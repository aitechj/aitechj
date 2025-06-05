
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"permissions" jsonb,
	CONSTRAINT "user_roles_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role_id" integer,
	"subscription_tier" varchar(50) DEFAULT 'guest',
	"email_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "media_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"file_size" integer,
	"mime_type" varchar(100),
	"storage_url" text NOT NULL,
	"alt_text" text,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"difficulty_level" integer NOT NULL,
	"category" varchar(100),
	"prerequisites" jsonb,
	"estimated_time" integer,
	"meta_title" varchar(60),
	"meta_description" varchar(160),
	"slug" varchar(255),
	"featured_image" uuid,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"order_index" integer,
	"status" varchar(50) DEFAULT 'draft',
	"publish_at" timestamp,
	"meta_title" varchar(60),
	"meta_description" varchar(160),
	"reading_time" integer,
	"version_number" integer DEFAULT 1,
	"summary" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"content" text NOT NULL,
	"version_number" integer NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "content_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"status" varchar(50) DEFAULT 'pending',
	"comments" text,
	"automated_checks" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "review_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"assigned_to" uuid,
	"assigned_by" uuid,
	"status" varchar(50) DEFAULT 'assigned',
	"assigned_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "section_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "section_bookmarks_user_id_section_id_unique" UNIQUE("user_id","section_id")
);

CREATE TABLE IF NOT EXISTS "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_name" varchar(100) NOT NULL,
	"badge_description" text,
	"badge_icon" varchar(255),
	"awarded_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"completed_at" timestamp,
	"time_spent" integer,
	"score" integer,
	CONSTRAINT "user_progress_user_id_section_id_unique" UNIQUE("user_id","section_id")
);

CREATE TABLE IF NOT EXISTS "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" varchar(255) NOT NULL,
	"messages" jsonb,
	"tokens_used" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_conversations_user_id_conversation_id_unique" UNIQUE("user_id","conversation_id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"stripe_subscription_id" varchar(255),
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_role_id_user_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "user_roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "topics" ADD CONSTRAINT "topics_featured_image_media_files_id_fk" FOREIGN KEY ("featured_image") REFERENCES "media_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "sections" ADD CONSTRAINT "sections_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "section_bookmarks" ADD CONSTRAINT "section_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "section_bookmarks" ADD CONSTRAINT "section_bookmarks_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role_id");

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens" ("expires_at");

CREATE INDEX IF NOT EXISTS "media_files_uploader_idx" ON "media_files" ("uploaded_by","created_at");

CREATE INDEX IF NOT EXISTS "topics_category_idx" ON "topics" ("category");
CREATE INDEX IF NOT EXISTS "topics_difficulty_idx" ON "topics" ("difficulty_level");
CREATE INDEX IF NOT EXISTS "topics_slug_idx" ON "topics" ("slug");
CREATE INDEX IF NOT EXISTS "topics_tags_idx" ON "topics" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "topics_category_difficulty_idx" ON "topics" ("category","difficulty_level");

CREATE INDEX IF NOT EXISTS "sections_topic_order_idx" ON "sections" ("topic_id","order_index");
CREATE INDEX IF NOT EXISTS "sections_status_idx" ON "sections" ("status");
CREATE INDEX IF NOT EXISTS "sections_publish_at_idx" ON "sections" ("publish_at");

CREATE INDEX IF NOT EXISTS "content_versions_section_idx" ON "content_versions" ("section_id","version_number");

CREATE INDEX IF NOT EXISTS "content_reviews_section_idx" ON "content_reviews" ("section_id","status");
CREATE INDEX IF NOT EXISTS "content_reviews_reviewer_idx" ON "content_reviews" ("reviewer_id","created_at");

CREATE INDEX IF NOT EXISTS "review_assignments_assignee_idx" ON "review_assignments" ("assigned_to","status");

CREATE INDEX IF NOT EXISTS "bookmarks_user_idx" ON "section_bookmarks" ("user_id","created_at");

CREATE INDEX IF NOT EXISTS "achievements_user_idx" ON "achievements" ("user_id","awarded_at");

CREATE INDEX IF NOT EXISTS "user_progress_user_idx" ON "user_progress" ("user_id");
CREATE INDEX IF NOT EXISTS "user_progress_section_idx" ON "user_progress" ("section_id");

CREATE INDEX IF NOT EXISTS "ai_conversations_user_idx" ON "ai_conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_created_at_idx" ON "ai_conversations" ("created_at");

CREATE INDEX IF NOT EXISTS "subscriptions_user_idx" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_idx" ON "subscriptions" ("stripe_subscription_id");
