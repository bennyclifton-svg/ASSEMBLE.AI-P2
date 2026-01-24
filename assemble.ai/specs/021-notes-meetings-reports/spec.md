# Feature Specification: Notes, Meetings & Reports Module

**Feature Branch**: `021-notes-meetings-reports`
**Created**: 2026-01-23
**Status**: Draft - Pending Approval
**Source**: 000-brainstorm/NotesMeetingsReports.md

---

## Executive Summary

A new top-level tab module for capturing project communications: **Notes** (quick scratch notes), **Meetings** (agendas and minutes), and **Reports** (periodic reporting). All three share common patterns: document attachments, AI-assisted content generation, stakeholder integration, and template-based structures.

---

## Overview

### Module Position
New tab sits at application top level alongside existing tabs:
- **Cost Planning** | **Program** | **Procurement** | **Notes/Meetings/Reports** (NEW)

### Three Sub-Modules

| Sub-Module | Purpose | Complexity |
|------------|---------|------------|
| **Notes** | Quick scratch notes with document attachments | Simple |
| **Meetings** | Meeting agendas and minutes with stakeholder selection | Medium |
| **Reports** | Periodic project reports with structured contents | Medium |

### Shared Features Across All Sub-Modules
1. **Document Attachments** - Save/Load pattern from Document Repository (same as RFT/TRR transmittals)
2. **AI Generation** - Empty diamond (generate) and Full diamond (polish) icons
3. **Copy Functionality** - Duplicate any item with "copy" appended to title
4. **Chevron Expand/Collapse** - Show/hide panel content
5. **Title Editing** - Single-click edit with auto-save
6. **Delete** - Bin icon to remove items

---

## Core Features

### 1. Layout Structure

```
+-----------------------------------------------------------------------------------+
| COST PLANNING | PROGRAM | PROCUREMENT | NOTES/MEETINGS/REPORTS                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  NOTES  |  MEETINGS  |  REPORTS                              [+ New Meeting]     |
|                                                                                   |
|  +-------------------------------------------------------------------------+     |
|  | > Meeting Title                          [Download][Email][Copy][Bin]   |     |
|  +-------------------------------------------------------------------------+     |
|  | Project: Riverstone Gateway                                             |     |
|  | Address: 42-48 Station Street                                           |     |
|  +-------------------------------------------------------------------------+     |
|  | Stakeholders:                      [+][Client][Auth][Consultant][Contr] |     |
|  | ... stakeholder table ...                                               |     |
|  +-------------------------------------------------------------------------+     |
|  | Agenda:                  [+][Standard][Detailed][Custom][◇][◆][Bin]     |     |
|  | ... agenda sections ...                                                 |     |
|  +-------------------------------------------------------------------------+     |
|  | Attachments:                                      [Save][Load][⊘]      |     |
|  | ... document schedule table (Category, Name, Revision, Date) ...        |     |
|  +-------------------------------------------------------------------------+     |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### 2. Notes Sub-Module (Simplest)

**Purpose**: Quick capture of random notes during meetings or research.

#### UI Structure
```
+-------------------------------------------------------------------------+
| > Note Title                        [Save][Load][☆][◇][◆][Copy][Bin]    |
+-------------------------------------------------------------------------+
| [Free-form text area - user types notes here]                           |
|                                                                         |
| ATTACHMENTS (visible if documents attached)                             |
| +---------------------------------------------------------------------+ |
| | Category | Document Name              | Revision | Date              | |
| +---------------------------------------------------------------------+ |
| | Reports  | Fire_Services_Report.pdf   | 1        | 15/01/2026        | |
| +---------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

#### Actions
| Icon | Action | Description |
|------|--------|-------------|
| Save | Save Transmittal | Associate selected documents from repository |
| Load | Load Transmittal | Retrieve and modify document associations |
| ☆ | Star Toggle | Mark note for inclusion in AI generation scope |
| ◇ | Generate | AI generates short-form content from context |
| ◆ | Polish | AI polishes/refines existing content |
| Copy | Copy Note | Duplicate note with "copy" appended to title |
| Bin | Delete | Remove the note |

#### Star Selection Feature
- Notes with star toggled ON are included in AI generation context for Meetings and Reports
- Filter: "Notes starred within current reporting period" or "All starred notes"
- Provides user control over what AI considers when generating content

### 3. Meetings Sub-Module

**Purpose**: Create meeting agendas and capture meeting minutes.

#### UI Structure
```
+-------------------------------------------------------------------------+
| > Meeting Title                        [Download][Email][Copy][Bin]     |
+-------------------------------------------------------------------------+
| Project: [Auto-populated from Planning Card]                            |
| Address: [Auto-populated from Planning Card]                            |
+-------------------------------------------------------------------------+
| Stakeholders:                    [+][Client][Authority][Consultant][Contractor][Bin]
|                                                                         |
| +-------------------------------------------------------------------+   |
| | Group     | Sub-Group | Firm       | Person      | Attend | Dist  |   |
| +-------------------------------------------------------------------+   |
| | Client    | Owner     | ABC Corp   | John Smith  |  ☑    |  ☑    |   |
| | Consultant| Architect | XYZ Design | Jane Doe    |  ☑    |  ☑    |   |
| +-------------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
| Agenda:                   [+][Standard][Detailed][Custom][◇][◆][Bin]    |
|                                                                         |
| BRIEF                                                         [◇][◆]   |
| [Text area for meeting notes/minutes]                                   |
|                                                                         |
| PROCUREMENT                                                   [◇][◆]   |
| [Text area for meeting notes/minutes]                                   |
|                                                                         |
| ... additional sections ...                                             |
+-------------------------------------------------------------------------+
| Attachments:                                     [Save][Load][⊘]       |
| +---------------------------------------------------------------------+ |
| | Category | Document Name              | Revision | Date              | |
| +---------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

#### Stakeholder Selection
When user clicks a group button (Client, Authority, Consultant, Contractor):
1. System queries `project_stakeholders` table for that group
2. Displays stakeholders in a table matching the master stakeholder table format
3. Columns: Group | Sub-Group | Firm | Person | Attendance (checkbox) | Distribution (checkbox)
4. Defaults: Both checkboxes checked
5. Static display (not editable except checkboxes)
6. Plus button allows ad-hoc stakeholder addition without updating master table

#### Agenda Types

| Type | Description |
|------|-------------|
| **Standard** | 8 fixed headings (hard-coded) |
| **Detailed** | Standard + stakeholder-based sub-headings |
| **Custom** | User defines own structure |

**Standard Agenda Headings (8 items)**:
1. Brief
2. Procurement
3. Planning & Authorities
4. Design
5. Construction
6. Cost Planning
7. Programme
8. Other

**Detailed Agenda Headings**:
- Same 8 main headings
- **Procurement**: Sub-headings for each Consultant and Contractor stakeholder
- **Planning & Authorities**: Sub-headings for each Authority stakeholder
- **Design**: Sub-headings for each Consultant discipline stakeholder
- **Cost Planning**: Sub-headings: Summary, Provisional Sums, Variations

#### Workflow: Agenda to Minutes
1. User creates meeting agenda (selects stakeholders, selects Standard/Detailed)
2. User saves and optionally emails agenda to stakeholders
3. User clicks **Copy** icon → Creates duplicate with "copy" appended to title
4. User expands copied meeting, clicks on agenda fields
5. User types notes OR clicks ◇ (generate) to have AI populate content
6. User reviews and edits AI content
7. User clicks ◆ (polish) to refine content
8. Result: Meeting minutes from agenda template

### 4. Reports Sub-Module

**Purpose**: Generate periodic project reports (monthly, quarterly, etc.).

#### UI Structure
Same as Meetings with these differences:
- Additional row below project/address: **Prepared For** (client name) and **Prepared By** (PM name)
- "Agenda" section renamed to "Contents"
- Contents options: Standard | Detailed | Custom

**Standard Contents (9 items)**:
1. Summary
2. Procurement
3. Planning & Authorities
4. Design
5. Construction
6. Cost Planning
7. Programme
8. Other

**Detailed Contents**:
- Same as Detailed Agenda in Meetings
- Sub-headings under Procurement, Authorities, Design based on stakeholders
- **Cost Planning**: Sub-headings: Summary, Provisional Sums, Variations

#### Contents Management
- User can delete headings
- User can reorder headings (drag-drop)
- Progressive save as user works

### 5. AI Content Generation

#### Context Sources for AI Generation
AI draws from multiple sources when generating content:

| Priority | Source | Filter |
|----------|--------|--------|
| 1 | **Notes** | Starred OR created within reporting period |
| 2 | **Procurement Documents** | RFT, Addendum, Evaluation, TRR with dates in reporting period |
| 3 | **Manual Input** | Any text user has already typed in the dialog |
| 4 | **Project Context** | Planning card data, objectives, stakeholder info |

#### Generation Flow
1. User clicks ◇ (empty diamond) on a section
2. System gathers context from sources above
3. AI generates **short-form content** relevant to that heading
4. Content appears in text area for user review/edit
5. User clicks ◆ (full diamond) to **polish** the content
6. AI refines language, structure, and formatting

#### Reporting Period
- Configurable date range (e.g., "This Month", "Last 30 Days", "Custom Range")
- Filters Notes and Procurement documents by date
- Stored per Meeting/Report instance

### 6. Document Attachments (Transmittals)

All three sub-modules support document attachments using the same pattern as RFT/TRR:

1. **Save Transmittal**: User selects documents from Document Repository, clicks Save
2. **Load Transmittal**: User clicks Load to see/modify attached documents
3. **Display**: Documents shown in a table (Category, Document Name, Revision, Date)
4. **Toggle Icon (⊘)**: Turn off/on the attachments section. Some meetings and reports won't have attachments, so the user can disable this heading. Can be re-enabled later if a future report requires attachments.

---

## Data Model

### Notes Table
```
notes
├── id: text (UUID, PK)
├── projectId: text (FK → projects)
├── organizationId: text (FK → organizations)
├── title: text
├── content: text (free-form note content)
├── isStarred: boolean (default false)
├── reportingPeriodStart: text | null (ISO date)
├── reportingPeriodEnd: text | null (ISO date)
├── createdAt: timestamp
├── updatedAt: timestamp
├── deletedAt: timestamp | null
```

### Notes Transmittals Table
```
note_transmittals
├── id: text (UUID, PK)
├── noteId: text (FK → notes, ON DELETE CASCADE)
├── documentId: text (FK → documents)
├── addedAt: timestamp
```

### Meetings Table
```
meetings
├── id: text (UUID, PK)
├── projectId: text (FK → projects)
├── organizationId: text (FK → organizations)
├── title: text
├── meetingDate: text | null (ISO date)
├── agendaType: enum ('standard', 'detailed', 'custom')
├── reportingPeriodStart: text | null
├── reportingPeriodEnd: text | null
├── createdAt: timestamp
├── updatedAt: timestamp
├── deletedAt: timestamp | null
```

### Meeting Sections Table
```
meeting_sections
├── id: text (UUID, PK)
├── meetingId: text (FK → meetings, ON DELETE CASCADE)
├── sectionKey: text (e.g., 'brief', 'procurement', 'design')
├── sectionLabel: text (display name)
├── content: text (user-entered content)
├── sortOrder: integer
├── parentSectionId: text | null (FK → meeting_sections, for sub-headings)
├── stakeholderId: text | null (FK → project_stakeholders, for detailed sub-headings)
├── createdAt: timestamp
├── updatedAt: timestamp
```

### Meeting Attendees Table
```
meeting_attendees
├── id: text (UUID, PK)
├── meetingId: text (FK → meetings, ON DELETE CASCADE)
├── stakeholderId: text | null (FK → project_stakeholders)
├── adhocName: text | null (for ad-hoc additions)
├── adhocFirm: text | null
├── adhocGroup: text | null
├── isAttending: boolean (default true)
├── isDistribution: boolean (default true)
├── createdAt: timestamp
```

### Meeting Transmittals Table
```
meeting_transmittals
├── id: text (UUID, PK)
├── meetingId: text (FK → meetings, ON DELETE CASCADE)
├── documentId: text (FK → documents)
├── addedAt: timestamp
```

### Reports Table
```
reports
├── id: text (UUID, PK)
├── projectId: text (FK → projects)
├── organizationId: text (FK → organizations)
├── title: text
├── reportDate: text | null (ISO date)
├── preparedFor: text | null (client name)
├── preparedBy: text | null (PM name)
├── contentsType: enum ('standard', 'detailed', 'custom')
├── reportingPeriodStart: text | null
├── reportingPeriodEnd: text | null
├── createdAt: timestamp
├── updatedAt: timestamp
├── deletedAt: timestamp | null
```

### Report Sections Table
```
report_sections
├── id: text (UUID, PK)
├── reportId: text (FK → reports, ON DELETE CASCADE)
├── sectionKey: text
├── sectionLabel: text
├── content: text
├── sortOrder: integer
├── parentSectionId: text | null
├── stakeholderId: text | null
├── createdAt: timestamp
├── updatedAt: timestamp
```

### Report Attendees Table (for stakeholder distribution)
```
report_attendees
├── id: text (UUID, PK)
├── reportId: text (FK → reports, ON DELETE CASCADE)
├── stakeholderId: text | null
├── adhocName: text | null
├── adhocFirm: text | null
├── adhocGroup: text | null
├── isDistribution: boolean (default true)
├── createdAt: timestamp
```

### Report Transmittals Table
```
report_transmittals
├── id: text (UUID, PK)
├── reportId: text (FK → reports, ON DELETE CASCADE)
├── documentId: text (FK → documents)
├── addedAt: timestamp
```

---

## API Endpoints

### Notes API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/notes?projectId=X` | List all notes for project |
| POST | `/api/notes` | Create new note |
| GET | `/api/notes/[id]` | Get single note |
| PATCH | `/api/notes/[id]` | Update note (title, content, isStarred) |
| DELETE | `/api/notes/[id]` | Soft delete note |
| POST | `/api/notes/[id]/copy` | Duplicate note |
| GET | `/api/notes/[id]/transmittal` | Get attached documents |
| POST | `/api/notes/[id]/transmittal` | Save document attachments |

### Meetings API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/meetings?projectId=X` | List all meetings for project |
| POST | `/api/meetings` | Create new meeting |
| GET | `/api/meetings/[id]` | Get meeting with sections and attendees |
| PATCH | `/api/meetings/[id]` | Update meeting metadata |
| DELETE | `/api/meetings/[id]` | Soft delete meeting |
| POST | `/api/meetings/[id]/copy` | Duplicate meeting (creates copy) |
| GET | `/api/meetings/[id]/sections` | Get meeting sections |
| PATCH | `/api/meetings/[id]/sections/[sectionId]` | Update section content |
| POST | `/api/meetings/[id]/sections/reorder` | Reorder sections |
| GET | `/api/meetings/[id]/attendees` | Get meeting attendees |
| POST | `/api/meetings/[id]/attendees` | Add attendee (stakeholder or ad-hoc) |
| DELETE | `/api/meetings/[id]/attendees/[attendeeId]` | Remove attendee |
| PATCH | `/api/meetings/[id]/attendees/[attendeeId]` | Update attendance/distribution |
| POST | `/api/meetings/[id]/generate-sections` | Generate sections based on type |
| GET | `/api/meetings/[id]/transmittal` | Get attached documents |
| POST | `/api/meetings/[id]/transmittal` | Save document attachments |
| GET | `/api/meetings/[id]/export` | Export to PDF/DOCX |
| POST | `/api/meetings/[id]/email` | Email meeting to attendees |

### Reports API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/reports?projectId=X` | List all reports for project |
| POST | `/api/reports` | Create new report |
| GET | `/api/reports/[id]` | Get report with sections |
| PATCH | `/api/reports/[id]` | Update report metadata |
| DELETE | `/api/reports/[id]` | Soft delete report |
| POST | `/api/reports/[id]/copy` | Duplicate report |
| GET | `/api/reports/[id]/sections` | Get report sections |
| PATCH | `/api/reports/[id]/sections/[sectionId]` | Update section content |
| POST | `/api/reports/[id]/sections/reorder` | Reorder sections |
| DELETE | `/api/reports/[id]/sections/[sectionId]` | Delete section |
| POST | `/api/reports/[id]/generate-sections` | Generate sections based on type |
| GET | `/api/reports/[id]/transmittal` | Get attached documents |
| POST | `/api/reports/[id]/transmittal` | Save document attachments |
| GET | `/api/reports/[id]/export` | Export to PDF/DOCX |

### AI Generation API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ai/generate-content` | Generate content for a section |
| POST | `/api/ai/polish-content` | Polish/refine existing content |

**Request Body for Generate**:
```json
{
    "projectId": "uuid",
    "sectionKey": "procurement",
    "sectionLabel": "Procurement",
    "contextType": "meeting" | "report",
    "contextId": "uuid",
    "reportingPeriodStart": "2026-01-01",
    "reportingPeriodEnd": "2026-01-31",
    "existingContent": "any text already in field",
    "stakeholderId": "uuid | null"
}
```

**Request Body for Polish**:
```json
{
    "content": "text to polish",
    "sectionKey": "procurement",
    "tone": "professional" | "formal" | "concise"
}
```

---

## UI Components

```
src/components/notes-meetings-reports/
├── NotesPanel.tsx                    # Notes tab content container
├── NoteCard.tsx                      # Individual note card
├── NoteEditor.tsx                    # Note content editor
│
├── MeetingsPanel.tsx                 # Meetings tab content container
├── MeetingCard.tsx                   # Individual meeting card (collapsed)
├── MeetingEditor.tsx                 # Expanded meeting editor
├── MeetingStakeholderSelector.tsx    # Group buttons + stakeholder table
├── MeetingStakeholderTable.tsx       # Attendee list with checkboxes
├── MeetingAgendaSection.tsx          # Single agenda section with editor
├── MeetingAgendaToolbar.tsx          # Standard/Detailed/Custom buttons
│
├── ReportsPanel.tsx                  # Reports tab content container
├── ReportCard.tsx                    # Individual report card
├── ReportEditor.tsx                  # Expanded report editor
├── ReportContentsSection.tsx         # Single contents section
├── ReportContentsToolbar.tsx         # Contents type buttons
│
├── shared/
│   ├── AttachmentSection.tsx         # Save/Load/View transmittal
│   ├── AttachmentTable.tsx           # Document list table
│   ├── AIGenerateButton.tsx          # Empty diamond button
│   ├── AIPolishButton.tsx            # Full diamond button
│   ├── CardHeader.tsx                # Chevron + title + action icons
│   ├── RichTextEditor.tsx            # Content editor with formatting
│   ├── StakeholderGroupButtons.tsx   # Client/Auth/Consultant/Contractor
│   └── DateRangePicker.tsx           # Reporting period selector
```

---

## Interactions Detail

### Creating a New Meeting
1. User clicks [+ New Meeting] button
2. New meeting card appears with default title "New Meeting"
3. Card auto-expands to show editor
4. Project name and address auto-populate from Planning Card
5. User clicks title to edit
6. User selects stakeholder groups (e.g., clicks "Client", "Consultant")
7. Stakeholders from those groups appear in table
8. User selects agenda type (Standard/Detailed/Custom)
9. Agenda sections generate accordingly
10. User saves meeting

### Converting Agenda to Minutes
1. User opens existing meeting (agenda)
2. User clicks Copy icon
3. New meeting created: "Meeting Title copy"
4. User expands copy, renames to "Meeting Title - Minutes"
5. User clicks on section text areas to add notes
6. OR user clicks ◇ to have AI generate content
7. User reviews, edits, then clicks ◆ to polish
8. User attaches relevant documents via Save Transmittal
9. User exports or emails minutes

### Creating a Monthly Report
1. User clicks [+ New Report] button
2. New report card appears
3. User sets title: "January 2026 Progress Report"
4. User sets Prepared For: "ABC Development"
5. User sets Prepared By: "John Smith, PM"
6. User sets reporting period: Jan 1 - Jan 31, 2026
7. User selects "Detailed" contents
8. System generates sections with stakeholder sub-headings
9. User clicks ◇ on each section to generate AI content
10. AI pulls from starred notes and procurement docs in date range
11. User reviews, edits, polishes content
12. User exports to PDF/DOCX

### Star Selection Workflow
1. During the month, user creates various notes
2. User stars notes that should be included in monthly report
3. When generating report content, AI considers only starred notes
4. After report is finalized, user can unstar notes for next period

---

## Standard Section Definitions

### Meeting Agenda Sections (Standard - 8 items)
```typescript
const STANDARD_AGENDA_SECTIONS = [
    { key: 'brief', label: 'Brief' },
    { key: 'procurement', label: 'Procurement' },
    { key: 'planning_authorities', label: 'Planning & Authorities' },
    { key: 'design', label: 'Design' },
    { key: 'construction', label: 'Construction' },
    { key: 'cost_planning', label: 'Cost Planning' },
    { key: 'programme', label: 'Programme' },
    { key: 'other', label: 'Other' },
];
```

### Report Contents Sections (Standard - 9 items)
```typescript
const STANDARD_CONTENTS_SECTIONS = [
    { key: 'summary', label: 'Summary' },
    { key: 'procurement', label: 'Procurement' },
    { key: 'planning_authorities', label: 'Planning & Authorities' },
    { key: 'design', label: 'Design' },
    { key: 'construction', label: 'Construction' },
    { key: 'cost_planning', label: 'Cost Planning' },
    { key: 'programme', label: 'Programme' },
    { key: 'other', label: 'Other' },
];
```

### Detailed Sub-Heading Generation
For "Detailed" agenda/contents:
1. **Procurement**: Add sub-section for each Consultant and Contractor stakeholder
2. **Planning & Authorities**: Add sub-section for each Authority stakeholder
3. **Design**: Add sub-section for each Consultant discipline
4. **Cost Planning**: Add sub-sections: Summary, Provisional Sums, Variations

```typescript
async function generateDetailedSections(projectId: string, baseType: 'agenda' | 'contents') {
    const stakeholders = await getProjectStakeholders(projectId);

    const sections = [...(baseType === 'agenda' ? STANDARD_AGENDA_SECTIONS : STANDARD_CONTENTS_SECTIONS)];

    // Add procurement sub-sections
    const procurementIdx = sections.findIndex(s => s.key === 'procurement');
    const consultants = stakeholders.filter(s => s.stakeholderGroup === 'consultant');
    const contractors = stakeholders.filter(s => s.stakeholderGroup === 'contractor');

    // Add authority sub-sections under planning_authorities
    const authIdx = sections.findIndex(s => s.key === 'planning_authorities');
    const authorities = stakeholders.filter(s => s.stakeholderGroup === 'authority');

    // Add design sub-sections
    const designIdx = sections.findIndex(s => s.key === 'design');
    // Use consultants for design sub-headings

    // Add cost planning sub-sections (fixed)
    const costPlanningIdx = sections.findIndex(s => s.key === 'cost_planning');
    const costPlanningSubSections = [
        { key: 'cost_planning_summary', label: 'Summary', parentKey: 'cost_planning' },
        { key: 'cost_planning_provisional_sums', label: 'Provisional Sums', parentKey: 'cost_planning' },
        { key: 'cost_planning_variations', label: 'Variations', parentKey: 'cost_planning' },
    ];

    return sections; // With nested structure
}
```

---

## Visual Design

### Color Scheme
Follow existing app theme using CSS variables:
- Background: `var(--color-bg-primary)`, `var(--color-bg-secondary)`
- Text: `var(--color-text-primary)`, `var(--color-text-muted)`
- Accents: `var(--color-accent-copper)`, `var(--color-accent-teal)`
- Borders: `var(--color-border)`

### Card States
| State | Visual Treatment |
|-------|------------------|
| Collapsed | Single row, chevron pointing right |
| Expanded | Full editor visible, chevron pointing down |
| Starred (Notes) | Star icon filled with accent color |
| Has Attachments | Document count badge on Attachments row |

### Diamond Icons
| Icon | State | Meaning |
|------|-------|---------|
| ◇ | Empty | Generate content (AI) |
| ◆ | Full | Polish content (AI) |

---

## Scope Boundaries

### In Scope (V1)
- Three sub-modules: Notes, Meetings, Reports
- Top-level tab navigation
- CRUD operations for all entities
- Standard and Detailed templates
- AI content generation (◇) and polishing (◆)
- Document attachments (Save/Load transmittals)
- Stakeholder selection from project_stakeholders
- Ad-hoc stakeholder additions
- Attendance and Distribution checkboxes
- Star toggle for Notes
- Copy functionality
- Export to PDF/DOCX
- Email distribution (basic)

### Out of Scope (V1)
- Custom template builder/editor
- Meeting scheduling/calendar integration
- Video conferencing integration
- Real-time collaborative editing
- Approval workflows
- Version history for content
- Advanced AI features (voice transcription, image extraction)
- Mobile-optimized interface
- Offline support

---

## Dependencies

- **Feature 020 (Stakeholders)**: Unified `project_stakeholders` table
- **Feature 004 (Procurement)**: RFT, Addendum, Evaluation, TRR data for AI context
- **Feature 003 (Planning Card)**: Project details, objectives
- **Document Repository**: For transmittal attachments
- **Export Utilities**: pdf-enhanced.ts, docx-enhanced.ts
- **AI Services**: Claude API integration for content generation

---

## Acceptance Criteria

### Notes
1. User can create a new note with title and free-form content
2. User can star/unstar notes to control AI generation scope
3. User can attach documents from repository (Save/Load pattern)
4. User can copy a note to create a template
5. User can delete notes (soft delete)
6. Notes persist after page reload

### Meetings
1. User can create new meeting with auto-populated project info
2. User can select stakeholder groups and see relevant stakeholders
3. User can toggle attendance and distribution checkboxes
4. User can add ad-hoc attendees without modifying master stakeholder table
5. User can select Standard, Detailed, or Custom agenda
6. Standard agenda generates 8 predefined sections
7. Detailed agenda includes stakeholder-based sub-headings
8. User can click ◇ to generate AI content for any section
9. User can click ◆ to polish AI-generated or manual content
10. User can copy meeting to create minutes from agenda
11. User can attach documents to meeting
12. User can export meeting to PDF/DOCX
13. User can email meeting to attendees in distribution list

### Reports
1. User can create new report with Prepared For / Prepared By fields
2. User can set reporting period (date range)
3. User can select Standard, Detailed, or Custom contents
4. Contents sections are deletable and reorderable
5. User can generate and polish content via AI
6. AI considers starred notes within reporting period
7. User can attach documents to report
8. User can export report to PDF/DOCX

### AI Generation
1. AI generates contextually relevant content based on section key
2. AI considers starred notes, procurement docs, and existing content
3. AI polish improves language, structure, and formatting
4. Generation is scoped to reporting period when set

---

## Success Criteria

| ID | Metric | Target |
|----|--------|--------|
| SC-001 | Time to create meeting agenda | < 2 minutes |
| SC-002 | Time to convert agenda to minutes (with AI) | < 5 minutes |
| SC-003 | Time to generate monthly report (with AI) | < 10 minutes |
| SC-004 | Data persistence reliability | 100% |
| SC-005 | Export produces professional document | Matches on-screen layout |

---

## Implementation Phases

### Phase 1: Core Infrastructure
- Database schema migrations
- API route structure
- Basic CRUD operations
- Component scaffolding

### Phase 2: Notes Module
- Notes list and editor
- Star toggle
- Document attachments
- Copy functionality

### Phase 3: Meetings Module
- Meeting list and editor
- Stakeholder selection
- Standard/Detailed agenda generation
- Attendance/Distribution tracking
- Document attachments

### Phase 4: Reports Module
- Report list and editor
- Contents generation
- Prepared For/By fields
- Reporting period selector
- Document attachments

### Phase 5: AI Integration
- Generate content endpoint
- Polish content endpoint
- Context gathering from Notes + Procurement
- Section-specific prompts

### Phase 6: Export & Email
- PDF export for all modules
- DOCX export for all modules
- Email distribution

---

## Notes from Brainstorm Analysis

### Key Design Decisions
1. **Static Stakeholder Display**: Stakeholders shown in meeting are static (read-only) except for attendance/distribution checkboxes. This prevents accidental modification of master data.

2. **Ad-hoc Additions**: Plus button allows temporary stakeholder addition to single meeting without polluting master stakeholder table.

3. **Copy as Template Pattern**: Notes provide utility as reusable templates via copy function. User creates a note with commonly needed info, then copies when needed.

4. **AI Generation Two-Phase**: Separating "generate" (short-form, raw) from "polish" (refined, professional) gives user control over output quality.

5. **Star Selection for AI Scope**: Explicit user control over what notes AI considers prevents unwanted context bleeding into reports.

6. **Reporting Period Filter**: Date-based filtering ensures AI focuses on relevant content for periodic reports.

---

**Awaiting Approval**
