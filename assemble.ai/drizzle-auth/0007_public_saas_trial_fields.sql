-- Public SaaS trial fields
--
-- Records no-card trial state on the Better Auth-owned user row so new
-- public SaaS signups do not depend on legacy subscription fields.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_started_at" TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_plan_id" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_status" TEXT;

CREATE INDEX IF NOT EXISTS "user_trial_status_idx" ON "user" ("trial_status");
CREATE INDEX IF NOT EXISTS "user_trial_ends_at_idx" ON "user" ("trial_ends_at");
