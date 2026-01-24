-- Initialize local development database
-- This script runs automatically when the container is first created

-- Enable pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- ============================================================================
-- NOTES, MEETINGS & REPORTS TABLES (Feature 021)
-- ============================================================================

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    title TEXT NOT NULL DEFAULT 'New Note',
    content TEXT,
    is_starred BOOLEAN DEFAULT false,
    reporting_period_start TEXT,
    reporting_period_end TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
);

-- Note transmittals (document attachments for notes)
CREATE TABLE IF NOT EXISTS note_transmittals (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    title TEXT NOT NULL DEFAULT 'New Meeting',
    meeting_date TEXT,
    agenda_type TEXT DEFAULT 'standard',
    reporting_period_start TEXT,
    reporting_period_end TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
);

-- Meeting sections (agenda items)
CREATE TABLE IF NOT EXISTS meeting_sections (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    section_label TEXT NOT NULL,
    content TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_section_id TEXT,
    stakeholder_id TEXT REFERENCES project_stakeholders(id),
    created_at TEXT,
    updated_at TEXT
);

-- Meeting attendees
CREATE TABLE IF NOT EXISTS meeting_attendees (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    stakeholder_id TEXT REFERENCES project_stakeholders(id),
    adhoc_name TEXT,
    adhoc_firm TEXT,
    adhoc_group TEXT,
    adhoc_sub_group TEXT,
    is_attending BOOLEAN DEFAULT true,
    is_distribution BOOLEAN DEFAULT true,
    created_at TEXT
);

-- Meeting transmittals (document attachments for meetings)
CREATE TABLE IF NOT EXISTS meeting_transmittals (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    title TEXT NOT NULL DEFAULT 'New Report',
    report_date TEXT,
    prepared_for TEXT,
    prepared_by TEXT,
    contents_type TEXT DEFAULT 'standard',
    reporting_period_start TEXT,
    reporting_period_end TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
);

-- Report sections (content sections)
CREATE TABLE IF NOT EXISTS report_sections (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    section_label TEXT NOT NULL,
    content TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_section_id TEXT,
    stakeholder_id TEXT REFERENCES project_stakeholders(id),
    created_at TEXT,
    updated_at TEXT
);

-- Report attendees (distribution list)
CREATE TABLE IF NOT EXISTS report_attendees (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    stakeholder_id TEXT REFERENCES project_stakeholders(id),
    adhoc_name TEXT,
    adhoc_firm TEXT,
    adhoc_group TEXT,
    adhoc_sub_group TEXT,
    is_distribution BOOLEAN DEFAULT true,
    created_at TEXT
);

-- Report transmittals (document attachments for reports)
CREATE TABLE IF NOT EXISTS report_transmittals (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT
);
