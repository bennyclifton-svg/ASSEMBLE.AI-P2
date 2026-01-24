# Tasks: Profiler Module

**Input**: Design documents from `/specs/019-profiler/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Requirements**: 151 total (P0: 89, P1: 42, P2: 16, P3: 4)

**Tests**: Not explicitly requested - omitting test tasks per speckit guidelines.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, database schema, and template files

- [X] T001 Create profiler component directory structure at src/components/profiler/
- [X] T002 [P] Add projectProfiles table schema to src/lib/db/pg-schema.ts (DB-001 to DB-009) - ALREADY EXISTS
- [X] T003 [P] Add profilerObjectives table schema to src/lib/db/pg-schema.ts (DB-010 to DB-014) - ALREADY EXISTS
- [X] T004 [P] Add profilePatterns table schema to src/lib/db/pg-schema.ts (DB-015 to DB-017) - ALREADY EXISTS
- [X] T005 Generate and run database migration for 3 new tables - SCHEMA ALREADY IN PLACE
- [X] T006 [P] Create TypeScript types for profiler entities in src/types/profiler.ts
- [X] T007 [P] Create Zod validation schemas in src/lib/validation/profile.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create profile-templates.json with building classes structure in src/lib/data/profile-templates.json (TPL-001)
- [X] T009 [P] Add Residential class subclasses, scale fields, and complexity options to profile-templates.json (TPL-002, TPL-003, TPL-004)
- [X] T010 [P] Add Commercial class subclasses, scale fields, and complexity options to profile-templates.json
- [X] T011 [P] Add Industrial class subclasses, scale fields, and complexity options to profile-templates.json
- [X] T012 [P] Add Institution class subclasses, scale fields, and complexity options to profile-templates.json
- [X] T013 [P] Add Mixed class subclasses, scale fields, and complexity options to profile-templates.json
- [X] T014 [P] Add Infrastructure class subclasses, scale fields, and complexity options to profile-templates.json
- [X] T015 Add Seniors Living (ILU and Class 9c) specific configurations to Residential class (SENIORS-001 to SENIORS-013)
- [X] T016 Create ProfileSection.tsx main container component (replaces ProfilerLayout.tsx) in src/components/profiler/ProfileSection.tsx (CMP-001, UI-001, UI-002, UI-003)
- [X] T017 [P] ProfileSection includes navigation (replaces LeftNavigation.tsx) (CMP-002, NAV-001, NAV-002, NAV-003)
- [X] T018 Add objective-templates.json with generation templates in src/lib/data/objective-templates.json (TPL-005, TPL-006, TPL-007)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Profile Selection (Priority: P0) MVP

**Goal**: User can select Building Class, Project Type, Subclass, Scale, and Complexity

**Independent Test**: User completes full profile selection and data persists to database

### Implementation for User Story 1

- [X] T019 [US1] ClassTypeSelector integrated in ProfileSection.tsx (CMP-004, PROF-001, PROF-002, PROF-003, PROF-004)
- [X] T020 [US1] SubclassSelector integrated in ProfileSection.tsx with multi-select for Mixed class (CMP-005, SUB-001 to SUB-006)
- [X] T021 [US1] ScaleInputs integrated in ProfileSection.tsx with dynamic fields from templates (CMP-006, SCALE-001 to SCALE-005)
- [X] T022 [US1] ComplexitySelector integrated in ProfileSection.tsx multi-dimensional selection (CMP-007, CMPLX-001 to CMPLX-005)
- [X] T023 [US1] Complexity dimension configurations in profile-templates.json for all 6 building classes (CMPLX-006 to CMPLX-015)
- [X] T024 [US1] ProfileSection.tsx container component created in src/components/profiler/ProfileSection.tsx (CMP-003)
- [X] T025 [US1] Implement PUT /api/projects/[projectId]/profile endpoint in src/app/api/projects/[projectId]/profile/route.ts (API-001, API-003, API-004)
- [X] T026 [US1] Implement GET /api/projects/[projectId]/profile endpoint in same route file
- [X] T027 [US1] Profile save performance optimization included (API-002, PERF-002)
- [ ] T028 [US1] Add responsive breakpoint handling at 768px (UI-004) - DEFERRED
- [ ] T029 [US1] Implement Middle Panel tab headers (dimmed during profiler) (TAB-001, TAB-002) - DEFERRED

**Checkpoint**: User Story 1 - Profile selection fully functional and data persists

---

## Phase 4: User Story 2 - Objectives Management (Priority: P0)

**Goal**: User can write manual objectives OR generate with AI, then edit and polish

**Independent Test**: User creates objectives via manual entry or AI generation, edits them, and polishes

### Implementation for User Story 2

- [X] T030 [US2] ObjectiveEditor integrated in ObjectivesProfilerSection.tsx (CMP-009, MANUAL-001, MANUAL-002, OBJ-004)
- [X] T031 [US2] ObjectivesProfilerSection.tsx created with Generate/Manual/Polish buttons in src/components/profiler/ObjectivesProfilerSection.tsx (CMP-008, OBJ-001, OBJ-002, OBJ-003)
- [X] T032 [US2] Template substitution logic implemented in generate API endpoint (GEN-002)
- [X] T033 [US2] POST /api/projects/[projectId]/objectives/generate endpoint implemented (API-005, GEN-001, GEN-004)
- [X] T034 [US2] PUT /api/projects/[projectId]/objectives endpoint implemented (API-006, MANUAL-003)
- [X] T035 [US2] GET /api/projects/[projectId]/objectives endpoint implemented
- [X] T036 [US2] POST /api/projects/[projectId]/objectives/polish endpoint implemented (API-007, POLISH-001, POLISH-002, POLISH-003)
- [X] T037 [US2] Objectives generation uses Claude Sonnet for performance (GEN-003, PERF-003)
- [X] T038 [US2] Polish operation uses Claude Sonnet for performance (POLISH-004, PERF-004)
- [ ] T039 [US2] Add diff highlighting for user edits in accent color (OBJ-006, EDIT-001, EDIT-002) - DEFERRED
- [X] T040 [US2] Polish button visibility logic implemented (only when content exists) (OBJ-005)

**Checkpoint**: User Story 2 - Objectives entry, generation, and polish fully functional

---

## Phase 5: User Story 3 - 10x Power Features (Priority: P1)

**Goal**: Smart defaults, context chips, complexity score, risk flags, and consultant preview

**Independent Test**: Selections trigger smart suggestions and real-time insights display

### Implementation for User Story 3

- [X] T041 [P] [US3] Create PowerFeatures directory at src/components/profiler/PowerFeatures/
- [X] T042 [P] [US3] Create ContextChips.tsx for instant insights display in src/components/profiler/PowerFeatures/ContextChips.tsx (POWER-007, POWER-008)
- [X] T043 [P] [US3] Create ComplexityScore.tsx with real-time calculation in src/components/profiler/PowerFeatures/ComplexityScore.tsx (POWER-009, POWER-010)
- [X] T044 [P] [US3] Create RiskFlags.tsx for auto-generated warnings in src/components/profiler/PowerFeatures/RiskFlags.tsx (POWER-015, POWER-016)
- [X] T045 [P] [US3] Create ConsultantPreview.tsx for discipline suggestions in src/components/profiler/PowerFeatures/ConsultantPreview.tsx (POWER-014)
- [X] T046 [P] [US3] Create MarketContext.tsx for benchmark display in src/components/profiler/PowerFeatures/MarketContext.tsx (POWER-012, POWER-013)
- [X] T047 [US3] Implement smart defaults logic in ScaleInputs.tsx (POWER-001)
- [X] T048 [US3] Implement complexity tier suggestion from scale in ComplexitySelector.tsx (POWER-002)
- [X] T049 [US3] Implement plausibility alerts as non-blocking warnings (POWER-004, POWER-005, POWER-006)
- [X] T050 [US3] Add consultant disciplines auto-suggestion based on profile (POWER-003)
- [X] T051 [US3] Add complexity contingency range suggestion (POWER-011)
- [X] T052 [US3] Add progressive disclosure behavior (POWER-017)
- [X] T053 [US3] Add tooltips for industry terms (POWER-018)
- [X] T054 [US3] Add keyboard navigation support (POWER-019)

**Checkpoint**: User Story 3 - Power features enhance profiler with real-time insights

---

## Phase 6: User Story 4 - AI Learning (Priority: P2/P3)

**Goal**: Aggregate learning from user inputs for template improvement

**Independent Test**: "Other" selections and polish edits are collected for pattern analysis

### Implementation for User Story 4

- [X] T055 [US4] Implement "Other" subclass entry collection logic (LEARN-001, SUB-006)
- [X] T056 [US4] Implement pattern upsert API for profilePatterns table in src/lib/services/pattern-learning.ts (LEARN-004)
- [X] T057 [US4] Add manual objectives analysis for common themes (LEARN-002)
- [X] T058 [US4] Add polish edit tracking for template improvement (LEARN-003)
- [X] T059 [US4] Add "Other" complexity input collection (CMPLX-005)

**Checkpoint**: User Story 4 - AI learning collects aggregate patterns

---

## Phase 7: User Story 5 - Integration (Priority: P1)

**Goal**: Profile integrates with Cost Plan, Programme, and Procurement modules

**Independent Test**: Profile data affects cost benchmarks, programme templates, and consultant disciplines

### Implementation for User Story 5

- [X] T060 [US5] Add complexity to cost multiplier integration in src/lib/services/planning-context.ts (INT-001)
- [X] T061 [US5] Add class/type to programme template mapping (INT-002)
- [X] T062 [US5] Add profile to consultant discipline determination (INT-003)
- [X] T063 [US5] Add profile data export for reports (INT-004)
- [X] T064 [US5] Implement legacy projectType fallback for backward compatibility (INT-005)
- [X] T065 [US5] Enable Middle Panel tabs after profile completion (TAB-003)
- [X] T066 [US5] Implement non-linear navigation between sections (NAV-004, NAV-005)

**Checkpoint**: User Story 5 - Profiler integrates with other modules

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final component assembly, code quality, and deprecation

- [X] T067 Create index.ts with all profiler exports in src/components/profiler/index.ts (CMP-010)
- [X] T068 [P] Verify total new code is <2000 lines (excluding templates) (CODE-005) - 1754 lines
- [X] T069 [P] Verify 0 new runtime dependencies added (CODE-006) - verified
- [X] T070 [P] Add deprecation notice to src/components/project-wizard/ directory (DEP-001)
- [ ] T071 Verify page load performance <200ms (PERF-001) - manual test required
- [X] T072 Ensure each component does ONE thing well (CODE-001) - verified
- [X] T073 Ensure data-driven UI pattern followed (CODE-002) - uses profile-templates.json
- [X] T074 Ensure no prop drilling beyond 2 levels (CODE-003) - verified
- [X] T075 Ensure no separate files for single-use types (CODE-004) - types in profiler.ts
- [X] T076 Ensure progressive enhancement works (CODE-007 - manual mode without AI) - manual entry works
- [ ] T077 Run quickstart.md validation scenarios - manual test required

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T007) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (T008-T018)
- **User Story 2 (Phase 4)**: Depends on Foundational (T008-T018), can parallel with US1
- **User Story 3 (Phase 5)**: Depends on US1 (T019-T029) for profile data
- **User Story 4 (Phase 6)**: Depends on US2 (T030-T040) for objectives data
- **User Story 5 (Phase 7)**: Depends on US1 and US2
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

- **US1 (Profile Selection)**: After Foundational - No dependencies on other stories
- **US2 (Objectives)**: After Foundational - Independent of US1 but better if US1 complete
- **US3 (Power Features)**: After US1 - Needs profile data for suggestions
- **US4 (AI Learning)**: After US2 - Needs objectives for pattern collection (can defer to post-MVP)
- **US5 (Integration)**: After US1, US2 - Connects to other modules

### Within Each User Story

- Templates/schemas before components
- Components before API routes
- Core implementation before enhancements
- Performance optimization as final step

### Parallel Opportunities

- T002, T003, T004: All schema additions in parallel (different tables)
- T006, T007: Types and validation in parallel (different files)
- T009-T014: All building class templates in parallel
- T041-T046: All Power Features components in parallel
- T068, T069, T070: All verification tasks in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all building class templates together:
Task: "Add Residential class subclasses, scale fields, and complexity options to profile-templates.json"
Task: "Add Commercial class subclasses, scale fields, and complexity options to profile-templates.json"
Task: "Add Industrial class subclasses, scale fields, and complexity options to profile-templates.json"
Task: "Add Institution class subclasses, scale fields, and complexity options to profile-templates.json"
Task: "Add Mixed class subclasses, scale fields, and complexity options to profile-templates.json"
Task: "Add Infrastructure class subclasses, scale fields, and complexity options to profile-templates.json"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T018)
3. Complete Phase 3: User Story 1 - Profile Selection (T019-T029)
4. Complete Phase 4: User Story 2 - Objectives (T030-T040)
5. **STOP and VALIDATE**: Test profile + objectives workflow
6. Deploy/demo if ready (89 P0 requirements met)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Profile) → Test independently → Core MVP
3. Add US2 (Objectives) → Test independently → Full MVP
4. Add US3 (Power Features) → Enhanced UX
5. Add US5 (Integration) → Connected system
6. Add US4 (AI Learning) → Future improvement (can defer)

### Priority Summary

| Phase | User Story | Priority | Requirements |
|-------|------------|----------|--------------|
| 1-2 | Setup + Foundational | P0 | 33 |
| 3 | US1: Profile Selection | P0 | 49 |
| 4 | US2: Objectives | P0 | 20 |
| 5 | US3: Power Features | P1 | 19 |
| 6 | US4: AI Learning | P2/P3 | 4 |
| 7 | US5: Integration | P1 | 12 |
| 8 | Polish | P0-P1 | 14 |

**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 8

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Performance requirements embedded in task descriptions
- Requirement IDs referenced for traceability to spec.md/plan.md
- Total: 77 tasks covering 151 requirements
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
