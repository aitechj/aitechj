ALTER TABLE "users" ADD COLUMN "period_start" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "users" ADD COLUMN "queries_used" integer DEFAULT 0 NOT NULL;

UPDATE "users" SET "period_start" = COALESCE("created_at", now()) WHERE "period_start" IS NULL;

ALTER TABLE "users" ALTER COLUMN "subscription_tier" SET DEFAULT 'free';
UPDATE "users" SET "subscription_tier" = 'free' WHERE "subscription_tier" = 'guest';
