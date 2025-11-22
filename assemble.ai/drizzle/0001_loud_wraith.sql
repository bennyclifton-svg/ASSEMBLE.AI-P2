CREATE TABLE `consultant_disciplines` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`discipline_name` text NOT NULL,
	`is_enabled` integer DEFAULT false,
	`order` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consultant_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`discipline_id` text NOT NULL,
	`status_type` text NOT NULL,
	`is_active` integer DEFAULT false,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`discipline_id`) REFERENCES `consultant_disciplines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contractor_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`trade_id` text NOT NULL,
	`status_type` text NOT NULL,
	`is_active` integer DEFAULT false,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`trade_id`) REFERENCES `contractor_trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contractor_trades` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`trade_name` text NOT NULL,
	`is_enabled` integer DEFAULT false,
	`order` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gis_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`zoning` text,
	`jurisdiction` text,
	`lot_area` integer,
	`raw_data` text,
	`cached_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gis_cache_address_unique` ON `gis_cache` (`address`);--> statement-breakpoint
CREATE TABLE `project_details` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`project_name` text NOT NULL,
	`address` text NOT NULL,
	`legal_address` text,
	`zoning` text,
	`jurisdiction` text,
	`lot_area` integer,
	`number_of_stories` integer,
	`building_class` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_objectives` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`functional` text,
	`quality` text,
	`budget` text,
	`program` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_stages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stage_number` integer NOT NULL,
	`stage_name` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`duration` integer,
	`status` text DEFAULT 'not_started',
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `revision_history` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field_name` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`likelihood` text,
	`impact` text,
	`mitigation` text,
	`status` text DEFAULT 'identified',
	`order` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stakeholders` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`organization` text,
	`email` text,
	`phone` text,
	`order` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
