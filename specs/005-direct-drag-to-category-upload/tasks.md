# Tasks: Direct Drag-to-Category Upload

**Input**: Design documents from `/specs/005-direct-drag-to-category-upload/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are included per Constitution Principle VIII (Test-Driven Quality requirement)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `src/app/`, `src/components/`, `src/lib/`, `tests/`
- All paths relative to repository root: `assemble.ai/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and dependencies

- [X] T001 Verify Next.js 16 project structure matches plan.md specification
- [X] T002 Verify required dependencies in package.json: react-dropzone ^14.3.8, @radix-ui/react-toast ^1.2.15
- [X] T003 [P] Create tests directory structure: tests/components/documents/, tests/integration/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create GET /api/categories/active endpoint in src/app/api/categories/active/route.ts
- [X] T005 Implement category filtering logic in /api/categories/active (fetch active disciplines and trades)
- [X] T006 Modify POST /api/documents endpoint in src/app/api/documents/route.ts to accept categoryId and subcategoryId parameters
- [X] T007 Add category/subcategory validation to POST /api/documents (verify foreign keys exist)
- [X] T008 Test /api/categories/active returns filtered categories for test project
- [X] T009 Test POST /api/documents accepts and persists category/subcategory parameters

**Checkpoint**: Foundation ready - API endpoints support categorization, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - One-Drag Upload & Categorise (Priority: P1) 🎯 MVP

**Goal**: Enable drag-and-drop of files directly onto category tiles for one-step upload and categorization

**Independent Test**: Drag 5 PDF files onto "Planning" category tile → verify files appear in repository with categoryId='planning', versionNumber=1

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T010 [P] [US1] Unit test for CategoryTile drag-drop handling in tests/components/documents/CategoryTile.test.tsx
- [X] T011 [P] [US1] Integration test for drag-to-category upload flow in tests/integration/drag-to-category.test.tsx

### Implementation for User Story 1

- [X] T012 [US1] Create CategoryTile component in src/components/documents/CategoryTile.tsx
- [X] T013 [US1] Implement react-dropzone integration in CategoryTile (accept files, validate size/type)
- [X] T014 [US1] Add visual states to CategoryTile (idle, hover, drop, disabled, uploading)
- [X] T015 [US1] Modify CategoryUploadTiles in src/components/documents/CategoryUploadTiles.tsx to render CategoryTile components
- [X] T016 [US1] Wire CategoryTile onDrop to handleFilesSelected in DocumentRepository
- [X] T017 [US1] Modify DocumentRepository handleFilesSelected in src/components/documents/DocumentRepository.tsx to pass categoryId/subcategoryId to API
- [X] T018 [US1] Test file upload to category tile → verify document created with correct category
- [X] T019 [US1] Test file upload to main upload zone → verify document remains uncategorized (backward compatibility)
- [X] T020 [US1] Implement bulk re-categorization: modify handleFilesSelected to detect empty files array + selectedDocumentIds
- [X] T021 [US1] Test multi-select documents + click category tile → verify documents update to new category

**Checkpoint**: At this point, User Story 1 should be fully functional - drag files to tiles OR bulk re-categorize via click

---

## Phase 4: User Story 2 - Active Categories Only + Expandable Subcategories (Priority: P1)

**Goal**: Show only active categories/subcategories based on Planning Card configuration, with expandable Consultants/Contractors tiles

**Independent Test**: Configure project with only Structural + MEP disciplines active → verify only Planning, Scheme Design, Detail Design, Consultants (with 2 subcategories), Cost Planning, Administration tiles appear

### Tests for User Story 2

- [X] T022 [P] [US2] Unit test for use-active-categories hook in tests/lib/hooks/use-active-categories.test.ts
- [X] T023 [P] [US2] Unit test for CategoryUploadTiles expansion logic in tests/components/documents/CategoryUploadTiles.test.tsx

### Implementation for User Story 2

- [X] T024 [P] [US2] Create use-active-categories hook in src/lib/hooks/use-active-categories.ts
- [X] T025 [US2] Implement category filtering logic in use-active-categories (integrate with useConsultantDisciplines and useContractorTrades)
- [X] T026 [US2] Add expansion state management to CategoryUploadTiles (expandedCategories Set)
- [X] T027 [US2] Implement toggleExpand handler in CategoryUploadTiles
- [X] T028 [US2] Modify CategoryUploadTiles to render Row 1 (categories) and Row 2+ (subcategories) based on expansion state
- [X] T029 [US2] Add isExpandable prop to CategoryTile for Consultants/Contractors
- [X] T030 [US2] Add expansion indicator (ChevronRight icon) to expandable CategoryTile components
- [X] T031 [US2] Disable drop on expandable parent tiles (Consultants/Contractors) - only subcategories accept drops
- [X] T032 [US2] Test category filtering: mock Planning Card with 3 active disciplines → verify 3 subcategory tiles appear
- [X] T033 [US2] Test expansion: click Consultants tile → verify subcategories appear in Row 2
- [X] T034 [US2] Test collapse: click expanded Consultants tile → verify subcategories disappear

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - filtered tiles, expandable subcategories, drag-to-categorize

---

## Phase 5: User Story 3 - Visual Feedback & Toast Confirmation (Priority: P2)

**Goal**: Provide clear visual feedback during drag operations and toast confirmation on successful uploads

**Independent Test**: Drag files over "Structural" tile → verify blue outline + scale-up animation. Drop 10 files → verify toast appears: "10 files → Structural"

### Tests for User Story 3

- [X] T035 [P] [US3] Unit test for CategoryTile hover state in tests/components/documents/CategoryTile.test.tsx
- [X] T036 [P] [US3] Integration test for toast notifications in tests/integration/drag-to-category.test.tsx

### Implementation for User Story 3

- [X] T037 [P] [US3] Add hover state styling to CategoryTile (ring-2 ring-blue-500, scale-105 on isDragActive)
- [X] T038 [P] [US3] Add Tailwind transition classes to CategoryTile (transition-all duration-150 ease-in-out)
- [X] T039 [P] [US3] Add uploading spinner to CategoryTile (absolute positioned, bg-gray-900/50 overlay)
- [X] T040 [US3] Implement toast notification in handleFilesSelected after successful upload
- [X] T041 [US3] Format toast message: "{count} file(s) → {categoryName}"
- [X] T042 [US3] Add toast notification to handleBulkCategorize after successful re-categorization
- [X] T043 [US3] Add error toast for failed uploads (catch errors in handleFilesSelected)
- [X] T044 [US3] Test hover feedback: simulate drag over → verify ring and scale classes applied
- [X] T045 [US3] Test toast appears after upload with correct file count and category name
- [X] T046 [US3] Test error toast appears on upload failure (mock API 500 error)

**Checkpoint**: All user stories should now be independently functional with polished UX

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, comprehensive testing, and documentation

- [ ] T047 [P] Add throttling to drag events in CategoryTile (100ms throttle on onDragOver)
- [ ] T048 [P] Verify responsive layout: test CategoryUploadTiles on mobile (320px), tablet (768px), desktop (1920px) widths
- [X] T049 [P] Test with large batch: upload 50 files to category tile → verify completes in ≤12 seconds (SC-001)
- [ ] T050 [P] Accessibility audit: test CategoryTile keyboard navigation (Tab, Enter to expand)
- [ ] T051 [P] Cross-browser testing: verify drag-drop works in Chrome, Firefox, Safari, Edge
- [ ] T052 Performance test: render DocumentRepository with 100+ documents → verify no scroll jank
- [X] T053 [P] Add JSDoc comments to CategoryTile props interface
- [X] T054 [P] Add JSDoc comments to use-active-categories hook
- [ ] T055 Update quickstart.md with final implementation notes (if any deviations from plan)
- [ ] T056 Run full test suite and ensure >80% coverage (per research.md requirement)
- [ ] T057 Manual validation: follow quickstart.md testing checklist completely

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel if staffed (US1, US2, US3 are independent)
  - OR sequentially in priority order: US1 → US2 → US3
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent from US1 (modifies CategoryUploadTiles separately)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Enhances US1/US2 components but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Components before integration
- Core functionality before visual polish
- Independent validation before moving to next priority

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can run in parallel
- **Phase 2**: T004-T005 (API endpoint), T006-T007 (modify endpoint) can run in parallel blocks
- **User Story 1**: T010-T011 (tests) can run in parallel, T012-T014 (CategoryTile) is one component
- **User Story 2**: T022-T023 (tests) can run in parallel, T024-T025 (hook) can run in parallel with T026-T028 (expansion logic)
- **User Story 3**: T035-T036 (tests) can run in parallel, T037-T039 (visual states) can run in parallel
- **Phase 6**: T047-T051, T053-T054 can all run in parallel

**Key Parallel Strategy**: Once Phase 2 completes, all three user stories (Phases 3-5) can be worked on simultaneously by different developers, as they modify different components and are independently testable.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for CategoryTile drag-drop handling in tests/components/documents/CategoryTile.test.tsx"
Task: "Integration test for drag-to-category upload flow in tests/integration/drag-to-category.test.tsx"

# After tests written, implement CategoryTile:
Task: "Create CategoryTile component in src/components/documents/CategoryTile.tsx"
Task: "Implement react-dropzone integration in CategoryTile"
Task: "Add visual states to CategoryTile"

# Then wire everything together:
Task: "Modify CategoryUploadTiles to render CategoryTile components"
Task: "Wire CategoryTile onDrop to handleFilesSelected in DocumentRepository"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for use-active-categories hook"
Task: "Unit test for CategoryUploadTiles expansion logic"

# Implement hook and UI separately (can parallelize):
Task: "Create use-active-categories hook" (Developer A)
Task: "Add expansion state management to CategoryUploadTiles" (Developer B)
Task: "Implement toggleExpand handler" (Developer B)

# Then integrate:
Task: "Modify CategoryUploadTiles to use useActiveCategories hook"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009) - CRITICAL blocking phase
3. Complete Phase 3: User Story 1 (T010-T021)
4. **STOP and VALIDATE**: Test drag-to-category upload independently
   - Drag 10 files to "Planning" tile → verify categorized
   - Select 5 uncategorized files + click "Cost Planning" → verify re-categorized
   - Verify backward compatibility: upload to main zone → uncategorized
5. Deploy/demo if ready - **Delivers 67% of time savings (45s → 25s)**

### Incremental Delivery

1. Complete Setup + Foundational (T001-T009) → Foundation ready
2. Add User Story 1 (T010-T021) → Test independently → Deploy/Demo (MVP!) → **Delivers core value**
3. Add User Story 2 (T022-T034) → Test independently → Deploy/Demo → **Adds filtering and organization**
4. Add User Story 3 (T035-T046) → Test independently → Deploy/Demo → **Adds visual polish**
5. Add Polish (T047-T057) → Final validation → Production release
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 2-3 developers:

1. **Week 1, Days 1-2**: Team completes Setup + Foundational together (T001-T009)
2. **Week 1, Days 3-5**: Once Foundational is done:
   - **Developer A**: User Story 1 (T010-T021) - Core drag-drop feature
   - **Developer B**: User Story 2 (T022-T034) - Category filtering
   - **Developer C** (if available): User Story 3 (T035-T046) - Visual feedback
3. **Week 2, Days 1-2**: Integration testing, fix conflicts (minimal due to different files)
4. **Week 2, Days 3-5**: Polish phase together (T047-T057)

**Timeline**: 7-10 days with 2-3 developers, or 12-15 days solo

---

## Task Summary

**Total Tasks**: 57

### Tasks per Phase
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (User Story 1 - P1)**: 12 tasks (2 tests + 10 implementation)
- **Phase 4 (User Story 2 - P1)**: 13 tasks (2 tests + 11 implementation)
- **Phase 5 (User Story 3 - P2)**: 12 tasks (2 tests + 10 implementation)
- **Phase 6 (Polish)**: 11 tasks

### Parallel Opportunities
- **18 tasks** marked [P] can run in parallel (within their phase)
- **3 user stories** can be developed in parallel after Foundational phase
- **Estimated speedup**: 40-50% with 3 developers vs. solo

### Independent Test Criteria
- **User Story 1**: Drag files to tile → categorized correctly
- **User Story 2**: Only active categories shown, subcategories expand/collapse
- **User Story 3**: Hover effects + toast notifications appear

### Suggested MVP Scope
**Phase 1 + Phase 2 + Phase 3** (User Story 1 only)
- **Tasks**: T001-T021 (21 tasks)
- **Estimated effort**: 3-5 days solo, 2-3 days with pair
- **Delivers**: Core drag-to-category upload + bulk re-categorization
- **Value**: 67% of time savings (current: 45s, with US1: ~25s, with all: 15s)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests FAIL before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution Principle VIII satisfied: Comprehensive test coverage planned
