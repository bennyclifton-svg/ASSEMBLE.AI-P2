-- Migration: 0004_report_context_ids
-- Fix: Add disciplineId and tradeId columns to report_templates for proper filtering
-- Previously reports were saved with discipline NAME but filtered by discipline ID, causing retrieval to fail

-- Add new columns to report_templates table
ALTER TABLE report_templates
ADD COLUMN discipline_id TEXT,
ADD COLUMN trade_id TEXT;

-- Create index on discipline_id for filtering by discipline
CREATE INDEX idx_reports_discipline_id ON report_templates(discipline_id);

-- Create index on trade_id for filtering by trade
CREATE INDEX idx_reports_trade_id ON report_templates(trade_id);

-- Add comments describing the new columns
COMMENT ON COLUMN report_templates.discipline_id IS 'Consultant discipline ID (UUID) for filtering reports';
COMMENT ON COLUMN report_templates.trade_id IS 'Contractor trade ID (UUID) for filtering reports';
