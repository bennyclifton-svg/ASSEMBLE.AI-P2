-- 0042_phase3x_row_versions.sql
--
-- Phase 3X broad agent write tools need optimistic-locking on every table
-- they can update. Existing rows default to version 1; approval applicators
-- increment the value when an approved mutation is applied.
--
-- Idempotent: safe to re-run.

ALTER TABLE notes ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE variations ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE program_activities ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE program_milestones ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE project_stakeholders ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1;
