import { Router } from "express";
import { db, ordersTable, withdrawalsTable, merchantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { emitOrderStatus } from "../lib/order-events";

const router = Router();

function isSuccessState(state: string): boolean {
  return ["SUCCESS", "SUCCESSFULL", "SUCCESSFUL"].includes(state.toUpperCase());
}

function isFailedState(state: string): boolean {
  return ["FAILED", "REJECTED", "CANCELLED", "FAILURE", "TIMEOUT"].includes(state.toUpperCase());
}

router.post("/payments/ipn", async (req, res) => {
  res.status(200).json({ received: true });

  const { transaction_id, state, custom_data } = req.body ?? {};
  const customStr = String(custom_data ?? "");

  logger.info({ transaction_id, state, custom_data }, "Pixpay IPN received");

  // Withdrawal cashin IPN: custom_data = "withdrawal_<id>"
  if (customStr.startsWith("withdrawal_")) {
    const withdrawalId = parseInt(customStr.replace("withdrawal_", ""));
    if (isNaN(withdrawalId)) {
      logger.warn({ custom_data }, "IPN: invalid withdrawal id in custom_data");
      return;
    }

    try {
      const [withdrawal] = await db
        .select()
        .from(withdrawalsTable)
        .where(eq(withdrawalsTable.id, withdrawalId))
        .limit(1);

      if (!withdrawal) {
        logger.warn({ withdrawalId }, "IPN: withdrawal not found");
        return;
      }

      if (isSuccessState(state)) {
        // Mark paid regardless of current status — IPN is authoritative for success
        await db
          .update(withdrawalsTable)
          .set({ status: "paid", transactionId: transaction_id ?? null })
          .where(eq(withdrawalsTable.id, withdrawalId));
        logger.info({ withdrawalId, transaction_id }, "IPN: withdrawal marked paid");
      } else if (isFailedState(state)) {
        // Only apply failed if the withdrawal hasn't already been marked paid.
        // The money may have arrived on the mobile before the IPN fired.
        if (withdrawal.status === "paid") {
          logger.warn({ withdrawalId, state }, "IPN: received failed state but withdrawal already paid — ignoring");
          return;
        }

        await db
          .update(withdrawalsTable)
          .set({ status: "failed", transactionId: transaction_id ?? null })
          .where(eq(withdrawalsTable.id, withdrawalId));

        // Rembourser le marchand si nécessaire
        if (!withdrawal.isAdmin && withdrawal.merchantId) {
          const [merchant] = await db
            .select()
            .from(merchantsTable)
            .where(eq(merchantsTable.id, withdrawal.merchantId))
            .limit(1);
          if (merchant) {
            await db
              .update(merchantsTable)
              .set({ balance: merchant.balance + withdrawal.amount })
              .where(eq(merchantsTable.id, merchant.id));
            logger.info({ merchantId: merchant.id, amount: withdrawal.amount }, "IPN: merchant balance refunded after failed cashin");
          }
        }
        logger.info({ withdrawalId, state }, "IPN: withdrawal failed");
      }
    } catch (err) {
      logger.error({ err, withdrawalId }, "IPN: error processing withdrawal callback");
    }
    return;
  }

  // Order cashout IPN: custom_data = "GD_<orderId>" or legacy "<orderId>"
  const rawId = customStr.includes("_") ? customStr.split("_").pop() : customStr;
  const orderId = parseInt(rawId ?? "");
  if (isNaN(orderId)) {
    logger.warn({ custom_data }, "IPN: custom_data is not a valid order id");
    return;
  }

  try {
    if (isSuccessState(state)) {
      // Mise à jour atomique : seulement si le statut est encore "processing"
      // Cela évite le double crédit si IPN + poller arrivent en même temps
      const updated = await db
        .update(ordersTable)
        .set({ status: "confirmed", transactionId: transaction_id ?? null })
        .where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "processing")))
        .returning();

      if (updated.length === 0) {
        logger.info({ orderId }, "IPN: order already confirmed or not in processing state — skipping");
        emitOrderStatus(orderId, "confirmed", transaction_id);
        return;
      }

      const order = updated[0];
      logger.info({ orderId, transaction_id }, "IPN: order confirmed (awaiting admin delivery)");

      // Créditer la commission marchand (50%) — uniquement si on a bien transitionné
      if (order.merchantId) {
        const commission = Math.floor(order.totalAmount * 0.5);
        const [merchant] = await db
          .select()
          .from(merchantsTable)
          .where(eq(merchantsTable.id, order.merchantId))
          .limit(1);
        if (merchant) {
          await db
            .update(merchantsTable)
            .set({ balance: merchant.balance + commission })
            .where(eq(merchantsTable.id, merchant.id));
          logger.info({ merchantId: merchant.id, commission }, "IPN: merchant commission credited on confirmation");
        }
      }

      emitOrderStatus(orderId, "confirmed", transaction_id);
    } else if (isFailedState(state)) {
      // Never downgrade an order that is already confirmed or paid
      const [current] = await db
        .select({ status: ordersTable.status })
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .limit(1);
      if (current?.status === "confirmed" || current?.status === "paid") {
        logger.warn({ orderId, state }, "IPN: received failed state but order already confirmed/paid — ignoring");
      } else {
        await db
          .update(ordersTable)
          .set({ status: "failed", transactionId: transaction_id ?? null })
          .where(eq(ordersTable.id, orderId));
        logger.info({ orderId, state }, "IPN: order marked failed");
        emitOrderStatus(orderId, "failed", transaction_id);
      }
    } else {
      logger.info({ orderId, state }, "IPN: unhandled state, no update");
    }
  } catch (err) {
    logger.error({ err, orderId }, "IPN: error updating order status");
  }
});

export default router;
