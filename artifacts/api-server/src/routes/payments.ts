import { Router } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { emitOrderStatus } from "../lib/order-events";

const router = Router();

router.post("/payments/ipn", async (req, res) => {
  res.status(200).json({ received: true });

  const { transaction_id, state, custom_data } = req.body ?? {};

  logger.info({ transaction_id, state, custom_data }, "Pixpay IPN received");

  const orderId = parseInt(String(custom_data ?? ""));
  if (isNaN(orderId)) {
    logger.warn({ custom_data }, "IPN: custom_data is not a valid order id");
    return;
  }

  try {
    if (state === "SUCCESS" || state === "SUCCESSFULL" || state === "SUCCESSFUL") {
      await db
        .update(ordersTable)
        .set({ status: "paid", transactionId: transaction_id ?? null })
        .where(eq(ordersTable.id, orderId));
      logger.info({ orderId, transaction_id }, "Order marked as paid via IPN");
      emitOrderStatus(orderId, "paid", transaction_id);
    } else if (state === "FAILED" || state === "REJECTED" || state === "CANCELLED") {
      await db
        .update(ordersTable)
        .set({ status: "failed", transactionId: transaction_id ?? null })
        .where(eq(ordersTable.id, orderId));
      logger.info({ orderId, state }, "Order marked as failed via IPN");
      emitOrderStatus(orderId, "failed", transaction_id);
    } else {
      logger.info({ orderId, state }, "IPN: unhandled state, no update");
    }
  } catch (err) {
    logger.error({ err, orderId }, "IPN: error updating order status");
  }
});

export default router;
