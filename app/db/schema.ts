import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(), // Clerk User ID
  baby_nickname: text("baby_nickname").notNull(),
  dueDate: timestamp("due_date").notNull(),
  gender: text("gender", { enum: ["boy", "girl", "unknown"] }).notNull(),
  relation: text("relation", { enum: ["mother", "father"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}); 