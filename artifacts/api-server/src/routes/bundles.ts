import { Router } from "express";
import { db, bundlesTable, operatorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/bundles", async (req, res) => {
  const operatorId = req.query.operatorId ? parseInt(req.query.operatorId as string) : undefined;
  const activeParam = req.query.active;
  const active = activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const conditions = [];
  if (operatorId !== undefined && !isNaN(operatorId)) conditions.push(eq(bundlesTable.operatorId, operatorId));
  if (active !== undefined) conditions.push(eq(bundlesTable.active, active));

  const rows = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(bundlesTable.price);

  return res.json(rows);
});

router.post("/bundles", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    dataSize: z.string().min(1),
    validity: z.number().int().positive(),
    price: z.number().int().positive(),
    operatorId: z.number().int().positive(),
    active: z.boolean().optional().default(true),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [bundle] = await db.insert(bundlesTable).values(parsed.data).returning();
  const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, bundle.operatorId)).limit(1);

  return res.status(201).json({
    ...bundle,
    operatorName: operator?.name ?? null,
    operatorSlug: operator?.slug ?? null,
    operatorColor: operator?.color ?? null,
  });
});

router.get("/bundles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

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
    .where(eq(bundlesTable.id, id))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Bundle not found" });
  return res.json(row);
});

router.put("/bundles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const schema = z.object({
    name: z.string().min(1).optional(),
    dataSize: z.string().min(1).optional(),
    validity: z.number().int().positive().optional(),
    price: z.number().int().positive().optional(),
    active: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [bundle] = await db.update(bundlesTable).set(parsed.data).where(eq(bundlesTable.id, id)).returning();
  if (!bundle) return res.status(404).json({ error: "Bundle not found" });

  const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, bundle.operatorId)).limit(1);

  return res.json({
    ...bundle,
    operatorName: operator?.name ?? null,
    operatorSlug: operator?.slug ?? null,
    operatorColor: operator?.color ?? null,
  });
});

router.delete("/bundles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [deleted] = await db.delete(bundlesTable).where(eq(bundlesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Bundle not found" });

  return res.status(204).send();
});

export default router;
