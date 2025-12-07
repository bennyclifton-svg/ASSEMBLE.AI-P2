-- Migration: Add discipline/trade support to transmittals
-- This adds projectId, disciplineId, and tradeId columns to enable discipline-based transmittals
-- subcategoryId is made nullable for backwards compatibility

-- Add new columns to transmittals table
ALTER TABLE `transmittals` ADD COLUMN `project_id` text REFERENCES `projects`(`id`);
ALTER TABLE `transmittals` ADD COLUMN `discipline_id` text REFERENCES `consultant_disciplines`(`id`);
ALTER TABLE `transmittals` ADD COLUMN `trade_id` text REFERENCES `contractor_trades`(`id`);

-- Note: SQLite doesn't support dropping NOT NULL constraint directly
-- Existing subcategory-based transmittals will continue to work
-- New discipline-based transmittals will have projectId + disciplineId/tradeId set
