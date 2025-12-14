-- Migration: 0024_non_price_evaluation
-- Feature: 013-evaluation-non-price
-- Description: Add tables for non-price evaluation criteria and cells

-- Non-Price Criteria table (7 fixed rows per evaluation)
CREATE TABLE IF NOT EXISTS evaluation_non_price_criteria (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    criteria_key TEXT NOT NULL CHECK (criteria_key IN ('methodology', 'program', 'personnel', 'experience', 'health_safety', 'insurance', 'departures')),
    criteria_label TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (evaluation_id, criteria_key)
);

CREATE INDEX IF NOT EXISTS idx_non_price_criteria_evaluation ON evaluation_non_price_criteria(evaluation_id);

-- Non-Price Cells table (one per criterion per firm)
CREATE TABLE IF NOT EXISTS evaluation_non_price_cells (
    id TEXT PRIMARY KEY,
    criteria_id TEXT NOT NULL REFERENCES evaluation_non_price_criteria(id) ON DELETE CASCADE,
    firm_id TEXT NOT NULL,
    firm_type TEXT NOT NULL CHECK (firm_type IN ('consultant', 'contractor')),
    extracted_content TEXT,
    quality_rating TEXT CHECK (quality_rating IN ('good', 'average', 'poor')),
    user_edited_content TEXT,
    user_edited_rating TEXT CHECK (user_edited_rating IN ('good', 'average', 'poor')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    source_chunks TEXT,
    source_submission_id TEXT REFERENCES tender_submissions(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (criteria_id, firm_id, firm_type)
);

CREATE INDEX IF NOT EXISTS idx_non_price_cells_criteria ON evaluation_non_price_cells(criteria_id);
CREATE INDEX IF NOT EXISTS idx_non_price_cells_firm ON evaluation_non_price_cells(firm_id, firm_type);
