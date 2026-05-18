import { db, ordersTable, merchantsTable } from "@workspace/db";
import { eq, and, isNull, lt } from "drizzle-orm";
import { checkPixpayStatus } from "./pixpay";
import { emitOrderStatus } from "./order-events";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 3000;
// Pending orders with no transactionId: auto-cancel after 3 min
const UNPAID_EXPIRY_MS = 3 * 60 * 1000;
// Processing orders stuck with no IPN: auto-fail after 30 min
const STUCK_PROCESSING_EXPIRY_MS = 30 * 60 * 1000;
// How long to wait before trusting a "failed" status from Pixpay.
// Cashouts (collecting from customer mobile) can briefly return FAILED on the
// status API even when the customer has confirmed — the IPN is authoritative.
const FAIL_GRACE_MS = 10 * 60 * 1000; // 10 minutes

function isSuccessState(state: string): boolean {
  return ["SUCCESS", "SUCCESSFULL", "SUCCESSFUL"].includes(state.toUpperCase());
}

function isFailedState(state: string): boolean {
  return ["FAILED", "REJECTED", "CANCELLED", "FAILURE", "TIMEOUT"].includes(state.toUpperCase());
}

async function creditMerchantCommission(order: typeof ordersTable.$inferSelect) {
  if (!order.merchantId) return;
  try {
    const [merchant] = await db
      .select()
      .from(merchantsTable)
      .where(eq(merchantsTable.id, order.merchantId))
      .limit(1);
    if (merchant) {
      const commission = Math.floor(order.totalAmount * 0.5);
      await db
        .update(merchantsTable)
        .set({ balance: merchant.balance + commission })
        .where(eq(merchantsTable.id, merchant.id));
      logger.info({ merchantId: merchant.id, commission }, "Poller: merchant commission credited on confirmation");
    }
  } catch (e: any) {
    logger.warn({ orderId: order.id, err: e?.message }, "Poller: failed to credit merchant commission");
  }
}

// Cancel old `pending` orders that were never paid (no transactionId)
async function cancelOldUnpaidOrders() {
  const cutoff = new Date(Date.now() - UNPAID_EXPIRY_MS);
  try {
    const rows = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.status, "pending"),
          isNull(ordersTable.transactionId),
          lt(ordersTable.createdAt, cutoff)
        )
      );

    for (const row of rows) {
      await db
        .update(ordersTable)
        .set({ status: "cancelled" })
        .where(eq(ordersTable.id, row.id));
      emitOrderStatus(row.id, "cancelled");
      logger.info({ orderId: row.id }, "Poller: auto-cancelled unpaid order (expired)");
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Poller: error in cancelOldUnpaidOrders");
  }
}

// Fail `processing` orders stuck for more than 30 min (IPN never arrived)
async function failStuckProcessingOrders() {
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_EXPIRY_MS);
  try {
    const rows = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.status, "processing"),
          lt(ordersTable.createdAt, cutoff)
        )
      );

    for (const order of rows) {
      // Try Pixpay one last time before giving up
      let finalState = "TIMEOUT";
      if (order.transactionId) {
        try {
          const result = await checkPixpayStatus(order.transactionId);
          finalState = result?.data?.state ?? "TIMEOUT";
        } catch {}
      }

      if (isSuccessState(finalState)) {
        // Atomic update — avoid double credit if IPN arrives at the same time
        const updated = await db
          .update(ordersTable)
          .set({ status: "confirmed" })
          .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "processing")))
          .returning();
        if (updated.length === 0) {
          logger.info({ orderId: order.id }, "Poller(stuck): order already transitioned — skipping");
          emitOrderStatus(order.id, "confirmed", order.transactionId);
          continue;
        }
        await creditMerchantCommission(order);
        emitOrderStatus(order.id, "confirmed", order.transactionId);
        logger.info({ orderId: order.id, finalState }, "Poller: stuck order confirmed (awaiting admin)");
      } else {
        await db
          .update(ordersTable)
          .set({ status: "failed" })
          .where(eq(ordersTable.id, order.id));
        emitOrderStatus(order.id, "failed", order.transactionId);
        logger.warn({ orderId: order.id, finalState }, "Poller: stuck processing order auto-failed after 30 min");
      }
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Poller: error in failStuckProcessingOrders");
  }
}

// Check all active `processing` orders against Pixpay API
async function checkProcessingOrders() {
  let rows: typeof ordersTable.$inferSelect[] = [];
  try {
    rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.status, "processing"));
  } catch {
    return;
  }

  for (const order of rows) {
    if (!order.transactionId) continue;

    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    // Skip orders past the stuck threshold — handled by failStuckProcessingOrders
    if (ageMs >= STUCK_PROCESSING_EXPIRY_MS) continue;

    const pastGracePeriod = ageMs >= FAIL_GRACE_MS;

    try {
      const result = await checkPixpayStatus(order.transactionId);
      const state: string = result?.data?.state ?? "";

      logger.debug({ orderId: order.id, transactionId: order.transactionId, state, ageMs }, "Poller: Pixpay status");

      if (isSuccessState(state)) {
        // Atomic update — avoid double credit if IPN arrives at the same time
        const updated = await db
          .update(ordersTable)
          .set({ status: "confirmed" })
          .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "processing")))
          .returning();
        if (updated.length === 0) {
          logger.info({ orderId: order.id }, "Poller: order already transitioned — skipping");
          emitOrderStatus(order.id, "confirmed", order.transactionId);
          continue;
        }
        await creditMerchantCommission(order);
        emitOrderStatus(order.id, "confirmed", order.transactionId);
        logger.info({ orderId: order.id, transactionId: order.transactionId, state }, "Poller: order confirmed (awaiting admin)");
      } else if (isFailedState(state) && pastGracePeriod) {
        // Only trust "failed" from Pixpay after the grace period.
        // In the first 10 min, the IPN may still arrive with the real SUCCESS result.
        await db
          .update(ordersTable)
          .set({ status: "failed" })
          .where(eq(ordersTable.id, order.id));
        emitOrderStatus(order.id, "failed", order.transactionId);
        logger.info({ orderId: order.id, transactionId: order.transactionId, state, ageMs }, "Poller: order marked failed after grace period");
      } else if (isFailedState(state)) {
        logger.info(
          { orderId: order.id, state, ageMs, gracePeriodMs: FAIL_GRACE_MS },
          "Poller: Pixpay reports failed but still within grace period — waiting for IPN"
        );
      }
      // Still in-flight → check again next cycle
    } catch (err: any) {
      logger.warn({ orderId: order.id, err: err?.message }, "Poller: error checking Pixpay status");
    }
  }
}

async function runCycle() {
  await cancelOldUnpaidOrders();
  await failStuckProcessingOrders();
  await checkProcessingOrders();
}

export function startProcessingPoller() {
  logger.info("Starting Pixpay processing-order poller (every 3s)");
  runCycle().catch(() => {});
  setInterval(() => { runCycle().catch(() => {}); }, POLL_INTERVAL_MS);
}
