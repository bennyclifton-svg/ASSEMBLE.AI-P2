CREATE TABLE "addenda" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"discipline_id" text,
	"trade_id" text,
	"addendum_number" integer NOT NULL,
	"content" text,
	"addendum_date" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "addendum_transmittals" (
	"id" text PRIMARY KEY NOT NULL,
	"addendum_id" text NOT NULL,
	"document_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abn" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "consultant_disciplines" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"discipline_name" text NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"order" integer NOT NULL,
	"brief_services" text,
	"brief_deliverables" text,
	"brief_fee" text,
	"brief_program" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consultant_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"discipline_id" text NOT NULL,
	"status_type" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consultants" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_person" text,
	"discipline" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"mobile" text,
	"address" text,
	"abn" text,
	"notes" text,
	"shortlisted" boolean DEFAULT false,
	"awarded" boolean DEFAULT false,
	"company_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractor_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"trade_id" text NOT NULL,
	"status_type" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractor_trades" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"trade_name" text NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"order" integer NOT NULL,
	"scope_works" text,
	"scope_deliverables" text,
	"scope_price" text,
	"scope_program" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_person" text,
	"trade" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"abn" text,
	"notes" text,
	"shortlisted" boolean DEFAULT false,
	"awarded" boolean DEFAULT false,
	"company_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cost_line_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"cost_line_id" text NOT NULL,
	"fiscal_year" integer NOT NULL,
	"amount_cents" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cost_line_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"cost_line_id" text NOT NULL,
	"column_key" text NOT NULL,
	"comment_text" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cost_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"discipline_id" text,
	"trade_id" text,
	"section" text NOT NULL,
	"cost_code" text,
	"activity" text NOT NULL,
	"reference" text,
	"budget_cents" integer DEFAULT 0,
	"approved_contract_cents" integer DEFAULT 0,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "discipline_fee_items" (
	"id" text PRIMARY KEY NOT NULL,
	"discipline_id" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"category_id" text,
	"subcategory_id" text,
	"latest_version_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluation_cells" (
	"id" text PRIMARY KEY NOT NULL,
	"row_id" text NOT NULL,
	"firm_id" text NOT NULL,
	"firm_type" text NOT NULL,
	"amount_cents" integer DEFAULT 0,
	"source" text DEFAULT 'manual',
	"confidence" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluation_non_price_cells" (
	"id" text PRIMARY KEY NOT NULL,
	"criteria_id" text NOT NULL,
	"firm_id" text NOT NULL,
	"firm_type" text NOT NULL,
	"extracted_content" text,
	"quality_rating" text,
	"user_edited_content" text,
	"user_edited_rating" text,
	"source" text DEFAULT 'manual',
	"confidence" integer,
	"source_chunks" text,
	"source_submission_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluation_non_price_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"evaluation_id" text NOT NULL,
	"criteria_key" text NOT NULL,
	"criteria_label" text NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluation_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"evaluation_id" text NOT NULL,
	"table_type" text NOT NULL,
	"description" text NOT NULL,
	"order_index" integer NOT NULL,
	"is_system_row" boolean DEFAULT false,
	"cost_line_id" text,
	"source" text DEFAULT 'cost_plan',
	"source_submission_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"discipline_id" text,
	"trade_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "file_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"hash" text NOT NULL,
	"ocr_status" text DEFAULT 'PENDING',
	"ocr_text" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gis_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"zoning" text,
	"jurisdiction" text,
	"lot_area" integer,
	"raw_data" text,
	"cached_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "gis_cache_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "import_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"template_name" text NOT NULL,
	"column_mappings" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"cost_line_id" text,
	"variation_id" text,
	"company_id" text,
	"file_asset_id" text,
	"invoice_date" text NOT NULL,
	"po_number" text,
	"invoice_number" text NOT NULL,
	"description" text,
	"amount_cents" integer NOT NULL,
	"gst_cents" integer DEFAULT 0,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"paid_status" text DEFAULT 'unpaid',
	"paid_date" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "knowledge_libraries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"document_count" integer DEFAULT 0 NOT NULL,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"library_id" text NOT NULL,
	"file_asset_id" text NOT NULL,
	"added_at" integer NOT NULL,
	"added_by" text,
	"sync_status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" integer,
	"updated_at" integer NOT NULL,
	CONSTRAINT "login_attempts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"default_settings" text DEFAULT '{}',
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"start_date" text,
	"end_date" text,
	"collapsed" boolean DEFAULT false,
	"color" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "program_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"from_activity_id" text NOT NULL,
	"to_activity_id" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "program_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_details" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"project_name" text NOT NULL,
	"address" text NOT NULL,
	"legal_address" text,
	"zoning" text,
	"jurisdiction" text,
	"lot_area" integer,
	"number_of_stories" integer,
	"building_class" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"functional" text,
	"quality" text,
	"budget" text,
	"program" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"snapshot_name" text NOT NULL,
	"snapshot_date" text NOT NULL,
	"snapshot_data" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"stage_number" integer NOT NULL,
	"stage_name" text NOT NULL,
	"start_date" text,
	"end_date" text,
	"duration" integer,
	"status" text DEFAULT 'not_started',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"status" text DEFAULT 'active',
	"organization_id" text,
	"current_report_month" text,
	"revision" text DEFAULT 'REV A',
	"currency_code" text DEFAULT 'AUD',
	"show_gst" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "revision_history" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rft_new" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"discipline_id" text,
	"trade_id" text,
	"rft_date" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rft_new_transmittals" (
	"id" text PRIMARY KEY NOT NULL,
	"rft_new_id" text NOT NULL,
	"document_id" text NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"likelihood" text,
	"impact" text,
	"mitigation" text,
	"status" text DEFAULT 'identified',
	"order" integer NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" integer NOT NULL,
	"created_at" integer NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "stakeholders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"organization" text,
	"email" text,
	"phone" text,
	"order" integer NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"polar_subscription_id" text,
	"polar_customer_id" text,
	"status" text NOT NULL,
	"plan_id" text NOT NULL,
	"current_period_start" integer,
	"current_period_end" integer,
	"canceled_at" integer,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "subscriptions_polar_subscription_id_unique" UNIQUE("polar_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "tender_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"evaluation_id" text NOT NULL,
	"firm_id" text NOT NULL,
	"firm_type" text NOT NULL,
	"filename" text NOT NULL,
	"file_asset_id" text,
	"parsed_at" timestamp DEFAULT now(),
	"parser_used" text DEFAULT 'claude',
	"confidence" integer,
	"raw_extracted_items" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trade_price_items" (
	"id" text PRIMARY KEY NOT NULL,
	"trade_id" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transmittal_items" (
	"id" text PRIMARY KEY NOT NULL,
	"transmittal_id" text NOT NULL,
	"version_id" text NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transmittals" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"subcategory_id" text,
	"discipline_id" text,
	"trade_id" text,
	"name" text NOT NULL,
	"status" text DEFAULT 'DRAFT',
	"issued_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trr" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"discipline_id" text,
	"trade_id" text,
	"executive_summary" text,
	"clarifications" text,
	"recommendation" text,
	"report_date" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trr_transmittals" (
	"id" text PRIMARY KEY NOT NULL,
	"trr_id" text NOT NULL,
	"document_id" text NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"organization_id" text,
	"polar_customer_id" text,
	"subscription_status" text DEFAULT 'free',
	"subscription_plan_id" text,
	"subscription_ends_at" integer,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "variations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"cost_line_id" text,
	"variation_number" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'Forecast',
	"amount_forecast_cents" integer DEFAULT 0,
	"amount_approved_cents" integer DEFAULT 0,
	"date_submitted" text,
	"date_approved" text,
	"requested_by" text,
	"approved_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"file_asset_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"uploaded_by" text DEFAULT 'User',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "addenda" ADD CONSTRAINT "addenda_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addenda" ADD CONSTRAINT "addenda_discipline_id_consultant_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."consultant_disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addenda" ADD CONSTRAINT "addenda_trade_id_contractor_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."contractor_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addendum_transmittals" ADD CONSTRAINT "addendum_transmittals_addendum_id_addenda_id_fk" FOREIGN KEY ("addendum_id") REFERENCES "public"."addenda"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addendum_transmittals" ADD CONSTRAINT "addendum_transmittals_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultant_disciplines" ADD CONSTRAINT "consultant_disciplines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultant_statuses" ADD CONSTRAINT "consultant_statuses_discipline_id_consultant_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."consultant_disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultants" ADD CONSTRAINT "consultants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultants" ADD CONSTRAINT "consultants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_statuses" ADD CONSTRAINT "contractor_statuses_trade_id_contractor_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."contractor_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_trades" ADD CONSTRAINT "contractor_trades_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_line_allocations" ADD CONSTRAINT "cost_line_allocations_cost_line_id_cost_lines_id_fk" FOREIGN KEY ("cost_line_id") REFERENCES "public"."cost_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_line_comments" ADD CONSTRAINT "cost_line_comments_cost_line_id_cost_lines_id_fk" FOREIGN KEY ("cost_line_id") REFERENCES "public"."cost_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD CONSTRAINT "cost_lines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD CONSTRAINT "cost_lines_discipline_id_consultant_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."consultant_disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD CONSTRAINT "cost_lines_trade_id_contractor_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."contractor_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipline_fee_items" ADD CONSTRAINT "discipline_fee_items_discipline_id_consultant_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."consultant_disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_cells" ADD CONSTRAINT "evaluation_cells_row_id_evaluation_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."evaluation_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_non_price_cells" ADD CONSTRAINT "evaluation_non_price_cells_criteria_id_evaluation_non_price_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."evaluation_non_price_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_non_price_cells" ADD CONSTRAINT "evaluation_non_price_cells_source_submission_id_tender_submissions_id_fk" FOREIGN KEY ("source_submission_id") REFERENCES "public"."tender_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_non_price_criteria" ADD CONSTRAINT "evaluation_non_price_criteria_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_rows" ADD CONSTRAINT "evaluation_rows_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_rows" ADD CONSTRAINT "evaluation_rows_cost_line_id_cost_lines_id_fk" FOREIGN KEY ("cost_line_id") REFERENCES "public"."cost_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_rows" ADD CONSTRAINT "evaluation_rows_source_submission_id_tender_submissions_id_fk" FOREIGN KEY ("source_submission_id") REFERENCES "public"."tender_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_discipline_id_consultant_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."consultant_disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_trade_id_contractor_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."contractor_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cost_line_id_cost_lines_id_fk" FOREIGN KEY ("cost_line_id") REFERENCES "public"."cost_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_variation_id_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_file_asset_id_file_assets_id_fk" FOREIGN KEY ("file_asset_id") REFERENCES "public"."file_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_libraries" ADD CONSTRAINT "knowledge_libraries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_documents" ADD CONSTRAINT "library_documents_library_id_knowledge_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."knowledge_libraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_documents" ADD CONSTRAINT "library_documents_file_asset_id_file_assets_id_fk" FOREIGN KEY ("file_asset_id") REFERENCES "public"."file_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_documents" ADD CONSTRAINT "library_documents_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_activities" ADD CONSTRAINT "program_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_dependencies" ADD CONSTRAINT "program_dependencies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_dependencies" ADD CONSTRAINT "program_dependencies_from_activity_id_program_activities_id_fk" FOREIGN KEY ("from_activity_id") REFERENCES "public"."program_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_dependencies" ADD CONSTRAINT "program_dependencies_to_activity_id_program_activities_id_fk" FOREIGN KEY ("to_activity_id") REFERENCES "public"."program_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_milestones" ADD CONSTRAINT "program_milestones_activity_id_program_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."program_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_details" ADD CONSTRAINT "project_details_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_objectives" ADD CONSTRAINT "project_objectives_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_history" ADD CONSTRAINT "revision_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rft_new" ADD CONSTRAINT "rft_new_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rft_new" ADD CONSTRAINT "rft_new_discipline_id_consultant_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."consultant_disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rft_new" ADD CONSTRAINT "rft_new_trade_id_contractor_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."contractor_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rft_new_transmittals" ADD CONSTRAINT "rft_new_transmittals_rft_new_id_rft_new_id_fk" FOREIGN KEY ("rft_new_id") REFERENCES "public"."rft_new"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rft_new_transmittals" ADD CONSTRAINT "rft_new_transmittals_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_submissions" ADD CONSTRAINT "tender_submissions_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_submissions" ADD CONSTRAINT "tender_submissions_file_asset_id_file_assets_id_fk" FOREIGN KEY ("file_asset_id") REFERENCES "public"."file_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_price_items" ADD CONSTRAINT "trade_price_items_trade_id_contractor_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."contractor_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transmittal_items" ADD CONSTRAINT "transmittal_items_transmittal_id_transmittals_id_fk" FOREIGN KEY ("transmittal_id") REFERENCES "public"."transmittals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transmittal_items" ADD CONSTRAINT "transmittal_items_version_id_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transmittals" ADD CONSTRAINT "transmittals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transmittals" ADD CONSTRAINT "transmittals_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transmittals" ADD CONSTRAINT "transmittals_discipline_id_consultant_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."consultant_disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transmittals" ADD CONSTRAINT "transmittals_trade_id_contractor_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."contractor_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trr" ADD CONSTRAINT "trr_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trr" ADD CONSTRAINT "trr_discipline_id_consultant_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."consultant_disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trr" ADD CONSTRAINT "trr_trade_id_contractor_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."contractor_trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trr_transmittals" ADD CONSTRAINT "trr_transmittals_trr_id_trr_id_fk" FOREIGN KEY ("trr_id") REFERENCES "public"."trr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trr_transmittals" ADD CONSTRAINT "trr_transmittals_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_cost_line_id_cost_lines_id_fk" FOREIGN KEY ("cost_line_id") REFERENCES "public"."cost_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_file_asset_id_file_assets_id_fk" FOREIGN KEY ("file_asset_id") REFERENCES "public"."file_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_polar_sub_idx" ON "subscriptions" USING btree ("polar_subscription_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_polar_customer_idx" ON "users" USING btree ("polar_customer_id");