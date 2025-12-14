-- Feature 011: User Story 7 - Full Price Schedule + Merge/Edit
-- T075-T077: Add tender_submissions table and update evaluation_rows

-- Tender submissions table (audit trail for tender parsing)
CREATE TABLE IF NOT EXISTS tender_submissions (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    firm_id TEXT NOT NULL,
    firm_type TEXT NOT NULL CHECK(firm_type IN ('consultant', 'contractor')),
    filename TEXT NOT NULL,
    file_asset_id TEXT REFERENCES file_assets(id),
    parsed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    parser_used TEXT DEFAULT 'claude',
    confidence REAL,
    raw_extracted_items TEXT, -- JSON array of extracted items before mapping
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tender_submissions_eval ON tender_submissions(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_tender_submissions_firm ON tender_submissions(firm_id);

-- Add source column to evaluation_rows
-- Values: 'cost_plan' (from cost lines), 'ai_parsed' (from tender parsing), 'manual' (user added)
ALTER TABLE evaluation_rows ADD COLUMN source TEXT DEFAULT 'cost_plan' CHECK(source IN ('cost_plan', 'ai_parsed', 'manual'));

-- Add source_submission_id column to evaluation_rows (FK to tender_submissions)
ALTER TABLE evaluation_rows ADD COLUMN source_submission_id TEXT REFERENCES tender_submissions(id);
