import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createHash, timingSafeEqual } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + process.env.SESSION_SECRET).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  const inputHash = hashPassword(password);
  const inputBuf = Buffer.from(inputHash, "hex");
  const hashBuf = Buffer.from(hash, "hex");
  if (inputBuf.length !== hashBuf.length) return false;
  return timingSafeEqual(inputBuf, hashBuf);
}

function generateToken(userId: number): string {
  const payload = `${userId}:${Date.now()}:${process.env.SESSION_SECRET}`;
  return createHash("sha256").update(payload).digest("hex") + ":" + userId;
}

function getUserIdFromToken(token: string): number | null {
  const parts = token.split(":");
  if (parts.length !== 2) return null;
  const userId = parseInt(parts[1]);
  if (isNaN(userId)) return null;
  return userId;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

router.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const email: string = parsed.data.email;
  const password: string = parsed.data.password;
  const name: string = parsed.data.name;
  const phone: string = parsed.data.phone;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const passwordHash = hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name, phone, role: "user" }).returning();

  const token = generateToken(user.id);
  return res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user.id);
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt },
    token,
  });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  const userId = getUserIdFromToken(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  return res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt });
});

router.post("/auth/logout", async (_req, res) => {
  return res.json({ message: "Logged out" });
});

export { getUserIdFromToken };
export default router;
