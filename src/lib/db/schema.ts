import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, serial, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').$type<{
    content: string[];
    ai_chat: { max_requests_per_month: number };
    admin_dashboard: boolean;
    user_management: boolean;
  }>(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  roleId: integer('role_id').references(() => userRoles.id),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('guest'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastLogin: timestamp('last_login'),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.roleId),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
}));

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  difficultyLevel: integer('difficulty_level').notNull(),
  category: varchar('category', { length: 100 }),
  prerequisites: jsonb('prerequisites').$type<string[]>(),
  estimatedTime: integer('estimated_time'), // minutes
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  difficultyCheck: 'CHECK (difficulty_level BETWEEN 1 AND 4)',
  categoryIdx: index('topics_category_idx').on(table.category),
  difficultyIdx: index('topics_difficulty_idx').on(table.difficultyLevel),
}));

export const sections = pgTable('sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  orderIndex: integer('order_index'),
  status: varchar('status', { length: 50 }).default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  statusCheck: "CHECK (status IN ('draft', 'review', 'published'))",
  topicOrderIdx: index('sections_topic_order_idx').on(table.topicId, table.orderIndex),
  statusIdx: index('sections_status_idx').on(table.status),
}));

export const userProgress = pgTable('user_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'cascade' }).notNull(),
  completedAt: timestamp('completed_at'),
  timeSpent: integer('time_spent'), // minutes
  score: integer('score'),
}, (table) => ({
  userSectionUnique: unique('user_progress_user_section_unique').on(table.userId, table.sectionId),
  userIdx: index('user_progress_user_idx').on(table.userId),
  sectionIdx: index('user_progress_section_idx').on(table.sectionId),
}));

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull(),
  messages: jsonb('messages').$type<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>(),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userConversationUnique: unique('ai_conversations_user_conversation_unique').on(table.userId, table.conversationId),
  userIdx: index('ai_conversations_user_idx').on(table.userId),
  createdAtIdx: index('ai_conversations_created_at_idx').on(table.createdAt),
}));

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planType: varchar('plan_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  statusCheck: "CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid'))",
  planCheck: "CHECK (plan_type IN ('basic', 'premium'))",
  userIdx: index('subscriptions_user_idx').on(table.userId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
  stripeIdx: index('subscriptions_stripe_idx').on(table.stripeSubscriptionId),
}));

export const userRolesRelations = relations(userRoles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(userRoles, {
    fields: [users.roleId],
    references: [userRoles.id],
  }),
  refreshTokens: many(refreshTokens),
  progress: many(userProgress),
  conversations: many(aiConversations),
  subscriptions: many(subscriptions),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  sections: many(sections),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  topic: one(topics, {
    fields: [sections.topicId],
    references: [topics.id],
  }),
  progress: many(userProgress),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  section: one(sections, {
    fields: [userProgress.sectionId],
    references: [sections.id],
  }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));
