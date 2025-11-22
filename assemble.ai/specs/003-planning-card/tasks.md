# Tasks: Planning Card

**Feature**: Planning Card
**Branch**: `003-planning-card`
**Spec**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

## Phase 1: Setup & Database

- [ ] T001 Install new dependencies (react-hook-form, zod, AI SDK, Mapbox client)
- [ ] T002 Create database schema in drizzle/schema/planning.ts
- [ ] T003 Generate and run database migrations
- [ ] T004 Create seed data for default consultant disciplines and contractor trades
- [ ] T005 Create validation schemas in lib/validations/planning-schema.ts

## Phase 2: Core API Routes

- [ ] T006 Create GET /api/planning/[projectId] route
- [ ] T007 Create PUT /api/planning/[projectId]/details route
- [ ] T008 Create PUT /api/planning/[projectId]/objectives route
- [ ] T009 Create PUT /api/planning/[projectId]/stages route
- [ ] T010 Create GET/POST /api/planning/[projectId]/risks routes
- [ ] T011 Create GET/POST /api/planning/[projectId]/stakeholders routes

## Phase 3: Consultant/Contractor API Routes

- [ ] T012 Create GET/POST /api/consultants/disciplines routes
- [ ] T013 Create PUT /api/consultants/disciplines/[id]/status route
- [ ] T014 Create GET/POST /api/contractors/trades routes
- [ ] T015 Create PUT /api/contractors/trades/[id]/status route

## Phase 4: User Story 1 - View Project Details

**Goal**: Users can view all 7 sections with their respective fields.
**Test**: Load Planning Card and verify all sections appear.

- [ ] T016 [US1] Create PlanningCard main component shell
- [ ] T017 [US1] Create DetailsSection component with 8 fields
- [ ] T018 [US1] Create ObjectivesSection component with 4 fields
- [ ] T019 [US1] Create StagingSection component with 5 stages
- [ ] T020 [US1] Create RiskSection component with risk list
- [ ] T021 [US1] Create StakeholdersSection component
- [ ] T022 [US1] Create ConsultantListSection component
- [ ] T023 [US1] Create ContractorListSection component
- [ ] T024 [US1] Implement data fetching with use-planning-data hook
- [ ] T025 [US1] Style all sections with dark theme

## Phase 5: User Story 2 - Edit Fields Inline

**Goal**: Users can click any field to edit and save automatically.
**Test**: Click field, edit, verify auto-save.

- [ ] T026 [US2] Create InlineEditField reusable component
- [ ] T027 [US2] Create use-inline-edit hook with optimistic updates
- [ ] T028 [US2] Integrate InlineEditField into DetailsSection
- [ ] T029 [US2] Integrate InlineEditField into ObjectivesSection
- [ ] T030 [US2] Add loading spinner and success indicators
- [ ] T031 [US2] Implement Tab navigation between fields
- [ ] T032 [US2] Add debounced auto-save (500ms)

## Phase 6: User Story 3 - Validate and Handle Errors

**Goal**: Users see clear validation errors and save failure messages.
**Test**: Enter invalid data, verify error messages.

- [ ] T033 [US3] Add Zod validation to all inline edit fields
- [ ] T034 [US3] Display inline error messages
- [ ] T035 [US3] Add error handling for failed saves with retry
- [ ] T036 [US3] Implement required field validation

## Phase 7: User Story 4 - Undo Recent Changes

**Goal**: Users can press Ctrl+Z to undo edits.
**Test**: Edit field, press Ctrl+Z, verify revert.

- [ ] T037 [US4] Create use-undo-history hook
- [ ] T038 [US4] Integrate undo history with inline editing
- [ ] T039 [US4] Add keyboard shortcut handler (Ctrl+Z/Cmd+Z)
- [ ] T040 [US4] Add undo/redo UI indicators

## Phase 8: User Story 5 - Manage Consultant Disciplines

**Goal**: Users can toggle consultant disciplines and track status.
**Test**: Toggle discipline, verify tab creation in Consultant Card.

- [ ] T041 [US5] Create scrollable consultant disciplines list
- [ ] T042 [US5] Add toggle control for each discipline
- [ ] T043 [US5] Display 4 status icons (Brief, Tender, Rec, Award)
- [ ] T044 [US5] Implement status icon click handlers
- [ ] T045 [US5] Create tab in Consultant Card when toggled on
- [ ] T046 [US5] Remove tab from Consultant Card when toggled off (with confirmation)

## Phase 9: User Story 6 - Manage Contractor Trades

**Goal**: Users can toggle contractor trades and track status.
**Test**: Toggle trade, verify tab creation in Contractor Card.

- [ ] T047 [US6] Create scrollable contractor trades list
- [ ] T048 [US6] Add toggle control for each trade
- [ ] T049 [US6] Display 4 status icons (Brief, Tender, Rec, Award)
- [ ] T050 [US6] Implement status icon click handlers
- [ ] T051 [US6] Create tab in Contractor Card when toggled on
- [ ] T052 [US6] Remove tab from Contractor Card when toggled off (with confirmation)

## Phase 10: User Story 7 - AI-Assisted Field Filling

**Goal**: Users can click "Suggest" to get AI-generated content.
**Test**: Click "Suggest" on Objectives, verify AI fills fields.

- [ ] T053 [US7] Create AIAssistButton component
- [ ] T054 [US7] Create POST /api/ai/suggest route
- [ ] T055 [US7] Integrate Vercel AI SDK
- [ ] T056 [US7] Add "Suggest" button to Objectives section
- [ ] T057 [US7] Add "Suggest" button to Staging section
- [ ] T058 [US7] Add "Suggest" button to Risk section
- [ ] T059 [US7] Implement AI prompt engineering for construction context
- [ ] T060 [US7] Make AI suggestions editable before accepting

## Phase 11: User Story 8 - Smart Defaults from Address

**Goal**: Address auto-fills Zoning, Jurisdiction, Lot Area.
**Test**: Enter address, verify auto-fill.

- [ ] T061 [US8] Create GET /api/gis/lookup route
- [ ] T062 [US8] Integrate Mapbox Geocoding API
- [ ] T063 [US8] Create GIS data cache table and logic
- [ ] T064 [US8] Add address field change handler
- [ ] T065 [US8] Auto-fill Zoning, Jurisdiction, Lot Area on address lookup
- [ ] T066 [US8] Handle GIS lookup failures gracefully
- [ ] T067 [US8] Allow manual override of auto-filled fields

## Phase 12: User Story 9 - Interactive Staging Timeline

**Goal**: Users can drag on timeline grid to set stage durations.
**Test**: Drag on timeline, verify duration saves.

- [ ] T068 [US9] Create TimelineGrid component
- [ ] T069 [US9] Implement grid-based timeline visualization
- [ ] T070 [US9] Add drag-to-set duration with @dnd-kit
- [ ] T071 [US9] Display stage durations visually
- [ ] T072 [US9] Save duration on drag release
- [ ] T073 [US9] Show stage dependencies and overlaps

## Phase 13: User Story 10 - Export Planning Card as PDF

**Goal**: Directors can export Planning Card as formatted PDF.
**Test**: Click "Export PDF", verify PDF generation.

- [ ] T074 [US10] Create PDFExportButton component
- [ ] T075 [US10] Create POST /api/export/pdf route
- [ ] T076 [US10] Implement PDF generation with jsPDF
- [ ] T077 [US10] Format all 7 sections in PDF
- [ ] T078 [US10] Include revision history in PDF
- [ ] T079 [US10] Add progress indicator during generation
- [ ] T080 [US10] Apply branding and professional formatting

## Phase 14: Integration & Polish

- [ ] T081 Modify ConsultantCard to support dynamic tabs
- [ ] T082 Modify ContractorCard to support dynamic tabs
- [ ] T083 Create revision history tracking service
- [ ] T084 Add loading states for all async operations
- [ ] T085 Implement error boundaries for each section
- [ ] T086 Add responsive design for smaller screens
- [ ] T087 Optimize performance (lazy loading, memoization)
- [ ] T088 Add accessibility attributes (ARIA labels, keyboard nav)

## Phase 15: Testing & Documentation

- [ ] T089 Manual test: View all sections
- [ ] T090 Manual test: Inline editing and auto-save
- [ ] T091 Manual test: Consultant/Contractor toggle and tab creation
- [ ] T092 Manual test: AI suggestions
- [ ] T093 Manual test: GIS address lookup
- [ ] T094 Manual test: Interactive timeline
- [ ] T095 Manual test: PDF export
- [ ] T096 Manual test: Undo/redo functionality
- [ ] T097 Update quickstart.md with final implementation details
- [ ] T098 Create walkthrough with screenshots

## Dependencies

1. **Phase 1-3** (Setup, Core APIs, Consultant/Contractor APIs) MUST complete first
2. **Phase 4** (US1 - View) depends on Phases 1-3
3. **Phase 5** (US2 - Inline Edit) depends on Phase 4
4. **Phase 6** (US3 - Validation) depends on Phase 5
5. **Phase 7** (US4 - Undo) depends on Phase 5
6. **Phase 8-9** (US5-6 - Consultant/Contractor) depend on Phases 1-3, can run parallel to Phase 4-7
7. **Phase 10-13** (US7-10 - AI, GIS, Timeline, PDF) depend on Phase 4, can run in parallel
8. **Phase 14** (Integration) depends on all user story phases
9. **Phase 15** (Testing) depends on Phase 14

## Implementation Strategy

1. **MVP (Phases 1-6)**: Core viewing and inline editing functionality
2. **Enhanced (Phases 7-9)**: Undo, consultant/contractor management
3. **Advanced (Phases 10-13)**: AI, GIS, timeline, PDF export
4. **Production (Phases 14-15)**: Integration, polish, testing

**Total Tasks**: 98
**Estimated Complexity**: High (50+ FRs, 12 entities, multiple integrations)
