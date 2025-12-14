# Tasks: TRR Report

**Input**: Design documents from `/specs/012-trr-report/`
**Prerequisites**: plan.md, spec.md

**Tests**: Not requested - manual testing only

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6)

## User Story Mapping

| ID | Story | Priority | Description |
|----|-------|----------|-------------|
| US1 | View TRR Report Structure | P1 | Display aggregated data from RFT, Addendum, Evaluation |
| US2 | Edit Editable Text Sections | P1 | Executive Summary, Clarifications, Recommendation |
| US3 | View Tender Process Table | P1 | Firms with star icons, per-firm RFT dates |
| US4 | Export TRR Report | P1 | PDF and Word export |
| US5 | Manage Attachments/Transmittal | P2 | Save/Load transmittal, attachments table |
| US6 | Switch Between SHORT and LONG Tabs | P2 | Tab switcher, LONG placeholder |

---

## Phase 1: Setup

**Purpose**: Database schema and component scaffolding

- [ ] T001 Create migration file `drizzle/0022_trr.sql` with trr and trr_transmittals tables
- [ ] T002 Create migration file `drizzle/0023_rft_addendum_dates.sql` adding rft_date to rft_new and addendum_date to addenda
- [ ] T003 Create migration script `scripts/run-migration-0022.js`
- [ ] T004 Create migration script `scripts/run-migration-0023.js`
- [ ] T005 Run migration scripts
- [ ] T006 [P] Add trr and trr_transmittals tables to schema in `src/lib/db/schema.ts`
- [ ] T007 [P] Add rft_date column to rftNew table in `src/lib/db/schema.ts`
- [ ] T008 [P] Add addendum_date column to addenda table in `src/lib/db/schema.ts`
- [ ] T009 [P] Create component directory structure `src/components/trr/`
- [ ] T010 [P] Create barrel export file `src/components/trr/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core API routes and hooks that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Create TRR API route GET (get-or-create) `src/app/api/trr/route.ts`
- [ ] T012 Create TRR API route PUT `src/app/api/trr/[id]/route.ts`
- [ ] T013 [P] Create TRR types `src/types/trr.ts`
- [ ] T014 Create TRR hook `src/lib/hooks/use-trr.ts` with fetch/update functions
- [ ] T015 Add TRRSection to ConsultantGallery after EvaluationSection in `src/components/consultants/ConsultantGallery.tsx`
- [ ] T016 Add TRRSection to ContractorGallery after EvaluationSection in `src/components/contractors/ContractorGallery.tsx`

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: MVP - User Stories 1, 2, 3 (Priority: P1) - MVP

**Goal**: Display TRR report with aggregated data and editable sections

**Independent Test**: Open a discipline with RFT/Addendum/Evaluation data, view TRR section, see all data populated, edit Executive Summary, see Tender Process table with firms

### TRRSection Component (US1)

- [ ] T017 [US1] Create TRRSection collapsible component matching RFT/Addendum/Evaluation styling in `src/components/trr/TRRSection.tsx`
- [ ] T018 [US1] Add SHORT and LONG tabs to TRRSection
- [ ] T019 [US1] Create TRRShortTab component in `src/components/trr/TRRShortTab.tsx`
- [ ] T020 [US1] Create TRRLongTab placeholder component in `src/components/trr/TRRLongTab.tsx` with "Coming in future release" message

### Header Table (US1)

- [ ] T021 [P] [US1] Create TRRHeaderTable component in `src/components/trr/TRRHeaderTable.tsx`
- [ ] T022 [US1] Fetch Project Name and Address from Planning Card API
- [ ] T023 [US1] Display Document title ("TRR [Discipline Name]") with editable date field

### Editable Sections (US2)

- [ ] T024 [P] [US2] Create TRREditableSection wrapper component in `src/components/trr/TRREditableSection.tsx`
- [ ] T025 [US2] Implement rich text editor matching Brief/Services sections
- [ ] T026 [US2] Add Executive Summary section with TRREditableSection
- [ ] T027 [US2] Add Clarifications section with TRREditableSection
- [ ] T028 [US2] Add Recommendation section with TRREditableSection
- [ ] T029 [US2] Implement auto-save on blur with debounce (500ms)
- [ ] T030 [US2] Add saving/saved indicator

### Tender Process Table (US3)

- [ ] T031 [P] [US3] Create TRRTenderProcessTable component in `src/components/trr/TRRTenderProcessTable.tsx`
- [ ] T032 [US3] Fetch firms from discipline/trade gallery (consultants or contractors)
- [ ] T033 [US3] Display table with columns: Company Name, Contact, Shortlisted (star icon), RFT Date
- [ ] T034 [US3] Implement star icon for shortlisted firms (same icon as Firm Card)
- [ ] T035 [US3] Display RFT issue date in last column for each firm row
- [ ] T036 [US3] Implement clickable calendar date picker for per-firm date override
- [ ] T037 [US3] Store per-firm date override in database (or local state with persistence)
- [ ] T038 [US3] Handle empty state: "No firms added" message

### Addendum Table (US1)

- [ ] T039 [P] [US1] Create TRRAddendumTable component in `src/components/trr/TRRAddendumTable.tsx`
- [ ] T040 [US1] Fetch addenda for discipline/trade from addenda API
- [ ] T041 [US1] Display table with columns: Addendum Number, Summary, Date
- [ ] T042 [US1] Extract summary (first 100 chars or user-defined summary)
- [ ] T043 [US1] Handle empty state: "No addenda issued" message

### Evaluation Price Display (US1)

- [ ] T044 [P] [US1] Create TRREvaluationPrice component in `src/components/trr/TRREvaluationPrice.tsx`
- [ ] T045 [US1] Fetch evaluation data from evaluation API
- [ ] T046 [US1] Display evaluation tables in read-only mode
- [ ] T047 [US1] Handle empty state: "No price evaluation completed" message

### Evaluation Non-Price Display (US1)

- [ ] T048 [US1] Add Evaluation Non-Price section with placeholder: "Non-price evaluation not yet implemented"

**Checkpoint**: MVP complete - Users can view TRR report structure with all aggregated data

---

## Phase 4: User Story 4 - Export (Priority: P1)

**Goal**: Export complete TRR report to PDF and Word

**Independent Test**: Populate all sections, click Export PDF, verify document contains all sections in order

- [ ] T049 [P] [US4] Create export API route POST `src/app/api/trr/[id]/export/route.ts`
- [ ] T050 [US4] Implement PDF export using pdf-enhanced.ts utilities
- [ ] T051 [US4] Implement Word export using docx-enhanced.ts utilities
- [ ] T052 [US4] Export sections in order: Header, Executive Summary, Tender Process, Addendum, Evaluation Price, Evaluation Non-Price, Clarifications, Recommendation, Attachments
- [ ] T053 [US4] Generate filename: `TRR [Discipline Name].pdf/docx`
- [ ] T054 [US4] Add Export PDF and Export Word buttons to TRRSection header
- [ ] T055 [US4] Wire buttons to export API

**Checkpoint**: Export functionality works

---

## Phase 5: User Story 5 - Transmittal (Priority: P2)

**Goal**: Save/Load transmittal and display attachments

**Independent Test**: Select documents, click Save Transmittal, view Attachments section, verify documents listed

- [ ] T056 [P] [US5] Create transmittal API route GET/POST `src/app/api/trr/[id]/transmittal/route.ts`
- [ ] T057 [P] [US5] Create TRRAttachments component in `src/components/trr/TRRAttachments.tsx`
- [ ] T058 [US5] Display table with columns: Document Name, Revision, Date
- [ ] T059 [US5] Add Save Transmittal button to TRRSection header
- [ ] T060 [US5] Add Load Transmittal button to TRRSection header
- [ ] T061 [US5] Wire transmittal buttons to API (following RFT/Addendum patterns)
- [ ] T062 [US5] Include attachments table in PDF/Word export

**Checkpoint**: Transmittal and attachments work

---

## Phase 6: User Story 6 - Tabs (Priority: P2)

**Goal**: Switch between SHORT and LONG tabs

**Independent Test**: Click SHORT tab, see full content; click LONG tab, see placeholder message

- [ ] T063 [US6] Implement tab state management in TRRSection
- [ ] T064 [US6] Style tabs to match RFT/Addendum/Evaluation tab styling
- [ ] T065 [US6] Preserve entered text when switching tabs
- [ ] T066 [US6] Update LONG tab placeholder to mention RAG/parsed source documents

**Checkpoint**: Tab switching works

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements

- [ ] T067 Ensure TRRSection styling matches RFT/Addendum/Evaluation (FileText icon, blue highlight, collapsible triangle, dark theme)
- [ ] T068 Add loading states for all data fetching
- [ ] T069 Add error handling and toast notifications
- [ ] T070 Verify Date field displays correctly on export (same row as Document title, aligned right)
- [ ] T071 Test edge cases: no RFT, no firms, no evaluation data, no addenda
- [ ] T072 Run manual QA against all acceptance scenarios in spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────────────┐
                                                                 │
Phase 2 (Foundational) ──────────────────────────────────────────┤
                                                                 │
                        ┌────────────────────────────────────────┘
                        ▼
Phase 3 (MVP: US1+2+3) ──────► Phase 4 (US4: Export) ────────────┐
                                                                 │
                        ┌────────────────────────────────────────┘
                        ▼
Phase 5 (US5: Transmittal) ──► Phase 6 (US6: Tabs) ──► Phase 7 (Polish)
```

### Parallel Opportunities

**Phase 1**: T006, T007, T008, T009, T010 can run in parallel

**Phase 2**: T013 can run in parallel with T011

**Phase 3**: T021, T024, T031, T039, T044 can run in parallel (different components)

**Phase 4**: T049 can start while T050-T052 are prepared

**Phase 5**: T056, T057 can run in parallel

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup (migrations, schema)
2. Complete Phase 2: Foundational (API, hooks)
3. Complete Phase 3: MVP (US1+2+3 - view structure, edit text, tender process)
4. Complete Phase 4: Export (US4)
5. **STOP and VALIDATE**: Test full report viewing and export
6. Demo to stakeholder

### Full Feature Delivery

1. MVP + Export complete
2. Phase 5: Transmittal (US5)
3. Phase 6: Tabs (US6)
4. Phase 7: Polish

---

## Task Summary

| Phase | Task Count | Description |
|-------|------------|-------------|
| 1 | 10 | Setup (migrations, schema, structure) |
| 2 | 6 | Foundational (API routes, hooks) |
| 3 | 32 | MVP - US1+2+3 (report structure, editing, tables) |
| 4 | 7 | US4 - Export (PDF/Word) |
| 5 | 7 | US5 - Transmittal |
| 6 | 4 | US6 - Tabs |
| 7 | 6 | Polish |
| **Total** | **72** | |

### Tasks Per User Story

| Story | Tasks | Description |
|-------|-------|-------------|
| US1 | 18 | View report structure, aggregated data |
| US2 | 7 | Editable sections |
| US3 | 8 | Tender Process table with dates |
| US4 | 7 | Export PDF/Word |
| US5 | 7 | Transmittal/Attachments |
| US6 | 4 | Tab switching |
| Shared | 21 | Setup, foundation, polish |
