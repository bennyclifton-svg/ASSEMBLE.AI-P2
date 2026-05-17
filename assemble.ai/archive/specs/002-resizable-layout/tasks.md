# Tasks: Resizable Three-Column Layout

**Feature**: Resizable Three-Column Layout
**Branch**: `002-resizable-layout`
**Spec**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

## Phase 1: Setup

- [x] T001 Install dependencies (react-resizable-panels) in package.json
- [x] T002 Create feature directory structure in src/components/layout and src/components/dashboard
- [x] T003 Create mock Project API route in src/app/api/projects/route.ts
- [x] T004 Create use-layout-store hook for session persistence in src/lib/hooks/use-layout-store.ts

## Phase 2: Foundational

- [x] T005 Create ResizableLayout component shell in src/components/layout/ResizableLayout.tsx
- [x] T006 Create placeholder components (PlanningCard, ConsultantCard, DocumentCard) in src/components/dashboard/

## Phase 3: User Story 1 - View Default Layout

**Goal**: Users see the main dashboard organized into three distinct columns with default widths.
**Test**: Verify 3 columns appear with 25/50/25 widths.

- [x] T007 [US1] Implement 3-column structure using react-resizable-panels in src/components/layout/ResizableLayout.tsx
- [x] T008 [US1] Configure default panel sizes (25/50/25) in src/components/layout/ResizableLayout.tsx
- [x] T009 [US1] Integrate placeholder cards into layout in src/components/layout/ResizableLayout.tsx
- [x] T010 [US1] Update main page to use ResizableLayout in src/app/page.tsx

## Phase 4: User Story 2 - Resize Columns

**Goal**: Users can adjust column widths by dragging boundaries.
**Test**: Drag handles to resize columns; verify min-width constraints.

- [x] T011 [US2] Add resize handles to ResizableLayout in src/components/layout/ResizableLayout.tsx
- [x] T012 [US2] Implement min-width constraints (e.g., 15%) in src/components/layout/ResizableLayout.tsx
- [x] T013 [US2] Connect layout state to use-layout-store in src/components/layout/ResizableLayout.tsx
- [x] T014 [US2] Verify session persistence (reload page resets to default) in src/lib/hooks/use-layout-store.ts

## Phase 5: User Story 3 - Switch Projects

**Goal**: Users can switch between projects.
**Test**: Click switcher, select project, verify context change (mock log).

- [x] T015 [US3] Create ProjectSwitcher component UI in src/components/dashboard/ProjectSwitcher.tsx
- [x] T016 [US3] Implement data fetching from /api/projects in src/components/dashboard/ProjectSwitcher.tsx
- [x] T017 [US3] Add ProjectSwitcher to main page header in src/app/page.tsx
- [x] T018 [US3] Implement project selection state in src/components/dashboard/ProjectSwitcher.tsx

## Phase 6: Polish

- [x] T019 Style resize handles to match design system in src/components/ui/resizable.tsx
- [x] T020 Ensure responsive behavior (min-width handling) in src/components/layout/ResizableLayout.tsx
- [x] T021 Clean up mock data and console logs across all files

## Dependencies

1. Setup & Foundational (T001-T006) MUST complete first.
2. US1 (T007-T010) depends on Foundational.
3. US2 (T011-T014) depends on US1.
4. US3 (T015-T018) is independent of US1/US2 (can be parallelized).

## Implementation Strategy

1. **MVP**: Complete Phases 1, 2, and 3 to get the static layout.
2. **Interactive**: Complete Phase 4 for resizing.
3. **Context**: Complete Phase 5 for project switching.
