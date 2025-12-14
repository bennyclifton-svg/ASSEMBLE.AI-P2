-- Migration 0016: Add trade_id to cost_lines
-- Feature 006 - Cost Planning: Support both disciplines and trades in cost lines

-- Add trade_id column to cost_lines
ALTER TABLE cost_lines ADD COLUMN trade_id TEXT REFERENCES contractor_trades(id);

-- Create index for trade lookups
CREATE INDEX IF NOT EXISTS idx_cost_lines_trade ON cost_lines(trade_id) WHERE deleted_at IS NULL;
