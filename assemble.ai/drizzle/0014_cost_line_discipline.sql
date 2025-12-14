-- Migration 0014: Replace company_id with discipline_id in cost_lines
-- Feature 006 - Cost Planning: Use Discipline instead of Company

-- SQLite doesn't support DROP COLUMN directly, so we need to:
-- 1. Add the new discipline_id column
-- 2. Leave company_id as-is (can be cleaned up later with table rebuild if needed)

-- Add discipline_id column to cost_lines
ALTER TABLE cost_lines ADD COLUMN discipline_id TEXT REFERENCES consultant_disciplines(id);

-- Create index for discipline lookups
CREATE INDEX IF NOT EXISTS idx_cost_lines_discipline ON cost_lines(discipline_id) WHERE deleted_at IS NULL;
