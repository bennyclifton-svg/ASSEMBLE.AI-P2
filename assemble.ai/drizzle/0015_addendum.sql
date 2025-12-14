-- Migration: Addendum Reports
-- Creates tables for managing addenda with independent transmittals per discipline/trade

-- Create addenda table
CREATE TABLE IF NOT EXISTS addenda (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    discipline_id TEXT REFERENCES consultant_disciplines(id),
    trade_id TEXT REFERENCES contractor_trades(id),
    addendum_number INTEGER NOT NULL,
    content TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create addendum_transmittals table (links addenda to documents)
CREATE TABLE IF NOT EXISTS addendum_transmittals (
    id TEXT PRIMARY KEY,
    addendum_id TEXT NOT NULL REFERENCES addenda(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_addenda_project_discipline ON addenda(project_id, discipline_id, addendum_number);
CREATE INDEX IF NOT EXISTS idx_addenda_project_trade ON addenda(project_id, trade_id, addendum_number);
CREATE INDEX IF NOT EXISTS idx_addendum_transmittals_addendum ON addendum_transmittals(addendum_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_addenda_unique_discipline ON addenda(project_id, discipline_id, addendum_number) WHERE discipline_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_addenda_unique_trade ON addenda(project_id, trade_id, addendum_number) WHERE trade_id IS NOT NULL;
