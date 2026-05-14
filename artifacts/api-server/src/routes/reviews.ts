import { Router } from "express";
import { db, reviewsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Apashash28@";

const router = Router();

function isAdminRequest(req: any): boolean {
  return req.headers["x-admin-key"] === ADMIN_PASSWORD;
}

const reviewInput = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(30),
  stars: z.number().int().min(1).max(5).default(5),
  message: z.string().min(1).max(500),
});

// Public: submit a review (goes to pending)
router.post("/reviews", async (req, res) => {
  const parsed = reviewInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });

  const { name, phone, stars, message } = parsed.data;
  const [review] = await db.insert(reviewsTable).values({ name, phone, stars, message, status: "pending" }).returning();
  return res.status(201).json(review);
});

// Public: get only approved reviews
router.get("/reviews", async (req, res) => {
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.status, "approved"))
    .orderBy(desc(reviewsTable.createdAt));
  return res.json(rows);
});

// Admin: get all reviews (with optional status filter)
router.get("/admin/reviews", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const status = req.query.status as string | undefined;
  let rows;
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    rows = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.status, status as any))
      .orderBy(desc(reviewsTable.createdAt));
  } else {
    rows = await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  }
  return res.json(rows);
});

// Admin: create a review directly (statut approuvé par défaut)
router.post("/admin/reviews", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const schema = z.object({
    name: z.string().min(1).max(100),
    phone: z.string().min(1).max(30),
    stars: z.number().int().min(1).max(5).default(5),
    message: z.string().min(1).max(500),
    status: z.enum(["pending", "approved", "rejected"]).default("approved"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });

  const [review] = await db.insert(reviewsTable).values(parsed.data).returning();
  return res.status(201).json(review);
});

// Admin: approve or reject a review (status only)
router.patch("/admin/reviews/:id", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({ status: z.enum(["approved", "rejected", "pending"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Statut invalide" });

  const [updated] = await db
    .update(reviewsTable)
    .set({ status: parsed.data.status })
    .where(eq(reviewsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Avis introuvable" });
  return res.json(updated);
});

// Admin: full edit of a review (name, phone, stars, message, status)
router.put("/admin/reviews/:id", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().min(1).max(30).optional(),
    stars: z.number().int().min(1).max(5).optional(),
    message: z.string().min(1).max(500).optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });

  const fields = parsed.data;
  if (Object.keys(fields).length === 0) return res.status(400).json({ error: "Aucune donnée à modifier" });

  const [updated] = await db
    .update(reviewsTable)
    .set(fields)
    .where(eq(reviewsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Avis introuvable" });
  return res.json(updated);
});

// Admin: delete a review
router.delete("/admin/reviews/:id", async (req, res) => {
  if (!isAdminRequest(req)) return res.status(403).json({ error: "Accès refusé" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

  const [deleted] = await db
    .delete(reviewsTable)
    .where(eq(reviewsTable.id, id))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Avis introuvable" });
  return res.json({ success: true });
});

export default router;
