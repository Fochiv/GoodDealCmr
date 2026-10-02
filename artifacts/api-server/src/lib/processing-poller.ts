import { db, ordersTable, merchantsTable } from "@workspace/db";
import { eq, and, isNull, lt } from "drizzle-orm";
import { checkAshtechStatus, getAshtechTransactionId } from "./ashtech";
import { emitOrderStatus } from "./order-events";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 30_000;
// Pending orders with no transactionId: auto-cancel after 5 min
const UNPAID_EXPIRY_MS = 5 * 60 * 1000;
// Warn on processing orders still unresolved after 60 min; leave them for manual review
const STUCK_PROCESSING_EXPIRY_MS = 60 * 60 * 1000;

function isSuccessState(state: string): boolean {
  return state === "success" || state === "completed";
}

function isFailedState(state: string): boolean {
  return state === "failed";
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

// Check AshTech transactions at a conservative interval. Older transactions
// without the AshTech marker are left untouched for manual reconciliation.
async function checkProcessingOrders() {
  let rows: typeof ordersTable.$inferSelect[] = [];
  try {
    rows = await db.select().from(ordersTable).where(eq(ordersTable.status, "processing"));
  } catch {
    return;
  }

  for (const order of rows) {
    const transactionId = order.transactionId
      ? getAshtechTransactionId(order.transactionId)
      : null;
    if (!transactionId) continue;

    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    try {
      const state = await checkAshtechStatus(transactionId);
      logger.debug({ orderId: order.id, transactionId, state }, "AshTech payment status checked");

      if (isSuccessState(state)) {
        const updated = await db
          .update(ordersTable)
          .set({ status: "confirmed" })
          .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "processing")))
          .returning();
        if (updated.length === 0) {
          continue;
        }
        await creditMerchantCommission(order);
        emitOrderStatus(order.id, "confirmed", order.transactionId);
        logger.info({ orderId: order.id, state }, "AshTech order confirmed");
      } else if (isFailedState(state)) {
        const [updated] = await db
          .update(ordersTable)
          .set({ status: "failed" })
          .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "processing")))
          .returning();
        if (updated) {
          emitOrderStatus(order.id, "failed", order.transactionId);
          logger.info({ orderId: order.id }, "AshTech order marked failed");
        }
      } else if (ageMs >= STUCK_PROCESSING_EXPIRY_MS) {
        logger.warn(
          { orderId: order.id, state, ageMs },
          "AshTech order is still unresolved after 60 minutes; left processing for manual review",
        );
      }
    } catch (err: any) {
      logger.warn({ orderId: order.id, err: err?.message }, "AshTech status check failed");
    }
  }
}

async function runCycle() {
  await cancelOldUnpaidOrders();
  await checkProcessingOrders();
}

export function startProcessingPoller() {
  logger.info("Starting AshTech processing-order poller (every 30s)");
  runCycle().catch(() => {});
  setInterval(() => { runCycle().catch(() => {}); }, POLL_INTERVAL_MS);
}
