import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { db, ordersTable, merchantsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import { emitOrderStatus } from "../lib/order-events";
import { checkAshtechStatus, toStoredAshtechTransactionId } from "../lib/ashtech";

const router = Router();

router.post("/payments/ipn", async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: "Corps brut du webhook requis" });
  }

  const webhookSecret = (process.env.ASHTECH_WEBHOOK_SECRET ?? "").trim();
  if (!webhookSecret) {
    logger.error("ASHTECH_WEBHOOK_SECRET is not configured");
    return res.status(503).json({ error: "Le secret webhook AshTech n'est pas configuré" });
  }

  const rawBody = req.body.toString("utf8");
  const timestamp = req.header("X-Ashtech-Timestamp") ?? "";
  const signature = req.header("X-Ashtech-Signature") ?? "";
  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    return res.status(401).json({ error: "Horodatage webhook invalide ou expiré" });
  }

  const signatureMatch = /^sha256=([a-f0-9]{64})$/i.exec(signature);
  if (!signatureMatch) return res.status(401).json({ error: "Signature webhook invalide" });

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest();
  const receivedSignature = Buffer.from(signatureMatch[1], "hex");
  if (!timingSafeEqual(expectedSignature, receivedSignature)) {
    return res.status(401).json({ error: "Signature webhook invalide" });
  }

  let event: { status?: unknown; transaction_id?: unknown; reference?: unknown };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "JSON webhook invalide" });
  }

  const transactionId = typeof event.transaction_id === "string" ? event.transaction_id.trim() : "";
  const reference = typeof event.reference === "string" ? event.reference.trim() : "";
  const eventStatus = typeof event.status === "string" ? event.status.toLowerCase() : "";
  if (!transactionId || !reference) {
    return res.status(400).json({ error: "Référence ou identifiant de transaction manquant" });
  }

  let orderId: number | null = null;
  try {
    const storedTransactionId = toStoredAshtechTransactionId(transactionId);
    const orderIdMatch = /^gooddeal-order-(\d+)$/.exec(reference);
    orderId = orderIdMatch ? Number(orderIdMatch[1]) : null;

    if (orderId !== null && (!Number.isSafeInteger(orderId) || orderId <= 0)) {
      return res.status(400).json({ error: "Référence de commande invalide" });
    }

    if (orderId === null) {
      const [matchedOrder] = await db
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(eq(ordersTable.transactionId, storedTransactionId))
        .limit(1);
      orderId = matchedOrder?.id ?? null;
    }

    if (orderId === null) {
      logger.info({ reference, transactionId }, "AshTech webhook ignored: no matching Good Deal order");
      return res.status(200).json({ received: true, ignored: true });
    }

    const [currentOrder] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);
    if (!currentOrder) return res.status(200).json({ received: true, ignored: true });
    if (currentOrder.transactionId && currentOrder.transactionId !== storedTransactionId) {
      logger.warn({ orderId, transactionId }, "AshTech webhook ignored: transaction does not match order");
      return res.status(200).json({ received: true, ignored: true });
    }

    const verifiedStatus = await checkAshtechStatus(transactionId);

    if (eventStatus === "completed" && (verifiedStatus === "success" || verifiedStatus === "completed")) {
      const [updated] = await db
        .update(ordersTable)
        .set({ status: "confirmed", transactionId: storedTransactionId })
        .where(
          and(
            eq(ordersTable.id, orderId),
            or(eq(ordersTable.status, "processing"), eq(ordersTable.status, "pending")),
          ),
        )
        .returning();

      if (updated) {
        if (updated.merchantId) {
          const commission = Math.floor(updated.totalAmount * 0.5);
          const [merchant] = await db
            .select()
            .from(merchantsTable)
            .where(eq(merchantsTable.id, updated.merchantId))
            .limit(1);
          if (merchant) {
            await db
              .update(merchantsTable)
              .set({ balance: merchant.balance + commission })
              .where(eq(merchantsTable.id, merchant.id));
          }
        }
        logger.info({ orderId, transactionId }, "AshTech order confirmed");
        emitOrderStatus(orderId, "confirmed", transactionId);
      }
    } else if (eventStatus === "failed" && verifiedStatus === "failed") {
      const [updated] = await db
        .update(ordersTable)
        .set({ status: "failed", transactionId: storedTransactionId })
        .where(
          and(
            eq(ordersTable.id, orderId),
            or(eq(ordersTable.status, "processing"), eq(ordersTable.status, "pending")),
          ),
        )
        .returning();
      if (updated) emitOrderStatus(orderId, "failed", transactionId);
    } else if (verifiedStatus === "pending") {
      logger.info({ orderId, transactionId, eventStatus }, "AshTech payment is still pending");
    } else {
      logger.warn({ orderId, transactionId, eventStatus, verifiedStatus }, "AshTech webhook status mismatch");
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    logger.error({ err: err?.message, orderId, transactionId }, "AshTech webhook processing failed");
    return res.status(503).json({ error: "La vérification AshTech a échoué; notification à réessayer" });
  }
});

export default router;
