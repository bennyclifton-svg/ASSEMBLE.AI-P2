ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "privacy_accepted_at" timestamp;
