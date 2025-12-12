-- Migration 0018: Update RFT NEW schema
-- Feature: 004-procurement-rft-new
-- Date: 2025-12-12
-- Changes: Remove rft_number, add UNIQUE constraints for single report per discipline/trade

-- Drop existing tables (cascade will remove transmittals)
DROP TABLE IF EXISTS rft_new_transmittals;
DROP TABLE IF EXISTS rft_new;

-- Recreate rft_new table with updated schema
CREATE TABLE IF NOT EXISTS rft_new (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    discipline_id TEXT,
    trade_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (discipline_id) REFERENCES consultant_disciplines(id),
    FOREIGN KEY (trade_id) REFERENCES contractor_trades(id),
    CHECK (
        (discipline_id IS NOT NULL AND trade_id IS NULL) OR
        (discipline_id IS NULL AND trade_id IS NOT NULL)
    ),
    UNIQUE (project_id, discipline_id),
    UNIQUE (project_id, trade_id)
);

-- Recreate rft_new_transmittals table
CREATE TABLE IF NOT EXISTS rft_new_transmittals (
    id TEXT PRIMARY KEY,
    rft_new_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rft_new_id) REFERENCES rft_new(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rft_new_project_discipline ON rft_new(project_id, discipline_id);
CREATE INDEX IF NOT EXISTS idx_rft_new_project_trade ON rft_new(project_id, trade_id);
CREATE INDEX IF NOT EXISTS idx_rft_new_transmittals_rft_new ON rft_new_transmittals(rft_new_id);
CREATE INDEX IF NOT EXISTS idx_rft_new_transmittals_document ON rft_new_transmittals(document_id);
