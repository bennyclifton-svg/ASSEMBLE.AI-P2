-- Disable foreign keys for this migration
PRAGMA foreign_keys=off;
--> statement-breakpoint
-- Step 1: Add project_id column as nullable
ALTER TABLE `documents` ADD `project_id` text REFERENCES projects(id);
--> statement-breakpoint
-- Step 2: Set all existing documents to use the default project
UPDATE `documents` SET `project_id` = 'default-project';
--> statement-breakpoint
-- Step 3: Recreate table with NOT NULL constraint (SQLite doesn't support ALTER COLUMN)
CREATE TABLE `documents_new` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`category_id` text,
	`subcategory_id` text,
	`latest_version_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Step 4: Copy data from old table to new table with explicit column order
INSERT INTO `documents_new` (`id`, `category_id`, `subcategory_id`, `latest_version_id`, `created_at`, `updated_at`, `project_id`)
SELECT `id`, `category_id`, `subcategory_id`, `latest_version_id`, `created_at`, `updated_at`, COALESCE(`project_id`, 'default-project')
FROM `documents`;
--> statement-breakpoint
-- Step 5: Drop old table
DROP TABLE `documents`;
--> statement-breakpoint
-- Step 6: Rename new table to original name
ALTER TABLE `documents_new` RENAME TO `documents`;
--> statement-breakpoint
-- Re-enable foreign keys
PRAGMA foreign_keys=on;
