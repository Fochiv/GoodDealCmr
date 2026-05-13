import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

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
  merchantId: integer("merchant_id"),
  isAdmin: boolean("is_admin").notNull().default(false),
  operator: text("operator").notNull().default("mtn"),
  amount: integer("amount").notNull(),
  withdrawalPhone: text("withdrawal_phone").notNull(),
  status: text("status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminDepositsTable = pgTable("admin_deposits", {
  id: serial("id").primaryKey(),
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Merchant = typeof merchantsTable.$inferSelect;
export type Withdrawal = typeof withdrawalsTable.$inferSelect;
export type AdminDeposit = typeof adminDepositsTable.$inferSelect;
