import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { checkPixpayStatus } from "./pixpay";
import { emitOrderStatus } from "./order-events";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 3000;

function isSuccessState(state: string): boolean {
  return ["SUCCESS", "SUCCESSFULL", "SUCCESSFUL"].includes(state.toUpperCase());
}

function isFailedState(state: string): boolean {
  return ["FAILED", "REJECTED", "CANCELLED", "FAILURE"].includes(state.toUpperCase());
}

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

    try {
      const result = await checkPixpayStatus(order.transactionId);
      const state: string = result?.data?.state ?? "";

      if (isSuccessState(state)) {
        await db
          .update(ordersTable)
          .set({ status: "paid" })
          .where(eq(ordersTable.id, order.id));
        logger.info({ orderId: order.id, transactionId: order.transactionId, state }, "Poller: order marked paid");
        emitOrderStatus(order.id, "paid", order.transactionId);
      } else if (isFailedState(state)) {
        await db
          .update(ordersTable)
          .set({ status: "failed" })
          .where(eq(ordersTable.id, order.id));
        logger.info({ orderId: order.id, transactionId: order.transactionId, state }, "Poller: order marked failed");
        emitOrderStatus(order.id, "failed", order.transactionId);
      }
      // If still pending/processing, do nothing — will check again next cycle
    } catch (err: any) {
      logger.warn({ orderId: order.id, err: err?.message }, "Poller: error checking Pixpay status");
    }
  }
}

export function startProcessingPoller() {
  logger.info("Starting Pixpay processing-order poller (every 3s)");
  // Run once immediately on start (catches orders stuck from before restart)
  checkProcessingOrders().catch(() => {});
  setInterval(() => {
    checkProcessingOrders().catch(() => {});
  }, POLL_INTERVAL_MS);
}
