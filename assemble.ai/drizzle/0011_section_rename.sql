-- Migration: Rename PC_ITEMS to CONSTRUCTION
-- Feature 009 - Default Financial Data

-- Update existing cost_lines with PC_ITEMS section to CONSTRUCTION
UPDATE cost_lines SET section = 'CONSTRUCTION', updated_at = CURRENT_TIMESTAMP WHERE section = 'PC_ITEMS';

-- Note: SQLite doesn't support ALTER TABLE for modifying CHECK constraints directly.
-- The schema.ts already defines the new enum values, and Drizzle will handle
-- constraint enforcement at the application layer.
-- For pure SQLite validation, we would need to recreate the table, but since
-- Drizzle handles validation, we only need to update the data.
