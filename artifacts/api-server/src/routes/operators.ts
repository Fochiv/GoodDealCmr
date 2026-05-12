import { Router } from "express";
import { db, operatorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/operators", async (_req, res) => {
  const operators = await db.select().from(operatorsTable).orderBy(operatorsTable.id);
  return res.json(operators);
});

router.get("/operators/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, id)).limit(1);
  if (!operator) return res.status(404).json({ error: "Operator not found" });

  return res.json(operator);
});

export default router;
