-- Migration: Drawing Extraction Feature (PostgreSQL)
-- AI-powered extraction of drawing numbers, names, and revisions from construction documents

-- Add drawing extraction fields to file_assets table
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS drawing_number TEXT;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS drawing_name TEXT;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS drawing_revision TEXT;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS drawing_extraction_status TEXT DEFAULT 'PENDING';
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS drawing_extraction_confidence INTEGER;

-- Add project-level toggle for drawing extraction (default: enabled)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drawing_extraction_enabled BOOLEAN DEFAULT TRUE;

-- Create index for drawing number queries
CREATE INDEX IF NOT EXISTS idx_file_assets_drawing_number ON file_assets(drawing_number);

-- Create index for extraction status queries (for re-processing failed extractions)
CREATE INDEX IF NOT EXISTS idx_file_assets_extraction_status ON file_assets(drawing_extraction_status);
