-- Admin Console Migration (Phase 1)
--
-- Adds operator-admin foundations:
--   1. is_super_admin + suspended_at columns on the user table
--   2. model_settings table (one row per AI feature group)
--   3. admin_audit_log table (append-only log of admin actions)
--
-- All changes are additive. No data is destroyed.
-- Run: psql ... -f drizzle-auth/0002_admin_console.sql
-- Or:  npm run db:auth:push  (drizzle-kit push will diff and apply automatically)

-- ============================================================================
-- 1. USER TABLE — add operator-admin columns
-- ============================================================================

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMP;

-- ============================================================================
-- 2. MODEL_SETTINGS TABLE — runtime AI model registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS "model_settings" (
    "feature_group" TEXT PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_by" TEXT REFERENCES "user"("id") ON DELETE SET NULL
);

-- Seed defaults (mirrors current hardcoded behaviour after the Apr 2026 model swap)
INSERT INTO "model_settings" ("feature_group", "provider", "model_id") VALUES
    ('document_extraction',  'anthropic', 'claude-sonnet-4-6'),
    ('text_extraction',      'anthropic', 'claude-haiku-4-5-20251001'),
    ('cost_line_matching',   'anthropic', 'claude-haiku-4-5-20251001'),
    ('content_generation',   'anthropic', 'claude-sonnet-4-6'),
    ('content_polishing',    'anthropic', 'claude-sonnet-4-6')
ON CONFLICT ("feature_group") DO NOTHING;

-- ============================================================================
-- 3. ADMIN_AUDIT_LOG TABLE — append-only admin action log
-- ============================================================================

CREATE TABLE IF NOT EXISTS "admin_audit_log" (
    "id" TEXT PRIMARY KEY,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "actor_user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "before_json" JSONB,
    "after_json" JSONB
);

CREATE INDEX IF NOT EXISTS "admin_audit_log_created_at_idx" ON "admin_audit_log" ("created_at");
CREATE INDEX IF NOT EXISTS "admin_audit_log_actor_idx"      ON "admin_audit_log" ("actor_user_id");
CREATE INDEX IF NOT EXISTS "admin_audit_log_action_idx"     ON "admin_audit_log" ("action");
