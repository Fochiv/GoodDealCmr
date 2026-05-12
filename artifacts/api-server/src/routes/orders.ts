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

router.get("/orders", async (req, res) => {
  const userId = getCurrentUserId(req);
  const admin = await isAdmin(userId);

  let rows;
  if (admin) {
    rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(100);
  } else if (userId) {
    rows = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId)).orderBy(desc(ordersTable.createdAt));
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
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const bundle = await getBundleWithOperator(parsed.data.bundleId);
  if (!bundle) return res.status(404).json({ error: "Bundle not found" });
  if (!bundle.active) return res.status(400).json({ error: "Bundle is not active" });

  const userId = getCurrentUserId(req);

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId: userId ?? null,
      bundleId: parsed.data.bundleId,
      phoneNumber: parsed.data.phoneNumber,
      paymentMethod: parsed.data.paymentMethod,
      status: "pending",
      totalAmount: bundle.price,
    })
    .returning();

  return res.status(201).json({ ...order, bundle });
});

router.get("/orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const bundle = await getBundleWithOperator(order.bundleId);
  return res.json({ ...order, bundle });
});

router.post("/orders/:id/pay", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const schema = z.object({
    paymentMethod: z.enum(["mtn_momo", "orange_money"]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status === "paid") return res.status(400).json({ error: "Order already paid" });

  // Demo mode: always succeed
  const transactionId = "TXN" + createHash("sha256").update(`${id}:${Date.now()}`).digest("hex").slice(0, 12).toUpperCase();

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "paid", transactionId, paymentMethod: parsed.data.paymentMethod })
    .where(eq(ordersTable.id, id))
    .returning();

  const bundle = await getBundleWithOperator(updated.bundleId);

  return res.json({ success: true, transactionId, message: "Payment successful", order: { ...updated, bundle } });
});

export default router;
