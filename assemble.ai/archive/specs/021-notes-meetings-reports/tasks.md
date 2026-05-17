# Tasks: Notes, Meetings & Reports Module

**Input**: Design documents from `/specs/021-notes-meetings-reports/`
**Prerequisites**: spec.md, data-model.md, checklists/requirements.md

**Tests**: Tests are OPTIONAL - only included if explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project**: `src/` at repository root (Next.js app structure)
- API routes: `src/app/api/`
- Components: `src/components/`
- Hooks: `src/lib/hooks/`
- Types: `src/types/`
- Database: `src/lib/db/`, `drizzle/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and core infrastructure that all user stories depend on

- [X] T001 Create database migration file `drizzle/0027_notes_meetings_reports.sql` with all tables (notes, meetings, reports, sections, attendees, transmittals)
- [X] T002 Add schema definitions to `src/lib/db/schema.ts` for notes, noteTransmittals tables with relations
- [X] T003 [P] Add schema definitions to `src/lib/db/schema.ts` for meetings, meetingSections, meetingAttendees, meetingTransmittals tables with relations
- [X] T004 [P] Add schema definitions to `src/lib/db/schema.ts` for reports, reportSections, reportAttendees, reportTransmittals tables with relations
- [X] T005 Run migration and verify tables created: `npm run db:push`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create TypeScript types file `src/types/notes-meetings-reports.ts` with Note, NoteTransmittal, CreateNoteRequest, UpdateNoteRequest interfaces
- [X] T007 [P] Add Meeting, MeetingSection, MeetingAttendee, MeetingTransmittal interfaces to `src/types/notes-meetings-reports.ts`
- [X] T008 [P] Add Report, ReportSection, ReportAttendee, ReportTransmittal interfaces to `src/types/notes-meetings-reports.ts`
- [X] T009 [P] Add AI generation types (GenerateContentRequest, PolishContentRequest) to `src/types/notes-meetings-reports.ts`
- [X] T010 Create Zod validation schemas file `src/lib/validations/notes-meetings-reports-schema.ts` with createNoteSchema, updateNoteSchema
- [X] T011 [P] Add meeting validation schemas (createMeetingSchema, addAttendeeSchema, updateSectionSchema) to `src/lib/validations/notes-meetings-reports-schema.ts`
- [X] T012 [P] Add report validation schemas (createReportSchema, updateReportSchema) to `src/lib/validations/notes-meetings-reports-schema.ts`
- [X] T013 [P] Add AI and transmittal validation schemas to `src/lib/validations/notes-meetings-reports-schema.ts`
- [X] T014 Create constants file `src/lib/constants/sections.ts` with STANDARD_AGENDA_SECTIONS (8 items)
- [X] T015 [P] Add STANDARD_CONTENTS_SECTIONS (9 items) to `src/lib/constants/sections.ts`
- [X] T016 [P] Add DETAILED_SECTION_STAKEHOLDER_MAPPING to `src/lib/constants/sections.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Notes Module (Priority: P1) MVP

**Goal**: Users can create, edit, star, copy, and delete quick scratch notes with document attachments

**Independent Test**: Create a note, edit title/content, star it, attach a document, copy it, delete it - all operations persist after page reload

### Implementation for User Story 1

- [X] T017 [P] [US1] Create GET/POST handler in `src/app/api/notes/route.ts` - list notes by projectId, create new note
- [X] T018 [P] [US1] Create GET/PATCH/DELETE handler in `src/app/api/notes/[id]/route.ts` - get, update, soft delete single note
- [X] T019 [US1] Create POST handler in `src/app/api/notes/[id]/copy/route.ts` - duplicate note with "copy" suffix
- [X] T020 [US1] Create GET/POST handler in `src/app/api/notes/[id]/transmittal/route.ts` - get/save document attachments
- [X] T021 [US1] Create custom hook `src/lib/hooks/use-notes.ts` with useNotes(projectId), useNote(noteId)
- [X] T022 [US1] Add useNoteMutations (create, update, delete, copy, toggleStar) to `src/lib/hooks/use-notes.ts`
- [X] T023 [US1] Add useNoteTransmittal (save, load) to `src/lib/hooks/use-notes.ts`
- [X] T024 [P] [US1] Create shared component `src/components/notes-meetings-reports/shared/CardHeader.tsx` - chevron, title, action icons
- [X] T025 [P] [US1] Create shared component `src/components/notes-meetings-reports/shared/AttachmentSection.tsx` - Save/Load/toggle visibility
- [X] T026 [P] [US1] Create shared component `src/components/notes-meetings-reports/shared/AttachmentTable.tsx` - document list table
- [X] T027 [US1] Create component `src/components/notes-meetings-reports/NoteCard.tsx` - collapsed/expanded card with actions
- [X] T028 [US1] Create component `src/components/notes-meetings-reports/NoteEditor.tsx` - title, content textarea, star toggle
- [X] T029 [US1] Create component `src/components/notes-meetings-reports/NotesPanel.tsx` - list of notes, [+ New Note] button

**Checkpoint**: Notes module fully functional - users can CRUD notes with attachments

---

## Phase 4: User Story 2 - Meetings Module (Priority: P2)

**Goal**: Users can create meeting agendas with stakeholder selection, generate sections (standard/detailed/custom), and manage attendees

**Independent Test**: Create meeting, add stakeholders from groups, select Standard agenda (8 sections generated), edit section content, copy meeting, export to PDF

### Implementation for User Story 2

- [X] T030 [P] [US2] Create GET/POST handler in `src/app/api/meetings/route.ts` - list meetings by projectId, create new meeting
- [X] T031 [P] [US2] Create GET/PATCH/DELETE handler in `src/app/api/meetings/[id]/route.ts` - get with relations, update, soft delete
- [X] T032 [US2] Create POST handler in `src/app/api/meetings/[id]/copy/route.ts` - duplicate meeting with sections and attendees
- [X] T033 [US2] Create GET handler in `src/app/api/meetings/[id]/sections/route.ts` - get sections ordered by sortOrder
- [X] T034 [US2] Create PATCH handler in `src/app/api/meetings/[id]/sections/[sectionId]/route.ts` - update section content/label
- [X] T035 [US2] Create POST handler in `src/app/api/meetings/[id]/sections/reorder/route.ts` - reorder sections by sectionIds array
- [X] T036 [US2] Create GET/POST handler in `src/app/api/meetings/[id]/attendees/route.ts` - list attendees, add stakeholder or ad-hoc
- [X] T037 [US2] Create PATCH/DELETE handler in `src/app/api/meetings/[id]/attendees/[attendeeId]/route.ts` - update flags, remove
- [X] T038 [US2] Create POST handler in `src/app/api/meetings/[id]/generate-sections/route.ts` - generate standard/detailed/custom sections
- [X] T039 [US2] Create GET/POST handler in `src/app/api/meetings/[id]/transmittal/route.ts` - get/save documents
- [X] T040 [US2] Implement generateStandardSections() in `src/lib/services/section-generation.ts` - create 8 agenda sections
- [X] T041 [US2] Implement generateDetailedSections() in `src/lib/services/section-generation.ts` - with stakeholder sub-headings
- [X] T042 [US2] Create custom hook `src/lib/hooks/use-meetings.ts` with useMeetings(projectId), useMeeting(meetingId)
- [X] T043 [US2] Add useMeetingMutations (create, update, delete, copy) to `src/lib/hooks/use-meetings.ts`
- [X] T044 [US2] Add useMeetingSections (update, reorder, generate) to `src/lib/hooks/use-meetings.ts`
- [X] T045 [US2] Add useMeetingAttendees (add, update, remove) to `src/lib/hooks/use-meetings.ts`
- [X] T046 [P] [US2] Create component `src/components/notes-meetings-reports/MeetingStakeholderSelector.tsx` - group filter buttons (Client, Authority, Consultant, Contractor)
- [X] T047 [P] [US2] Create component `src/components/notes-meetings-reports/MeetingStakeholderTable.tsx` - attendee list with attendance/distribution checkboxes
- [X] T048 [P] [US2] Create component `src/components/notes-meetings-reports/MeetingAgendaSection.tsx` - single section with content editor
- [X] T049 [P] [US2] Create component `src/components/notes-meetings-reports/MeetingAgendaToolbar.tsx` - Standard/Detailed/Custom buttons
- [X] T050 [US2] Create component `src/components/notes-meetings-reports/MeetingCard.tsx` - collapsed/expanded with project info
- [X] T051 [US2] Create component `src/components/notes-meetings-reports/MeetingEditor.tsx` - full meeting editor with all sections
- [X] T052 [US2] Create component `src/components/notes-meetings-reports/MeetingsPanel.tsx` - list of meetings, [+ New Meeting] button

**Checkpoint**: Meetings module fully functional - users can create agendas with stakeholders and sections

---

## Phase 5: User Story 3 - Reports Module (Priority: P3)

**Goal**: Users can create periodic reports with Prepared For/By fields, reporting period, and structured contents

**Independent Test**: Create report, set Prepared For/By, set reporting period, select Detailed contents, delete a section, reorder sections, export to DOCX

**Note**: API routes use `/api/project-reports` instead of `/api/reports` to avoid conflict with existing RAG tender reports API.

### Implementation for User Story 3

- [X] T053 [P] [US3] Create GET/POST handler in `src/app/api/project-reports/route.ts` - list reports by projectId, create new report
- [X] T054 [P] [US3] Create GET/PATCH/DELETE handler in `src/app/api/project-reports/[id]/route.ts` - get with relations, update, soft delete
- [X] T055 [US3] Create POST handler in `src/app/api/project-reports/[id]/copy/route.ts` - duplicate report with sections
- [X] T056 [US3] Create GET handler in `src/app/api/project-reports/[id]/sections/route.ts` - get sections ordered
- [X] T057 [US3] Create PATCH/DELETE handler in `src/app/api/project-reports/[id]/sections/[sectionId]/route.ts` - update or delete section
- [X] T058 [US3] Create POST handler in `src/app/api/project-reports/[id]/sections/reorder/route.ts` - reorder sections
- [X] T059 [US3] Create POST handler in `src/app/api/project-reports/[id]/generate-sections/route.ts` - generate contents sections
- [X] T060 [US3] Create GET/POST handler in `src/app/api/project-reports/[id]/attendees/route.ts` - distribution list management
- [X] T061 [US3] Create GET/POST handler in `src/app/api/project-reports/[id]/transmittal/route.ts` - get/save documents
- [X] T062 [US3] Create custom hook `src/lib/hooks/use-reports.ts` with useReports(projectId), useReport(reportId)
- [X] T063 [US3] Add useReportMutations (create, update, delete, copy) to `src/lib/hooks/use-reports.ts`
- [X] T064 [US3] Add useReportSections (update, delete, reorder, generate) to `src/lib/hooks/use-reports.ts`
- [X] T065 [P] [US3] Create component `src/components/notes-meetings-reports/ReportContentsSection.tsx` - single section with delete capability
- [X] T066 [P] [US3] Create component `src/components/notes-meetings-reports/ReportContentsToolbar.tsx` - Standard/Detailed/Custom buttons
- [X] T067 [P] [US3] Create shared component `src/components/notes-meetings-reports/shared/DateRangePicker.tsx` - reporting period selector
- [X] T068 [US3] Create component `src/components/notes-meetings-reports/ReportCard.tsx` - collapsed/expanded with prepared for/by
- [X] T069 [US3] Create component `src/components/notes-meetings-reports/ReportEditor.tsx` - full report editor
- [X] T070 [US3] Create component `src/components/notes-meetings-reports/ReportsPanel.tsx` - list of reports, [+ New Report] button

**Checkpoint**: Reports module fully functional - users can create and manage periodic reports

---

## Phase 6: User Story 4 - AI Content Generation (Priority: P4)

**Goal**: Users can generate AI content for any section and polish existing content

**Independent Test**: Click generate on empty section (content appears), click polish on existing content (content refined), verify starred notes are used as context

### Implementation for User Story 4

- [x] T071 [P] [US4] Create POST handler in `src/app/api/ai/generate-content/route.ts` - generate section content with context
- [x] T072 [P] [US4] Create POST handler in `src/app/api/ai/polish-content/route.ts` - polish/refine existing content
- [x] T073 [US4] Create service `src/lib/services/ai-content-generation.ts` with generateSectionContent() function
- [x] T074 [US4] Add polishContent() function to `src/lib/services/ai-content-generation.ts`
- [x] T075 [US4] Implement fetchStarredNotes(projectId, periodStart, periodEnd) in `src/lib/services/ai-content-generation.ts`
- [x] T076 [US4] Implement fetchProcurementDocs(projectId, periodStart, periodEnd) in `src/lib/services/ai-content-generation.ts` - RFT, Addendum, Evaluation, TRR
- [x] T077 [US4] Create section-specific prompts for each sectionKey in `src/lib/services/ai-content-generation.ts`
- [x] T078 [P] [US4] Create component `src/components/notes-meetings-reports/shared/AIGenerateButton.tsx` - empty diamond icon with loading state
- [x] T079 [P] [US4] Create component `src/components/notes-meetings-reports/shared/AIPolishButton.tsx` - full diamond icon with loading state
- [x] T080 [US4] Integrate AIGenerateButton and AIPolishButton into MeetingAgendaSection.tsx
- [x] T081 [US4] Integrate AIGenerateButton and AIPolishButton into ReportContentsSection.tsx
- [x] T082 [US4] Add source count display (notes + docs used) to generate response UI

**Checkpoint**: AI generation works - users can generate and polish content with context from notes and procurement docs

---

## Phase 7: User Story 5 - Export & Email (Priority: P5)

**Goal**: Users can export meetings/reports to PDF/DOCX and email meetings to distribution list

**Independent Test**: Export meeting to PDF (opens/downloads), export report to DOCX (opens/downloads), email meeting to attendees with isDistribution=true

### Implementation for User Story 5

- [X] T083 [P] [US5] Create GET handler in `src/app/api/meetings/[id]/export/route.ts` - export meeting to PDF or DOCX
- [X] T084 [P] [US5] Create GET handler in `src/app/api/project-reports/[id]/export/route.ts` - export report to PDF or DOCX
- [X] T085 [US5] Extend `src/lib/services/pdf-enhanced.ts` with meeting format (header table, sections, attachments)
- [X] T086 [US5] Extend `src/lib/services/pdf-enhanced.ts` with report format (prepared for/by, period, sections)
- [X] T087 [US5] Extend `src/lib/services/docx-enhanced.ts` with meeting format
- [X] T088 [US5] Extend `src/lib/services/docx-enhanced.ts` with report format
- [X] T089 [US5] Create POST handler in `src/app/api/meetings/[id]/email/route.ts` - email to attendees with isDistribution=true
- [X] T090 [US5] Implement email body generation from meeting content in `src/lib/services/email-generation.ts`
- [X] T091 [P] [US5] Create component `src/components/notes-meetings-reports/shared/ExportButton.tsx` - dropdown for PDF/DOCX
- [X] T092 [P] [US5] Create component `src/components/notes-meetings-reports/shared/EmailButton.tsx` - send to distribution list
- [X] T093 [US5] Add ExportButton to MeetingCard.tsx header
- [X] T094 [US5] Add ExportButton to ReportCard.tsx header
- [X] T095 [US5] Add EmailButton to MeetingCard.tsx header

**Checkpoint**: Export and email work - users can download documents and email meetings

---

## Phase 8: User Story 6 - Tab Navigation & Layout (Priority: P6)

**Goal**: Notes/Meetings/Reports module integrated into main app navigation with sub-tabs

**Independent Test**: Click main tab (module opens), switch between Notes/Meetings/Reports sub-tabs, Document Repository visible for Save/Load

### Implementation for User Story 6

- [X] T096 [US6] Add "Notes/Meetings/Reports" tab to main navigation in `src/components/dashboard/ProcurementCard.tsx`
- [X] T097 [US6] Create tab container component `src/components/notes-meetings-reports/NotesMeetingsReportsContainer.tsx` with sub-tab navigation
- [X] T098 [US6] Implement sub-tab state management (Notes | Meetings | Reports) in container
- [X] T099 [US6] Integrate container with ProcurementCard (main center panel tabs)
- [X] T100 [US6] Ensure Document Repository panel visible for Save/Load transmittal operations
- [X] T101 [US6] Match styling with existing tabs (Cost Planning, Program, Procurement) - use CSS variables

**Checkpoint**: Module integrated - accessible from main navigation with working sub-tabs

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T102 [P] Add loading skeletons to NotesPanel, MeetingsPanel, ReportsPanel
- [X] T103 [P] Add empty state components for each panel ("No notes yet", "No meetings yet", etc.)
- [X] T104 [P] Add error boundaries to each panel component
- [X] T105 Verify dark/light theme support across all components
- [X] T106 Add delete confirmation dialogs for notes, meetings, reports
- [X] T107 Implement auto-save with debounce (500ms) for section content edits
- [X] T108 Add tooltips for all icon buttons (Download, Email, Copy, Delete, Generate, Polish)
- [X] T109 [P] Verify project_stakeholders table exists and integration works
- [X] T110 [P] Verify Document Repository integration for transmittals
- [X] T111 [P] Verify export utilities (pdf-enhanced, docx-enhanced) are accessible
- [X] T112 Run through all acceptance criteria from requirements.md checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration must run first) - BLOCKS all user stories
- **User Story 1 - Notes (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 - Meetings (Phase 4)**: Depends on Foundational phase; can run parallel with US1 after shared components created
- **User Story 3 - Reports (Phase 5)**: Depends on Foundational phase; can run parallel with US1/US2
- **User Story 4 - AI (Phase 6)**: Depends on US2 and US3 (needs section components to integrate)
- **User Story 5 - Export (Phase 7)**: Depends on US2 and US3 (needs meeting/report entities)
- **User Story 6 - Navigation (Phase 8)**: Depends on US1, US2, US3 (needs panel components)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (Notes)**: Can start after Foundational - Creates shared components used by US2/US3
- **User Story 2 (Meetings)**: Can start after Foundational - Uses shared components from US1
- **User Story 3 (Reports)**: Can start after Foundational - Uses shared components from US1
- **User Story 4 (AI)**: Depends on US2 and US3 section components being complete
- **User Story 5 (Export)**: Depends on US2 and US3 entities being complete
- **User Story 6 (Navigation)**: Depends on all panel components (US1, US2, US3)

### Within Each User Story

- API routes before hooks
- Hooks before components
- Shared components before specific components
- Container/panel components last

### Parallel Opportunities

**Phase 2 (Foundational)**:
```bash
# Can run in parallel:
T006-T009: All TypeScript type definitions
T010-T013: All Zod validation schemas
T014-T016: All constants
```

**Phase 3 (Notes - US1)**:
```bash
# Can run in parallel after API routes:
T024, T025, T026: All shared components
```

**Phase 4 (Meetings - US2)**:
```bash
# Can run in parallel:
T030, T031: API list and detail routes
T046-T049: UI components (after hooks)
```

**Phase 5 (Reports - US3)**:
```bash
# Can run in parallel:
T053, T054: API list and detail routes
T065-T067: UI components (after hooks)
```

**Phase 6 (AI - US4)**:
```bash
# Can run in parallel:
T071, T072: Both AI API routes
T078, T079: Both AI button components
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database migration)
2. Complete Phase 2: Foundational (types, validation, constants)
3. Complete Phase 3: User Story 1 (Notes)
4. **STOP and VALIDATE**: Test Notes module independently
5. Deploy/demo if ready - users can take notes immediately

### Incremental Delivery

1. Complete Setup + Foundational - Foundation ready
2. Add User Story 1 (Notes) - MVP deployed
3. Add User Story 2 (Meetings) - Meeting agendas available
4. Add User Story 3 (Reports) - Periodic reports available
5. Add User Story 4 (AI) - Content generation available
6. Add User Story 5 (Export) - PDF/DOCX/Email available
7. Add User Story 6 (Navigation) - Full integration
8. Polish phase - Production ready

### Recommended Order for Solo Developer

1. Phase 1 + 2: Setup + Foundational (T001-T016)
2. Phase 3: Notes module (T017-T029) - establishes patterns
3. Phase 4: Meetings module (T030-T052) - most complex
4. Phase 5: Reports module (T053-T070) - similar to meetings
5. Phase 8: Navigation (T096-T101) - wire up the app
6. Phase 6: AI Integration (T071-T082) - enhance sections
7. Phase 7: Export/Email (T083-T095) - complete workflows
8. Phase 9: Polish (T102-T112) - production ready

---

## Task Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| Phase 1 | Setup | 5 | 2 |
| Phase 2 | Foundational | 11 | 8 |
| Phase 3 | US1 - Notes | 13 | 6 |
| Phase 4 | US2 - Meetings | 23 | 6 |
| Phase 5 | US3 - Reports | 18 | 4 |
| Phase 6 | US4 - AI | 12 | 4 |
| Phase 7 | US5 - Export | 13 | 4 |
| Phase 8 | US6 - Navigation | 6 | 0 |
| Phase 9 | Polish | 11 | 6 |
| **Total** | | **112** | **40** |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Shared components (T024-T026) created in US1 but used by US2/US3
- AI integration (US4) enhances existing section components
- Export (US5) uses existing pdf-enhanced.ts and docx-enhanced.ts patterns
- All API endpoints require authentication and organization scoping
- Soft delete used for all entities (set deletedAt, filter in queries)
- Commit after each task or logical group
