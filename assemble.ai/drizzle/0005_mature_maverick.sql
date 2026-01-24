CREATE TABLE `addenda` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`discipline_id` text,
	`trade_id` text,
	`addendum_number` integer NOT NULL,
	`content` text,
	`addendum_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discipline_id`) REFERENCES `consultant_disciplines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trade_id`) REFERENCES `contractor_trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `addendum_transmittals` (
	`id` text PRIMARY KEY NOT NULL,
	`addendum_id` text NOT NULL,
	`document_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`addendum_id`) REFERENCES `addenda`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`abn` text,
	`contact_name` text,
	`contact_email` text,
	`contact_phone` text,
	`address` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `cost_line_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`cost_line_id` text NOT NULL,
	`fiscal_year` integer NOT NULL,
	`amount_cents` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`cost_line_id`) REFERENCES `cost_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cost_line_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`cost_line_id` text NOT NULL,
	`column_key` text NOT NULL,
	`comment_text` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	FOREIGN KEY (`cost_line_id`) REFERENCES `cost_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cost_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`discipline_id` text,
	`trade_id` text,
	`section` text NOT NULL,
	`cost_code` text,
	`activity` text NOT NULL,
	`reference` text,
	`budget_cents` integer DEFAULT 0,
	`approved_contract_cents` integer DEFAULT 0,
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discipline_id`) REFERENCES `consultant_disciplines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trade_id`) REFERENCES `contractor_trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `discipline_fee_items` (
	`id` text PRIMARY KEY NOT NULL,
	`discipline_id` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`discipline_id`) REFERENCES `consultant_disciplines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evaluation_cells` (
	`id` text PRIMARY KEY NOT NULL,
	`row_id` text NOT NULL,
	`firm_id` text NOT NULL,
	`firm_type` text NOT NULL,
	`amount_cents` integer DEFAULT 0,
	`source` text DEFAULT 'manual',
	`confidence` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`row_id`) REFERENCES `evaluation_rows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `evaluation_non_price_cells` (
	`id` text PRIMARY KEY NOT NULL,
	`criteria_id` text NOT NULL,
	`firm_id` text NOT NULL,
	`firm_type` text NOT NULL,
	`extracted_content` text,
	`quality_rating` text,
	`user_edited_content` text,
	`user_edited_rating` text,
	`source` text DEFAULT 'manual',
	`confidence` integer,
	`source_chunks` text,
	`source_submission_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`criteria_id`) REFERENCES `evaluation_non_price_criteria`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_submission_id`) REFERENCES `tender_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evaluation_non_price_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`evaluation_id` text NOT NULL,
	`criteria_key` text NOT NULL,
	`criteria_label` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `evaluation_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`evaluation_id` text NOT NULL,
	`table_type` text NOT NULL,
	`description` text NOT NULL,
	`order_index` integer NOT NULL,
	`is_system_row` integer DEFAULT false,
	`cost_line_id` text,
	`source` text DEFAULT 'cost_plan',
	`source_submission_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cost_line_id`) REFERENCES `cost_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_submission_id`) REFERENCES `tender_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`discipline_id` text,
	`trade_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discipline_id`) REFERENCES `consultant_disciplines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trade_id`) REFERENCES `contractor_trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `import_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`template_name` text NOT NULL,
	`column_mappings` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`cost_line_id` text,
	`variation_id` text,
	`company_id` text,
	`file_asset_id` text,
	`invoice_date` text NOT NULL,
	`po_number` text,
	`invoice_number` text NOT NULL,
	`description` text,
	`amount_cents` integer NOT NULL,
	`gst_cents` integer DEFAULT 0,
	`period_year` integer NOT NULL,
	`period_month` integer NOT NULL,
	`paid_status` text DEFAULT 'unpaid',
	`paid_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cost_line_id`) REFERENCES `cost_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variation_id`) REFERENCES `variations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`file_asset_id`) REFERENCES `file_assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `knowledge_libraries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`type` text NOT NULL,
	`document_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `library_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`library_id` text NOT NULL,
	`file_asset_id` text NOT NULL,
	`added_at` integer NOT NULL,
	`added_by` text,
	`sync_status` text DEFAULT 'pending',
	FOREIGN KEY (`library_id`) REFERENCES `knowledge_libraries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_asset_id`) REFERENCES `file_assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `login_attempts_email_unique` ON `login_attempts` (`email`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`default_settings` text DEFAULT '{}',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile_patterns` (
	`id` text PRIMARY KEY NOT NULL,
	`building_class` text NOT NULL,
	`project_type` text NOT NULL,
	`pattern_type` text NOT NULL,
	`pattern_value` text NOT NULL,
	`occurrence_count` integer DEFAULT 1,
	`last_seen` text DEFAULT CURRENT_TIMESTAMP,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `profiler_objectives` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`functional_quality` text NOT NULL,
	`planning_compliance` text NOT NULL,
	`profile_context` text,
	`generated_at` text,
	`polished_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `program_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`collapsed` integer DEFAULT false,
	`color` text,
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `program_dependencies` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`from_activity_id` text NOT NULL,
	`to_activity_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_activity_id`) REFERENCES `program_activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_activity_id`) REFERENCES `program_activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `program_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`activity_id`) REFERENCES `program_activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`building_class` text NOT NULL,
	`project_type_v2` text NOT NULL,
	`subclass` text NOT NULL,
	`subclass_other` text,
	`scale_data` text NOT NULL,
	`complexity` text NOT NULL,
	`complexity_score` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`snapshot_name` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`snapshot_data` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_stakeholders` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`company_id` text,
	`stakeholder_group` text NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`organization` text,
	`contact_name` text,
	`contact_email` text,
	`contact_phone` text,
	`discipline_or_trade` text,
	`is_enabled` integer DEFAULT true,
	`brief_services` text,
	`brief_fee` text,
	`brief_program` text,
	`scope_works` text,
	`scope_price` text,
	`scope_program` text,
	`submission_ref` text,
	`submission_type` text,
	`sort_order` integer DEFAULT 0,
	`notes` text,
	`is_ai_generated` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `rft_new` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`discipline_id` text,
	`trade_id` text,
	`rft_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discipline_id`) REFERENCES `consultant_disciplines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trade_id`) REFERENCES `contractor_trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rft_new_transmittals` (
	`id` text PRIMARY KEY NOT NULL,
	`rft_new_id` text NOT NULL,
	`document_id` text NOT NULL,
	`added_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`rft_new_id`) REFERENCES `rft_new`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `stakeholder_submission_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`stakeholder_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_at` text,
	`submission_ref` text,
	`response_due` text,
	`response_received_at` text,
	`response_notes` text,
	`conditions` text,
	`conditions_cleared` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`stakeholder_id`) REFERENCES `project_stakeholders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stakeholder_tender_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`stakeholder_id` text NOT NULL,
	`status_type` text NOT NULL,
	`is_active` integer DEFAULT false,
	`is_complete` integer DEFAULT false,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`stakeholder_id`) REFERENCES `project_stakeholders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`polar_subscription_id` text,
	`polar_customer_id` text,
	`status` text NOT NULL,
	`plan_id` text NOT NULL,
	`current_period_start` integer,
	`current_period_end` integer,
	`canceled_at` integer,
	`cancel_at_period_end` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_polar_subscription_id_unique` ON `subscriptions` (`polar_subscription_id`);--> statement-breakpoint
CREATE TABLE `tender_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`evaluation_id` text NOT NULL,
	`firm_id` text NOT NULL,
	`firm_type` text NOT NULL,
	`filename` text NOT NULL,
	`file_asset_id` text,
	`parsed_at` text DEFAULT CURRENT_TIMESTAMP,
	`parser_used` text DEFAULT 'claude',
	`confidence` integer,
	`raw_extracted_items` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_asset_id`) REFERENCES `file_assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trade_price_items` (
	`id` text PRIMARY KEY NOT NULL,
	`trade_id` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`trade_id`) REFERENCES `contractor_trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trr` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`discipline_id` text,
	`trade_id` text,
	`executive_summary` text,
	`clarifications` text,
	`recommendation` text,
	`report_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discipline_id`) REFERENCES `consultant_disciplines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trade_id`) REFERENCES `contractor_trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trr_transmittals` (
	`id` text PRIMARY KEY NOT NULL,
	`trr_id` text NOT NULL,
	`document_id` text NOT NULL,
	`added_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`trr_id`) REFERENCES `trr`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`organization_id` text,
	`polar_customer_id` text,
	`subscription_status` text DEFAULT 'free',
	`subscription_plan_id` text,
	`subscription_ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `variations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`cost_line_id` text,
	`variation_number` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'Forecast',
	`amount_forecast_cents` integer DEFAULT 0,
	`amount_approved_cents` integer DEFAULT 0,
	`date_submitted` text,
	`date_approved` text,
	`requested_by` text,
	`approved_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cost_line_id`) REFERENCES `cost_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transmittals` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`subcategory_id` text,
	`discipline_id` text,
	`trade_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'DRAFT',
	`issued_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discipline_id`) REFERENCES `consultant_disciplines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trade_id`) REFERENCES `contractor_trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transmittals`("id", "project_id", "subcategory_id", "discipline_id", "trade_id", "name", "status", "issued_at", "updated_at", "created_at") SELECT "id", "project_id", "subcategory_id", "discipline_id", "trade_id", "name", "status", "issued_at", "updated_at", "created_at" FROM `transmittals`;--> statement-breakpoint
DROP TABLE `transmittals`;--> statement-breakpoint
ALTER TABLE `__new_transmittals` RENAME TO `transmittals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `consultant_disciplines` ADD `brief_services` text;--> statement-breakpoint
ALTER TABLE `consultant_disciplines` ADD `brief_deliverables` text;--> statement-breakpoint
ALTER TABLE `consultant_disciplines` ADD `brief_fee` text;--> statement-breakpoint
ALTER TABLE `consultant_disciplines` ADD `brief_program` text;--> statement-breakpoint
ALTER TABLE `consultants` ADD `awarded` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `consultants` ADD `company_id` text REFERENCES companies(id);--> statement-breakpoint
ALTER TABLE `contractor_trades` ADD `scope_works` text;--> statement-breakpoint
ALTER TABLE `contractor_trades` ADD `scope_deliverables` text;--> statement-breakpoint
ALTER TABLE `contractor_trades` ADD `scope_price` text;--> statement-breakpoint
ALTER TABLE `contractor_trades` ADD `scope_program` text;--> statement-breakpoint
ALTER TABLE `contractors` ADD `awarded` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `contractors` ADD `company_id` text REFERENCES companies(id);--> statement-breakpoint
ALTER TABLE `project_objectives` ADD `question_answers` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `organization_id` text REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `projects` ADD `current_report_month` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `revision` text DEFAULT 'REV A';--> statement-breakpoint
ALTER TABLE `projects` ADD `currency_code` text DEFAULT 'AUD';--> statement-breakpoint
ALTER TABLE `projects` ADD `show_gst` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `projects` ADD `project_type` text;