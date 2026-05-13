import { Router } from "express";
import { db, ordersTable, bundlesTable, operatorsTable, usersTable, merchantsTable } from "@workspace/db";
import { eq, desc, inArray, or, and } from "drizzle-orm";
import { z } from "zod";
import { getUserIdFromToken } from "./auth";
import { initiatePixpayPayment } from "../lib/pixpay";
import { subscribeToOrder, unsubscribeFromOrder, emitOrderStatus } from "../lib/order-events";

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

// Public: returns all active (processing/confirmed) orders linked to the requesting IP
// Used by the floating DevicePendingBar to detect in-progress orders without a phone number
router.get("/orders/active-for-ip", async (req, res) => {
  // Get the real IP (trust proxy is set in app.ts)
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";

  if (!ip) return res.json([]);

  try {
    // Find all orders from this IP that are currently active
    const activeRows = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.ipAddress, ip),
          or(
            eq(ordersTable.status, "processing"),
            eq(ordersTable.status, "confirmed")
          )
        )
      )
      .orderBy(desc(ordersTable.createdAt));

    const enriched = await Promise.all(
      activeRows.map(async (order) => {
        const bundle = await getBundleWithOperator(order.bundleId);
        return { ...order, bundle };
      })
    );

    return res.json(enriched);
  } catch {
    return res.json([]);
  }
});

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
    referralCode: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  const bundle = await getBundleWithOperator(parsed.data.bundleId);
  if (!bundle) return res.status(404).json({ error: "Forfait introuvable" });
  if (!bundle.active) return res.status(400).json({ error: "Ce forfait n'est pas disponible" });

  const userId = getCurrentUserId(req);

  // Resolve referral code to merchant ID
  let merchantId: number | null = null;
  if (parsed.data.referralCode) {
    const [merchant] = await db
      .select({ id: merchantsTable.id })
      .from(merchantsTable)
      .where(eq(merchantsTable.referralCode, parsed.data.referralCode))
      .limit(1);
    if (merchant) merchantId = merchant.id;
  }

  // Capture client IP for floating-bar detection (no phone required)
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;

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
      ipAddress: clientIp,
      merchantId,
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

// SSE: push order status updates in real-time (no polling needed)
router.get("/orders/:id/events", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send current status immediately on connect
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (order) {
      res.write(`data: ${JSON.stringify({ status: order.status, transactionId: order.transactionId ?? null })}\n\n`);
      // If already in a final state, close right away
      if (order.status === "paid" || order.status === "failed" || order.status === "cancelled") {
        return res.end();
      }
    }
  } catch {}

  subscribeToOrder(id, res);

  // Keepalive ping every 20s
  const ping = setInterval(() => {
    try { res.write(": ping\n\n"); } catch {}
  }, 20_000);

  req.on("close", () => {
    clearInterval(ping);
    unsubscribeFromOrder(id, res);
  });
});

router.post("/orders/:id/pay", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({
    paymentMethod: z.enum(["mtn_momo", "orange_money"]),
    payerPhone: z.string().min(1, "Numéro de paiement requis"),
    payerName: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order) return res.status(404).json({ error: "Commande introuvable" });
  if (order.status === "paid") return res.status(400).json({ error: "Commande déjà payée" });
  if (order.status === "processing") return res.status(400).json({ error: "Paiement déjà en cours de traitement" });

  try {
    const pixpay = await initiatePixpayPayment({
      amount: order.totalAmount,
      destination: parsed.data.payerPhone,
      paymentMethod: parsed.data.paymentMethod,
      orderId: id,
    });

    const [updated] = await db
      .update(ordersTable)
      .set({
        status: "processing",
        transactionId: pixpay.data.transaction_id,
        paymentMethod: parsed.data.paymentMethod,
        payerPhone: parsed.data.payerPhone,
        payerName: parsed.data.payerName ?? null,
      })
      .where(eq(ordersTable.id, id))
      .returning();

    const bundle = await getBundleWithOperator(updated.bundleId);

    return res.json({
      success: true,
      transactionId: pixpay.data.transaction_id,
      state: pixpay.data.state,
      message: pixpay.message,
      order: { ...updated, bundle },
    });
  } catch (err: any) {
    return res.status(502).json({ error: err.message ?? "Erreur lors de l'initiation du paiement" });
  }
});

// Admin: clients list — grouped by phone number from orders
router.get("/admin/clients", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== (process.env.ADMIN_PASSWORD ?? "Apashash28@")) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  const allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));

  // Group by phoneNumber
  const map = new Map<string, {
    phone: string;
    totalOrders: number;
    paidOrders: number;
    totalSpent: number;
    firstOrder: string;
    lastOrder: string;
    operators: Set<string>;
  }>();

  const bundles = await db
    .select({ id: bundlesTable.id, operatorId: bundlesTable.operatorId })
    .from(bundlesTable);
  const operators = await db.select().from(operatorsTable);
  const opMap = new Map(operators.map(o => [o.id, o.name]));
  const bundleOpMap = new Map(bundles.map(b => [b.id, b.operatorId]));

  for (const order of allOrders) {
    const phone = order.phoneNumber;
    if (!map.has(phone)) {
      map.set(phone, {
        phone,
        totalOrders: 0,
        paidOrders: 0,
        totalSpent: 0,
        firstOrder: order.createdAt as unknown as string,
        lastOrder: order.createdAt as unknown as string,
        operators: new Set(),
      });
    }
    const entry = map.get(phone)!;
    entry.totalOrders++;
    if (order.status === "paid") {
      entry.paidOrders++;
      entry.totalSpent += order.totalAmount;
    }
    const ts = new Date(order.createdAt).getTime();
    if (ts < new Date(entry.firstOrder).getTime()) entry.firstOrder = new Date(order.createdAt).toISOString();
    if (ts > new Date(entry.lastOrder).getTime()) entry.lastOrder = new Date(order.createdAt).toISOString();
    const opId = bundleOpMap.get(order.bundleId);
    if (opId) entry.operators.add(opMap.get(opId) ?? "");
  }

  const clients = Array.from(map.values())
    .map(c => ({ ...c, operators: Array.from(c.operators).filter(Boolean) }))
    .sort((a, b) => new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime());

  return res.json(clients);
});

// Admin: manually set order status to paid or failed
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Apashash28@";

router.patch("/admin/orders/:id/status", async (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({ status: z.enum(["paid", "failed", "cancelled", "confirmed"]) });
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

  // Credit 50% commission to merchant if order is paid and has a referral
  // Ne pas créditer si déjà crédité lors du passage à "confirmed" (paiement Pixpay confirmé)
  if (parsed.data.status === "paid" && order.status !== "paid" && order.status !== "confirmed" && order.merchantId) {
    const commission = Math.floor(order.totalAmount * 0.5);
    const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, order.merchantId)).limit(1);
    if (merchant) {
      await db.update(merchantsTable)
        .set({ balance: merchant.balance + commission })
        .where(eq(merchantsTable.id, merchant.id));
    }
  }

  // Push real-time update to any listening client
  emitOrderStatus(updated.id, updated.status, updated.transactionId ?? undefined);

  const bundle = await getBundleWithOperator(updated.bundleId);
  return res.json({ ...updated, bundle });
});

export default router;
