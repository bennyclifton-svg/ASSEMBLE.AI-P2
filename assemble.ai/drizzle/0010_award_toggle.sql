-- Migration: Award Toggle for Consultants and Contractors
-- Links consultants/contractors to the companies master table
-- When a firm is "awarded", they are promoted to the companies master list

-- Add awarded flag and company_id FK to consultants table
ALTER TABLE consultants ADD COLUMN awarded INTEGER DEFAULT 0;
ALTER TABLE consultants ADD COLUMN company_id TEXT REFERENCES companies(id);

-- Add awarded flag and company_id FK to contractors table
ALTER TABLE contractors ADD COLUMN awarded INTEGER DEFAULT 0;
ALTER TABLE contractors ADD COLUMN company_id TEXT REFERENCES companies(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultants_company ON consultants(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contractors_company ON contractors(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consultants_awarded ON consultants(project_id, awarded);
CREATE INDEX IF NOT EXISTS idx_contractors_awarded ON contractors(project_id, awarded);
