import { Router } from "express";
import { db, merchantsTable, withdrawalsTable, ordersTable } from "@workspace/db";
import { eq, desc, sum, count, and } from "drizzle-orm";
import { z } from "zod";
import { createHash } from "crypto";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Apashash28@";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + (process.env.SESSION_SECRET ?? "good-deal-secret")).digest("hex");
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GD-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getMerchantIdFromHeader(req: any): number | null {
  const token = req.headers["x-merchant-token"];
  if (!token || typeof token !== "string") return null;
  const id = parseInt(token);
  return isNaN(id) ? null : id;
}

function isAdminRequest(req: any): boolean {
  return req.headers["x-admin-key"] === ADMIN_PASSWORD;
}

// POST /merchant/login
router.post("/merchant/login", async (req, res) => {
  const schema = z.object({ phone: z.string().min(1), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.phone, parsed.data.phone)).limit(1);
  if (!merchant || merchant.passwordHash !== hashPassword(parsed.data.password)) {
    return res.status(401).json({ error: "Numéro ou mot de passe incorrect" });
  }

  return res.json({
    token: String(merchant.id),
    merchant: {
      id: merchant.id,
      name: merchant.name,
      phone: merchant.phone,
      referralCode: merchant.referralCode,
      balance: merchant.balance,
    },
  });
});

// GET /merchant/me — returns merchant profile + stats
router.get("/merchant/me", async (req, res) => {
  const merchantId = getMerchantIdFromHeader(req);
  if (!merchantId) return res.status(401).json({ error: "Non autorisé" });

  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, merchantId)).limit(1);
  if (!merchant) return res.status(404).json({ error: "Marchand introuvable" });

  const allOrders = await db.select().from(ordersTable).where(eq(ordersTable.merchantId, merchantId)).orderBy(desc(ordersTable.createdAt));

  const paidOrders = allOrders.filter(o => o.status === "paid");
  const totalEarnings = paidOrders.reduce((acc, o) => acc + Math.floor(o.totalAmount * 0.5), 0);
  const pendingOrders = allOrders.filter(o => o.status === "pending" || o.status === "processing").length;

  return res.json({
    id: merchant.id,
    name: merchant.name,
    phone: merchant.phone,
    referralCode: merchant.referralCode,
    balance: merchant.balance,
    stats: {
      totalOrders: allOrders.length,
      paidOrders: paidOrders.length,
      pendingOrders,
      totalEarnings,
    },
    recentOrders: allOrders.slice(0, 20),
  });
});

// POST /merchant/withdraw
router.post("/merchant/withdraw", async (req, res) => {
  const merchantId = getMerchantIdFromHeader(req);
  if (!merchantId) return res.status(401).json({ error: "Non autorisé" });

  const schema = z.object({
    amount: z.number().int().positive(),
    withdrawalPhone: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, merchantId)).limit(1);
  if (!merchant) return res.status(404).json({ error: "Marchand introuvable" });

  if (parsed.data.amount > merchant.balance) {
    return res.status(400).json({ error: "Solde insuffisant" });
  }
  if (parsed.data.amount < 500) {
    return res.status(400).json({ error: "Montant minimum de retrait: 500 FCFA" });
  }

  await db.update(merchantsTable)
    .set({ balance: merchant.balance - parsed.data.amount })
    .where(eq(merchantsTable.id, merchantId));

  const [withdrawal] = await db.insert(withdrawalsTable).values({
    merchantId,
    amount: parsed.data.amount,
    withdrawalPhone: parsed.data.withdrawalPhone,
    status: "pending",
  }).returning();

  return res.status(201).json(withdrawal);
});

// GET /admin/merchants
router.get("/admin/merchants", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const merchants = await db.select().from(merchantsTable).orderBy(desc(merchantsTable.createdAt));
  return res.json(merchants);
});

// POST /admin/merchants — create merchant account
router.post("/admin/merchants", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const schema = z.object({
    phone: z.string().min(1),
    password: z.string().min(4),
    name: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  const existing = await db.select().from(merchantsTable).where(eq(merchantsTable.phone, parsed.data.phone)).limit(1);
  if (existing.length > 0) return res.status(400).json({ error: "Ce numéro est déjà enregistré" });

  let referralCode = generateReferralCode();
  let codeExists = await db.select().from(merchantsTable).where(eq(merchantsTable.referralCode, referralCode)).limit(1);
  while (codeExists.length > 0) {
    referralCode = generateReferralCode();
    codeExists = await db.select().from(merchantsTable).where(eq(merchantsTable.referralCode, referralCode)).limit(1);
  }

  const [merchant] = await db.insert(merchantsTable).values({
    phone: parsed.data.phone,
    passwordHash: hashPassword(parsed.data.password),
    name: parsed.data.name,
    referralCode,
    balance: 0,
  }).returning();

  return res.status(201).json({
    id: merchant.id,
    phone: merchant.phone,
    name: merchant.name,
    referralCode: merchant.referralCode,
    balance: merchant.balance,
    createdAt: merchant.createdAt,
  });
});

// GET /admin/withdrawals
router.get("/admin/withdrawals", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const withdrawals = await db.select().from(withdrawalsTable).orderBy(desc(withdrawalsTable.createdAt));
  const merchants = await db.select().from(merchantsTable);
  const merchantMap = new Map(merchants.map(m => [m.id, m]));

  const enriched = withdrawals.map(w => ({
    ...w,
    merchant: merchantMap.get(w.merchantId) ?? null,
  }));

  return res.json(enriched);
});

// PATCH /admin/withdrawals/:id/status
router.patch("/admin/withdrawals/:id/status", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({ status: z.enum(["pending", "paid", "rejected"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Statut invalide" });

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) return res.status(404).json({ error: "Retrait introuvable" });

  if (parsed.data.status === "rejected" && withdrawal.status === "pending") {
    const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, withdrawal.merchantId)).limit(1);
    if (merchant) {
      await db.update(merchantsTable)
        .set({ balance: merchant.balance + withdrawal.amount })
        .where(eq(merchantsTable.id, merchant.id));
    }
  }

  const [updated] = await db.update(withdrawalsTable).set({ status: parsed.data.status }).where(eq(withdrawalsTable.id, id)).returning();
  return res.json(updated);
});

// POST /admin/withdraw — admin requests his own withdrawal (treated as a special merchant withdrawal)
router.post("/admin/withdraw", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const schema = z.object({
    amount: z.number().int().positive(),
    withdrawalPhone: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  return res.status(201).json({
    success: true,
    amount: parsed.data.amount,
    withdrawalPhone: parsed.data.withdrawalPhone,
    message: `Retrait de ${parsed.data.amount} FCFA vers ${parsed.data.withdrawalPhone} enregistré.`,
  });
});

export default router;
