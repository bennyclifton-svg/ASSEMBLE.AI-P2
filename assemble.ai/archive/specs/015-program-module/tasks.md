# Tasks: Program Module

**Input**: `/specs/015-program-module/spec.md`
**Feature**: 015-program-module
**Date**: 2025-12-16
**Last Updated**: 2025-12-16

**Tests**: Integration tests for drag interactions and persistence.

**Organization**: Tasks grouped by implementation phase to enable incremental delivery.

---

## Progress Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Database Schema & Types |
| 2 | ✅ Complete | API Routes - Activities CRUD |
| 3 | ✅ Complete | API Routes - Dependencies & Milestones |
| 4 | ✅ Complete | API Routes - Templates & Export |
| 5 | ⏳ Pending | API Routes - AI Parsing |
| 6 | ✅ Complete | React Hooks |
| 7 | ✅ Complete | Core UI Components |
| 8 | ✅ Complete | Timeline Header |
| 9 | ✅ Complete | Bar Rendering & Interactions |
| 10 | ✅ Complete | Milestones |
| 11 | ✅ Complete | Dependencies |
| 12 | ✅ Complete | Hierarchy & Collapse |
| 13 | ✅ Complete | Templates |
| 14 | ⏳ Pending | AI Parsing UI |
| 15 | ✅ Complete | Export |
| 16 | ✅ Complete | Dashboard Integration |
| 17 | ⏳ Pending | Polish & Testing |

**Completed**: 79 of 92 tasks (~86%)
**Remaining**: Phase 5 (AI Parsing API), Phase 14 (AI Parsing UI), Phase 17 (Polish & Testing)

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Which phase this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Database Schema & Types ✅

**Purpose**: Create tables and TypeScript types for program data

- [x] T001 Add `programActivities` table to `src/lib/db/schema.ts` (id, projectId, parentId, name, startDate, endDate, collapsed, color, sortOrder, timestamps)
- [x] T002 [P] Add `programDependencies` table to `src/lib/db/schema.ts` (id, projectId, fromActivityId, toActivityId, type enum FS/SS/FF)
- [x] T003 [P] Add `programMilestones` table to `src/lib/db/schema.ts` (id, activityId, name, date, sortOrder)
- [x] T004 Create migration script at `scripts/run-migration-0020.js` for program tables
- [x] T005 Run migration to create program tables
- [x] T006 [P] Create TypeScript types in `src/types/program.ts` (ProgramActivity, ProgramDependency, ProgramMilestone, DependencyType)

**Checkpoint**: Database ready for program data ✅

---

## Phase 2: API Routes - Activities CRUD ✅

**Purpose**: Core activity management endpoints

- [x] T007 [P] Create GET `/api/projects/[projectId]/program/route.ts` - returns activities, dependencies, milestones for project
- [x] T008 [P] Create POST `/api/projects/[projectId]/program/activities/route.ts` - create activity (handles parentId, auto-assigns color)
- [x] T009 [P] Create PATCH `/api/projects/[projectId]/program/activities/[id]/route.ts` - update activity (name, dates, collapsed, parentId)
- [x] T010 [P] Create DELETE `/api/projects/[projectId]/program/activities/[id]/route.ts` - delete activity and children
- [x] T011 Create POST `/api/projects/[projectId]/program/reorder/route.ts` - reorder activities (handles indent/outdent via parentId changes)

**Checkpoint**: Activity CRUD functional ✅

---

## Phase 3: API Routes - Dependencies & Milestones ✅

**Purpose**: Dependency and milestone management endpoints

- [x] T012 [P] Create POST `/api/projects/[projectId]/program/dependencies/route.ts` - create dependency (FS/SS/FF)
- [x] T013 [P] Create DELETE `/api/projects/[projectId]/program/dependencies/[id]/route.ts` - delete dependency
- [x] T014 [P] Create POST `/api/projects/[projectId]/program/activities/[id]/milestones/route.ts` - add milestone
- [x] T015 [P] Create DELETE `/api/projects/[projectId]/program/milestones/[id]/route.ts` - delete milestone

**Checkpoint**: Full API coverage for relationships ✅

---

## Phase 4: API Routes - Templates & Export ✅

**Purpose**: Template insertion and PDF export

- [x] T016 Create template definitions in `src/lib/constants/program-templates.ts` (Design, Tender, Construction, Consultant phases)
- [x] T017 Create POST `/api/projects/[projectId]/program/template/route.ts` - insert template activities as parent with children
- [x] T018 Create GET `/api/projects/[projectId]/program/export/route.ts` - generate PDF using jsPDF with autoTable

**Checkpoint**: Templates and export functional ✅

---

## Phase 5: API Routes - AI Parsing

**Purpose**: Extract schedule from uploaded files

- [ ] T019 Create POST `/api/projects/[projectId]/program/parse/route.ts` - accepts file upload, returns extracted activities
- [ ] T020 [P] Add Excel parsing logic using xlsx library (detect task/start/end columns)
- [ ] T021 [P] Add PDF/Word parsing via Claude API (extract activities with dates)
- [ ] T022 Add confirmation flow - return parsed data for user review before insert

**Checkpoint**: AI parsing functional

---

## Phase 6: React Hooks ✅

**Purpose**: Data fetching and mutations for program data

- [x] T023 Create `src/lib/hooks/use-program.ts` - fetch activities, dependencies, milestones for project
- [x] T024 [P] Add mutations: createActivity, updateActivity, deleteActivity
- [x] T025 [P] Add mutations: createDependency, deleteDependency
- [x] T026 [P] Add mutations: createMilestone, deleteMilestone
- [x] T027 Add mutation: reorderActivities (for drag reorder and indent/outdent)
- [x] T028 Add mutation: insertTemplate
- [x] T029 [P] Add optimistic updates for all mutations (uses custom useState/useCallback pattern, not react-query)

**Checkpoint**: Data layer complete ✅

---

## Phase 7: Core UI Components ✅

**Purpose**: Basic table structure and row rendering

- [x] T030 Create `src/components/program/ProgramPanel.tsx` - main container, fetches data, tab content wrapper (with RefetchContext)
- [x] T031 Create `src/components/program/ProgramToolbar.tsx` - Add button, template dropdown, zoom toggle (Week/Month), export button
- [x] T032 Create `src/components/program/ProgramTable.tsx` - table container, generates timeline header, renders rows
- [x] T033 Create `src/components/program/ProgramRow.tsx` - activity row (indent padding, chevron, name input, cell grid)
- [x] T034 Create `src/components/program/ProgramCell.tsx` - cell functionality integrated into ProgramRow (double-click for milestone)

**Checkpoint**: Basic table renders with activities ✅

---

## Phase 8: Timeline Header ✅

**Purpose**: Month/week header generation and zoom toggle

- [x] T035 Create timeline header generation logic in ProgramTable - calculate visible weeks from project date range
- [x] T036 Add month grouping row above week row in header
- [x] T037 Implement zoom toggle - switch between week columns and month columns
- [x] T038 Add Today marker - vertical dashed line at current date
- [x] T039 Add sticky first column (activity names) with horizontal scroll for timeline

**Checkpoint**: Timeline header functional with zoom and Today marker ✅

---

## Phase 9: Bar Rendering & Interactions ✅

**Purpose**: Duration bars with drag/resize/move

- [x] T040 Create `src/components/program/ProgramBar.tsx` - renders bar overlay on cells based on startDate/endDate
- [x] T041 Add bar edge resize handles (cursor: ew-resize on hover)
- [x] T042 Implement drag-to-create: horizontal drag across empty cells creates bar
- [x] T043 Implement bar move: click+drag bar body moves entire bar
- [x] T044 Implement bar resize: drag edge extends/shrinks duration
- [x] T045 Add week-snap behavior (default snaps to week boundaries)
- [x] T046 Add Shift+drag fine adjustment (snaps to day within week)
- [x] T047 Auto-save on drag end (call updateActivity mutation)

**Checkpoint**: Bar interactions fully functional ✅

---

## Phase 10: Milestones ✅

**Purpose**: Milestone markers and forms

- [x] T048 Create `src/components/program/MilestoneMarker.tsx` - diamond icon positioned at milestone date
- [x] T049 Create `src/components/program/MilestoneForm.tsx` - simplified to browser prompt for milestone name
- [x] T050 Implement double-click on cell → open MilestoneForm → create milestone on submit
- [x] T051 Add milestone delete via double-click on marker

**Checkpoint**: Milestones functional ✅

---

## Phase 11: Dependencies ✅

**Purpose**: Dependency connectors and drag-to-connect

- [x] T052 Create `src/components/program/BarHandles.tsx` - handles integrated into ProgramBar component
- [x] T053 Create `src/components/program/DependencyArrows.tsx` - SVG overlay rendering curved dependency arrows
- [x] T054 Implement drag-from-arrow: start drag from arrow handle
- [x] T055 Detect drop target: left edge = SS, right edge = FF, body = FS
- [x] T056 Create dependency on drop (call createDependency mutation)
- [x] T057 Add right-click on connector → delete dependency
- [x] T058 Style connectors by type (FS: solid line, SS/FF: dashed lines)

**Checkpoint**: Dependencies fully functional ✅

---

## Phase 12: Hierarchy & Collapse ✅

**Purpose**: Parent/child relationships and collapse/expand

- [x] T059 Add indent/outdent via Tab/Shift+Tab key handlers in ProgramRow
- [ ] T060 Add indent/outdent toolbar buttons to ProgramToolbar (Tab/Shift+Tab available instead)
- [x] T061 Implement indent logic: set parentId to row above, update sortOrder
- [x] T062 Implement outdent logic: set parentId to null, update sortOrder
- [x] T063 Add chevron icon to parent rows (has children)
- [x] T064 Implement collapse/expand: click chevron toggles collapsed state
- [x] T065 Hide/show children based on parent collapsed state
- [x] T066 Persist collapsed state to database

**Checkpoint**: Hierarchy fully functional ✅

---

## Phase 13: Templates ✅

**Purpose**: Quick template insertion UI

- [x] T067 Create `src/components/program/TemplateMenu.tsx` - dropdown integrated into ProgramToolbar
- [x] T068 Implement template insertion: creates parent with children, no dates set
- [x] T069 Add toast notification on template insert success

**Checkpoint**: Templates functional ✅

---

## Phase 14: AI Parsing UI

**Purpose**: Drag & drop file parsing interface

- [ ] T070 Create `src/components/program/ProgramDropZone.tsx` - overlay for drag & drop files
- [ ] T071 Add file drop handling (Excel, PDF, Word)
- [ ] T072 Create parsing preview modal - show extracted activities for user review
- [ ] T073 Add confirm/cancel buttons to preview modal
- [ ] T074 Insert confirmed activities into table

**Checkpoint**: AI parsing UI complete

---

## Phase 15: Export ✅

**Purpose**: PDF export functionality

- [x] T075 Create PDF export logic in `src/lib/export/program-pdf.ts` - uses jsPDF with autoTable for table export
- [x] T076 Add export button to toolbar (calls export endpoint)
- [x] T077 Download PDF on completion

**Checkpoint**: Export functional ✅

---

## Phase 16: Dashboard Integration ✅

**Purpose**: Add Program tab to dashboard

- [x] T078 Add "Program" tab to ProcurementCard tab navigation (alongside Procurement, Cost Planning)
- [x] T079 Import ProgramPanel into ProcurementCard
- [x] T080 Wire up project context to ProgramPanel

**Checkpoint**: Program module integrated into dashboard ✅

---

## Phase 17: Polish & Testing

**Purpose**: Final touches and verification

- [ ] T081 [P] Add loading states to all async operations
- [ ] T082 [P] Add error handling and toast notifications
- [ ] T083 [P] Apply VS Code dark theme styling consistently
- [ ] T084 [P] Add keyboard shortcuts help tooltip
- [ ] T085 Test: Create parent, add children, verify indent levels
- [ ] T086 Test: Drag to create bar, move bar, resize bar
- [ ] T087 Test: Double-click to add milestone, verify display
- [ ] T088 Test: Drag arrow to create FS/SS/FF dependencies
- [ ] T089 Test: Insert template, verify parent/child structure
- [ ] T090 Test: Upload Excel/PDF, verify parsing and preview
- [ ] T091 Test: Export to PDF, verify output
- [ ] T092 Test: Data persists after page reload

**Checkpoint**: Program module complete and tested

---

## Dependencies & Execution Order

### Phase Dependencies

| Phase | Depends On | Notes |
|-------|------------|-------|
| 1 (Schema) | None | Start immediately |
| 2 (Activities API) | Phase 1 | Needs tables |
| 3 (Relations API) | Phase 1 | Can parallel with Phase 2 |
| 4 (Templates API) | Phase 2 | Needs activity create |
| 5 (AI Parsing API) | Phase 2 | Needs activity create |
| 6 (Hooks) | Phase 2, 3 | Needs all API routes |
| 7 (Core UI) | Phase 6 | Needs hooks |
| 8 (Timeline) | Phase 7 | Needs table structure |
| 9 (Bars) | Phase 7 | Needs row structure |
| 10 (Milestones) | Phase 9 | Needs bar context |
| 11 (Dependencies) | Phase 9 | Needs bar context |
| 12 (Hierarchy) | Phase 7 | Needs row structure |
| 13 (Templates UI) | Phase 4, 7 | Needs API + toolbar |
| 14 (Parsing UI) | Phase 5, 7 | Needs API + table |
| 15 (Export) | Phase 4, 8 | Needs API + timeline |
| 16 (Integration) | Phase 7-15 | All features ready |
| 17 (Polish) | Phase 16 | Final phase |

### Parallel Opportunities

**Phase 1** - Tables can be added in parallel:
```
T001: programActivities table
T002: programDependencies table
T003: programMilestones table
T006: TypeScript types
```

**Phase 2-3** - API routes can run in parallel:
```
T007: GET program
T008: POST activities
T009: PATCH activities/[id]
T010: DELETE activities/[id]
T012: POST dependencies
T013: DELETE dependencies/[id]
T014: POST milestones
T015: DELETE milestones/[id]
```

**Phase 6** - Hook mutations can run in parallel:
```
T024: activity mutations
T025: dependency mutations
T026: milestone mutations
T029: optimistic updates
```

---

## Estimated Effort

| Phase | Tasks | Estimate | Status |
|-------|-------|----------|--------|
| 1: Schema | 6 | 2 hours | ✅ Done |
| 2: Activities API | 5 | 3 hours | ✅ Done |
| 3: Relations API | 4 | 2 hours | ✅ Done |
| 4: Templates API | 3 | 2 hours | ✅ Done |
| 5: AI Parsing API | 4 | 4 hours | ⏳ Pending |
| 6: Hooks | 7 | 3 hours | ✅ Done |
| 7: Core UI | 5 | 4 hours | ✅ Done |
| 8: Timeline | 5 | 4 hours | ✅ Done |
| 9: Bars | 8 | 6 hours | ✅ Done |
| 10: Milestones | 4 | 2 hours | ✅ Done |
| 11: Dependencies | 7 | 5 hours | ✅ Done |
| 12: Hierarchy | 8 | 4 hours | ✅ Done |
| 13: Templates UI | 3 | 1 hour | ✅ Done |
| 14: Parsing UI | 5 | 3 hours | ⏳ Pending |
| 15: Export | 3 | 2 hours | ✅ Done |
| 16: Integration | 3 | 1 hour | ✅ Done |
| 17: Polish | 12 | 4 hours | ⏳ Pending |

**Total**: 92 tasks, ~52 hours estimated
**Completed**: ~41 hours worth of work done
**Remaining**: ~11 hours (AI Parsing + Polish & Testing)

---

## Implementation Strategy

### MVP First (Phases 1-9)
1. Schema + API (Phases 1-3)
2. Hooks + Core UI (Phases 6-7)
3. Timeline + Bars (Phases 8-9)
4. **STOP and VALIDATE**: Basic Gantt works
5. Demo to stakeholder

### Incremental Delivery
1. MVP → Basic table with bars
2. Add Milestones (Phase 10) → **Release 0.2**
3. Add Dependencies (Phase 11) → **Release 0.3**
4. Add Hierarchy (Phase 12) → **Release 0.4**
5. Add Templates (Phase 13) → **Release 0.5**
6. Add AI Parsing (Phase 14) → **Release 0.6**
7. Add Export (Phase 15) → **Release 0.7**
8. Integration + Polish → **Release 1.0**

---

## Notes

- Auto-color palette: 6-8 muted colors cycling per parent group
- Week boundaries: Monday start
- Shift+drag precision: snaps to nearest day
- Dependencies render as SVG overlay above table
- Collapsed state persisted per user session
- PDF export uses current zoom level (Week or Month)
