-- Migration: 0027_notes_meetings_reports.sql
-- Feature: 021-notes-meetings-reports
-- Created: 2026-01-24

-- ============================================================================
-- NOTES TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    title TEXT NOT NULL DEFAULT 'New Note',
    content TEXT,
    is_starred INTEGER DEFAULT 0,
    reporting_period_start TEXT,
    reporting_period_end TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_org ON notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_starred ON notes(is_starred) WHERE is_starred = 1;

CREATE TABLE IF NOT EXISTS note_transmittals (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_note_transmittals_note ON note_transmittals(note_id);

-- ============================================================================
-- MEETINGS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    title TEXT NOT NULL DEFAULT 'New Meeting',
    meeting_date TEXT,
    agenda_type TEXT DEFAULT 'standard' CHECK(agenda_type IN ('standard', 'detailed', 'custom')),
    reporting_period_start TEXT,
    reporting_period_end TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_meetings_project ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_org ON meetings(organization_id);

CREATE TABLE IF NOT EXISTS meeting_sections (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    section_label TEXT NOT NULL,
    content TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_section_id TEXT REFERENCES meeting_sections(id) ON DELETE CASCADE,
    stakeholder_id TEXT REFERENCES project_stakeholders(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_sections_meeting ON meeting_sections(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sections_parent ON meeting_sections(parent_section_id);

CREATE TABLE IF NOT EXISTS meeting_attendees (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    stakeholder_id TEXT REFERENCES project_stakeholders(id),
    adhoc_name TEXT,
    adhoc_firm TEXT,
    adhoc_group TEXT,
    adhoc_sub_group TEXT,
    is_attending INTEGER DEFAULT 1,
    is_distribution INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);

CREATE TABLE IF NOT EXISTS meeting_transmittals (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_transmittals_meeting ON meeting_transmittals(meeting_id);

-- ============================================================================
-- REPORTS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    title TEXT NOT NULL DEFAULT 'New Report',
    report_date TEXT,
    prepared_for TEXT,
    prepared_by TEXT,
    contents_type TEXT DEFAULT 'standard' CHECK(contents_type IN ('standard', 'detailed', 'custom')),
    reporting_period_start TEXT,
    reporting_period_end TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(organization_id);

CREATE TABLE IF NOT EXISTS report_sections (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    section_label TEXT NOT NULL,
    content TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_section_id TEXT REFERENCES report_sections(id) ON DELETE CASCADE,
    stakeholder_id TEXT REFERENCES project_stakeholders(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_sections_report ON report_sections(report_id);
CREATE INDEX IF NOT EXISTS idx_report_sections_parent ON report_sections(parent_section_id);

CREATE TABLE IF NOT EXISTS report_attendees (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    stakeholder_id TEXT REFERENCES project_stakeholders(id),
    adhoc_name TEXT,
    adhoc_firm TEXT,
    adhoc_group TEXT,
    is_distribution INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_attendees_report ON report_attendees(report_id);

CREATE TABLE IF NOT EXISTS report_transmittals (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_transmittals_report ON report_transmittals(report_id);
