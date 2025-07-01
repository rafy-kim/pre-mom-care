import {
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  integer,
  customType,
} from 'drizzle-orm/pg-core'
import { relations } from "drizzle-orm";

const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(3072)' // Dimension from existing DB schema
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
})

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(), // Clerk User ID
  baby_nickname: text("baby_nickname").notNull(),
  dueDate: timestamp("due_date").notNull(),
  gender: text("gender", { enum: ["boy", "girl", "unknown"] }).notNull(),
  relation: text("relation", { enum: ["mother", "father"] }).notNull(),
  membershipTier: text("membership_tier", { 
    enum: ["basic", "premium", "expert"] 
  }).default("basic").notNull(),
  dailyQuestionsUsed: integer("daily_questions_used").default(0).notNull(),
  weeklyQuestionsUsed: integer("weekly_questions_used").default(0).notNull(),
  monthlyQuestionsUsed: integer("monthly_questions_used").default(0).notNull(),
  lastQuestionAt: timestamp("last_question_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  chats: many(chats),
  bookmarks: many(bookmarks),
}));

export const chats = pgTable("chats", {
  id: varchar("id", { length: 256 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(userProfiles, {
    fields: [chats.userId],
    references: [userProfiles.id],
  }),
  messages: many(messages),
}));

export const messages = pgTable("messages", {
  id: varchar("id", { length: 256 }).primaryKey(),
  chatId: varchar("chat_id", { length: 256 })
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  bookmarks: many(bookmarks),
}));

export const documents = pgTable('documents', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  refType: text('ref_type', { enum: ['book', 'youtube', 'paper'] }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  reference: text('reference').notNull(), // Book title or YouTube channel name
  metadata: jsonb('metadata'), // { page: number } or { videoId: string, url:string, seconds: number }
  embedding: vector('embedding'),
})

export const bookmarks = pgTable("bookmarks", {
  id: varchar("id", { length: 256 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  messageId: varchar("message_id", { length: 256 })
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(userProfiles, {
    fields: [bookmarks.userId],
    references: [userProfiles.id],
  }),
  message: one(messages, {
    fields: [bookmarks.messageId],
    references: [messages.id],
  }),
}));