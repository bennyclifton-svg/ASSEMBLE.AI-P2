-- TRR (Tender Recommendation Report) Schema
-- One TRR per discipline/trade per project

CREATE TABLE trr (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    discipline_id TEXT REFERENCES consultant_disciplines(id),
    trade_id TEXT REFERENCES contractor_trades(id),
    executive_summary TEXT,
    clarifications TEXT,
    recommendation TEXT,
    report_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (discipline_id IS NOT NULL AND trade_id IS NULL) OR
        (discipline_id IS NULL AND trade_id IS NOT NULL)
    )
);

-- TRR Transmittals (Documents attached to a TRR report)
CREATE TABLE trr_transmittals (
    id TEXT PRIMARY KEY,
    trr_id TEXT NOT NULL REFERENCES trr(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create unique indexes for one TRR per discipline/trade
CREATE UNIQUE INDEX idx_trr_project_discipline ON trr(project_id, discipline_id) WHERE discipline_id IS NOT NULL;
CREATE UNIQUE INDEX idx_trr_project_trade ON trr(project_id, trade_id) WHERE trade_id IS NOT NULL;
