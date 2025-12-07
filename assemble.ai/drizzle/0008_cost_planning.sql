-- Migration: Cost Planning Module (Feature 006)
-- Adds tables for cost tracking, invoices, variations, and financial reporting

-- Add cost planning fields to projects table
ALTER TABLE projects ADD COLUMN current_report_month TEXT;
ALTER TABLE projects ADD COLUMN revision TEXT DEFAULT 'REV A';
ALTER TABLE projects ADD COLUMN currency_code TEXT DEFAULT 'AUD';
ALTER TABLE projects ADD COLUMN show_gst INTEGER DEFAULT 0;

-- Companies (Master List)
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    abn TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

-- Cost Lines (Budget line items in Project Summary)
CREATE TABLE IF NOT EXISTS cost_lines (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id),
    company_id TEXT REFERENCES companies(id),
    section TEXT NOT NULL CHECK(section IN ('FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY')),
    cost_code TEXT,
    description TEXT NOT NULL,
    reference TEXT,
    budget_cents INTEGER DEFAULT 0,
    approved_contract_cents INTEGER DEFAULT 0,
    sort_order INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

-- Cost Line Allocations (Dynamic FY columns)
CREATE TABLE IF NOT EXISTS cost_line_allocations (
    id TEXT PRIMARY KEY NOT NULL,
    cost_line_id TEXT NOT NULL REFERENCES cost_lines(id),
    fiscal_year INTEGER NOT NULL,
    amount_cents INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cost_line_id, fiscal_year)
);

-- Variations (Change orders)
CREATE TABLE IF NOT EXISTS variations (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id),
    cost_line_id TEXT REFERENCES cost_lines(id),
    variation_number TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Principal', 'Contractor', 'Lessor Works')),
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Forecast' CHECK(status IN ('Forecast', 'Approved', 'Rejected', 'Withdrawn')),
    amount_forecast_cents INTEGER DEFAULT 0,
    amount_approved_cents INTEGER DEFAULT 0,
    date_submitted TEXT,
    date_approved TEXT,
    requested_by TEXT,
    approved_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    UNIQUE(project_id, variation_number)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id),
    cost_line_id TEXT REFERENCES cost_lines(id),
    variation_id TEXT REFERENCES variations(id),
    company_id TEXT REFERENCES companies(id),
    invoice_date TEXT NOT NULL,
    po_number TEXT,
    invoice_number TEXT NOT NULL,
    description TEXT,
    amount_cents INTEGER NOT NULL,
    gst_cents INTEGER DEFAULT 0,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL CHECK(period_month BETWEEN 1 AND 12),
    paid_status TEXT DEFAULT 'unpaid' CHECK(paid_status IN ('unpaid', 'paid', 'partial')),
    paid_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

-- Cost Line Comments (Cell-level comments)
CREATE TABLE IF NOT EXISTS cost_line_comments (
    id TEXT PRIMARY KEY NOT NULL,
    cost_line_id TEXT NOT NULL REFERENCES cost_lines(id),
    column_key TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

-- Project Snapshots (Baseline comparison)
CREATE TABLE IF NOT EXISTS project_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id),
    snapshot_name TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    snapshot_data TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, snapshot_name)
);

-- Import Templates (Column mapping memory)
CREATE TABLE IF NOT EXISTS import_templates (
    id TEXT PRIMARY KEY NOT NULL,
    template_name TEXT NOT NULL,
    column_mappings TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cost_lines_project ON cost_lines(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_lines_section ON cost_lines(project_id, section, sort_order);
CREATE INDEX IF NOT EXISTS idx_allocations_cost_line ON cost_line_allocations(cost_line_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_cost_line ON invoices(cost_line_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_variations_project ON variations(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variations_cost_line ON variations(cost_line_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_snapshots_project ON project_snapshots(project_id);
