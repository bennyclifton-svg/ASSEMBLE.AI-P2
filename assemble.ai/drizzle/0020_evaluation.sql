-- Migration 0020: Evaluation Report Tables
-- Feature: 011-evaluation-report
-- Created: 2025-12-12

-- Evaluations table (one per discipline/trade per project)
CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    discipline_id TEXT REFERENCES consultant_disciplines(id),
    trade_id TEXT REFERENCES contractor_trades(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_evaluations_project ON evaluations(project_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_discipline ON evaluations(discipline_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_trade ON evaluations(trade_id);

-- Evaluation rows table
CREATE TABLE IF NOT EXISTS evaluation_rows (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    table_type TEXT NOT NULL CHECK(table_type IN ('initial_price', 'adds_subs')),
    description TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_system_row INTEGER DEFAULT 0,
    cost_line_id TEXT REFERENCES cost_lines(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluation_rows_eval ON evaluation_rows(evaluation_id);

-- Evaluation cells table (amounts per firm per row)
CREATE TABLE IF NOT EXISTS evaluation_cells (
    id TEXT PRIMARY KEY,
    row_id TEXT NOT NULL REFERENCES evaluation_rows(id) ON DELETE CASCADE,
    firm_id TEXT NOT NULL,
    firm_type TEXT NOT NULL CHECK(firm_type IN ('consultant', 'contractor')),
    amount_cents INTEGER DEFAULT 0,
    source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'ai')),
    confidence INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluation_cells_row ON evaluation_cells(row_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_cells_firm ON evaluation_cells(firm_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_cells_row_firm ON evaluation_cells(row_id, firm_id);
