-- Add per-project UI preferences (JSON-as-text). Used by the Notes panel
-- to persist sort field, sort direction, and view mode (tiles/list).
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "ui_preferences" text NOT NULL DEFAULT '{}';
