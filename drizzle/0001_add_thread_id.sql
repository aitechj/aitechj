ALTER TABLE "ai_conversations" ADD COLUMN "thread_id" uuid DEFAULT gen_random_uuid() NOT NULL;
