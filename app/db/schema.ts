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
  dueDate: timestamp("due_date", { mode: 'string' }).notNull(),
  gender: text("gender").notNull(), // enum 제약 제거
  relation: text("relation").notNull(), // enum 제약 제거  
  membershipTier: text("membership_tier").default("basic").notNull(), // enum 제약 제거
  dailyQuestionsUsed: integer("daily_questions_used").default(0).notNull(),
  weeklyQuestionsUsed: integer("weekly_questions_used").default(0).notNull(),
  monthlyQuestionsUsed: integer("monthly_questions_used").default(0).notNull(),
  lastQuestionAt: timestamp("last_question_at", { withTimezone: true, mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
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
  role: text("role").notNull(), // enum 제약 제거
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
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
  refType: text('ref_type').notNull(), // enum 제약 제거
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
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
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

// 🎯 포트원(PortOne) V2 결제 시스템 관련 테이블들

// 구독 계획 테이블 (월간/연간/단건 요금제)
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id", { length: 256 }).primaryKey(),
  name: text("name").notNull(), // "Premium Monthly", "Premium Yearly", "Premium One-time"
  membershipTier: text("membership_tier").notNull(), // enum 제약 제거 (premium, expert)
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // 가격 (원)
  billingPeriod: text("billing_period").notNull(), // enum 제약 제거 (monthly, yearly, one_time)
  dailyQuestionLimit: integer("daily_question_limit").notNull(),
  weeklyQuestionLimit: integer("weekly_question_limit").notNull(), 
  monthlyQuestionLimit: integer("monthly_question_limit").notNull(),
  features: jsonb("features").notNull(), // 제공 기능 목록
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
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
  status: text("status").notNull(), // enum 제약 제거 (active, cancelled, paused, expired)
  startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }).notNull(),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  portoneCustomerKey: text("portone_customer_key"), // 포트원 고객 키
  portoneBillingKey: text("portone_billing_key"), // 포트원 빌링 키 (자동결제용)
  metadata: jsonb("metadata"), // 추가 구독 정보
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
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
  portonePaymentKey: text("portone_payment_key").notNull(), // 포트원 결제 키
  portoneOrderId: text("portone_order_id").notNull(), // 포트원 주문 ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(), // 결제 수단 (카드, 가상계좌 등)
  status: text("status").notNull(), // enum 제약 제거 (pending, confirmed, failed, cancelled, refunded)
  paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
  metadata: jsonb("metadata"), // 포트원 응답 전체 저장
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// 🎯 카드 빌링키 정보 테이블 (보안 및 관리용)
export const cardBillingKeys = pgTable("card_billing_keys", {
  id: varchar("id", { length: 256 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  issueId: text("issue_id").notNull(), // 포트원 빌링키 발급 ID
  billingKey: text("billing_key").notNull(), // 포트원 빌링키
  cardCompany: text("card_company").notNull(), // 카드사
  maskedCardNumber: text("masked_card_number").notNull(), // 마스킹된 카드번호
  status: text("status").default("active").notNull(), // enum 제약 제거 (active, inactive, expired)
  issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
  metadata: jsonb("metadata"), // 추가 빌링키 정보
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// 결제 관련 테이블들의 관계 정의
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
  payments: many(payments),
}));

export const cardBillingKeysRelations = relations(cardBillingKeys, ({ one }) => ({
  user: one(userProfiles, {
    fields: [cardBillingKeys.userId],
    references: [userProfiles.id],
  }),
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