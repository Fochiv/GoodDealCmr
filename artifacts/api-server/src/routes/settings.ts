import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const ALLOWED_KEYS = ["whatsapp_number"] as const;
type SettingKey = typeof ALLOWED_KEYS[number];

const DEFAULT_VALUES: Record<SettingKey, string> = {
  whatsapp_number: "237650000000",
};

router.get("/settings", async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = { ...DEFAULT_VALUES };
  for (const row of rows) {
    map[row.key] = row.value;
  }
  res.json(map);
});

router.put("/settings/:key", async (req, res) => {
  const { key } = req.params;
  if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
    res.status(400).json({ error: "Clé de paramètre invalide" });
    return;
  }
  const body = z.object({ value: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Valeur requise" });
    return;
  }
  await db
    .insert(settingsTable)
    .values({ key, value: body.data.value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: body.data.value, updatedAt: new Date() } });
  res.json({ key, value: body.data.value });
});

export default router;
