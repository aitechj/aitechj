ALTER TABLE "users" ADD COLUMN "name" varchar(255) NOT NULL DEFAULT '';

UPDATE "users" SET "name" = 'User' WHERE "name" = '';

ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;
