import { Router } from "express";
import { db, ordersTable, bundlesTable, operatorsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { createHash } from "crypto";
import { getUserIdFromToken } from "./auth";

const router = Router();

async function getBundleWithOperator(bundleId: number) {
  const [row] = await db
    .select({
      id: bundlesTable.id,
      name: bundlesTable.name,
      dataSize: bundlesTable.dataSize,
      validity: bundlesTable.validity,
      price: bundlesTable.price,
      operatorId: bundlesTable.operatorId,
      active: bundlesTable.active,
      createdAt: bundlesTable.createdAt,
      operatorName: operatorsTable.name,
      operatorSlug: operatorsTable.slug,
      operatorColor: operatorsTable.color,
    })
    .from(bundlesTable)
    .leftJoin(operatorsTable, eq(bundlesTable.operatorId, operatorsTable.id))
    .where(eq(bundlesTable.id, bundleId))
    .limit(1);
  return row ?? null;
}

function getCurrentUserId(req: any): number | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return getUserIdFromToken(auth.slice(7));
}

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user?.role === "admin";
}

// Public: track orders by phone number — MUST be before /:id
router.get("/orders/track", async (req, res) => {
  const phone = String(req.query.phone ?? "").trim();
  if (!phone) return res.status(400).json({ error: "Numéro de téléphone requis" });

  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.phoneNumber, phone))
    .orderBy(desc(ordersTable.createdAt));

  const enriched = await Promise.all(
    rows.map(async (order) => {
      const bundle = await getBundleWithOperator(order.bundleId);
      return { ...order, bundle };
    })
  );

  return res.json(enriched);
});

router.get("/orders", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  const isAdminKey = adminKey === (process.env.ADMIN_PASSWORD ?? "Apashash28@");

  const userId = getCurrentUserId(req);
  const adminJwt = await isAdmin(userId);

  let rows;
  if (isAdminKey || adminJwt) {
    rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  } else if (userId) {
    rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId))
      .orderBy(desc(ordersTable.createdAt));
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const enriched = await Promise.all(
    rows.map(async (order) => {
      const bundle = await getBundleWithOperator(order.bundleId);
      return { ...order, bundle };
    })
  );

  return res.json(enriched);
});

router.post("/orders", async (req, res) => {
  const schema = z.object({
    bundleId: z.number().int().positive(),
    phoneNumber: z.string().min(1),
    paymentMethod: z.enum(["mtn_momo", "orange_money"]),
    payerPhone: z.string().optional(),
    payerName: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  const bundle = await getBundleWithOperator(parsed.data.bundleId);
  if (!bundle) return res.status(404).json({ error: "Forfait introuvable" });
  if (!bundle.active) return res.status(400).json({ error: "Ce forfait n'est pas disponible" });

  const userId = getCurrentUserId(req);

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId: userId ?? null,
      bundleId: parsed.data.bundleId,
      phoneNumber: parsed.data.phoneNumber,
      payerPhone: parsed.data.payerPhone ?? null,
      payerName: parsed.data.payerName ?? null,
      paymentMethod: parsed.data.paymentMethod,
      status: "pending",
      totalAmount: bundle.price,
    })
    .returning();

  return res.status(201).json({ ...order, bundle });
});

router.get("/orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const bundle = await getBundleWithOperator(order.bundleId);
  return res.json({ ...order, bundle });
});

router.post("/orders/:id/pay", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({
    paymentMethod: z.enum(["mtn_momo", "orange_money"]),
    payerPhone: z.string().optional(),
    payerName: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) return res.status(404).json({ error: "Commande introuvable" });
  if (order.status === "paid") return res.status(400).json({ error: "Commande déjà payée" });

  const transactionId =
    "TXN" +
    createHash("sha256")
      .update(`${id}:${Date.now()}`)
      .digest("hex")
      .slice(0, 12)
      .toUpperCase();

  const updateData: Record<string, any> = {
    status: "paid",
    transactionId,
    paymentMethod: parsed.data.paymentMethod,
  };
  if (parsed.data.payerPhone) updateData.payerPhone = parsed.data.payerPhone;
  if (parsed.data.payerName) updateData.payerName = parsed.data.payerName;

  const [updated] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, id))
    .returning();

  const bundle = await getBundleWithOperator(updated.bundleId);

  return res.json({
    success: true,
    transactionId,
    message: "Paiement réussi",
    order: { ...updated, bundle },
  });
});

// Admin: manually set order status to paid or failed
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Apashash28@";

router.patch("/admin/orders/:id/status", async (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({ status: z.enum(["paid", "failed", "cancelled"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Statut invalide" });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const updateData: Record<string, any> = { status: parsed.data.status };

  if (parsed.data.status === "paid" && !order.transactionId) {
    const { createHash } = await import("crypto");
    updateData.transactionId = "TXN" + createHash("sha256")
      .update(`admin:${id}:${Date.now()}`).digest("hex").slice(0, 12).toUpperCase();
  }

  const [updated] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, id))
    .returning();

  const bundle = await getBundleWithOperator(updated.bundleId);
  return res.json({ ...updated, bundle });
});

export default router;
