import { db, ordersTable, merchantsTable } from "@workspace/db";
import { eq, and, isNull, lt } from "drizzle-orm";
import { checkPixpayStatus } from "./pixpay";
import { emitOrderStatus } from "./order-events";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 3000;
// Pending orders with no transactionId: auto-cancel after 5 min
const UNPAID_EXPIRY_MS = 5 * 60 * 1000;
// Processing orders stuck with no resolution: auto-fail after 60 min
const STUCK_PROCESSING_EXPIRY_MS = 60 * 60 * 1000;
// Minimum age before we start counting consecutive FAILEDs.
// PixPay returns FAILED during USSD confirmation — don't penalise early.
const MIN_AGE_BEFORE_FAIL_COUNT_MS = 4 * 60 * 1000; // 4 minutes
// How many consecutive FAILED responses before we trust it.
// 60 checks × 3 s = ~3 min of confirmed failures needed.
const MAX_FAIL_COUNT = 60;

// In-memory counters: transactionId → number of consecutive FAILED checks
const failedCounts = new Map<string, number>();

function isSuccessState(state: string): boolean {
  const s = state.toUpperCase().trim();
  return ["SUCCESS", "SUCCESSFULL", "SUCCESSFUL", "COMPLETED", "COMPLETE", "PAID", "DONE", "APPROVED"].includes(s);
}

function isFailedState(state: string): boolean {
  const s = state.toUpperCase().trim();
  return ["FAILED", "REJECTED", "CANCELLED", "FAILURE", "TIMEOUT", "EXPIRED", "ERROR", "DECLINED"].includes(s);
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
      logger.info({ merchantId: merchant.id, commission }, "Poller: merchant commission credited");
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
      await db.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, row.id));
      emitOrderStatus(row.id, "cancelled");
      logger.info({ orderId: row.id }, "Poller: auto-cancelled unpaid order (expired)");
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Poller: error in cancelOldUnpaidOrders");
  }
}

// Fail `processing` orders stuck for more than 60 min (IPN never arrived)
async function failStuckProcessingOrders() {
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_EXPIRY_MS);
  try {
    const rows = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.status, "processing"), lt(ordersTable.createdAt, cutoff)));

    for (const order of rows) {
      let finalState = "TIMEOUT";
      if (order.transactionId) {
        try {
          const result = await checkPixpayStatus(order.transactionId);
          finalState = result?.data?.state ?? "TIMEOUT";
        } catch {}
      }

      if (isSuccessState(finalState)) {
        const updated = await db
          .update(ordersTable)
          .set({ status: "confirmed" })
          .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "processing")))
          .returning();
        if (updated.length === 0) {
          emitOrderStatus(order.id, "confirmed", order.transactionId);
          continue;
        }
        await creditMerchantCommission(order);
        emitOrderStatus(order.id, "confirmed", order.transactionId);
        logger.info({ orderId: order.id }, "Poller(stuck): order confirmed");
      } else {
        if (order.transactionId) failedCounts.delete(order.transactionId);
        await db.update(ordersTable).set({ status: "failed" }).where(eq(ordersTable.id, order.id));
        emitOrderStatus(order.id, "failed", order.transactionId);
        logger.warn({ orderId: order.id, finalState }, "Poller: stuck order auto-failed after 60 min");
      }
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Poller: error in failStuckProcessingOrders");
  }
}

// Check all active `processing` orders against Pixpay every 5 s
async function checkProcessingOrders() {
  let rows: typeof ordersTable.$inferSelect[] = [];
  try {
    rows = await db.select().from(ordersTable).where(eq(ordersTable.status, "processing"));
  } catch {
    return;
  }

  for (const order of rows) {
    if (!order.transactionId) continue;

    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    if (ageMs >= STUCK_PROCESSING_EXPIRY_MS) continue; // handled separately

    try {
      const result = await checkPixpayStatus(order.transactionId);
      const state: string = result?.data?.state ?? "";

      logger.debug({ orderId: order.id, transactionId: order.transactionId, state }, "Poller: Pixpay status");

      if (isSuccessState(state)) {
        failedCounts.delete(order.transactionId);
        const updated = await db
          .update(ordersTable)
          .set({ status: "confirmed" })
          .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "processing")))
          .returning();
        if (updated.length === 0) {
          emitOrderStatus(order.id, "confirmed", order.transactionId);
          continue;
        }
        await creditMerchantCommission(order);
        emitOrderStatus(order.id, "confirmed", order.transactionId);
        logger.info({ orderId: order.id, state }, "Poller: order confirmed");

      } else if (isFailedState(state)) {
        // PixPay returns FAILED briefly while user is confirming USSD.
        // Don't start counting failures until the order is at least 4 minutes old.
        if (ageMs < MIN_AGE_BEFORE_FAIL_COUNT_MS) {
          logger.info(
            { orderId: order.id, state, ageMs },
            "Poller: FAILED state but order too young — ignoring (user may still be confirming)"
          );
          failedCounts.delete(order.transactionId);
          continue;
        }

        const count = (failedCounts.get(order.transactionId) ?? 0) + 1;
        failedCounts.set(order.transactionId, count);

        logger.info(
          { orderId: order.id, state, failCount: count, maxFailCount: MAX_FAIL_COUNT },
          "Poller: FAILED state received — waiting for confirmation"
        );

        if (count >= MAX_FAIL_COUNT) {
          failedCounts.delete(order.transactionId);
          await db.update(ordersTable).set({ status: "failed" }).where(eq(ordersTable.id, order.id));
          emitOrderStatus(order.id, "failed", order.transactionId);
          logger.info({ orderId: order.id, state }, "Poller: order marked failed after consecutive checks");
        }
      } else {
        // In-flight (PENDING / PENDING1 / PROCESSING / unknown) — reset failure streak
        failedCounts.delete(order.transactionId);
      }
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
