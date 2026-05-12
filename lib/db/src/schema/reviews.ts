import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  stars: integer("stars").notNull().default(5),
  message: text("message").notNull(),
  status: reviewStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
