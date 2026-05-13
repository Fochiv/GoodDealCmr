import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  bundleId: integer("bundle_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  payerPhone: text("payer_phone"),
  payerName: text("payer_name"),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: integer("total_amount").notNull(),
  transactionId: text("transaction_id"),
  ipAddress: text("ip_address"),
  merchantId: integer("merchant_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
