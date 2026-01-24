-- Migration: Add master_stage columns to cost_lines and program_activities
-- Feature: 018-project-initiator - 5 Master Stages Consolidation
-- Date: 2025-12-21

-- Add master_stage column to cost_lines table
ALTER TABLE "cost_lines" ADD COLUMN "master_stage" text;

-- Add master_stage column to program_activities table
ALTER TABLE "program_activities" ADD COLUMN "master_stage" text;

-- Create indexes for filtering by master stage (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS "idx_cost_lines_master_stage" ON "cost_lines" ("master_stage");
CREATE INDEX IF NOT EXISTS "idx_program_activities_master_stage" ON "program_activities" ("master_stage");

-- Add comments for documentation
COMMENT ON COLUMN "cost_lines"."master_stage" IS 'Links cost line to one of 5 master stages: initiation, schematic_design, design_development, procurement, delivery';
COMMENT ON COLUMN "program_activities"."master_stage" IS 'Links program activity to one of 5 master stages: initiation, schematic_design, design_development, procurement, delivery';
