ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_reminder_sent_at" timestamp;
CREATE INDEX IF NOT EXISTS "user_trial_reminder_sent_at_idx" ON "user" ("trial_reminder_sent_at");
