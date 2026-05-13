import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const merchantsTable = pgTable("merchants", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const withdrawalsTable = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").notNull(),
  amount: integer("amount").notNull(),
  withdrawalPhone: text("withdrawal_phone").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Merchant = typeof merchantsTable.$inferSelect;
export type Withdrawal = typeof withdrawalsTable.$inferSelect;
