-- Migration 0001: RAG Context Architecture - Global & Project Repos
-- Adds repo_type, organization_id, and is_global columns to document_sets
-- Supports 6 global project type repos + project-scoped repos

-- Add repo_type column (project, due_diligence, house, apartments, fitout, industrial, remediation)
ALTER TABLE "document_sets" ADD COLUMN "repo_type" text DEFAULT 'project';
--> statement-breakpoint

-- Add organization_id column (required for global repos, NULL for project-scoped)
ALTER TABLE "document_sets" ADD COLUMN "organization_id" text;
--> statement-breakpoint

-- Add is_global flag (true for 6 project type repos, false for project-specific)
ALTER TABLE "document_sets" ADD COLUMN "is_global" boolean DEFAULT false;
--> statement-breakpoint

-- Make project_id nullable for global repos (they don't belong to a specific project)
ALTER TABLE "document_sets" ALTER COLUMN "project_id" DROP NOT NULL;
--> statement-breakpoint

-- Index for filtering by repo type
CREATE INDEX "idx_document_sets_repo_type" ON "document_sets" USING btree ("repo_type");
--> statement-breakpoint

-- Index for filtering by organization (for global repos)
CREATE INDEX "idx_document_sets_organization" ON "document_sets" USING btree ("organization_id");
--> statement-breakpoint

-- Index for filtering by is_global flag
CREATE INDEX "idx_document_sets_is_global" ON "document_sets" USING btree ("is_global");
--> statement-breakpoint

-- Unique constraint: only one global repo per organization per repo type
CREATE UNIQUE INDEX "idx_document_sets_global_unique" ON "document_sets" USING btree ("organization_id", "repo_type") WHERE "is_global" = true;
