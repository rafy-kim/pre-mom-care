import {
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  integer,
  customType,
  decimal,
  boolean,
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
  subscriptions: many(subscriptions),
  payments: many(payments),
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

// 🎯 토스페이먼츠 결제 시스템 관련 테이블들

// 구독 계획 테이블 (월간/연간 요금제)
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id", { length: 256 }).primaryKey(),
  name: text("name").notNull(), // "Premium Monthly", "Premium Yearly"
  membershipTier: text("membership_tier", { 
    enum: ["premium", "expert"] 
  }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // 가격 (원)
  billingPeriod: text("billing_period", { 
    enum: ["monthly", "yearly"] 
  }).notNull(),
  dailyQuestionLimit: integer("daily_question_limit").notNull(),
  weeklyQuestionLimit: integer("weekly_question_limit").notNull(), 
  monthlyQuestionLimit: integer("monthly_question_limit").notNull(),
  features: jsonb("features").notNull(), // 제공 기능 목록
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 사용자 구독 정보 테이블
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 256 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  planId: varchar("plan_id", { length: 256 })
    .notNull()
    .references(() => subscriptionPlans.id),
  status: text("status", { 
    enum: ["active", "cancelled", "paused", "expired"] 
  }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  tossCustomerKey: text("toss_customer_key"), // 토스페이먼츠 고객 키
  tossBillingKey: text("toss_billing_key"), // 토스페이먼츠 빌링 키 (자동결제용)
  metadata: jsonb("metadata"), // 추가 구독 정보
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 결제 기록 테이블
export const payments = pgTable("payments", {
  id: varchar("id", { length: 256 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id", { length: 256 })
    .references(() => subscriptions.id),
  planId: varchar("plan_id", { length: 256 })
    .notNull()
    .references(() => subscriptionPlans.id),
  tossPaymentKey: text("toss_payment_key").notNull(), // 토스페이먼츠 결제 키
  tossOrderId: text("toss_order_id").notNull(), // 토스페이먼츠 주문 ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(), // 결제 수단 (카드, 가상계좌 등)
  status: text("status", { 
    enum: ["pending", "confirmed", "failed", "cancelled", "refunded"] 
  }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata"), // 토스페이먼츠 응답 전체 저장
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 결제 관련 테이블들의 관계 정의
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
  payments: many(payments),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(userProfiles, {
    fields: [subscriptions.userId],
    references: [userProfiles.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(userProfiles, {
    fields: [payments.userId],
    references: [userProfiles.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [payments.planId],
    references: [subscriptionPlans.id],
  }),
}));