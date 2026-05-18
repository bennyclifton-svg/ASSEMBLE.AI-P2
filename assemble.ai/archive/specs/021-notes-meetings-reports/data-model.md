# Data Model: Notes, Meetings & Reports Module

**Feature**: 021-notes-meetings-reports
**Created**: 2026-01-23

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    projects     │────<│       notes          │>────│ note_transmittals│
│                 │     │                      │     │                 │
│ id (PK)         │     │ id (PK)              │     │ id (PK)         │
│ name            │     │ projectId (FK)       │     │ noteId (FK)     │
│ organizationId  │     │ organizationId (FK)  │     │ documentId (FK) │
└─────────────────┘     │ title                │     └─────────────────┘
        │               │ content              │
        │               │ isStarred            │
        │               │ reportingPeriodStart │
        │               │ reportingPeriodEnd   │
        │               └──────────────────────┘
        │
        │               ┌──────────────────────┐     ┌─────────────────────┐
        ├──────────────<│      meetings        │>────│ meeting_transmittals│
        │               │                      │     └─────────────────────┘
        │               │ id (PK)              │
        │               │ projectId (FK)       │>────┌─────────────────────┐
        │               │ organizationId (FK)  │     │  meeting_sections   │
        │               │ title                │     │                     │
        │               │ meetingDate          │     │ id (PK)             │
        │               │ agendaType           │     │ meetingId (FK)      │
        │               │ reportingPeriodStart │     │ sectionKey          │
        │               │ reportingPeriodEnd   │     │ content             │
        │               └──────────────────────┘     │ sortOrder           │
        │                         │                  │ parentSectionId(FK) │
        │                         │                  │ stakeholderId (FK)  │
        │                         v                  └─────────────────────┘
        │               ┌──────────────────────┐
        │               │  meeting_attendees   │
        │               │                      │
        │               │ id (PK)              │
        │               │ meetingId (FK)       │
        │               │ stakeholderId (FK)   │────┐
        │               │ adhocName            │    │
        │               │ adhocFirm            │    │
        │               │ isAttending          │    │
        │               │ isDistribution       │    │
        │               └──────────────────────┘    │
        │                                           │
        │               ┌──────────────────────┐    │    ┌─────────────────────┐
        └──────────────<│      reports         │    └───>│ project_stakeholders│
                        │                      │         │    (existing)       │
                        │ id (PK)              │>───┐    └─────────────────────┘
                        │ projectId (FK)       │    │
                        │ organizationId (FK)  │    │    ┌─────────────────────┐
                        │ title                │    ├───>│   report_sections   │
                        │ reportDate           │    │    └─────────────────────┘
                        │ preparedFor          │    │
                        │ preparedBy           │    │    ┌─────────────────────┐
                        │ contentsType         │    ├───>│  report_attendees   │
                        │ reportingPeriodStart │    │    └─────────────────────┘
                        │ reportingPeriodEnd   │    │
                        └──────────────────────┘    │    ┌─────────────────────┐
                                                    └───>│ report_transmittals │
                                                         └─────────────────────┘
```

---

## Drizzle Schema Definition

### Notes Tables

```typescript
// ============================================================================
// NOTES SCHEMA
// ============================================================================

export const notes = sqliteTable('notes', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    title: text('title').notNull().default('New Note'),
    content: text('content'), // Free-form text content
    isStarred: integer('is_starred', { mode: 'boolean' }).default(false),
    reportingPeriodStart: text('reporting_period_start'), // ISO date string
    reportingPeriodEnd: text('reporting_period_end'), // ISO date string
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'), // Soft delete
});

export const noteTransmittals = sqliteTable('note_transmittals', {
    id: text('id').primaryKey(),
    noteId: text('note_id').references(() => notes.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const notesRelations = relations(notes, ({ one, many }) => ({
    project: one(projects, {
        fields: [notes.projectId],
        references: [projects.id],
    }),
    organization: one(organizations, {
        fields: [notes.organizationId],
        references: [organizations.id],
    }),
    transmittals: many(noteTransmittals),
}));

export const noteTransmittalsRelations = relations(noteTransmittals, ({ one }) => ({
    note: one(notes, {
        fields: [noteTransmittals.noteId],
        references: [notes.id],
    }),
    document: one(documents, {
        fields: [noteTransmittals.documentId],
        references: [documents.id],
    }),
}));
```

### Meetings Tables

```typescript
// ============================================================================
// MEETINGS SCHEMA
// ============================================================================

export const meetingAgendaTypeEnum = ['standard', 'detailed', 'custom'] as const;
export type MeetingAgendaType = typeof meetingAgendaTypeEnum[number];

export const meetings = sqliteTable('meetings', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    title: text('title').notNull().default('New Meeting'),
    meetingDate: text('meeting_date'), // ISO date string
    agendaType: text('agenda_type').$type<MeetingAgendaType>().default('standard'),
    reportingPeriodStart: text('reporting_period_start'),
    reportingPeriodEnd: text('reporting_period_end'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
});

export const meetingSections = sqliteTable('meeting_sections', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    sectionKey: text('section_key').notNull(), // e.g., 'brief', 'procurement', 'design'
    sectionLabel: text('section_label').notNull(), // Display name
    content: text('content'), // User-entered/AI-generated content
    sortOrder: integer('sort_order').notNull().default(0),
    parentSectionId: text('parent_section_id').references(() => meetingSections.id, { onDelete: 'cascade' }),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id), // For detailed sub-headings
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const meetingAttendees = sqliteTable('meeting_attendees', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id), // NULL for ad-hoc
    // Ad-hoc attendee fields (used when stakeholderId is NULL)
    adhocName: text('adhoc_name'),
    adhocFirm: text('adhoc_firm'),
    adhocGroup: text('adhoc_group'), // 'client', 'authority', 'consultant', 'contractor'
    adhocSubGroup: text('adhoc_sub_group'),
    // Status flags
    isAttending: integer('is_attending', { mode: 'boolean' }).default(true),
    isDistribution: integer('is_distribution', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const meetingTransmittals = sqliteTable('meeting_transmittals', {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
    project: one(projects, {
        fields: [meetings.projectId],
        references: [projects.id],
    }),
    organization: one(organizations, {
        fields: [meetings.organizationId],
        references: [organizations.id],
    }),
    sections: many(meetingSections),
    attendees: many(meetingAttendees),
    transmittals: many(meetingTransmittals),
}));

export const meetingSectionsRelations = relations(meetingSections, ({ one, many }) => ({
    meeting: one(meetings, {
        fields: [meetingSections.meetingId],
        references: [meetings.id],
    }),
    parentSection: one(meetingSections, {
        fields: [meetingSections.parentSectionId],
        references: [meetingSections.id],
        relationName: 'parentChild',
    }),
    childSections: many(meetingSections, { relationName: 'parentChild' }),
    stakeholder: one(projectStakeholders, {
        fields: [meetingSections.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
    meeting: one(meetings, {
        fields: [meetingAttendees.meetingId],
        references: [meetings.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [meetingAttendees.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const meetingTransmittalsRelations = relations(meetingTransmittals, ({ one }) => ({
    meeting: one(meetings, {
        fields: [meetingTransmittals.meetingId],
        references: [meetings.id],
    }),
    document: one(documents, {
        fields: [meetingTransmittals.documentId],
        references: [documents.id],
    }),
}));
```

### Reports Tables

```typescript
// ============================================================================
// REPORTS SCHEMA
// ============================================================================

export const reportContentsTypeEnum = ['standard', 'detailed', 'custom'] as const;
export type ReportContentsType = typeof reportContentsTypeEnum[number];

export const reports = sqliteTable('reports', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    organizationId: text('organization_id').references(() => organizations.id).notNull(),
    title: text('title').notNull().default('New Report'),
    reportDate: text('report_date'), // ISO date string
    preparedFor: text('prepared_for'), // Client name
    preparedBy: text('prepared_by'), // PM name
    contentsType: text('contents_type').$type<ReportContentsType>().default('standard'),
    reportingPeriodStart: text('reporting_period_start'),
    reportingPeriodEnd: text('reporting_period_end'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
});

export const reportSections = sqliteTable('report_sections', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    sectionKey: text('section_key').notNull(),
    sectionLabel: text('section_label').notNull(),
    content: text('content'),
    sortOrder: integer('sort_order').notNull().default(0),
    parentSectionId: text('parent_section_id').references(() => reportSections.id, { onDelete: 'cascade' }),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reportAttendees = sqliteTable('report_attendees', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    stakeholderId: text('stakeholder_id').references(() => projectStakeholders.id),
    adhocName: text('adhoc_name'),
    adhocFirm: text('adhoc_firm'),
    adhocGroup: text('adhoc_group'),
    isDistribution: integer('is_distribution', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reportTransmittals = sqliteTable('report_transmittals', {
    id: text('id').primaryKey(),
    reportId: text('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const reportsRelations = relations(reports, ({ one, many }) => ({
    project: one(projects, {
        fields: [reports.projectId],
        references: [projects.id],
    }),
    organization: one(organizations, {
        fields: [reports.organizationId],
        references: [organizations.id],
    }),
    sections: many(reportSections),
    attendees: many(reportAttendees),
    transmittals: many(reportTransmittals),
}));

export const reportSectionsRelations = relations(reportSections, ({ one, many }) => ({
    report: one(reports, {
        fields: [reportSections.reportId],
        references: [reports.id],
    }),
    parentSection: one(reportSections, {
        fields: [reportSections.parentSectionId],
        references: [reportSections.id],
        relationName: 'parentChild',
    }),
    childSections: many(reportSections, { relationName: 'parentChild' }),
    stakeholder: one(projectStakeholders, {
        fields: [reportSections.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const reportAttendeesRelations = relations(reportAttendees, ({ one }) => ({
    report: one(reports, {
        fields: [reportAttendees.reportId],
        references: [reports.id],
    }),
    stakeholder: one(projectStakeholders, {
        fields: [reportAttendees.stakeholderId],
        references: [projectStakeholders.id],
    }),
}));

export const reportTransmittalsRelations = relations(reportTransmittals, ({ one }) => ({
    report: one(reports, {
        fields: [reportTransmittals.reportId],
        references: [reports.id],
    }),
    document: one(documents, {
        fields: [reportTransmittals.documentId],
        references: [documents.id],
    }),
}));
```

---

## TypeScript Types

```typescript
// src/types/notes-meetings-reports.ts

// ============================================================================
// NOTES TYPES
// ============================================================================

export interface Note {
    id: string;
    projectId: string;
    organizationId: string;
    title: string;
    content: string | null;
    isStarred: boolean;
    reportingPeriodStart: string | null;
    reportingPeriodEnd: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface NoteWithTransmittals extends Note {
    transmittals: NoteTransmittal[];
}

export interface NoteTransmittal {
    id: string;
    noteId: string;
    documentId: string;
    addedAt: string;
    document?: Document; // Joined
}

export interface CreateNoteRequest {
    projectId: string;
    title?: string;
    content?: string;
}

export interface UpdateNoteRequest {
    title?: string;
    content?: string;
    isStarred?: boolean;
    reportingPeriodStart?: string | null;
    reportingPeriodEnd?: string | null;
}

// ============================================================================
// MEETINGS TYPES
// ============================================================================

export type MeetingAgendaType = 'standard' | 'detailed' | 'custom';

export interface Meeting {
    id: string;
    projectId: string;
    organizationId: string;
    title: string;
    meetingDate: string | null;
    agendaType: MeetingAgendaType;
    reportingPeriodStart: string | null;
    reportingPeriodEnd: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface MeetingWithDetails extends Meeting {
    sections: MeetingSection[];
    attendees: MeetingAttendee[];
    transmittals: MeetingTransmittal[];
    project?: Project; // Joined for display
}

export interface MeetingSection {
    id: string;
    meetingId: string;
    sectionKey: string;
    sectionLabel: string;
    content: string | null;
    sortOrder: number;
    parentSectionId: string | null;
    stakeholderId: string | null;
    createdAt: string;
    updatedAt: string;
    childSections?: MeetingSection[]; // Nested
    stakeholder?: ProjectStakeholder; // Joined
}

export interface MeetingAttendee {
    id: string;
    meetingId: string;
    stakeholderId: string | null;
    adhocName: string | null;
    adhocFirm: string | null;
    adhocGroup: string | null;
    adhocSubGroup: string | null;
    isAttending: boolean;
    isDistribution: boolean;
    createdAt: string;
    stakeholder?: ProjectStakeholder; // Joined
}

export interface MeetingTransmittal {
    id: string;
    meetingId: string;
    documentId: string;
    addedAt: string;
    document?: Document; // Joined
}

export interface CreateMeetingRequest {
    projectId: string;
    title?: string;
    meetingDate?: string;
    agendaType?: MeetingAgendaType;
}

export interface UpdateMeetingRequest {
    title?: string;
    meetingDate?: string;
    agendaType?: MeetingAgendaType;
    reportingPeriodStart?: string | null;
    reportingPeriodEnd?: string | null;
}

export interface AddAttendeeRequest {
    stakeholderId?: string; // Use existing stakeholder
    // OR ad-hoc fields:
    adhocName?: string;
    adhocFirm?: string;
    adhocGroup?: string;
    adhocSubGroup?: string;
}

export interface UpdateAttendeeRequest {
    isAttending?: boolean;
    isDistribution?: boolean;
}

export interface UpdateSectionRequest {
    content?: string;
    sectionLabel?: string;
}

export interface ReorderSectionsRequest {
    sectionIds: string[]; // Ordered list of section IDs
}

// ============================================================================
// REPORTS TYPES
// ============================================================================

export type ReportContentsType = 'standard' | 'detailed' | 'custom';

export interface Report {
    id: string;
    projectId: string;
    organizationId: string;
    title: string;
    reportDate: string | null;
    preparedFor: string | null;
    preparedBy: string | null;
    contentsType: ReportContentsType;
    reportingPeriodStart: string | null;
    reportingPeriodEnd: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ReportWithDetails extends Report {
    sections: ReportSection[];
    attendees: ReportAttendee[];
    transmittals: ReportTransmittal[];
    project?: Project;
}

export interface ReportSection {
    id: string;
    reportId: string;
    sectionKey: string;
    sectionLabel: string;
    content: string | null;
    sortOrder: number;
    parentSectionId: string | null;
    stakeholderId: string | null;
    createdAt: string;
    updatedAt: string;
    childSections?: ReportSection[];
    stakeholder?: ProjectStakeholder;
}

export interface ReportAttendee {
    id: string;
    reportId: string;
    stakeholderId: string | null;
    adhocName: string | null;
    adhocFirm: string | null;
    adhocGroup: string | null;
    isDistribution: boolean;
    createdAt: string;
    stakeholder?: ProjectStakeholder;
}

export interface ReportTransmittal {
    id: string;
    reportId: string;
    documentId: string;
    addedAt: string;
    document?: Document;
}

export interface CreateReportRequest {
    projectId: string;
    title?: string;
    reportDate?: string;
    preparedFor?: string;
    preparedBy?: string;
    contentsType?: ReportContentsType;
}

export interface UpdateReportRequest {
    title?: string;
    reportDate?: string;
    preparedFor?: string;
    preparedBy?: string;
    contentsType?: ReportContentsType;
    reportingPeriodStart?: string | null;
    reportingPeriodEnd?: string | null;
}

// ============================================================================
// AI GENERATION TYPES
// ============================================================================

export interface GenerateContentRequest {
    projectId: string;
    sectionKey: string;
    sectionLabel: string;
    contextType: 'meeting' | 'report';
    contextId: string;
    reportingPeriodStart?: string;
    reportingPeriodEnd?: string;
    existingContent?: string;
    stakeholderId?: string;
}

export interface GenerateContentResponse {
    content: string;
    sourcesUsed: {
        notes: number;
        procurementDocs: number;
    };
}

export interface PolishContentRequest {
    content: string;
    sectionKey: string;
    tone?: 'professional' | 'formal' | 'concise';
}

export interface PolishContentResponse {
    content: string;
}

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface TransmittalSaveRequest {
    documentIds: string[];
}

export interface ExportRequest {
    format: 'pdf' | 'docx';
}

export interface EmailRequest {
    subject?: string;
    includeAttachments?: boolean;
}
```

---

## Zod Validation Schemas

```typescript
// src/lib/validations/notes-meetings-reports-schema.ts

import { z } from 'zod';

// ============================================================================
// NOTES VALIDATION
// ============================================================================

export const createNoteSchema = z.object({
    projectId: z.string().uuid(),
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
});

export const updateNoteSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
    isStarred: z.boolean().optional(),
    reportingPeriodStart: z.string().nullable().optional(),
    reportingPeriodEnd: z.string().nullable().optional(),
});

// ============================================================================
// MEETINGS VALIDATION
// ============================================================================

export const meetingAgendaTypeSchema = z.enum(['standard', 'detailed', 'custom']);

export const createMeetingSchema = z.object({
    projectId: z.string().uuid(),
    title: z.string().min(1).max(200).optional(),
    meetingDate: z.string().optional(),
    agendaType: meetingAgendaTypeSchema.optional(),
});

export const updateMeetingSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    meetingDate: z.string().nullable().optional(),
    agendaType: meetingAgendaTypeSchema.optional(),
    reportingPeriodStart: z.string().nullable().optional(),
    reportingPeriodEnd: z.string().nullable().optional(),
});

export const addAttendeeSchema = z.object({
    stakeholderId: z.string().uuid().optional(),
    adhocName: z.string().max(100).optional(),
    adhocFirm: z.string().max(100).optional(),
    adhocGroup: z.enum(['client', 'authority', 'consultant', 'contractor']).optional(),
    adhocSubGroup: z.string().max(100).optional(),
}).refine(
    data => data.stakeholderId || data.adhocName,
    { message: 'Either stakeholderId or adhocName must be provided' }
);

export const updateAttendeeSchema = z.object({
    isAttending: z.boolean().optional(),
    isDistribution: z.boolean().optional(),
});

export const updateSectionSchema = z.object({
    content: z.string().optional(),
    sectionLabel: z.string().min(1).max(100).optional(),
});

export const reorderSectionsSchema = z.object({
    sectionIds: z.array(z.string().uuid()),
});

// ============================================================================
// REPORTS VALIDATION
// ============================================================================

export const reportContentsTypeSchema = z.enum(['standard', 'detailed', 'custom']);

export const createReportSchema = z.object({
    projectId: z.string().uuid(),
    title: z.string().min(1).max(200).optional(),
    reportDate: z.string().optional(),
    preparedFor: z.string().max(200).optional(),
    preparedBy: z.string().max(200).optional(),
    contentsType: reportContentsTypeSchema.optional(),
});

export const updateReportSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    reportDate: z.string().nullable().optional(),
    preparedFor: z.string().max(200).nullable().optional(),
    preparedBy: z.string().max(200).nullable().optional(),
    contentsType: reportContentsTypeSchema.optional(),
    reportingPeriodStart: z.string().nullable().optional(),
    reportingPeriodEnd: z.string().nullable().optional(),
});

// ============================================================================
// SHARED VALIDATION
// ============================================================================

export const transmittalSaveSchema = z.object({
    documentIds: z.array(z.string().uuid()),
});

export const exportSchema = z.object({
    format: z.enum(['pdf', 'docx']),
});

export const emailSchema = z.object({
    subject: z.string().max(200).optional(),
    includeAttachments: z.boolean().optional(),
});

// ============================================================================
// AI GENERATION VALIDATION
// ============================================================================

export const generateContentSchema = z.object({
    projectId: z.string().uuid(),
    sectionKey: z.string().min(1),
    sectionLabel: z.string().min(1),
    contextType: z.enum(['meeting', 'report']),
    contextId: z.string().uuid(),
    reportingPeriodStart: z.string().optional(),
    reportingPeriodEnd: z.string().optional(),
    existingContent: z.string().optional(),
    stakeholderId: z.string().uuid().optional(),
});

export const polishContentSchema = z.object({
    content: z.string().min(1),
    sectionKey: z.string().min(1),
    tone: z.enum(['professional', 'formal', 'concise']).optional(),
});
```

---

## Database Migration

```sql
-- Migration: 021_notes_meetings_reports.sql

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

CREATE INDEX idx_notes_project ON notes(project_id);
CREATE INDEX idx_notes_org ON notes(organization_id);
CREATE INDEX idx_notes_starred ON notes(is_starred) WHERE is_starred = 1;

CREATE TABLE IF NOT EXISTS note_transmittals (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_note_transmittals_note ON note_transmittals(note_id);

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

CREATE INDEX idx_meetings_project ON meetings(project_id);
CREATE INDEX idx_meetings_org ON meetings(organization_id);

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

CREATE INDEX idx_meeting_sections_meeting ON meeting_sections(meeting_id);
CREATE INDEX idx_meeting_sections_parent ON meeting_sections(parent_section_id);

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

CREATE INDEX idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);

CREATE TABLE IF NOT EXISTS meeting_transmittals (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meeting_transmittals_meeting ON meeting_transmittals(meeting_id);

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

CREATE INDEX idx_reports_project ON reports(project_id);
CREATE INDEX idx_reports_org ON reports(organization_id);

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

CREATE INDEX idx_report_sections_report ON report_sections(report_id);
CREATE INDEX idx_report_sections_parent ON report_sections(parent_section_id);

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

CREATE INDEX idx_report_attendees_report ON report_attendees(report_id);

CREATE TABLE IF NOT EXISTS report_transmittals (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_transmittals_report ON report_transmittals(report_id);
```

---

## Query Patterns

### Fetch Meeting with All Relations
```typescript
const meeting = await db.query.meetings.findFirst({
    where: and(
        eq(meetings.id, meetingId),
        eq(meetings.organizationId, orgId),
        isNull(meetings.deletedAt)
    ),
    with: {
        sections: {
            orderBy: [asc(meetingSections.sortOrder)],
            with: {
                stakeholder: true,
                childSections: {
                    orderBy: [asc(meetingSections.sortOrder)],
                    with: { stakeholder: true }
                }
            },
            where: isNull(meetingSections.parentSectionId) // Top-level only
        },
        attendees: {
            with: { stakeholder: true }
        },
        transmittals: {
            with: { document: true }
        },
        project: {
            with: { details: true }
        }
    }
});
```

### Fetch Starred Notes for AI Context
```typescript
const starredNotes = await db.select()
    .from(notes)
    .where(and(
        eq(notes.projectId, projectId),
        eq(notes.organizationId, orgId),
        eq(notes.isStarred, true),
        isNull(notes.deletedAt),
        // Optional: within reporting period
        gte(notes.createdAt, periodStart),
        lte(notes.createdAt, periodEnd)
    ));
```

### Copy Meeting with Sections
```typescript
async function copyMeeting(meetingId: string, orgId: string) {
    const original = await fetchMeetingWithDetails(meetingId);
    if (!original) throw new Error('Meeting not found');

    const newId = crypto.randomUUID();
    const newMeeting = await db.insert(meetings).values({
        id: newId,
        projectId: original.projectId,
        organizationId: orgId,
        title: `${original.title} copy`,
        meetingDate: original.meetingDate,
        agendaType: original.agendaType,
    }).returning();

    // Copy sections
    for (const section of original.sections) {
        await db.insert(meetingSections).values({
            id: crypto.randomUUID(),
            meetingId: newId,
            sectionKey: section.sectionKey,
            sectionLabel: section.sectionLabel,
            content: section.content,
            sortOrder: section.sortOrder,
            // Note: parentSectionId needs mapping if copying nested
        });
    }

    // Copy attendees
    for (const attendee of original.attendees) {
        await db.insert(meetingAttendees).values({
            id: crypto.randomUUID(),
            meetingId: newId,
            stakeholderId: attendee.stakeholderId,
            adhocName: attendee.adhocName,
            adhocFirm: attendee.adhocFirm,
            adhocGroup: attendee.adhocGroup,
            isAttending: attendee.isAttending,
            isDistribution: attendee.isDistribution,
        });
    }

    return newMeeting;
}
```

---

## Standard Section Constants

```typescript
// src/lib/constants/sections.ts

export const STANDARD_AGENDA_SECTIONS = [
    { key: 'brief', label: 'Brief', sortOrder: 0 },
    { key: 'procurement', label: 'Procurement', sortOrder: 1 },
    { key: 'planning_authorities', label: 'Planning & Authorities', sortOrder: 2 },
    { key: 'design', label: 'Design', sortOrder: 3 },
    { key: 'construction', label: 'Construction', sortOrder: 4 },
    { key: 'cost_planning', label: 'Cost Planning', sortOrder: 5 },
    { key: 'programme', label: 'Programme', sortOrder: 6 },
    { key: 'other', label: 'Other', sortOrder: 7 },
] as const;

export const STANDARD_CONTENTS_SECTIONS = [
    { key: 'summary', label: 'Summary', sortOrder: 0 },
    { key: 'procurement', label: 'Procurement', sortOrder: 1 },
    { key: 'planning_authorities', label: 'Planning & Authorities', sortOrder: 2 },
    { key: 'design', label: 'Design', sortOrder: 3 },
    { key: 'construction', label: 'Construction', sortOrder: 4 },
    { key: 'cost_planning', label: 'Cost Planning', sortOrder: 5 },
    { key: 'programme', label: 'Programme', sortOrder: 6 },
    { key: 'other', label: 'Other', sortOrder: 7 },
] as const;

// Sections that should have stakeholder sub-headings in "detailed" mode
export const DETAILED_SECTION_STAKEHOLDER_MAPPING = {
    procurement: ['consultant', 'contractor'], // Sub-headings for consultants + contractors
    planning_authorities: ['authority'],        // Sub-headings for authorities
    design: ['consultant'],                     // Sub-headings for consultant disciplines
} as const;
```
