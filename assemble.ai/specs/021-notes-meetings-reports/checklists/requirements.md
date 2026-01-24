# Requirements Checklist: Notes, Meetings & Reports Module

**Feature**: 021-notes-meetings-reports
**Created**: 2026-01-23

---

## Functional Requirements

### FR-001 to FR-010: Notes Module

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-001 | System MUST display a "Notes" sub-tab within the Notes/Meetings/Reports module | [ ] | |
| FR-002 | User MUST be able to create a new note via [+ New Note] button | [ ] | |
| FR-003 | Note card MUST have chevron for expand/collapse | [ ] | |
| FR-004 | Note title MUST be editable via single-click with auto-save | [ ] | |
| FR-005 | Note MUST have free-form text content area | [ ] | |
| FR-006 | Note MUST have star toggle for AI generation scope control | [ ] | |
| FR-007 | Note MUST have document attachment capability (Save/Load) | [ ] | Same pattern as RFT/TRR |
| FR-008 | Note MUST have copy functionality (appends "copy" to title) | [ ] | |
| FR-009 | Note MUST have delete functionality (soft delete) | [ ] | |
| FR-010 | Notes MUST persist after page reload | [ ] | |

### FR-011 to FR-030: Meetings Module

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-011 | System MUST display a "Meetings" sub-tab within module | [ ] | |
| FR-012 | User MUST be able to create new meeting via [+ New Meeting] button | [ ] | |
| FR-013 | Meeting card MUST have chevron expand/collapse | [ ] | |
| FR-014 | Meeting MUST have editable title with auto-save | [ ] | |
| FR-015 | Meeting MUST auto-populate project name and address from Planning Card | [ ] | |
| FR-016 | Meeting MUST have Download, Email, Copy, Delete icons in header | [ ] | |
| FR-017 | Meeting MUST have Stakeholder section with group filter buttons | [ ] | Client, Authority, Consultant, Contractor |
| FR-018 | Clicking group button MUST display stakeholders from that group | [ ] | From project_stakeholders |
| FR-019 | Stakeholder table MUST show: Group, Sub-Group, Firm, Person, Attendance, Distribution | [ ] | |
| FR-020 | Attendance and Distribution checkboxes MUST default to checked | [ ] | |
| FR-021 | User MUST be able to add ad-hoc attendee via [+] button | [ ] | Without modifying master table |
| FR-022 | Meeting MUST have Agenda section with type selection | [ ] | Standard, Detailed, Custom |
| FR-023 | Standard agenda MUST generate 8 predefined sections | [ ] | Brief, Procurement, P&A, Design, Construction, Cost, Programme, Other |
| FR-024 | Detailed agenda MUST include stakeholder-based sub-headings | [ ] | Under Procurement, P&A, Design |
| FR-025 | Each agenda section MUST have content text area | [ ] | |
| FR-026 | Each agenda section MUST have ◇ (generate) and ◆ (polish) AI buttons | [ ] | |
| FR-027 | Meeting MUST have Attachments section with Save/Load/View | [ ] | |
| FR-028 | Copy meeting MUST create duplicate with "copy" appended to title | [ ] | |
| FR-029 | Meeting MUST be exportable to PDF and DOCX | [ ] | |
| FR-030 | Meeting MUST be emailable to attendees in distribution list | [ ] | |

### FR-031 to FR-045: Reports Module

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-031 | System MUST display a "Reports" sub-tab within module | [ ] | |
| FR-032 | User MUST be able to create new report via [+ New Report] button | [ ] | |
| FR-033 | Report MUST have "Prepared For" field for client name | [ ] | |
| FR-034 | Report MUST have "Prepared By" field for PM name | [ ] | |
| FR-035 | Report MUST have reporting period date range selector | [ ] | |
| FR-036 | Report MUST have Contents section with type selection | [ ] | Standard, Detailed, Custom |
| FR-037 | Standard contents MUST generate 9 predefined sections | [ ] | Summary + 8 standard |
| FR-038 | Detailed contents MUST include stakeholder sub-headings | [ ] | |
| FR-039 | Contents sections MUST be deletable | [ ] | |
| FR-040 | Contents sections MUST be reorderable via drag-drop | [ ] | |
| FR-041 | Each section MUST have ◇ (generate) and ◆ (polish) AI buttons | [ ] | |
| FR-042 | Report MUST have Attachments section | [ ] | |
| FR-043 | Report MUST be exportable to PDF and DOCX | [ ] | |
| FR-044 | Report data MUST persist after page reload | [ ] | |
| FR-045 | Copy report MUST create duplicate | [ ] | |

### FR-046 to FR-055: AI Generation

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-046 | ◇ button MUST trigger AI content generation for that section | [ ] | |
| FR-047 | ◆ button MUST trigger AI polish/refinement of existing content | [ ] | |
| FR-048 | AI MUST consider starred notes as context source | [ ] | |
| FR-049 | AI MUST consider procurement documents (RFT, ADD, EVAL, TRR) as context | [ ] | |
| FR-050 | AI MUST respect reporting period filter for context | [ ] | |
| FR-051 | AI MUST consider existing content in field as context | [ ] | |
| FR-052 | Generated content MUST appear in editable text area | [ ] | |
| FR-053 | System MUST show loading state during generation | [ ] | |
| FR-054 | System MUST handle AI errors gracefully | [ ] | |
| FR-055 | System SHOULD display count of sources used for generation | [ ] | Optional |

### FR-056 to FR-060: Document Attachments

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-056 | Save Transmittal MUST associate selected documents to entity | [ ] | |
| FR-057 | Load Transmittal MUST retrieve associated documents | [ ] | |
| FR-058 | Attachment table MUST show: Document Name, Revision, Date | [ ] | |
| FR-059 | Document Repository MUST be visible for selection | [ ] | In right panel |
| FR-060 | Attachments MUST be included in exports | [ ] | As document schedule |

---

## Non-Functional Requirements

### NFR-001 to NFR-010: Performance

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| NFR-001 | Meeting list MUST load within 2 seconds | [ ] | |
| NFR-002 | Section content MUST auto-save with debounce (500ms) | [ ] | |
| NFR-003 | AI generation MUST complete within 30 seconds | [ ] | |
| NFR-004 | Export to PDF MUST complete within 10 seconds | [ ] | |
| NFR-005 | System MUST handle 100+ notes per project | [ ] | |
| NFR-006 | System MUST handle 50+ meetings per project | [ ] | |
| NFR-007 | System MUST handle meetings with 20+ attendees | [ ] | |
| NFR-008 | System MUST handle meetings with 20+ agenda sections | [ ] | |

### NFR-011 to NFR-015: Usability

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| NFR-011 | UI MUST match existing app styling (dark/light theme) | [ ] | |
| NFR-012 | All actions MUST provide visual feedback | [ ] | Loading, success, error |
| NFR-013 | Delete actions MUST require confirmation | [ ] | |
| NFR-014 | Error messages MUST be user-friendly | [ ] | |
| NFR-015 | Module MUST be keyboard accessible | [ ] | |

### NFR-016 to NFR-020: Data Integrity

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| NFR-016 | Data MUST be scoped to organization | [ ] | Multi-tenant |
| NFR-017 | Soft delete MUST be used for all entities | [ ] | Recoverable |
| NFR-018 | All changes MUST update `updatedAt` timestamp | [ ] | |
| NFR-019 | Foreign key references MUST cascade on delete | [ ] | Sections, attendees, transmittals |
| NFR-020 | API MUST validate all input with Zod schemas | [ ] | |

---

## User Interface Requirements

### UI-001 to UI-010: Layout

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| UI-001 | Module MUST have top-level tab in main navigation | [ ] | |
| UI-002 | Module MUST have sub-tabs: Notes, Meetings, Reports | [ ] | |
| UI-003 | Each sub-tab MUST have [+ New] button in top-right | [ ] | |
| UI-004 | Items MUST be displayed as collapsible cards | [ ] | |
| UI-005 | Cards MUST be sorted by createdAt descending (newest first) | [ ] | |
| UI-006 | Collapsed card MUST show: chevron, title, action icons | [ ] | |
| UI-007 | Expanded card MUST show full editor | [ ] | |
| UI-008 | Action icons MUST use consistent iconography | [ ] | |
| UI-009 | Document Repository MUST be accessible for Save/Load | [ ] | |
| UI-010 | Empty state MUST be shown when no items exist | [ ] | |

### UI-011 to UI-015: Icons

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| UI-011 | Chevron MUST indicate expand/collapse state | [ ] | Right = collapsed, Down = expanded |
| UI-012 | Star icon MUST indicate starred state | [ ] | Empty = unstarred, Filled = starred |
| UI-013 | Diamond icons MUST be distinguishable | [ ] | ◇ = generate, ◆ = polish |
| UI-014 | Action icons: Download, Email, Copy, Bin | [ ] | Consistent with rest of app |
| UI-015 | Stakeholder group buttons MUST be clearly labeled | [ ] | Client, Authority, Consultant, Contractor |

---

## API Requirements

### API-001 to API-010: Notes API

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| API-001 | GET /api/notes MUST return notes for project | [ ] | Filter by projectId |
| API-002 | POST /api/notes MUST create new note | [ ] | |
| API-003 | GET /api/notes/[id] MUST return single note | [ ] | |
| API-004 | PATCH /api/notes/[id] MUST update note | [ ] | |
| API-005 | DELETE /api/notes/[id] MUST soft delete | [ ] | Set deletedAt |
| API-006 | POST /api/notes/[id]/copy MUST duplicate note | [ ] | |
| API-007 | GET /api/notes/[id]/transmittal MUST return documents | [ ] | |
| API-008 | POST /api/notes/[id]/transmittal MUST save documents | [ ] | |
| API-009 | All endpoints MUST check authentication | [ ] | |
| API-010 | All endpoints MUST scope to organization | [ ] | |

### API-011 to API-025: Meetings API

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| API-011 | GET /api/meetings MUST return meetings for project | [ ] | |
| API-012 | POST /api/meetings MUST create meeting | [ ] | |
| API-013 | GET /api/meetings/[id] MUST return meeting with relations | [ ] | Sections, attendees, transmittals |
| API-014 | PATCH /api/meetings/[id] MUST update meeting | [ ] | |
| API-015 | DELETE /api/meetings/[id] MUST soft delete | [ ] | |
| API-016 | POST /api/meetings/[id]/copy MUST duplicate meeting | [ ] | Include sections, attendees |
| API-017 | POST /api/meetings/[id]/generate-sections MUST create sections | [ ] | Based on agendaType |
| API-018 | PATCH /api/meetings/[id]/sections/[sectionId] MUST update section | [ ] | |
| API-019 | POST /api/meetings/[id]/sections/reorder MUST reorder | [ ] | |
| API-020 | POST /api/meetings/[id]/attendees MUST add attendee | [ ] | Stakeholder or ad-hoc |
| API-021 | PATCH /api/meetings/[id]/attendees/[id] MUST update flags | [ ] | isAttending, isDistribution |
| API-022 | DELETE /api/meetings/[id]/attendees/[id] MUST remove | [ ] | |
| API-023 | GET /api/meetings/[id]/transmittal MUST return documents | [ ] | |
| API-024 | POST /api/meetings/[id]/transmittal MUST save documents | [ ] | |
| API-025 | GET /api/meetings/[id]/export MUST return PDF/DOCX | [ ] | Query param: format |

### API-026 to API-035: Reports API

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| API-026 | GET /api/reports MUST return reports for project | [ ] | |
| API-027 | POST /api/reports MUST create report | [ ] | |
| API-028 | GET /api/reports/[id] MUST return report with relations | [ ] | |
| API-029 | PATCH /api/reports/[id] MUST update report | [ ] | |
| API-030 | DELETE /api/reports/[id] MUST soft delete | [ ] | |
| API-031 | POST /api/reports/[id]/generate-sections MUST create sections | [ ] | |
| API-032 | DELETE /api/reports/[id]/sections/[id] MUST remove section | [ ] | |
| API-033 | POST /api/reports/[id]/sections/reorder MUST reorder | [ ] | |
| API-034 | POST /api/reports/[id]/transmittal MUST save documents | [ ] | |
| API-035 | GET /api/reports/[id]/export MUST return PDF/DOCX | [ ] | |

### API-036 to API-040: AI API

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| API-036 | POST /api/ai/generate-content MUST generate section content | [ ] | |
| API-037 | POST /api/ai/polish-content MUST polish content | [ ] | |
| API-038 | Generate MUST accept reporting period filter | [ ] | |
| API-039 | Generate MUST include source count in response | [ ] | |
| API-040 | Both endpoints MUST handle AI errors gracefully | [ ] | |

---

## Data Requirements

### DR-001 to DR-010: Notes

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| DR-001 | Note MUST have unique id (UUID) | [ ] | |
| DR-002 | Note MUST have projectId foreign key | [ ] | |
| DR-003 | Note MUST have organizationId foreign key | [ ] | |
| DR-004 | Note MUST have title (default: "New Note") | [ ] | |
| DR-005 | Note MUST have content (nullable) | [ ] | |
| DR-006 | Note MUST have isStarred boolean | [ ] | |
| DR-007 | Note MAY have reportingPeriodStart/End | [ ] | |
| DR-008 | Note MUST have createdAt, updatedAt | [ ] | |
| DR-009 | Note MUST have deletedAt (nullable, for soft delete) | [ ] | |
| DR-010 | Note transmittals MUST cascade on delete | [ ] | |

### DR-011 to DR-025: Meetings

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| DR-011 | Meeting MUST have unique id | [ ] | |
| DR-012 | Meeting MUST have projectId, organizationId | [ ] | |
| DR-013 | Meeting MUST have agendaType enum | [ ] | standard, detailed, custom |
| DR-014 | Meeting sections MUST have meetingId foreign key | [ ] | |
| DR-015 | Meeting sections MUST have sectionKey and sectionLabel | [ ] | |
| DR-016 | Meeting sections MUST have sortOrder | [ ] | |
| DR-017 | Meeting sections MAY have parentSectionId | [ ] | For sub-headings |
| DR-018 | Meeting sections MAY have stakeholderId | [ ] | For detailed sub-headings |
| DR-019 | Meeting attendees MUST have meetingId | [ ] | |
| DR-020 | Meeting attendees MAY have stakeholderId OR adhoc fields | [ ] | |
| DR-021 | Meeting attendees MUST have isAttending, isDistribution | [ ] | |
| DR-022 | Meeting transmittals MUST have meetingId, documentId | [ ] | |
| DR-023 | All meeting child tables MUST cascade on meeting delete | [ ] | |
| DR-024 | Meeting MUST have timestamps and soft delete | [ ] | |
| DR-025 | Meeting sections MUST support nested structure | [ ] | Parent-child relation |

### DR-026 to DR-035: Reports

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| DR-026 | Report MUST have unique id | [ ] | |
| DR-027 | Report MUST have projectId, organizationId | [ ] | |
| DR-028 | Report MUST have preparedFor, preparedBy (nullable) | [ ] | |
| DR-029 | Report MUST have contentsType enum | [ ] | standard, detailed, custom |
| DR-030 | Report MUST have reportingPeriodStart/End | [ ] | |
| DR-031 | Report sections follow same structure as meeting sections | [ ] | |
| DR-032 | Report attendees follow same structure as meeting attendees | [ ] | For distribution |
| DR-033 | Report transmittals follow same structure | [ ] | |
| DR-034 | All report child tables MUST cascade on delete | [ ] | |
| DR-035 | Report MUST have timestamps and soft delete | [ ] | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| UX Designer | | | |
| QA Lead | | | |
