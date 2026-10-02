import { Router } from "express";
import { db, merchantsTable, withdrawalsTable, ordersTable, adminDepositsTable } from "@workspace/db";
import { eq, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { createHash } from "crypto";
import { logger } from "../lib/logger";

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

  // "confirmed" = paiement encaissé, livraison en cours — inclure dans les gains
  const paidOrders = allOrders.filter(o => o.status === "paid" || o.status === "confirmed");
  const totalEarnings = paidOrders.reduce((acc, o) => acc + Math.floor(o.totalAmount * 0.5), 0);
  const pendingOrders = allOrders.filter(o => o.status === "pending" || o.status === "processing").length;

  const myWithdrawals = await db.select().from(withdrawalsTable)
    .where(eq(withdrawalsTable.merchantId, merchantId))
    .orderBy(desc(withdrawalsTable.createdAt));

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
    withdrawals: myWithdrawals,
  });
});

// POST /merchant/withdraw
router.post("/merchant/withdraw", async (req, res) => {
  const merchantId = getMerchantIdFromHeader(req);
  if (!merchantId) return res.status(401).json({ error: "Non autorisé" });

  return res.status(503).json({
    error: "Les retraits Mobile Money sont temporairement suspendus : l'API AshTech de virement sortant n'est pas documentée.",
  });
});

// PATCH /admin/merchants/:id/balance — add or subtract from merchant balance
router.patch("/admin/merchants/:id/balance", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({
    type: z.enum(["add", "subtract"]),
    amount: z.number().int().positive(),
    note: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, id)).limit(1);
  if (!merchant) return res.status(404).json({ error: "Marchand introuvable" });

  const newBalance = parsed.data.type === "add"
    ? merchant.balance + parsed.data.amount
    : Math.max(0, merchant.balance - parsed.data.amount);

  const [updated] = await db.update(merchantsTable)
    .set({ balance: newBalance })
    .where(eq(merchantsTable.id, id))
    .returning();

  return res.json({
    id: updated.id,
    name: updated.name,
    phone: updated.phone,
    referralCode: updated.referralCode,
    balance: updated.balance,
    previousBalance: merchant.balance,
    change: parsed.data.type === "add" ? parsed.data.amount : -(merchant.balance - newBalance),
  });
});

// GET /admin/merchants
router.get("/admin/merchants", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const merchants = await db.select().from(merchantsTable).orderBy(desc(merchantsTable.createdAt));
  return res.json(merchants);
});

// GET /admin/merchants/:id — detail with orders + withdrawals
router.get("/admin/merchants/:id", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, id)).limit(1);
  if (!merchant) return res.status(404).json({ error: "Marchand introuvable" });

  const [orders, withdrawals] = await Promise.all([
    db.select().from(ordersTable).where(eq(ordersTable.merchantId, id)).orderBy(desc(ordersTable.createdAt)),
    db.select().from(withdrawalsTable).where(eq(withdrawalsTable.merchantId, id)).orderBy(desc(withdrawalsTable.createdAt)),
  ]);

  const paidOrders = orders.filter(o => o.status === "paid" || o.status === "confirmed");
  const totalEarnings = paidOrders.reduce((acc, o) => acc + Math.floor(o.totalAmount * 0.5), 0);
  const totalWithdrawn = withdrawals
    .filter(w => w.status === "paid" || w.status === "processing")
    .reduce((acc, w) => acc + w.amount, 0);

  return res.json({
    merchant: {
      id: merchant.id,
      name: merchant.name,
      phone: merchant.phone,
      referralCode: merchant.referralCode,
      balance: merchant.balance,
      createdAt: merchant.createdAt,
    },
    stats: {
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      totalEarnings,
      totalWithdrawn,
    },
    orders,
    withdrawals,
  });
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
    merchant: w.merchantId ? (merchantMap.get(w.merchantId) ?? null) : null,
  }));

  return res.json(enriched);
});

// PATCH /admin/withdrawals/:id/status
router.patch("/admin/withdrawals/:id/status", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({ status: z.enum(["pending", "paid", "rejected", "failed"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Statut invalide" });

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) return res.status(404).json({ error: "Retrait introuvable" });

  // Si on annule (rejected/failed) un retrait marchand → rembourser le solde marchand
  const isCancelling = parsed.data.status === "rejected" || parsed.data.status === "failed";
  if (isCancelling && !withdrawal.isAdmin && withdrawal.merchantId) {
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

// POST /admin/withdraw — admin requests his own withdrawal (stored in DB)
router.post("/admin/withdraw", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  return res.status(503).json({
    error: "Les retraits Mobile Money sont temporairement suspendus : l'API AshTech de virement sortant n'est pas documentée.",
  });
});

// POST /admin/manual-withdraw — retrait manuel admin (soustraction directe, sans Mobile Money)
router.post("/admin/manual-withdraw", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const schema = z.object({
    amount: z.number().int().positive(),
    note: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  if (parsed.data.amount < 100) {
    return res.status(400).json({ error: "Montant minimum : 100 FCFA" });
  }

  // Vérifier le solde disponible
  const allOrders = await db.select().from(ordersTable);
  const paidOrders = allOrders.filter(o => o.status === "paid" || o.status === "confirmed");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const merchantCommissionsTotal = paidOrders
    .filter(o => o.merchantId !== null)
    .reduce((sum, o) => sum + Math.floor(o.totalAmount * 0.5), 0);
  const allWithdrawals = await db.select().from(withdrawalsTable);
  const adminWithdrawalsTotal = allWithdrawals
    .filter(w => w.isAdmin && w.status === "paid")
    .reduce((sum, w) => sum + w.amount, 0);
  const allDeposits = await db.select().from(adminDepositsTable);
  const adminDepositsTotal = allDeposits.reduce((sum, d) => sum + d.amount, 0);
  const availableBalance = Math.max(0, totalRevenue - merchantCommissionsTotal + adminDepositsTotal - adminWithdrawalsTotal);

  if (parsed.data.amount > availableBalance) {
    return res.status(400).json({
      error: `Solde insuffisant. Solde disponible : ${availableBalance} FCFA`,
      availableBalance,
    });
  }

  // Enregistrer le retrait directement comme payé (retrait manuel, pas via MoMo)
  const [withdrawal] = await db.insert(withdrawalsTable).values({
    merchantId: null,
    isAdmin: true,
    operator: "mtn",
    amount: parsed.data.amount,
    withdrawalPhone: parsed.data.note ?? "retrait-manuel",
    status: "paid",
  }).returning();

  logger.info({ withdrawalId: withdrawal.id, amount: withdrawal.amount }, "Admin manual withdrawal");
  return res.status(201).json(withdrawal);
});

// POST /admin/deposit — ajouter des fonds au solde disponible de l'admin
router.post("/admin/deposit", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const schema = z.object({
    amount: z.number().int().positive(),
    note: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides" });

  const [deposit] = await db.insert(adminDepositsTable).values({
    amount: parsed.data.amount,
    note: parsed.data.note ?? null,
  }).returning();

  logger.info({ depositId: deposit.id, amount: deposit.amount }, "Admin deposit created");
  return res.status(201).json(deposit);
});

// GET /admin/deposits — liste des dépôts admin
router.get("/admin/deposits", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });
  const deposits = await db.select().from(adminDepositsTable).orderBy(desc(adminDepositsTable.createdAt));
  return res.json(deposits);
});

export default router;
