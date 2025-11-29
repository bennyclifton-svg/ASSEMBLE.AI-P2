CREATE TABLE `consultants` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`company_name` text NOT NULL,
	`contact_person` text,
	`discipline` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`mobile` text,
	`address` text,
	`abn` text,
	`notes` text,
	`shortlisted` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contractors` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`company_name` text NOT NULL,
	`contact_person` text,
	`trade` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`address` text,
	`abn` text,
	`notes` text,
	`shortlisted` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
