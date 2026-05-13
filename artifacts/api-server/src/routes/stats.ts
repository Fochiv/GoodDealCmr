import { Router } from "express";
import { db, ordersTable, bundlesTable, operatorsTable, usersTable, withdrawalsTable, merchantsTable, adminDepositsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { getUserIdFromToken } from "./auth";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Apashash28@";

const router = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  // Accept X-Admin-Key header (used by the admin panel frontend)
  if (req.headers["x-admin-key"] === ADMIN_PASSWORD) return true;

  // Also accept JWT Bearer token (used by API clients with auth)
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const userId = getUserIdFromToken(auth.slice(7));
    if (userId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (user?.role === "admin") return true;
    }
  }

  res.status(403).json({ error: "Accès refusé" });
  return false;
}

router.get("/stats/revenue", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  const allOrders = await db.select().from(ordersTable);
  // Les commandes "confirmed" ont le paiement déjà encaissé — on les inclut dans les revenus
  const paidList = allOrders.filter(o => o.status === "paid" || o.status === "confirmed");
  const pendingList = allOrders.filter(o => o.status === "pending" || o.status === "processing");
  const totalRevenue = paidList.reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingRevenue = pendingList.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = allOrders.length;
  const paidOrders = paidList.length;

  const operators = await db.select().from(operatorsTable).orderBy(operatorsTable.id);
  const bundles = await db.select().from(bundlesTable);

  const revenueByOperator = operators.map(op => {
    const opBundleIds = new Set(bundles.filter(b => b.operatorId === op.id).map(b => b.id));
    const opOrders = allOrders.filter(o => opBundleIds.has(o.bundleId) && (o.status === "paid" || o.status === "confirmed"));
    return {
      operatorName: op.name,
      revenue: opOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      orders: opOrders.length,
    };
  });

  // Commandes passées via un lien marchand (confirmed ou paid, avec merchantId)
  const merchantOrders = paidList.filter(o => o.merchantId !== null);
  const merchantOrdersRevenue = merchantOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const merchantOrdersCount = merchantOrders.length;

  // Commissions versées aux marchands (50% de chaque commande via marchand)
  const merchantCommissionsTotal = merchantOrders
    .reduce((sum, o) => sum + Math.floor(o.totalAmount * 0.5), 0);

  // Part admin sur les ventes marchands (l'autre 50%)
  const adminMerchantShare = merchantOrders
    .reduce((sum, o) => sum + (o.totalAmount - Math.floor(o.totalAmount * 0.5)), 0);

  // Retraits admin (pending + paid, pas les refusés ni les failed)
  const allWithdrawals = await db.select().from(withdrawalsTable);
  const adminWithdrawalsTotal = allWithdrawals
    .filter(w => w.isAdmin && w.status !== "rejected" && w.status !== "failed")
    .reduce((sum, w) => sum + w.amount, 0);

  // Dépôts admin manuels (crédits externes)
  const allDeposits = await db.select().from(adminDepositsTable);
  const adminDepositsTotal = allDeposits.reduce((sum, d) => sum + d.amount, 0);

  // Solde disponible = revenus + dépôts externes + commissions marchands − retraits admin
  const availableBalance = Math.max(0, totalRevenue + adminDepositsTotal + merchantCommissionsTotal - adminWithdrawalsTotal);

  return res.json({
    totalRevenue,
    pendingRevenue,
    totalOrders,
    paidOrders,
    revenueByOperator,
    merchantOrdersRevenue,
    merchantOrdersCount,
    merchantCommissionsTotal,
    adminMerchantShare,
    adminWithdrawalsTotal,
    adminDepositsTotal,
    availableBalance,
  });
});

router.get("/stats/orders", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  const allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  const recentOrders = allOrders.slice(0, 10);

  const enrichedRecent = await Promise.all(
    recentOrders.map(async (order) => {
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
        .where(eq(bundlesTable.id, order.bundleId))
        .limit(1);
      return { ...order, bundle: row ?? null };
    })
  );

  return res.json({
    total: allOrders.length,
    pending: allOrders.filter(o => o.status === "pending").length,
    paid: allOrders.filter(o => o.status === "paid").length,
    failed: allOrders.filter(o => o.status === "failed").length,
    cancelled: allOrders.filter(o => o.status === "cancelled").length,
    recentOrders: enrichedRecent,
  });
});

router.get("/stats/popular-bundles", async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  const allOrders = await db.select().from(ordersTable).where(eq(ordersTable.status, "paid"));
  const bundleCount: Record<number, { orders: number; revenue: number }> = {};

  for (const order of allOrders) {
    if (!bundleCount[order.bundleId]) bundleCount[order.bundleId] = { orders: 0, revenue: 0 };
    bundleCount[order.bundleId].orders++;
    bundleCount[order.bundleId].revenue += order.totalAmount;
  }

  const bundleIds = Object.keys(bundleCount).map(Number);
  if (bundleIds.length === 0) {
    const allBundles = await db.select({
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
    }).from(bundlesTable).leftJoin(operatorsTable, eq(bundlesTable.operatorId, operatorsTable.id)).limit(6);
    return res.json(allBundles.map(b => ({ bundle: b, totalOrders: 0, totalRevenue: 0 })));
  }

  const results = await Promise.all(
    bundleIds.map(async (bundleId) => {
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
      return {
        bundle: row ?? null,
        totalOrders: bundleCount[bundleId].orders,
        totalRevenue: bundleCount[bundleId].revenue,
      };
    })
  );

  return res.json(results.sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 6));
});

export default router;
