-- Migration: Stakeholder FK Migration
-- Feature 020 - Project Stakeholders
--
-- This migration adds stakeholderId columns to 6 tables that previously used
-- disciplineId/tradeId columns. The old columns are kept temporarily for
-- backward compatibility and will be dropped in a future migration after
-- data has been migrated and verified.
--
-- Tables affected:
-- 1. cost_lines
-- 2. transmittals
-- 3. addenda
-- 4. rft_new
-- 5. evaluations
-- 6. trr

-- Step 1: Add stakeholder_id column to cost_lines
ALTER TABLE cost_lines ADD COLUMN stakeholder_id TEXT REFERENCES project_stakeholders(id);

-- Step 2: Add stakeholder_id column to transmittals
ALTER TABLE transmittals ADD COLUMN stakeholder_id TEXT REFERENCES project_stakeholders(id);

-- Step 3: Add stakeholder_id column to addenda
ALTER TABLE addenda ADD COLUMN stakeholder_id TEXT REFERENCES project_stakeholders(id);

-- Step 4: Add stakeholder_id column to rft_new
ALTER TABLE rft_new ADD COLUMN stakeholder_id TEXT REFERENCES project_stakeholders(id);

-- Step 5: Add stakeholder_id column to evaluations
ALTER TABLE evaluations ADD COLUMN stakeholder_id TEXT REFERENCES project_stakeholders(id);

-- Step 6: Add stakeholder_id column to trr
ALTER TABLE trr ADD COLUMN stakeholder_id TEXT REFERENCES project_stakeholders(id);

-- Note: The old discipline_id and trade_id columns are intentionally kept.
-- They will be dropped in a future migration (0027) after:
-- 1. Code deployment is complete
-- 2. Data migration from old columns to stakeholder_id is verified
-- 3. All existing records have been updated
