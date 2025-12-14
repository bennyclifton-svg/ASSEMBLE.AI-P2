-- Migration 0018: Rename description to activity in cost_lines
-- Feature 006 - Cost Planning: Rename description column to activity for clarity
-- SQLite doesn't support RENAME COLUMN directly in all versions, so we recreate the table

-- Step 1: Create new table with 'activity' column
CREATE TABLE cost_lines_new (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    discipline_id TEXT REFERENCES consultant_disciplines(id),
    trade_id TEXT REFERENCES contractor_trades(id),
    section TEXT NOT NULL CHECK(section IN ('FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY')),
    cost_code TEXT,
    activity TEXT NOT NULL,
    reference TEXT,
    budget_cents INTEGER DEFAULT 0,
    approved_contract_cents INTEGER DEFAULT 0,
    sort_order INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

-- Step 2: Copy data from old table to new table
INSERT INTO cost_lines_new (
    id, project_id, discipline_id, trade_id, section, cost_code,
    activity, reference, budget_cents, approved_contract_cents,
    sort_order, created_at, updated_at, deleted_at
)
SELECT
    id, project_id, discipline_id, trade_id, section, cost_code,
    description, reference, budget_cents, approved_contract_cents,
    sort_order, created_at, updated_at, deleted_at
FROM cost_lines;

-- Step 3: Drop old table
DROP TABLE cost_lines;

-- Step 4: Rename new table to original name
ALTER TABLE cost_lines_new RENAME TO cost_lines;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_cost_lines_project ON cost_lines(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_lines_discipline ON cost_lines(discipline_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_lines_trade ON cost_lines(trade_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_lines_section ON cost_lines(section) WHERE deleted_at IS NULL;
