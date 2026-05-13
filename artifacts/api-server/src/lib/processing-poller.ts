import { db, ordersTable } from "@workspace/db";
import { eq, and, isNull, lt, sql } from "drizzle-orm";
import { checkPixpayStatus } from "./pixpay";
import { emitOrderStatus } from "./order-events";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 3000;
// Pending orders with no transactionId: auto-cancel after 15 min
const UNPAID_EXPIRY_MS = 15 * 60 * 1000;
// Processing orders stuck with no IPN: auto-fail after 30 min
const STUCK_PROCESSING_EXPIRY_MS = 30 * 60 * 1000;

function isSuccessState(state: string): boolean {
  return ["SUCCESS", "SUCCESSFULL", "SUCCESSFUL"].includes(state.toUpperCase());
}

function isFailedState(state: string): boolean {
  return ["FAILED", "REJECTED", "CANCELLED", "FAILURE", "TIMEOUT"].includes(state.toUpperCase());
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
        await db.update(ordersTable).set({ status: "confirmed" }).where(eq(ordersTable.id, order.id));
        emitOrderStatus(order.id, "confirmed", order.transactionId);
        logger.info({ orderId: order.id, finalState }, "Poller: stuck order confirmed (awaiting admin)");
      } else {
        await db.update(ordersTable).set({ status: "failed" }).where(eq(ordersTable.id, order.id));
        emitOrderStatus(order.id, "failed", order.transactionId);
        logger.info({ orderId: order.id, finalState }, "Poller: stuck processing order auto-failed");
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

    // Skip orders still within the stuck threshold — they'll be handled by failStuckProcessingOrders
    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    if (ageMs >= STUCK_PROCESSING_EXPIRY_MS) continue; // handled separately

    try {
      const result = await checkPixpayStatus(order.transactionId);
      const state: string = result?.data?.state ?? "";

      logger.debug({ orderId: order.id, transactionId: order.transactionId, state }, "Poller: Pixpay status");

      if (isSuccessState(state)) {
        await db.update(ordersTable).set({ status: "confirmed" }).where(eq(ordersTable.id, order.id));
        logger.info({ orderId: order.id, transactionId: order.transactionId, state }, "Poller: order confirmed (awaiting admin)");
        emitOrderStatus(order.id, "confirmed", order.transactionId);
      } else if (isFailedState(state)) {
        await db.update(ordersTable).set({ status: "failed" }).where(eq(ordersTable.id, order.id));
        logger.info({ orderId: order.id, transactionId: order.transactionId, state }, "Poller: order marked failed");
        emitOrderStatus(order.id, "failed", order.transactionId);
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
