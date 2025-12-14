# Tasks: Evaluation Report

**Input**: Design documents from `/specs/011-evaluation-report/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/evaluation-api.yaml

**Tests**: Not requested - manual testing only

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6) or combined stories (US1+2+5 for MVP)

## User Story Mapping

| ID | Story | Priority | Description |
|----|-------|----------|-------------|
| US1 | View Price Evaluation Tables | P1 | Display FortuneSheet tables with firm columns |
| US2 | Manual Table Editing | P1 | Add/delete rows, edit cells |
| US5 | Automatic Calculations | P1 | Sub-totals and grand totals |
| US3 | Individual Tender Parsing | P2 | Drag-drop PDF parsing per firm |
| US4 | Bulk Tender Evaluation | P2 | "Evaluate All" button |
| US6 | Data Persistence | P2 | Auto-save and reload |
| US7 | Full Price Schedule + Merge/Edit | P1 | Auto-create rows for unmapped items, merge rows, edit descriptions |

---

## Phase 1: Setup

**Purpose**: Database schema and component scaffolding

- [x] T001 Create migration file `drizzle/0020_evaluation.sql` with evaluations, evaluation_rows, evaluation_cells tables
- [x] T002 Run migration script `scripts/run-migration-0020.js`
- [x] T003 [P] Add evaluation tables to schema in `src/lib/db/schema.ts`
- [x] T004 [P] Add evaluation relations to schema in `src/lib/db/schema.ts`
- [x] T005 [P] Create component directory structure `src/components/evaluation/`
- [x] T006 [P] Create barrel export file `src/components/evaluation/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core API routes and hooks that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create evaluation API route GET/PUT `src/app/api/evaluation/[projectId]/[contextType]/[contextId]/route.ts`
- [x] T008 Create evaluation hook `src/lib/hooks/use-evaluation.ts` with fetch/update functions
- [x] T009 [P] Create evaluation types `src/types/evaluation.ts`
- [x] T010 Add EvaluationSection to ConsultantGallery after AddendumSection in `src/components/consultants/ConsultantGallery.tsx`
- [x] T011 Add EvaluationSection to ContractorGallery after AddendumSection in `src/components/contractors/ContractorGallery.tsx`

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: MVP - User Stories 1, 2, 5 (Priority: P1)

**Goal**: Display evaluation tables with firm columns, enable manual editing, show calculations

**Independent Test**: Open a discipline with short-listed firms, click PRICE tab, see tables with firms as columns, edit cells, verify totals update

### EvaluationSection Component (US1)

- [x] T012 [US1] Create EvaluationSection collapsible component matching RFT/Addendum styling in `src/components/evaluation/EvaluationSection.tsx`
- [x] T013 [US1] Add PRICE and NON-PRICE tabs to EvaluationSection
- [x] T014 [US1] Create NON-PRICE placeholder tab in `src/components/evaluation/EvaluationNonPriceTab.tsx`

### FortuneSheet Tables (US1 + US2 + US5)

- [x] T015 [P] [US1] Create EvaluationSheet FortuneSheet wrapper in `src/components/evaluation/EvaluationSheet.tsx`
- [x] T016 [US1] Implement dynamic column generation based on short-listed firms in EvaluationSheet
- [x] T017 [US1] Create EvaluationPriceTab with Table 1 (Initial Price) and Table 2 (Adds & Subs) in `src/components/evaluation/EvaluationPriceTab.tsx`
- [x] T018 [US1] Fetch cost_lines for discipline/trade to populate Table 1 Description column
- [x] T019 [US1] Initialize Table 2 with 3 empty rows (numbered 1, 2, 3)

### Manual Editing (US2)

- [x] T020 [US2] Implement cell editing with currency formatting in EvaluationSheet
- [x] T021 [US2] Add "Add Row" button functionality for both tables
- [x] T022 [US2] Add row delete via right-click context menu
- [x] T023 [US2] Create row add API route POST `src/app/api/evaluation/[projectId]/[contextType]/[contextId]/rows/route.ts`
- [x] T024 [US2] Create row delete API route DELETE `src/app/api/evaluation/[projectId]/[contextType]/[contextId]/rows/[rowId]/route.ts`

### Automatic Calculations (US5)

- [x] T025 [US5] Implement sub-total calculation for Table 1 (sum per firm column)
- [x] T026 [US5] Implement sub-total calculation for Table 2 (sum per firm column, negative values as deductions)
- [x] T027 [US5] Implement grand total calculation (Table 1 + Table 2 sub-totals per firm)
- [x] T028 [US5] Add real-time calculation updates on cell change (<100ms)

### MVP Integration

- [x] T029 [US1+2+5] Style tables following Cost Plan module patterns (colors, fonts, row heights)
- [x] T030 [US1+2+5] Add empty state when no firms are short-listed
- [x] T031 [US1+2+5] Add loading state while fetching evaluation data

**Checkpoint**: MVP complete - Users can view tables, edit manually, see calculations. No AI parsing yet.

---

## Phase 4: User Story 6 - Data Persistence (Priority: P2)

**Goal**: Auto-save changes and reload on return

**Independent Test**: Enter amounts, refresh page, verify data persists

- [x] T032 [US6] Implement debounced auto-save on cell change (500ms debounce)
- [x] T033 [US6] Add save indicator (saving..., saved) to EvaluationPriceTab
- [x] T034 [US6] Implement evaluation data upsert in PUT route
- [x] T035 [US6] Load persisted data on PRICE tab mount
- [x] T036 [US6] Preserve row additions/deletions across sessions

**Checkpoint**: Data persists between sessions

---

## Phase 5: User Story 3 - Individual Tender Parsing (Priority: P2)

**Goal**: Drag-drop PDF onto firm column to extract and populate amounts

**Independent Test**: Drag PDF onto firm column, see amounts populated with blue highlight

### Drop Zone Component

- [x] T037 [P] [US3] Create EvaluationDropZone component in `src/components/evaluation/EvaluationDropZone.tsx`
- [x] T038 [US3] Implement drop zone per firm column with visual highlight on drag-over
- [x] T039 [US3] Add file type validation (PDF only)

### PDF Parsing Service

- [x] T040 [P] [US3] Create tender parser service in `src/lib/services/tender-parser.ts`
- [x] T041 [US3] Implement PDF text extraction (using existing RAG infrastructure or pdf-parse)
- [x] T042 [US3] Implement Claude API call for pricing line item extraction
- [x] T043 [US3] Implement line item mapping to evaluation rows (semantic matching)

### Parse API Route

- [x] T044 [US3] Create parse API route POST `src/app/api/evaluation/[projectId]/[contextType]/[contextId]/parse/route.ts`
- [x] T045 [US3] Handle file upload and trigger parsing
- [x] T046 [US3] Upload PDF to document repository (Consultant/Discipline or Contractor/Trade category)
- [x] T047 [US3] Return mapped amounts with confidence scores

### UI Integration

- [x] T048 [US3] Populate cells with parsed amounts and AI source indicator
- [x] T049 [US3] Highlight AI-populated cells (blue border/background)
- [x] T050 [US3] Show confidence indicator for low-confidence mappings (<70%)
- [x] T051 [US3] Show parsing progress/spinner during extraction

**Checkpoint**: Individual PDF drag-drop parsing works

---

## Phase 5b: User Story 7 - Full Price Schedule + Merge/Edit (Priority: P1)

**Goal**: Store complete price schedules (not just matched items), enable row merging, enable description editing

**Independent Test**: Drop a PDF with 10 items onto a firm column with 3 existing rows, verify 10 rows appear (3 mapped + 7 new). Select 2 rows with Shift+Click, click Merge Selected, verify merge dialog appears. Edit a description inline, verify it saves.

### Database Schema Updates

- [x] T075 [US7] Create migration `drizzle/0021_tender_submissions.sql` with tender_submissions table
- [x] T076 [US7] Add `source` column to evaluation_rows ('cost_plan' | 'ai_parsed' | 'manual')
- [x] T077 [US7] Add `source_submission_id` column to evaluation_rows (FK to tender_submissions)
- [x] T078 [US7] Run migration script `scripts/run-migration-0021.js`
- [x] T079 [P] [US7] Update schema.ts with tender_submissions table and new evaluation_rows fields

### Parse Route - Auto-Create Unmapped Rows

- [x] T080 [US7] Modify parse route to create tender_submission record for audit trail
- [x] T081 [US7] Modify parse route to CREATE NEW ROWS for unmapped items (not discard them)
- [x] T082 [US7] Set `source: 'ai_parsed'` and `source_submission_id` on new rows
- [x] T083 [US7] Handle empty evaluation case: create ALL rows from PDF

### Row Merge Feature - API

- [x] T084 [US7] Create merge API route POST `src/app/api/evaluation/[projectId]/[contextType]/[contextId]/rows/merge/route.ts`
- [x] T085 [US7] Implement: get all cells from selected rows, sum by firm, create merged row, delete originals
- [x] T086 [US7] Add mergeRows function to use-evaluation hook

### Description Edit Feature - API

- [x] T087 [US7] Add PATCH handler to rows/[rowId]/route.ts for description updates
- [x] T088 [US7] Add updateRowDescription function to use-evaluation hook with optimistic update

### UI - Row Selection (Document Repository Pattern)

- [x] T089 [US7] Add selectedRowIds state to EvaluationSheet
- [x] T090 [US7] Implement Click to select single row (clear others)
- [x] T091 [US7] Implement Shift+Click for range selection
- [x] T092 [US7] Implement Ctrl+Click to toggle selection
- [x] T093 [US7] Add visual highlight (background color) for selected rows

### UI - Merge Dialog

- [x] T094 [US7] Create MergeRowsDialog component `src/components/evaluation/MergeRowsDialog.tsx`
- [x] T095 [US7] Display selected rows with their descriptions and summed amounts
- [x] T096 [US7] Add editable field for merged description (default to first row's description)
- [x] T097 [US7] Wire confirm button to call merge API and refresh

### UI - Merge Button & Integration

- [x] T098 [US7] Add "Merge Selected (N)" button to EvaluationSheet header (next to + Add)
- [x] T099 [US7] Show button only when 2+ rows selected
- [x] T100 [US7] Wire button to open MergeRowsDialog

### UI - Editable Descriptions

- [x] T101 [US7] Make description cells clickable to enter edit mode
- [x] T102 [US7] Add inline text input for description editing
- [x] T103 [US7] Wire blur/Enter to save via PATCH API

### UI - AI Row Indicators

- [x] T104 [US7] Add `source` field to EvaluationRow type
- [x] T105 [US7] Display sparkle icon (Sparkles from lucide-react) for rows where source='ai_parsed'
- [x] T106 [US7] Add tooltip "AI-generated row" on hover

### Intelligent Line Item Filtering (NEW)

- [x] T107 [US7] Add itemType classification to ParsedLineItem type ('deliverable' | 'total' | 'unit_rate' | 'allowance')
- [x] T108 [US7] Update tender extraction prompt to classify items and exclude totals/unit rates
- [x] T109 [US7] Add filterLineItems() post-extraction safety filter in tender-parser.ts
- [x] T110 [US7] Store filtered items in audit trail (rawExtractedItems includes both included and filtered)
- [x] T111 [US7] Hide empty evaluation rows (rows with no cell data) from display

**Checkpoint**: Full price schedule preserved, merge and edit working

---

## Phase 6: User Story 4 - Bulk Tender Evaluation (Priority: P2)

**Goal**: "Evaluate All Submissions" button to parse all PDFs at once

**Independent Test**: Click "Evaluate All", see progress modal, all firm columns populated

### Bulk Parse Logic

- [ ] T052 [P] [US4] Create BulkEvaluateModal component in `src/components/evaluation/BulkEvaluateModal.tsx`
- [ ] T053 [US4] Implement document repository lookup for PDFs in discipline/trade category
- [ ] T054 [US4] Implement firm identification from parsed PDF (company name extraction + fuzzy match)

### Bulk Parse API Route

- [ ] T055 [US4] Create bulk parse API route POST `src/app/api/evaluation/[projectId]/bulk-parse/route.ts`
- [ ] T056 [US4] Implement parallel PDF processing (Promise.all)
- [ ] T057 [US4] Return results with firm matching confidence

### UI Integration

- [ ] T058 [US4] Add "Evaluate All Submissions" button to PRICE tab header
- [ ] T059 [US4] Show progress modal with per-PDF status
- [ ] T060 [US4] Flag unmatched documents for manual review
- [ ] T061 [US4] Allow re-evaluation (click button again after uploading new PDFs)

**Checkpoint**: Bulk evaluation works

---

## Phase 7: Export Functionality

**Goal**: Export evaluation to PDF/Word/Excel

- [ ] T062 [P] Create export API route GET `src/app/api/evaluation/[projectId]/[contextType]/[contextId]/export/route.ts`
- [ ] T063 [P] Implement PDF export using existing pdf-enhanced utilities
- [ ] T064 [P] Implement Excel export using xlsx library
- [ ] T065 [P] Implement Word export (docx library or fallback to PDF)
- [ ] T066 Add Export PDF, Export Word, Export Excel buttons to PRICE tab header
- [ ] T067 Wire export buttons to API with format query parameter

**Checkpoint**: All export formats work

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements

- [ ] T068 Ensure horizontal scroll for >6 firms
- [ ] T069 Add keyboard navigation support in FortuneSheet
- [ ] T070 Optimize re-render performance for large tables
- [ ] T071 Add error boundary to EvaluationSection
- [ ] T072 Add toast notifications for save success/failure
- [ ] T073 Verify mobile/tablet responsiveness
- [ ] T074 Run manual QA against all acceptance scenarios in spec.md

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
Phase 3 (MVP: US1+2+5) ──────► Phase 4 (US6: Persistence) ──────┐
                                                                 │
                        ┌────────────────────────────────────────┘
                        ▼
Phase 5 (US3: Individual Parse) ──► Phase 5b (US7: Full Schedule + Merge)
                                                    │
                                                    ▼
                                    Phase 6 (US4: Bulk Parse)
                                                    │
                                                    ▼
                                    Phase 7 (Export) ──► Phase 8 (Polish)
```

### Parallel Opportunities

**Phase 1**: T003, T004, T005, T006 can run in parallel

**Phase 2**: T009 can run in parallel with T007

**Phase 3**: T015 can run in parallel with T012-T014

**Phase 5**: T037, T040 can run in parallel

**Phase 5b**: T079 can run in parallel with T075-T078; T084, T087 can run in parallel; T089-T093, T094-T097, T101-T103, T104-T106 can run in parallel after API work

**Phase 6**: T052 can run in parallel with T055

**Phase 7**: T062, T063, T064, T065 can all run in parallel

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup (migrations, schema)
2. Complete Phase 2: Foundational (API, hooks)
3. Complete Phase 3: MVP (US1+2+5 - view, edit, calculate)
4. **STOP and VALIDATE**: Test tables work with manual entry
5. Demo to stakeholder

### Full Feature Delivery

1. MVP complete
2. Phase 4: Data Persistence (US6)
3. Phase 5: Individual Parsing (US3)
4. **Phase 5b: Full Price Schedule + Merge/Edit (US7)** ← NEW
5. Phase 6: Bulk Evaluation (US4)
6. Phase 7: Export
7. Phase 8: Polish

---

## Task Summary

| Phase | Task Count | Description |
|-------|------------|-------------|
| 1 | 6 | Setup (migrations, schema, structure) |
| 2 | 5 | Foundational (API routes, hooks) |
| 3 | 20 | MVP - US1+2+5 (tables, editing, calculations) |
| 4 | 5 | US6 - Data Persistence |
| 5 | 15 | US3 - Individual Parsing |
| 5b | 32 | US7 - Full Price Schedule + Merge/Edit |
| 6 | 10 | US4 - Bulk Evaluation |
| 7 | 6 | Export (PDF/Word/Excel) |
| 8 | 7 | Polish |
| **Total** | **106** | |

### Tasks Per User Story

| Story | Tasks | Description |
|-------|-------|-------------|
| US1 | 10 | View tables with firms |
| US2 | 5 | Manual editing |
| US5 | 4 | Calculations |
| US6 | 5 | Data persistence |
| US3 | 15 | Individual parsing |
| US7 | 32 | Full price schedule, merge rows, edit descriptions |
| US4 | 10 | Bulk evaluation |
| Shared | 25 | Setup, foundation, export, polish |
