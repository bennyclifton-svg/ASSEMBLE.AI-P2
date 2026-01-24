# Tasks: Unified Stakeholder System

**Feature**: 020-stakeholder | **Generated**: 2026-01-21
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Task Overview

| Phase | Description | Tasks | Dependencies |
|-------|-------------|-------|--------------|
| 1 | Setup | 4 | None |
| 2 | Foundational (Data Layer) | 8 | Phase 1 |
| 3 | US1 - AI-Powered Generation (P1) | 6 | Phase 2 |
| 4 | US2 - Group Management (P1) ✅ | 12 | Phase 2 |
| 5 | US3 - Tender Process (P2) | 5 | Phases 2, 4 |
| 6 | US4 - Client & Authority (P2) | 4 | Phases 2, 4 |
| 7 | US5 - Data Migration (P3) | 5 | Phase 2 |
| 8 | Polish & Integration | 5 | All previous |

**Total**: 49 tasks

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and dependencies verification

- [x] T001 Verify Profiler (019) module is available at `src/lib/services/planning-context.ts`
- [x] T002 [P] Verify existing table patterns in `src/lib/db/schema.ts`
- [x] T003 [P] Verify existing table patterns in `src/lib/db/pg-schema.ts`
- [x] T004 [P] Verify existing component patterns in `src/components/dashboard/planning/ConsultantListSection.tsx`

---

## Phase 2: Foundational (Data Layer - Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core data infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create Stakeholder TypeScript types in `src/types/stakeholder.ts` (NEW - copy from data-model.md)
- [x] T006 Add `projectStakeholders` table to SQLite schema in `src/lib/db/schema.ts` (MODIFY)
- [x] T007 Add `stakeholderTenderStatuses` table to SQLite schema in `src/lib/db/schema.ts` (MODIFY)
- [x] T008 Add `stakeholderSubmissionStatuses` table to SQLite schema in `src/lib/db/schema.ts` (MODIFY)
- [x] T009 Add stakeholder tables to PostgreSQL schema in `src/lib/db/pg-schema.ts` (MODIFY)
- [x] T010 Run database migration: `drizzle/0005_mature_maverick.sql` contains all stakeholder tables
- [x] T011 Create stakeholder service with CRUD operations in `src/lib/services/stakeholder-service.ts` (NEW)
- [x] T012 Add tender status operations to `src/lib/services/stakeholder-service.ts` (EXTEND)
- [x] T013 Add submission status operations to `src/lib/services/stakeholder-service.ts` (EXTEND)
- [x] T014 Add count and reorder operations to `src/lib/services/stakeholder-service.ts` (EXTEND)

**Checkpoint**: Foundation ready - user story implementation can now begin ✅

---

## Phase 3: User Story 1 - AI-Powered Stakeholder Generation (Priority: P1) ✅ COMPLETE

**Goal**: Reduce manual data entry by 80% via AI-powered stakeholder generation from Profile/Objectives

**Independent Test**: Create project with completed Profile, click Generate, verify populated stakeholder list matches expected disciplines for project type

### Implementation for User Story 1

- [x] T015 [P] [US1] Create default stakeholder data file at `src/lib/data/default-stakeholders.ts` (NEW)
- [x] T016 [US1] Create stakeholder generation service in `src/lib/services/stakeholder-generation.ts` (NEW)
- [x] T017 [US1] Create generate API route at `src/app/api/projects/[projectId]/stakeholders/generate/route.ts` (NEW)
- [x] T018 [US1] Create GenerateStakeholdersDialog component at `src/components/stakeholders/GenerateStakeholdersDialog.tsx` (NEW)
- [x] T019 [US1] Add AI-generated visual indicator - `isAiGenerated` flag stored, notes contain generation reason
- [x] T020 [US1] Implement merge/replace prompt when generating over existing stakeholders

**Checkpoint**: User Story 1 fully functional - AI generation works end-to-end ✅

---

## Phase 4: User Story 2 - Stakeholder Group Management (Priority: P1) ✅ COMPLETE

**Goal**: Unified two-panel interface showing all 4 groups with team size counts and collapsible table sections

**Independent Test**: Navigate to Stakeholders, verify left nav shows 4 groups with counts, main panel shows 4 collapsible tables, add/edit/delete stakeholders

### API Routes for User Story 2

- [x] T021 [P] [US2] Create stakeholder list/create API at `src/app/api/projects/[projectId]/stakeholders/route.ts` (NEW)
- [x] T022 [P] [US2] Create individual stakeholder API at `src/app/api/projects/[projectId]/stakeholders/[stakeholderId]/route.ts` (NEW)
- [x] T023 [P] [US2] Create reorder API at `src/app/api/projects/[projectId]/stakeholders/reorder/route.ts` (NEW)

### UI Components for User Story 2

- [x] T024 [US2] Create StakeholderSection container at `src/components/stakeholders/StakeholderSection.tsx` (NEW)
- [x] T025 [US2] ~~Create StakeholderGroupNav component~~ - SIMPLIFIED: Navigation built into StakeholderSection (collapsible groups with icons/counts)
- [x] T026 [US2] ~~Create StakeholderGroupSection component~~ - SIMPLIFIED: Group rendering built into StakeholderSection
- [x] T027 [US2] ~~Create StakeholderTable component~~ - SIMPLIFIED: Table rendering built into StakeholderSection
- [x] T028 [US2] Create StakeholderRow component at `src/components/stakeholders/StakeholderRow.tsx` (NEW)
- [x] T029 [US2] Create AddStakeholderRow component at `src/components/stakeholders/AddStakeholderRow.tsx` (NEW)
- [x] T030 [US2] Integrate StakeholderSection into PlanningCard at `src/components/dashboard/PlanningCard.tsx` (MODIFY)
- [x] T031 [US2] Add Stakeholders section visible in PlanningCard left panel
- [x] T032 [US2] Implement inline edit for stakeholder fields using existing InlineEditField pattern

**Checkpoint**: User Story 2 fully functional - all CRUD operations and inline editing implemented ✅

---

## Phase 5: User Story 3 - Tender Process Integration (Priority: P2) ⚠️ PARTIALLY COMPLETE

**Goal**: Track 4-stage tender process (Brief, Tender, Rec, Award) for Consultant/Contractor groups with Cost Plan integration on Award

**Independent Test**: Toggle tender stages for consultant, verify progress updates, mark Award, confirm Cost Plan integration prompt

### Implementation for User Story 3

- [x] T033 [US3] ~~Create tender status API~~ - Handled via main PATCH API at `[stakeholderId]/route.ts` with `statusUpdate` body
- [x] T034 [US3] ~~Create TenderProgressBar component~~ - SIMPLIFIED: Inline B/T/R/A buttons in StakeholderRow.tsx
- [ ] T035 [US3] Implement handleAwardComplete function in `src/lib/services/stakeholder-service.ts` (EXTEND) - **NOT IMPLEMENTED**
- [ ] T036 [US3] Create LinkCostPlanDialog component at `src/components/stakeholders/LinkCostPlanDialog.tsx` (NEW) - **NOT IMPLEMENTED**
- [x] T037 [US3] Integrate TenderProgressBar into StakeholderRow for Consultant/Contractor groups - Basic implementation done

**Checkpoint**: User Story 3 partially functional - basic tender toggle works, Cost Plan integration missing

---

## Phase 6: User Story 4 - Client & Authority Stakeholder Management (Priority: P2) ⚠️ PARTIALLY COMPLETE

**Goal**: Simpler workflows for Client (contact management) and Authority (submission status tracking)

**Independent Test**: Add stakeholders to Client/Authority groups, verify no tender process columns, notes/contact fields work, Authority shows submission status

### Implementation for User Story 4

- [x] T038 [US4] ~~Create submission status API~~ - Handled via main PATCH API at `[stakeholderId]/route.ts` with `statusUpdate` body
- [x] T039 [US4] ~~Create SubmissionStatusBadge component~~ - SIMPLIFIED: Dropdown select in StakeholderRow.tsx
- [ ] T040 [US4] Implement Authority-specific table columns in StakeholderTable (submission type, status, due date) - **PARTIAL: Status dropdown exists, due date/submission type columns NOT shown**
- [ ] T041 [US4] Integrate Authority approval status with Planning indicators at `src/components/dashboard/planning/StatusIndicator.tsx` (MODIFY) - **NOT IMPLEMENTED**

**Checkpoint**: User Story 4 partially functional - basic status dropdown works, full columns/integration missing

---

## Phase 7: User Story 5 - Data Migration from Existing System (Priority: P3) ❌ NOT STARTED

**Goal**: Migrate existing consultant disciplines, contractor trades, and stakeholders to new unified schema with 100% data preservation

**Independent Test**: Run migration on project with existing data, verify all data appears correctly in new Stakeholders section

### Implementation for User Story 5

- [ ] T042 [US5] Create stakeholder migration utility at `src/lib/utils/stakeholder-migration.ts` (NEW)
- [ ] T043 [US5] Create migrate API at `src/app/api/projects/[projectId]/stakeholders/migrate/route.ts` (NEW)
- [ ] T044 [US5] Implement auto-migration check on StakeholderSection first access
- [ ] T045 [US5] Add migration status indicator and manual trigger button
- [ ] T046 [US5] Preserve all legacy data (tender statuses, firm associations, brief/scope data)

**Checkpoint**: User Story 5 not started - migration system needed for existing data

---

## Phase 8: Polish & Cross-Cutting Concerns ❌ NOT STARTED

**Purpose**: Deprecation of old sections, final integration, cleanup

- [ ] T047 Deprecate ConsultantListSection at `src/components/dashboard/planning/ConsultantListSection.tsx` (MODIFY - add feature flag)
- [ ] T048 Deprecate ContractorListSection at `src/components/dashboard/planning/ContractorListSection.tsx` (MODIFY - add feature flag)
- [ ] T049 Remove old nav items from Planning page (behind feature flag)
- [ ] T050 Add FEATURE_UNIFIED_STAKEHOLDERS environment variable for gradual rollout
- [ ] T051 Run quickstart.md validation scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ────────────────────────────────┐
                                               ▼
Phase 2: Foundational (Data Layer) ◀───── BLOCKS ALL STORIES
         │
         ├──────────┬──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼          ▼
     Phase 3    Phase 4    Phase 5    Phase 6    Phase 7
     (US1)      (US2)      (US3)      (US4)      (US5)
     Gen.       Groups     Tender     Client/    Migration
                           Process    Authority
         │          │          │          │          │
         └──────────┴──────────┴──────────┴──────────┘
                                               │
                                               ▼
                                    Phase 8: Polish
```

### User Story Dependencies

- **US1 (AI Generation)**: Depends on Phase 2 only. Independent from other stories.
- **US2 (Group Management)**: Depends on Phase 2 only. Core UI that other stories extend.
- **US3 (Tender Process)**: Depends on Phase 2 + needs US2 components (StakeholderRow).
- **US4 (Client/Authority)**: Depends on Phase 2 + needs US2 components (StakeholderTable).
- **US5 (Migration)**: Depends on Phase 2 only. Independent utility.

### Recommended Execution Order

**MVP Path** (fastest to demo):
1. Phase 1 → Phase 2 → Phase 4 (US2) → Demo stakeholder management UI
2. Add Phase 3 (US1) → Demo AI generation
3. Add Phases 5-6 (US3, US4) → Demo full workflows
4. Add Phase 7 (US5) → Production-ready with migration

**Parallel Opportunities**:
- After Phase 2 completes, all user stories can start in parallel
- Within Phase 2: T006, T007, T008 can run in parallel
- Within Phase 4: T021, T022, T023 (APIs) can run in parallel
- US1 and US5 are fully independent from each other

---

## Parallel Example: Phase 2 Foundation

```bash
# After T005 (types) completes, launch schema tasks in parallel:
Task T006: "Add projectStakeholders table to SQLite schema"
Task T007: "Add stakeholderTenderStatuses table to SQLite schema"
Task T008: "Add stakeholderSubmissionStatuses table to SQLite schema"
```

## Parallel Example: Phase 4 APIs

```bash
# All API routes are independent files, can run in parallel:
Task T021: "Create stakeholder list/create API"
Task T022: "Create individual stakeholder API"
Task T023: "Create reorder API"
```

---

## Checklist Summary

### Phase 1: Setup ✅ (4/4)
- [x] T001 Verify Profiler module available
- [x] T002 Verify SQLite schema patterns
- [x] T003 Verify PostgreSQL schema patterns
- [x] T004 Verify component patterns

### Phase 2: Foundational ✅ (10/10)
- [x] T005 Create TypeScript types
- [x] T006 Add projectStakeholders table (SQLite)
- [x] T007 Add stakeholderTenderStatuses table (SQLite)
- [x] T008 Add stakeholderSubmissionStatuses table (SQLite)
- [x] T009 Add tables to PostgreSQL schema
- [x] T010 Run database migration
- [x] T011 Create service - CRUD operations
- [x] T012 Add service - tender status operations
- [x] T013 Add service - submission status operations
- [x] T014 Add service - count & reorder operations

### Phase 3: US1 - AI Generation ✅ (6/6)
- [x] T015 Create default stakeholder data file
- [x] T016 Create stakeholder generation service
- [x] T017 Create generate API route
- [x] T018 Create GenerateStakeholdersDialog component
- [x] T019 Add AI-generated visual indicator
- [x] T020 Implement merge/replace prompt

### Phase 4: US2 - Group Management ✅ (12/12)
- [x] T021 Create list/create API
- [x] T022 Create individual stakeholder API
- [x] T023 Create reorder API
- [x] T024 Create StakeholderSection container
- [x] T025 ~~Create StakeholderGroupNav~~ (built into StakeholderSection)
- [x] T026 ~~Create StakeholderGroupSection~~ (built into StakeholderSection)
- [x] T027 ~~Create StakeholderTable~~ (built into StakeholderSection)
- [x] T028 Create StakeholderRow component
- [x] T029 Create AddStakeholderRow component
- [x] T030 Integrate into Planning page
- [x] T031 Add Stakeholders nav item
- [x] T032 Implement inline edit

### Phase 5: US3 - Tender Process ⚠️ (3/5)
- [x] T033 Tender status API (via main PATCH)
- [x] T034 TenderProgressBar (inline in StakeholderRow)
- [ ] **T035 Implement handleAwardComplete** ❌
- [ ] **T036 Create LinkCostPlanDialog** ❌
- [x] T037 Integrate TenderProgressBar into rows

### Phase 6: US4 - Client & Authority ⚠️ (2/4)
- [x] T038 Submission status API (via main PATCH)
- [x] T039 SubmissionStatusBadge (dropdown in StakeholderRow)
- [ ] **T040 Implement Authority table columns** ❌
- [ ] **T041 Integrate with Planning indicators** ❌

### Phase 7: US5 - Migration ❌ (0/5)
- [ ] T042 Create migration utility
- [ ] T043 Create migrate API
- [ ] T044 Implement auto-migration check
- [ ] T045 Add migration status indicator
- [ ] T046 Preserve all legacy data

### Phase 8: Polish ❌ (0/5)
- [ ] T047 Deprecate ConsultantListSection
- [ ] T048 Deprecate ContractorListSection
- [ ] T049 Remove old nav items (feature flag)
- [ ] T050 Add feature flag environment variable
- [ ] T051 Run quickstart.md validation

---

## Implementation Progress Summary

| Phase | Status | Completed | Total | % |
|-------|--------|-----------|-------|---|
| 1. Setup | ✅ Complete | 4 | 4 | 100% |
| 2. Foundational | ✅ Complete | 10 | 10 | 100% |
| 3. US1 Generation | ✅ Complete | 6 | 6 | 100% |
| 4. US2 Groups | ✅ Complete | 12 | 12 | 100% |
| 5. US3 Tender | ⚠️ Partial | 3 | 5 | 60% |
| 6. US4 Authority | ⚠️ Partial | 2 | 4 | 50% |
| 7. US5 Migration | ❌ Not Started | 0 | 5 | 0% |
| 8. Polish | ❌ Not Started | 0 | 5 | 0% |
| **TOTAL** | | **37** | **51** | **73%** |

---

## Notes

1. **Profiler Dependency**: US1 (T016) requires Profiler (019) module to be complete for `getRecommendedDisciplines()` function
2. **Existing Components**: Check `src/components/dashboard/planning/TenderProgressBar.tsx` before creating new (T034)
3. **InlineEditField**: Reuse existing pattern from `src/components/dashboard/planning/InlineEditField.tsx`
4. **Feature Flag**: Use `FEATURE_UNIFIED_STAKEHOLDERS` for gradual rollout (T050)
5. **Migration Safety**: Always backup database before running migration in production
6. **Tests Optional**: Test tasks not included per speckit.tasks template - add if explicitly requested
