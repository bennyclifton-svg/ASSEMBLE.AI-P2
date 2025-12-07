-- Migration: Remove FK constraints from documents table for categoryId and subcategoryId
-- These fields now store string IDs directly (from categories constants and consultant_disciplines/contractor_trades)
-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate the table

-- Step 1: Create new documents table without FK constraints
CREATE TABLE `documents_new` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`category_id` text,
	`subcategory_id` text,
	`latest_version_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Step 2: Copy data from old table to new table
INSERT INTO `documents_new` (`id`, `project_id`, `category_id`, `subcategory_id`, `latest_version_id`, `created_at`, `updated_at`)
SELECT `id`, `project_id`, `category_id`, `subcategory_id`, `latest_version_id`, `created_at`, `updated_at`
FROM `documents`;
--> statement-breakpoint
-- Step 3: Drop old table
DROP TABLE `documents`;
--> statement-breakpoint
-- Step 4: Rename new table to original name
ALTER TABLE `documents_new` RENAME TO `documents`;
