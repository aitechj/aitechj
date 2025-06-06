import { pgTable, serial, varchar, text, timestamp, boolean, integer, uuid, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions'),
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

export const mediaFiles = pgTable('media_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  storageUrl: text('storage_url').notNull(),
  altText: text('alt_text'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uploaderIdx: index('media_files_uploader_idx').on(table.uploadedBy, table.createdAt),
}));

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  difficultyLevel: integer('difficulty_level').notNull(),
  category: varchar('category', { length: 100 }),
  prerequisites: jsonb('prerequisites'),
  estimatedTime: integer('estimated_time'),
  metaTitle: varchar('meta_title', { length: 60 }),
  metaDescription: varchar('meta_description', { length: 160 }),
  slug: varchar('slug', { length: 255 }).unique(),
  featuredImage: uuid('featured_image').references(() => mediaFiles.id),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  categoryIdx: index('topics_category_idx').on(table.category),
  difficultyIdx: index('topics_difficulty_idx').on(table.difficultyLevel),
  slugIdx: index('topics_slug_idx').on(table.slug),
  tagsIdx: index('topics_tags_idx').on(table.tags),
  categoryDifficultyIdx: index('topics_category_difficulty_idx').on(table.category, table.difficultyLevel),
}));

export const sections = pgTable('sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  orderIndex: integer('order_index'),
  status: varchar('status', { length: 50 }).default('draft'),
  publishAt: timestamp('publish_at'),
  metaTitle: varchar('meta_title', { length: 60 }),
  metaDescription: varchar('meta_description', { length: 160 }),
  readingTime: integer('reading_time'),
  versionNumber: integer('version_number').default(1),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  topicOrderIdx: index('sections_topic_order_idx').on(table.topicId, table.orderIndex),
  statusIdx: index('sections_status_idx').on(table.status),
  publishAtIdx: index('sections_publish_at_idx').on(table.publishAt),
}));

export const contentVersions = pgTable('content_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  versionNumber: integer('version_number').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sectionVersionIdx: index('content_versions_section_idx').on(table.sectionId, table.versionNumber),
}));

export const contentReviews = pgTable('content_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  status: varchar('status', { length: 50 }).default('pending'),
  comments: text('comments'),
  automatedChecks: jsonb('automated_checks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  sectionStatusIdx: index('content_reviews_section_idx').on(table.sectionId, table.status),
  reviewerIdx: index('content_reviews_reviewer_idx').on(table.reviewerId, table.createdAt),
}));

export const reviewAssignments = pgTable('review_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'cascade' }).notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id),
  assignedBy: uuid('assigned_by').references(() => users.id),
  status: varchar('status', { length: 50 }).default('assigned'),
  assignedAt: timestamp('assigned_at').defaultNow(),
}, (table) => ({
  assigneeStatusIdx: index('review_assignments_assignee_idx').on(table.assignedTo, table.status),
}));

export const sectionBookmarks = pgTable('section_bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueUserSection: unique().on(table.userId, table.sectionId),
  userBookmarksIdx: index('bookmarks_user_idx').on(table.userId, table.createdAt),
}));

export const achievements = pgTable('achievements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  badgeName: varchar('badge_name', { length: 100 }).notNull(),
  badgeDescription: text('badge_description'),
  badgeIcon: varchar('badge_icon', { length: 255 }),
  awardedAt: timestamp('awarded_at').defaultNow(),
}, (table) => ({
  userAchievementsIdx: index('achievements_user_idx').on(table.userId, table.awardedAt),
}));

export const userProgress = pgTable('user_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'cascade' }).notNull(),
  completedAt: timestamp('completed_at'),
  timeSpent: integer('time_spent'),
  score: integer('score'),
}, (table) => ({
  uniqueUserSection: unique().on(table.userId, table.sectionId),
  userProgressIdx: index('user_progress_user_idx').on(table.userId),
  sectionProgressIdx: index('user_progress_section_idx').on(table.sectionId),
}));

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull(),
  threadId: uuid('thread_id').defaultRandom().notNull(),
  messages: jsonb('messages'),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueUserConversation: unique().on(table.userId, table.conversationId),
  userConversationsIdx: index('ai_conversations_user_idx').on(table.userId),
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
  userSubscriptionsIdx: index('subscriptions_user_idx').on(table.userId),
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
  bookmarks: many(sectionBookmarks),
  achievements: many(achievements),
  uploadedMedia: many(mediaFiles),
  contentVersions: many(contentVersions),
  reviews: many(contentReviews),
  assignedReviews: many(reviewAssignments, { relationName: 'assignedTo' }),
  createdAssignments: many(reviewAssignments, { relationName: 'assignedBy' }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one, many }) => ({
  uploader: one(users, {
    fields: [mediaFiles.uploadedBy],
    references: [users.id],
  }),
  featuredTopics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  sections: many(sections),
  featuredImage: one(mediaFiles, {
    fields: [topics.featuredImage],
    references: [mediaFiles.id],
  }),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  topic: one(topics, {
    fields: [sections.topicId],
    references: [topics.id],
  }),
  progress: many(userProgress),
  bookmarks: many(sectionBookmarks),
  versions: many(contentVersions),
  reviews: many(contentReviews),
  assignments: many(reviewAssignments),
}));

export const contentVersionsRelations = relations(contentVersions, ({ one }) => ({
  section: one(sections, {
    fields: [contentVersions.sectionId],
    references: [sections.id],
  }),
  createdBy: one(users, {
    fields: [contentVersions.createdBy],
    references: [users.id],
  }),
}));

export const contentReviewsRelations = relations(contentReviews, ({ one }) => ({
  section: one(sections, {
    fields: [contentReviews.sectionId],
    references: [sections.id],
  }),
  reviewer: one(users, {
    fields: [contentReviews.reviewerId],
    references: [users.id],
  }),
}));

export const reviewAssignmentsRelations = relations(reviewAssignments, ({ one }) => ({
  section: one(sections, {
    fields: [reviewAssignments.sectionId],
    references: [sections.id],
  }),
  assignedTo: one(users, {
    fields: [reviewAssignments.assignedTo],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  assignedBy: one(users, {
    fields: [reviewAssignments.assignedBy],
    references: [users.id],
    relationName: 'assignedBy',
  }),
}));

export const sectionBookmarksRelations = relations(sectionBookmarks, ({ one }) => ({
  user: one(users, {
    fields: [sectionBookmarks.userId],
    references: [users.id],
  }),
  section: one(sections, {
    fields: [sectionBookmarks.sectionId],
    references: [sections.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
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
