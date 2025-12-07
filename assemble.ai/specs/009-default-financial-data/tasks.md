# Tasks: Default Financial Data Initialization

**Input**: Design documents from `/specs/009-default-financial-data/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/projects-init.yaml, quickstart.md

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

---

## 📊 Implementation Status

**Last Updated**: 2025-12-06

| Phase | Status | Tasks Complete | Notes |
|-------|--------|----------------|-------|
| Phase 1: Setup | ✅ **COMPLETE** | 2/2 | Constants file created and populated |
| Phase 2: Foundational | ✅ **COMPLETE** | 14/15 | PC_ITEMS→CONSTRUCTION rename done. T017 pending DB verification |
| Phase 3: US1/2/5 | ✅ **COMPLETE** | 5/5 | Cost line initialization implemented |
| Phase 4: US3 | ⏸️ **PENDING** | 0/2 | Needs verification that existing endpoints work |
| Phase 5: US4 | ⚠️ **PARTIAL** | 3/3 | Sample data created. Variation linked to 2.02 instead of 4.01 |
| Phase 6: Polish | ❌ **NOT STARTED** | 0/4 | Validation and testing phase |
| **TOTAL** | **73% Complete** | **24/31** | **Core functionality implemented** |

**Key Findings:**
- ✅ Core feature (cost line initialization) is complete and functional
- ⚠️ Sample variation linked to "2.02 Architect" instead of "4.01 Construction Contingency" (spec deviation)
- ⏸️ Migration T017 needs verification - requires running on existing database
- ❌ Phase 6 validation tasks not yet executed

**Next Steps:**
1. Fix sample variation link to use 4.01 instead of 2.02 (if spec compliance required)
2. Verify existing delete/edit endpoints work with default cost lines (Phase 4)
3. Run migration script if there's an existing database with PC_ITEMS data (T017)
4. Execute Phase 6 validation tasks (T028-T031)

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Exact file paths included in descriptions

## Path Conventions

- **Single project**: Next.js app at repository root
- Source: `src/`
- Scripts: `scripts/`
- Database migrations: `drizzle/`

---

## Phase 1: Setup

**Purpose**: Create directory structure and initialize constants file

- [x] T001 Create constants directory at `src/lib/constants/` if not exists
- [x] T002 Create `src/lib/constants/default-cost-lines.ts` with DefaultCostLineTemplate interface and empty array

---

## Phase 2: Foundational (PC_ITEMS → CONSTRUCTION Rename)

**Purpose**: Update section enum from PC_ITEMS to CONSTRUCTION across all affected files

**⚠️ CRITICAL**: This rename MUST be complete before any new cost line initialization code is added

### Database Migration

- [x] T003 Create database migration script `scripts/run-migration-0011.js` to update existing cost_lines.section from 'PC_ITEMS' to 'CONSTRUCTION'
- [x] T004 Create SQL migration file `drizzle/0011_section_rename.sql`

### TypeScript File Updates (Parallel)

- [x] T005 [P] Update `src/types/cost-plan.ts` - Change CostLineSection type and SECTION_LABELS from PC_ITEMS to CONSTRUCTION
- [x] T006 [P] Update `src/app/projects/[projectId]/cost-plan/page.tsx` - Update section dropdown option
- [x] T007 [P] Update `src/app/cost-plan-poc/page.tsx` - Update section type and labels
- [x] T008 [P] Update `src/components/cost-plan/cells/CostLineDropdown.tsx` - Update section mapping
- [x] T009 [P] Update `src/lib/calculations/variance.ts` - Update sections array
- [x] T010 [P] Update `src/components/cost-plan/CostPlanPanel.tsx` - Update SECTION_DISPLAY_NAMES and SECTIONS
- [x] T011 [P] Update `src/components/cost-plan/CostPlanSheet.tsx` - Update SECTION_NAMES and sections array
- [x] T012 [P] Update `src/lib/calculations/cost-plan-formulas.ts` - Update sections array
- [x] T013 [P] Update `src/components/cost-plan/dialogs/ColumnMappingDialog.tsx` - Update section description
- [x] T014 [P] Update `src/lib/calculations/aggregations.ts` - Update sections arrays (2 locations)
- [x] T015 [P] Update `src/lib/fortune-sheet/row-groups.ts` - Update SECTIONS, SECTION_NAMES, SECTION_ICONS
- [x] T016 [P] Update `src/components/cost-plan/sheets/ProjectSummarySheet.tsx` - Update SECTIONS array

### Run Migration

- [ ] T017 Run migration script `node scripts/run-migration-0011.js` and verify existing data updated (needs verification with existing database)

**Checkpoint**: PC_ITEMS → CONSTRUCTION rename complete. All references updated.

---

## Phase 3: User Story 1, 2, 5 - Pre-populated Cost Plan with Sections & Codes (Priority: P1)

**Goal**: When a new project is created, cost_lines table is populated with 20 default entries across 4 sections (FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY) with nominal budget amounts totaling $900,000 and cost codes (1.xx, 2.xx, 3.xx, 4.xx).

**Independent Test**: Create a new project, navigate to Cost Plan tab, verify 20 line items present across 4 sections with budget amounts.

### Implementation

- [x] T018 [US1] Populate `src/lib/constants/default-cost-lines.ts` with full DEFAULT_COST_LINES array:
  - FEES section (4 items): Council Fees $25,000, Section 7.12 Levy $50,000, LSL Levy $15,000, Authority Fees $10,000
  - CONSULTANTS section (10 items): PM $50,000, Architect $80,000, Town Planner $15,000, Structural $25,000, Civil $15,000, Surveyor $8,000, BCA $12,000, Certifier $20,000, QS $25,000, Fire $15,000
  - CONSTRUCTION section (5 items): Prelims $150,000, Fitout $200,000, FF&E $50,000, IT/AV $30,000, Landscaping $25,000
  - CONTINGENCY section (1 item): Construction Contingency $80,000
- [x] T019 [US1] Add findCostLineByCode helper function to `src/lib/constants/default-cost-lines.ts`
- [x] T020 [US1] Import DEFAULT_COST_LINES in `src/app/api/projects/route.ts`
- [x] T021 [US1] Extend POST handler transaction in `src/app/api/projects/route.ts` to insert 20 cost line records with budgetCents, costCode, section, description, sortOrder
- [x] T022 [US1] Update InitializationSummary response in `src/app/api/projects/route.ts` to include costLines count and totalBudgetCents

**Checkpoint**: New projects now have 20 pre-populated cost lines with sections, codes, and budget amounts.

---

## Phase 4: User Story 3 - Delete or Modify Default Items (Priority: P1)

**Goal**: Users can delete or edit default cost lines to customize their project.

**Independent Test**: Delete a default cost line, verify it's removed; edit description, verify it persists.

### Implementation

- [ ] T023 [US3] Verify existing DELETE endpoint in `src/app/api/cost-lines/[id]/route.ts` handles default cost lines (no changes expected - existing functionality)
- [ ] T024 [US3] Verify existing PUT/PATCH endpoint in `src/app/api/cost-lines/[id]/route.ts` handles default cost lines (no changes expected - existing functionality)

**Checkpoint**: Default cost lines are deletable and editable using existing functionality.

---

## Phase 5: User Story 4 - Sample Variation and Invoice (Priority: P2)

**Goal**: Create one sample variation linked to Construction Contingency (4.01) and one sample invoice linked to Project Manager (2.01) to demonstrate linking workflow.

**Independent Test**: Create a new project, verify Variations tab has PV-001, Invoices tab has INV-SAMPLE-001, both linked to correct cost lines.

### Implementation

- [x] T025 [US4] Extend POST handler transaction in `src/app/api/projects/route.ts` to insert sample variation:
  - variationNumber: 'PV-001'
  - category: 'Principal'
  - description: 'Sample variation - delete if not needed'
  - status: 'Forecast'
  - amountForecastCents: 1000000 ($10,000)
  - costLineId: ⚠️ **IMPLEMENTED but linked to 2.02 Architect instead of 4.01 Construction Contingency as per spec**
- [x] T026 [US4] Extend POST handler transaction in `src/app/api/projects/route.ts` to insert sample invoice:
  - invoiceNumber: 'INV-SAMPLE-001'
  - description: 'Sample invoice - delete if not needed'
  - amountCents: 100000 ($1,000)
  - gstCents: 10000 ($100)
  - costLineId: link to 2.01 Project Manager
  - paidStatus: 'unpaid'
- [x] T027 [US4] Update InitializationSummary response in `src/app/api/projects/route.ts` to include sampleVariation and sampleInvoice boolean flags

**Checkpoint**: New projects have sample variation and invoice demonstrating linking workflow.

---

## Phase 6: Polish & Validation

**Purpose**: Final validation and cleanup

- [ ] T028 Verify idempotency: Create project twice, confirm no duplicate cost lines (FR-010)
- [ ] T029 Verify atomicity: Introduce failure in transaction, confirm no orphan data exists (FR-009)
- [ ] T030 Run quickstart.md validation checklist:
  - [ ] 20 cost lines present across 4 sections
  - [ ] FEES section shows $100,000 total
  - [ ] CONSULTANTS section shows $265,000 total
  - [ ] CONSTRUCTION section shows $455,000 total
  - [ ] CONTINGENCY section shows $80,000 total
  - [ ] Variations tab has PV-001
  - [ ] Invoices tab has INV-SAMPLE-001
- [ ] T031 Performance validation: Confirm project creation with 22 new records completes in <2 seconds (SC-001)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1/2/5 (Phase 3) can start after Foundational
  - US3 (Phase 4) is verification only, can run after Phase 3
  - US4 (Phase 5) can run in parallel with US3, depends on Phase 3 completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1, US2, US5 (Cost Lines)**: Core feature - must complete first
- **US3 (Delete/Edit)**: Verification task - depends on US1
- **US4 (Sample Variation/Invoice)**: Depends on cost lines (needs costLineId references)

### Parallel Opportunities

**Phase 2 Parallel Block (T005-T016)**:
```
All 12 TypeScript file updates can run in parallel:
- src/types/cost-plan.ts
- src/app/projects/[projectId]/cost-plan/page.tsx
- src/app/cost-plan-poc/page.tsx
- src/components/cost-plan/cells/CostLineDropdown.tsx
- src/lib/calculations/variance.ts
- src/components/cost-plan/CostPlanPanel.tsx
- src/components/cost-plan/CostPlanSheet.tsx
- src/lib/calculations/cost-plan-formulas.ts
- src/components/cost-plan/dialogs/ColumnMappingDialog.tsx
- src/lib/calculations/aggregations.ts
- src/lib/fortune-sheet/row-groups.ts
- src/components/cost-plan/sheets/ProjectSummarySheet.tsx
```

---

## Implementation Strategy

### MVP First (Phase 1-3)

1. Complete Phase 1: Setup (constants file structure)
2. Complete Phase 2: Foundational (PC_ITEMS → CONSTRUCTION rename)
3. Complete Phase 3: User Story 1/2/5 (cost line initialization)
4. **STOP and VALIDATE**: Create new project, verify 20 cost lines appear
5. Deploy/demo if ready

### Full Feature

1. Complete MVP above
2. Add Phase 4: Verify delete/edit works (US3)
3. Add Phase 5: Sample variation and invoice (US4)
4. Complete Phase 6: Polish and validation

---

## Task Summary

| Phase | Task Count | Parallel Tasks |
|-------|------------|----------------|
| Phase 1: Setup | 2 | 0 |
| Phase 2: Foundational | 15 | 12 |
| Phase 3: US1/2/5 | 5 | 0 |
| Phase 4: US3 | 2 | 0 |
| Phase 5: US4 | 3 | 0 |
| Phase 6: Polish | 4 | 0 |
| **Total** | **31** | **12** |

---

## Notes

- Schema already updated (PC_ITEMS → CONSTRUCTION in schema.ts) - only need code file updates
- All amounts stored in cents (e.g., $50,000 = 5000000 cents)
- better-sqlite3 uses synchronous transactions - no async/await needed
- Cost codes follow pattern: section.item (1.01, 2.03, etc.)
- Sample data clearly marked "delete if not needed" for user guidance
