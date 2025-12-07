# Tasks: Planning Card

**Feature**: Planning Card
**Branch**: `003-planning-card`
**Spec**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

## Status Summary (Updated 2025-12-07)

| Phase | Status | Completed | Total |
|-------|--------|-----------|-------|
| Phase 1: Setup & Database | ✅ Complete | 5/5 | 100% |
| Phase 2: Core API Routes | 🟡 Almost | 5/6 | 83% |
| Phase 3: Consultant/Contractor APIs | ✅ Complete | 4/4 | 100% |
| Phase 4: View Project Details | ✅ Complete | 10/10 | 100% |
| Phase 5: Edit Fields Inline | 🟡 Almost | 6/7 | 86% |
| Phase 5a: Document Extraction (US7a) | ✅ Complete | 9/9 | 100% |
| Phase 5b: Document Extraction (US7b) | ✅ Complete | 7/7 | 100% |
| Phase 6: Validation/Errors | 🟡 Partial | 3/4 | 75% |
| Phase 7: Undo | ❌ Not Started | 0/4 | 0% |
| Phase 8-9: Consultant/Contractor Mgmt | ✅ Complete | 12/12 | 100% |
| Phase 10: AI-Assisted (US7) | 🔷 Ready (RAG deps met) | 0/8 | 0% |
| Phase 11-13: GIS/Timeline/PDF | ❌ Not Started | 0/20 | 0% |
| Phase 14: Integration | 🟡 Partial | 4/8 | 50% |
| Phase 15: Testing | ❌ Not Started | 0/10 | 0% |
| Phase 16: Project Init | 🟡 Almost | 2/3 | 67% |

**Overall Progress**: ~67/117 tasks (57%)
**MVP Status**: Core viewing and inline editing functional

### Cross-Spec Notes
- 🔷 Phase 10 (AI-Assisted) now uses **007-RAG infrastructure** (LangGraph, Voyage embeddings, RAG retrieval)
- 007-RAG Phase 2 (Foundational) is **COMPLETE** - Phase 10 can begin implementation
- ✅ **Knowledge Libraries Section** integrated into PlanningCard (via 007-RAG Phase 10)
  - 6 global repo tiles for organization-wide document libraries
  - Save/Load document selections to/from global repos

## Phase 1: Setup & Database

- [x] T001 Install new dependencies (react-hook-form, zod, AI SDK, Mapbox client)
- [x] T002 Create database schema in drizzle/schema/planning.ts
- [x] T003 Generate and run database migrations
- [x] T004 Create seed data for default consultant disciplines and contractor trades
- [x] T005 Create validation schemas in lib/validations/planning-schema.ts
  - Implemented: `src/lib/validations/planning-schema.ts` with projectDetails, projectObjectives, projectStage, risk, stakeholder schemas

## Phase 2: Core API Routes

- [x] T006 Create GET /api/planning/[projectId] route
  - Implemented: `src/app/api/planning/[projectId]/route.ts` - returns details, objectives, stages, risks, stakeholders
- [x] T007 Create PUT /api/planning/[projectId]/details route
  - Implemented: `src/app/api/planning/[projectId]/details/route.ts`
- [x] T008 Create PUT /api/planning/[projectId]/objectives route
  - Implemented: `src/app/api/planning/[projectId]/objectives/route.ts`
- [ ] T009 Create PUT /api/planning/[projectId]/stages route
  - **Not implemented** - No stages PUT route exists (only GET via main route)
- [x] T010 Create GET/POST /api/planning/[projectId]/risks routes
  - Implemented: `src/app/api/planning/[projectId]/risks/route.ts`
- [x] T011 Create GET/POST /api/planning/[projectId]/stakeholders routes
  - Implemented: `src/app/api/planning/[projectId]/stakeholders/route.ts`

## Phase 3: Consultant/Contractor API Routes

- [x] T012 Create GET/POST /api/consultants/disciplines routes
- [x] T013 Create PUT /api/consultants/disciplines/[id]/status route
- [x] T014 Create GET/POST /api/contractors/trades routes
- [x] T015 Create PUT /api/contractors/trades/[id]/status route

## Phase 4: User Story 1 - View Project Details

**Goal**: Users can view all 7 sections with their respective fields.
**Test**: Load Planning Card and verify all sections appear.

- [x] T016 [US1] Create PlanningCard main component shell
  - Implemented: `src/components/dashboard/PlanningCard.tsx`
- [x] T017 [US1] Create DetailsSection component with 8 fields
  - Implemented: `src/components/dashboard/planning/DetailsSection.tsx` with all 8 fields
- [x] T018 [US1] Create ObjectivesSection component with 4 fields
  - Implemented: `src/components/dashboard/planning/ObjectivesSection.tsx` with 4 fields
- [x] T019 [US1] Create StagingSection component with 5 stages
  - Implemented: `src/components/dashboard/planning/StagingSection.tsx` (basic display, no editing)
- [x] T020 [US1] Create RiskSection component with risk list
  - Implemented: `src/components/dashboard/planning/RiskSection.tsx` (basic display)
- [x] T021 [US1] Create StakeholdersSection component
  - Implemented: `src/components/dashboard/planning/StakeholdersSection.tsx` (basic display)
- [x] T022 [US1] Create ConsultantListSection component
  - Implemented: `src/components/dashboard/planning/ConsultantListSection.tsx` with toggle & status icons
- [x] T023 [US1] Create ContractorListSection component
  - Implemented: `src/components/dashboard/planning/ContractorListSection.tsx` with toggle & status icons
- [x] T024 [US1] Implement data fetching with use-planning-data hook
  - Implemented: Data fetching inline in PlanningCard.tsx (no separate hook file)
- [x] T025 [US1] Style all sections with dark theme
  - Implemented: VS Code-inspired dark theme applied to all sections

## Phase 5: User Story 2 - Edit Fields Inline

**Goal**: Users can click any field to edit and save automatically.
**Test**: Click field, edit, verify auto-save.

- [x] T026 [US2] Create InlineEditField reusable component
  - Implemented: `src/components/dashboard/planning/InlineEditField.tsx` with click-to-edit, multiline support
- [~] T027 [US2] Create use-inline-edit hook with optimistic updates
  - **Partial**: Optimistic updates implemented directly in InlineEditField (no separate hook file)
- [x] T028 [US2] Integrate InlineEditField into DetailsSection
  - Implemented: All 8 fields use InlineEditField
- [x] T029 [US2] Integrate InlineEditField into ObjectivesSection
  - Implemented: All 4 fields use InlineEditField with multiline
- [x] T030 [US2] Add loading spinner and success indicators
  - Implemented: Spinner during save, green checkmark on success
- [ ] T031 [US2] Implement Tab navigation between fields
  - **Not implemented**
- [x] T032 [US2] Add debounced auto-save (500ms)
  - Implemented: 300ms debounce on blur (see InlineEditField.tsx:90)

## Phase 5a: User Story 7a - Document Extraction for Details Section

**Goal**: Users can drag files, paste text, or drop Outlook emails to auto-fill Details fields.
**Test**: Drag PDF onto Details section, verify fields are populated.
**Status**: ✅ Complete

- [x] T032a [US7a] Install mammoth library for DOCX text extraction
  - Command: `npm install mammoth`
  - Implemented: Added to package.json dependencies
- [x] T032b [US7a] Add DOCX extraction to text-extraction.ts
  - Implemented: `src/lib/utils/text-extraction.ts`
  - Added `extractTextFromDocx()` function using mammoth
  - Updated `extractText()` to handle .docx files
  - Added `calculateProjectDetailsConfidence()` for confidence scoring
- [x] T032c [US7a] Create POST /api/planning/extract route
  - Implemented: `src/app/api/planning/extract/route.ts`
  - Accepts FormData (file) or JSON (text) input
  - Uses Anthropic Claude 3.5 Haiku for extraction
  - Returns: { data, confidence, originalText }
  - Extracts: projectName, buildingClass, address, legalAddress, zoning, jurisdiction, lotArea, numberOfStories
- [x] T032d [US7a] Add drag-and-drop handlers to DetailsSection
  - Implemented: `src/components/dashboard/planning/DetailsSection.tsx`
  - `onDragOver`, `onDragLeave`, `onDrop` handlers
  - Supports: PDF, JPG, PNG, TXT, DOCX files
  - Drop zone overlay with Upload icon
- [x] T032e [US7a] Add paste handler for text/email content
  - Implemented: `handlePaste` in DetailsSection.tsx
  - Supports plain text and HTML (Outlook emails)
  - Strips HTML tags from pasted content
  - Ignores paste when focused on input fields
- [x] T032f [US7a] Add Outlook email drag support
  - Implemented: Checks `dataTransfer.getData('text/plain')` for email body
  - Falls back to file handling for .msg files
- [x] T032g [US7a] Add extraction progress overlay
  - Implemented: Spinner overlay with "Extracting project details..." message
  - Uses `isExtracting` state
- [x] T032h [US7a] Add confidence toast notifications
  - Implemented: Toast on success with confidence percentage
  - Warning toast (destructive variant) for confidence < 70%
- [x] T032i [US7a] Integrate extraction with updateMultipleFields
  - Implemented: `updateMultipleFields()` sends extracted data to PUT /api/planning/[projectId]/details

## Phase 5b: User Story 7b - Document Extraction for Objectives Section

**Goal**: Users can drag files, paste text, or drop Outlook emails to auto-fill Objectives fields.
**Test**: Drag project brief PDF onto Objectives section, verify fields are populated.
**Status**: ✅ Complete

- [x] T032j [US7b] Create POST /api/planning/extract-objectives route
  - Implemented: `src/app/api/planning/extract-objectives/route.ts`
  - Accepts FormData (file) or JSON (text) input
  - Uses Anthropic Claude 3.5 Haiku for extraction
  - Returns: { data, confidence, originalText }
  - Extracts: functional, quality, budget, program
  - Includes `calculateObjectivesConfidence()` for confidence scoring
- [x] T032k [US7b] Add drag-and-drop handlers to ObjectivesSection
  - Implemented: `src/components/dashboard/planning/ObjectivesSection.tsx`
  - `onDragOver`, `onDragLeave`, `onDrop` handlers
  - Supports: PDF, JPG, PNG, TXT, DOCX files
  - Drop zone overlay with Upload icon
- [x] T032l [US7b] Add paste handler for text/email content
  - Implemented: `handlePaste` in ObjectivesSection.tsx
  - Supports plain text and HTML (Outlook emails)
  - Strips HTML tags from pasted content
  - Ignores paste when focused on input fields
- [x] T032m [US7b] Add Outlook email drag support
  - Implemented: Checks `dataTransfer.getData('text/plain')` for email body
  - Falls back to file handling for .msg files
- [x] T032n [US7b] Add extraction progress overlay
  - Implemented: Spinner overlay with "Extracting objectives..." message
  - Uses `isExtracting` state
- [x] T032o [US7b] Add confidence toast notifications
  - Implemented: Toast on success with confidence percentage
  - Warning toast (destructive variant) for confidence < 70%
- [x] T032p [US7b] Integrate extraction with updateMultipleFields
  - Implemented: `updateMultipleFields()` sends extracted data to PUT /api/planning/[projectId]/objectives

## Phase 6: User Story 3 - Validate and Handle Errors

**Goal**: Users see clear validation errors and save failure messages.
**Test**: Enter invalid data, verify error messages.

- [~] T033 [US3] Add Zod validation to all inline edit fields
  - **Partial**: Zod validation in API routes, not client-side inline fields
- [x] T034 [US3] Display inline error messages
  - Implemented: Error message display in InlineEditField.tsx:142-144, 158-160
- [x] T035 [US3] Add error handling for failed saves with retry
  - Implemented: Error handling with revert on failure, stays in edit mode for retry
- [x] T036 [US3] Implement required field validation
  - Implemented: `required` prop on InlineEditField with validation (line 53-56)

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

- [x] T041 [US5] Create scrollable consultant disciplines list
- [x] T042 [US5] Add toggle control for each discipline
- [x] T043 [US5] Display 4 status icons (Brief, Tender, Rec, Award)
- [x] T044 [US5] Implement status icon click handlers
- [x] T045 [US5] Create tab in Consultant Card when toggled on
- [x] T046 [US5] Remove tab from Consultant Card when toggled off (with confirmation)

## Phase 9: User Story 6 - Manage Contractor Trades

**Goal**: Users can toggle contractor trades and track status.
**Test**: Toggle trade, verify tab creation in Contractor Card.

- [x] T047 [US6] Create scrollable contractor trades list
- [x] T048 [US6] Add toggle control for each trade
- [x] T049 [US6] Display 4 status icons (Brief, Tender, Rec, Award)
- [x] T050 [US6] Implement status icon click handlers
- [x] T051 [US6] Create tab in Contractor Card when toggled on
- [x] T052 [US6] Remove tab from Contractor Card when toggled off (with confirmation)

## Phase 10: User Story 7 - AI-Assisted Field Filling

**Goal**: Users can click "Suggest" to get AI-generated content informed by synced documents.
**Test**: Sync project brief → Click "Suggest" on Objectives → Verify AI fills fields with RAG-informed content.
**Dependency**: Requires 007-RAG Phase 2 (Foundational) complete. Uses existing RAG infrastructure.

### Prerequisites (from 007-RAG)
- [x] RAG retrieval pipeline (`src/lib/rag/retrieval.ts`) - already implemented
- [x] Document sync to AI (`src/lib/hooks/use-document-sets.ts`) - already implemented
- [x] Supabase PostgreSQL + pgvector - already configured

### Tasks

- [ ] T053 [US7] Create src/lib/langgraph/nodes/suggest-planning-fields.ts:
  - LangGraph node for Planning Card field suggestions
  - Uses hybrid context: Planning Card data (exact) + RAG retrieval (synced docs)
  - Returns structured field suggestions (not full report)
  - Supports section parameter: 'objectives' | 'staging' | 'risks'

- [ ] T054 [US7] Create POST /api/ai/suggest route:
  - Input: { projectId, section, documentSetId? }
  - Calls LangGraph suggest-planning-fields node
  - Returns: { suggestions: { field: value }, sources: SourceReference[] }
  - Graceful degradation when no synced docs (uses Planning Card context only)

- [ ] T055 [US7] Create src/components/dashboard/planning/AIAssistButton.tsx:
  - "Suggest" button with loading state and streaming support
  - Shows source attribution (which synced docs informed suggestion)
  - Displays "Sync documents for better suggestions" when no docs synced
  - Integrates with use-sync-status hook to check sync state

- [ ] T056 [US7] Add "Suggest" button to ObjectivesSection.tsx:
  - Integrate AIAssistButton with section='objectives'
  - Auto-fill Functional, Quality, Budget, Program fields on accept
  - Show diff preview before accepting suggestions

- [ ] T057 [US7] Add "Suggest" button to StagingSection.tsx:
  - Integrate AIAssistButton with section='staging'
  - Suggest timeline and milestones based on project scope
  - Allow selective accept (pick which stages to update)

- [ ] T058 [US7] Add "Suggest" button to RiskSection.tsx:
  - Integrate AIAssistButton with section='risks'
  - Suggest risk items with description, likelihood, impact, mitigation
  - Allow adding suggested risks to existing list

- [ ] T059 [US7] Create construction-specific prompt templates:
  - `src/lib/prompts/objectives-suggest.ts` - construction project objectives
  - `src/lib/prompts/staging-suggest.ts` - construction project phases
  - `src/lib/prompts/risks-suggest.ts` - construction risk identification
  - Include industry terminology and compliance considerations

- [ ] T060 [US7] Create src/lib/hooks/use-ai-suggestions.ts:
  - Hook for managing suggestion state, loading, and acceptance
  - Integrates with RAG sync status
  - Handles optimistic updates on acceptance

### Architecture Note

This phase uses the **same LangGraph orchestration** as 007-RAG tender report generation but with a simpler workflow:
- Single node execution (suggest-planning-fields) vs. multi-stage report generation
- Reuses RAG retrieval pipeline (`src/lib/rag/retrieval.ts`)
- Reuses planning context fetch (`src/lib/services/planning-context.ts` from 007-RAG T039a)

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

- [x] T081 Modify ConsultantCard to support dynamic tabs
  - Implemented: Dynamic tabs based on enabled disciplines
- [x] T082 Modify ContractorCard to support dynamic tabs
  - Implemented: Dynamic tabs based on enabled trades
- [~] T083 Create revision history tracking service
  - **Not implemented** - No revision history service exists
- [x] T084 Add loading states for all async operations
  - **Partial**: Loading states in PlanningCard, ConsultantListSection, ContractorListSection
- [ ] T085 Implement error boundaries for each section
  - **Not implemented**
- [ ] T086 Add responsive design for smaller screens
  - **Not implemented** - Currently uses fixed grid layouts
- [ ] T087 Optimize performance (lazy loading, memoization)
  - **Not implemented**
- [ ] T088 Add accessibility attributes (ARIA labels, keyboard nav)
  - **Not implemented**
- [x] T088a Integrate KnowledgeLibrariesSection into PlanningCard
  - Implemented: Via 007-RAG Phase 10 (T110-T113)
  - 6 global repo tiles for organization-wide document libraries
  - Save/Load document selections to/from global repos
- [x] T088b Integrate DisciplineRepoTiles into ConsultantCard/ContractorCard
  - Implemented: Via 007-RAG Phase 10 (T114-T118)
  - Sources tiles (Save/Load), Generation Mode tiles, Transmittal tiles
  - Layout reordered: Tiles → Reports → Brief → FeeStructure → Firms

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

## Phase 16: Project Initialization (Bug Fix)

**Goal**: Ensure new projects are automatically initialized with all planning data.
**Related Spec**: FR-051 to FR-058, SC-022 to SC-024
**Bug Report**: [008-project-initialization](../../008-project-initialization/spec.md)

- [x] T099 [FR-051-058] Add project initialization logic to POST /api/projects
  - Implemented: `src/app/api/projects/route.ts` with full transaction support
  - ✅ Wrap all operations in a database transaction (line 38)
  - ✅ Create 36 consultant disciplines with isEnabled: false (line 51-59)
  - ✅ Create 144 consultant statuses (4 per discipline) with isActive: false (line 61-70)
  - ✅ Create 21 contractor trades with isEnabled: false (line 72-80)
  - ✅ Create 84 contractor statuses (4 per trade) with isActive: false (line 82-91)
  - ✅ Create 5 default project stages (line 93-107)
  - ✅ Create empty ProjectDetails record (line 109-115)
  - ✅ Create empty ProjectObjectives record (line 117-121)
  - ✅ Rollback on any failure (transaction wrapping)

- [x] T100 [Migration] Create migration script for existing projects
  - Implemented: `scripts/migrate-project-initialization.js`
  - ✅ For each project without disciplines, create all planning data
  - ✅ Idempotent (safe to run multiple times)
  - ✅ Skip projects that already have complete data

- [ ] T101 [Testing] Test project initialization
  - Manual testing required:
  - [ ] Create new project → verify 292 records created
  - [ ] Simulate DB failure → verify rollback (no partial data)
  - [ ] Run migration on existing projects → verify backfill
  - [ ] Run migration twice → verify no duplicates

## Dependencies

### Internal Dependencies (003-planning-card)

1. **Phase 1-3** (Setup, Core APIs, Consultant/Contractor APIs) MUST complete first
2. **Phase 4** (US1 - View) depends on Phases 1-3
3. **Phase 5** (US2 - Inline Edit) depends on Phase 4
4. **Phase 6** (US3 - Validation) depends on Phase 5
5. **Phase 7** (US4 - Undo) depends on Phase 5
6. **Phase 8-9** (US5-6 - Consultant/Contractor) depend on Phases 1-3, can run parallel to Phase 4-7
7. **Phase 11-13** (US8-10 - GIS, Timeline, PDF) depend on Phase 4, can run in parallel
8. **Phase 14** (Integration) depends on all user story phases
9. **Phase 15** (Testing) depends on Phase 14

### Cross-Spec Dependencies (007-RAG)

10. **Phase 10** (US7 - AI-Assisted Field Filling) depends on **007-RAG Phase 2 (Foundational)**:
    - Requires: `src/lib/rag/retrieval.ts` (RAG retrieval pipeline)
    - Requires: `src/lib/db/rag-client.ts` (Supabase PostgreSQL connection)
    - Requires: Document sync infrastructure (document sets, sync status)
    - Uses: LangGraph for orchestration (same as 007-RAG report generation)
    - **Status**: 007-RAG Phase 2 is COMPLETE ✓

```
007-RAG Implementation Status (as of 2025-12-03):
┌─────────────────────────────────────────────────────────────┐
│ Phase 1 (Setup)              ✓ Complete                     │
│ Phase 2 (Foundational)       ✓ Complete ← 003 US7 depends   │
│ Phase 3 (US1: Document Sync) ✓ Complete                     │
│ Phase 4 (US2: Report Gen)    ○ Not Started                  │
│ Phase 5-8                    ○ Not Started                  │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

1. **MVP (Phases 1-6)**: Core viewing and inline editing functionality
2. **Enhanced (Phases 7-9)**: Undo, consultant/contractor management
3. **Advanced (Phases 10-13)**: AI, GIS, timeline, PDF export
4. **Production (Phases 14-15)**: Integration, polish, testing

**Total Tasks**: 101
**Estimated Complexity**: High (58 FRs, 12 entities, multiple integrations)
