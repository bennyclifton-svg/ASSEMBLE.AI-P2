-- Migration: 0003_unified_report_editor
-- Phase 11: Unified Report Editor - Request For Tender (RFT)
-- Adds columns for unified editor, Short/Long RFT workflow, and backward compatibility

-- Add new columns to report_templates table
ALTER TABLE report_templates
ADD COLUMN edited_content TEXT,
ADD COLUMN last_edited_at TIMESTAMP,
ADD COLUMN is_edited BOOLEAN DEFAULT false,
ADD COLUMN parent_report_id TEXT,
ADD COLUMN report_chain TEXT DEFAULT 'short' CHECK (report_chain IN ('short', 'long')),
ADD COLUMN detail_level TEXT CHECK (detail_level IN ('standard', 'comprehensive')),
ADD COLUMN view_mode TEXT DEFAULT 'unified' CHECK (view_mode IN ('sections', 'unified'));

-- Create index on parent_report_id for linked reports
CREATE INDEX idx_reports_parent ON report_templates(parent_report_id);

-- Create index on report_chain for filtering
CREATE INDEX idx_reports_chain ON report_templates(report_chain);

-- Add comment describing the new columns
COMMENT ON COLUMN report_templates.edited_content IS 'Complete unified HTML content for editable report view';
COMMENT ON COLUMN report_templates.last_edited_at IS 'Timestamp of last user edit';
COMMENT ON COLUMN report_templates.is_edited IS 'Whether report has been manually edited';
COMMENT ON COLUMN report_templates.parent_report_id IS 'Links Long RFT to parent Short RFT';
COMMENT ON COLUMN report_templates.report_chain IS 'Report type: short (Data Only) or long (AI Assisted)';
COMMENT ON COLUMN report_templates.detail_level IS 'Detail level for Long RFT: standard (~1000-1500 words) or comprehensive (~2000+ words)';
COMMENT ON COLUMN report_templates.view_mode IS 'Display mode: sections (legacy) or unified (new editor)';
