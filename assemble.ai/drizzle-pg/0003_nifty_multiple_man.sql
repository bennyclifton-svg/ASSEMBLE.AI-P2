CREATE TABLE "profile_patterns" (
	"id" text PRIMARY KEY NOT NULL,
	"building_class" text NOT NULL,
	"project_type" text NOT NULL,
	"pattern_type" text NOT NULL,
	"pattern_value" text NOT NULL,
	"occurrence_count" integer DEFAULT 1,
	"last_seen" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "idx_patterns_unique" UNIQUE("building_class","project_type","pattern_type","pattern_value")
);
--> statement-breakpoint
CREATE TABLE "profiler_objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"functional_quality" text NOT NULL,
	"planning_compliance" text NOT NULL,
	"profile_context" text,
	"generated_at" timestamp,
	"polished_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "profiler_objectives_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"building_class" text NOT NULL,
	"project_type_v2" text NOT NULL,
	"subclass" text NOT NULL,
	"subclass_other" text,
	"scale_data" text NOT NULL,
	"complexity" text NOT NULL,
	"complexity_score" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_profiles_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_stakeholders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"company_id" text,
	"stakeholder_group" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"organization" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"discipline_or_trade" text,
	"is_enabled" boolean DEFAULT true,
	"brief_services" text,
	"brief_fee" text,
	"brief_program" text,
	"scope_works" text,
	"scope_price" text,
	"scope_program" text,
	"submission_ref" text,
	"submission_type" text,
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"is_ai_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stakeholder_submission_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"stakeholder_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp,
	"submission_ref" text,
	"response_due" timestamp,
	"response_received_at" timestamp,
	"response_notes" text,
	"conditions" text,
	"conditions_cleared" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "stakeholder_submission_status_unique" UNIQUE("stakeholder_id")
);
--> statement-breakpoint
CREATE TABLE "stakeholder_tender_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"stakeholder_id" text NOT NULL,
	"status_type" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"is_complete" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "stakeholder_tender_status_unique" UNIQUE("stakeholder_id","status_type")
);
--> statement-breakpoint
ALTER TABLE "cost_line_allocations" ALTER COLUMN "amount_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "cost_lines" ALTER COLUMN "budget_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "cost_lines" ALTER COLUMN "approved_contract_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "amount_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "gst_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "variations" ALTER COLUMN "amount_forecast_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "variations" ALTER COLUMN "amount_approved_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "cost_lines" ADD COLUMN "master_stage" text;--> statement-breakpoint
ALTER TABLE "program_activities" ADD COLUMN "master_stage" text;--> statement-breakpoint
ALTER TABLE "profiler_objectives" ADD CONSTRAINT "profiler_objectives_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_submission_statuses" ADD CONSTRAINT "stakeholder_submission_statuses_stakeholder_id_project_stakeholders_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "public"."project_stakeholders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_tender_statuses" ADD CONSTRAINT "stakeholder_tender_statuses_stakeholder_id_project_stakeholders_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "public"."project_stakeholders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_profiles_class_type" ON "project_profiles" USING btree ("building_class","project_type_v2");--> statement-breakpoint
CREATE INDEX "idx_stakeholders_project" ON "project_stakeholders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_stakeholders_group" ON "project_stakeholders" USING btree ("project_id","stakeholder_group");--> statement-breakpoint
CREATE INDEX "idx_stakeholders_company" ON "project_stakeholders" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_submission_statuses_status" ON "stakeholder_submission_statuses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tender_statuses_stakeholder" ON "stakeholder_tender_statuses" USING btree ("stakeholder_id");