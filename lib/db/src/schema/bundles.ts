import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bundlesTable = pgTable("bundles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dataSize: text("data_size").notNull(),
  validity: integer("validity").notNull(),
  price: integer("price").notNull(),
  operatorId: integer("operator_id").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBundleSchema = createInsertSchema(bundlesTable).omit({ id: true, createdAt: true });
export type InsertBundle = z.infer<typeof insertBundleSchema>;
export type Bundle = typeof bundlesTable.$inferSelect;
