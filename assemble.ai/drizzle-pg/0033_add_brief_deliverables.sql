-- Add briefDeliverables column to project_stakeholders table
-- This column stores the generated/edited deliverables content for RFT service brief

ALTER TABLE "project_stakeholders" ADD COLUMN IF NOT EXISTS "brief_deliverables" text;
