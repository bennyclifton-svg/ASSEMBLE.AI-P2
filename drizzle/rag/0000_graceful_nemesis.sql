CREATE TABLE "document_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"parent_chunk_id" text,
	"hierarchy_level" integer DEFAULT 0 NOT NULL,
	"hierarchy_path" text,
	"section_title" text,
	"clause_number" text,
	"content" text NOT NULL,
	"embedding" vector(1024),
	"token_count" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_set_members" (
	"id" text PRIMARY KEY NOT NULL,
	"document_set_id" text NOT NULL,
	"document_id" text NOT NULL,
	"sync_status" text DEFAULT 'pending',
	"error_message" text,
	"synced_at" timestamp,
	"chunks_created" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"discipline" text,
	"is_default" boolean DEFAULT false,
	"auto_sync_category_ids" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"report_type" text NOT NULL,
	"discipline" text,
	"approved_toc" jsonb NOT NULL,
	"section_templates" jsonb,
	"times_used" integer DEFAULT 1,
	"success_rate" real,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"section_index" integer NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"source_chunk_ids" text[],
	"source_relevance" jsonb,
	"status" text DEFAULT 'pending',
	"generated_at" timestamp,
	"regeneration_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"document_set_ids" text[] NOT NULL,
	"report_type" text NOT NULL,
	"title" text NOT NULL,
	"discipline" text,
	"table_of_contents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft',
	"locked_by" text,
	"locked_by_name" text,
	"locked_at" timestamp,
	"graph_state" jsonb,
	"current_section_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "document_set_members" ADD CONSTRAINT "document_set_members_document_set_id_document_sets_id_fk" FOREIGN KEY ("document_set_id") REFERENCES "public"."document_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_report_id_report_templates_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunks_document" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_parent" ON "document_chunks" USING btree ("parent_chunk_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_hierarchy" ON "document_chunks" USING btree ("hierarchy_level","hierarchy_path");--> statement-breakpoint
CREATE INDEX "idx_set_members_status" ON "document_set_members" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_set_members_document" ON "document_set_members" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_set_members_unique" ON "document_set_members" USING btree ("document_set_id","document_id");--> statement-breakpoint
CREATE INDEX "idx_document_sets_project" ON "document_sets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_memory_org" ON "report_memory" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_memory_lookup" ON "report_memory" USING btree ("organization_id","report_type","discipline");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memory_unique" ON "report_memory" USING btree ("organization_id","report_type","discipline");--> statement-breakpoint
CREATE INDEX "idx_sections_report" ON "report_sections" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_sections_status" ON "report_sections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sections_unique" ON "report_sections" USING btree ("report_id","section_index");--> statement-breakpoint
CREATE INDEX "idx_reports_project" ON "report_templates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_reports_status" ON "report_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reports_locked" ON "report_templates" USING btree ("locked_by");