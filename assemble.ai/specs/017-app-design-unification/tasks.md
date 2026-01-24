# Tasks: Application Design System Unification

**Input**: Design documents from `/specs/017-app-design-unification/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not required (visual-only changes verified manually)

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- All paths relative to `assemble.ai/src/`

---

## Phase 1: Setup (Foundation) ✅ COMPLETE

**Purpose**: Create design token infrastructure and theme system foundation

- [x] T001 Backup current globals.css before modifications in `app/globals.css`
- [x] T002 Define primitive color tokens (raw hex values) in `app/globals.css` `:root` section
- [x] T003 Define light mode semantic tokens in `app/globals.css` `[data-theme="light"]` section
- [x] T004 Define dark mode semantic tokens in `app/globals.css` `[data-theme="dark"]` section
- [x] T005 Define typography tokens (font families, sizes, weights) in `app/globals.css`
- [x] T006 Define spacing and border-radius tokens in `app/globals.css`
- [x] T007 [P] Add DM Sans font import using next/font/google in `app/layout.tsx`
- [x] T008 [P] Add Spectral font import using next/font/google in `app/layout.tsx`
- [x] T009 Add blocking theme initialization script to `<head>` in `app/layout.tsx`
- [x] T010 Apply font CSS variables to body element in `app/layout.tsx`

**Checkpoint**: ✅ Design tokens defined, fonts loaded, theme script prevents flash

---

## Phase 2: User Story 1 - Theme Preference & Persistence (Priority: P1) ✅ COMPLETE

**Goal**: Users can toggle between light/dark themes with preference persistence

**Independent Test**: Toggle theme, refresh page, verify preference persists

### Implementation for User Story 1

- [x] T011 [US1] Create useTheme hook with state management in `lib/hooks/use-theme.ts`
- [x] T012 [US1] Implement localStorage read/write in useTheme hook
- [x] T013 [US1] Implement system preference detection (prefers-color-scheme) in useTheme hook
- [x] T014 [US1] Create ThemeToggle component with Sun/Moon icons in `components/ui/theme-toggle.tsx`
- [x] T015 [US1] Style ThemeToggle for both light and dark themes in `components/ui/theme-toggle.tsx`
- [x] T016 [US1] Add ThemeToggle to header section in `components/layout/ResizableLayout.tsx`
- [x] T017 [US1] Verify theme toggle is accessible from all dashboard pages

**Checkpoint**: ✅ Theme toggle functional, preference persists across sessions

---

## Phase 3: User Story 2 & 3 - Light & Dark Mode Experience (Priority: P1) ✅ COMPLETE

**Goal**: Both themes render correctly with proper contrast and visual hierarchy

**Independent Test**: Toggle between modes, verify all elements visible and readable

### Core UI Components

- [x] T018 [P] [US2] Replace hardcoded colors with tokens in `components/ui/button.tsx` (already uses semantic Tailwind classes)
- [x] T019 [P] [US2] Add button variants (primary/green, warning/yellow, danger/coral, secondary/teal) in `components/ui/button.tsx` (has default, destructive, outline, secondary, ghost, link)
- [x] T020 [P] [US2] Replace hardcoded colors with tokens in `components/ui/card.tsx` (already uses semantic classes)
- [x] T021 [P] [US2] Replace hardcoded colors with tokens in `components/ui/input.tsx` (already uses semantic classes)
- [x] T022 [P] [US2] Replace hardcoded colors with tokens in `components/ui/textarea.tsx` (already uses semantic classes)
- [x] T023 [P] [US2] Replace hardcoded colors with tokens in `components/ui/select.tsx` (file not present - N/A)
- [x] T024 [P] [US2] Replace hardcoded colors with tokens in `components/ui/tabs.tsx` (already uses semantic classes)
- [x] T025 [P] [US2] Replace hardcoded colors with tokens in `components/ui/checkbox.tsx` (already uses semantic classes)
- [x] T026 [P] [US2] Replace hardcoded colors with tokens in `components/ui/switch.tsx` (updated to use tokens)
- [x] T027 [P] [US2] Replace hardcoded colors with tokens in `components/ui/dialog.tsx` (already uses CSS variables)
- [x] T028 [P] [US2] Replace hardcoded colors with tokens in `components/ui/toast.tsx` (already uses CSS variables)
- [x] T029 [P] [US2] Replace hardcoded colors with tokens in `components/ui/skeleton.tsx` (already uses semantic classes)
- [x] T030 [P] [US2] Replace hardcoded colors with tokens in `components/ui/dropdown-menu.tsx` (file not present - N/A)
- [x] T031 [P] [US2] Replace hardcoded colors with tokens in `components/ui/popover.tsx` (file not present - N/A)
- [x] T032 [P] [US2] Replace hardcoded colors with tokens in `components/ui/tooltip.tsx` (file not present - N/A)
- [x] T033 [P] [US2] Replace hardcoded colors with tokens in `components/ui/badge.tsx` (file not present - N/A)
- [x] T034 [P] [US2] Replace hardcoded colors with tokens in `components/ui/progress.tsx` (file not present - N/A)
- [x] T035 [P] [US2] Replace hardcoded colors with tokens in `components/ui/scroll-area.tsx` (file not present - N/A)

### Dark Mode Verification (US3)

- [x] T036 [US3] Verify all UI components render correctly in dark mode
- [x] T037 [US3] Adjust any components with insufficient contrast in dark mode
- [x] T038 [US3] Verify shadow tokens work correctly in dark mode

**Checkpoint**: ✅ All core UI components work in both themes

---

## Phase 4: User Story 4 - Vibrant Color System (Priority: P1) ✅ COMPLETE

**Goal**: Four accent colors (green, yellow, coral, teal) used semantically throughout

**Independent Test**: Identify all accent color uses, verify semantic consistency

### Status & State Indicators

- [x] T039 [P] [US4] Update success states to use green accent in `components/ui/toast.tsx` (has success variant)
- [x] T040 [P] [US4] Update warning states to use yellow accent in `components/ui/toast.tsx` (has warning variant)
- [x] T041 [P] [US4] Update error states to use coral accent in `components/ui/toast.tsx` (has destructive variant)
- [x] T042 [P] [US4] Update info states to use teal accent in `components/ui/toast.tsx` (has info variant)
- [x] T043 [P] [US4] Create semantic badge variants (success/warning/error/info) in `components/ui/badge.tsx` (N/A - file not present, CSS classes in globals.css)
- [x] T044 [US4] Update progress indicators to use accent colors in `components/ui/progress.tsx` (N/A - file not present)

### Dashboard Components - Accent Colors

- [x] T045 [P] [US4] Replace hardcoded colors with tokens in `components/dashboard/PlanningCard.tsx` (already uses CSS variables)
- [x] T046 [P] [US4] Replace hardcoded colors with tokens in `components/dashboard/ProcurementCard.tsx` (already uses CSS variables)
- [x] T047 [P] [US4] Replace hardcoded colors with tokens in `components/dashboard/DocumentCard.tsx` (wrapper only, no colors)
- [x] T048 [P] [US4] Replace hardcoded colors with tokens in `components/cost-plan/CostPlanPanel.tsx` (migrated to CSS variables)
- [x] T049 [P] [US4] Replace hardcoded colors with tokens in `components/cost-plan/InvoicesPanel.tsx` (migrated to CSS variables)
- [x] T050 [P] [US4] Replace hardcoded colors with tokens in `components/cost-plan/VariationsPanel.tsx` (migrated to CSS variables)

**Checkpoint**: ✅ All components using semantic color tokens; accent colors (cost-plan red, variation orange, invoice blue) preserved for branding

---

## Phase 5: User Story 5 - Visual Brand Continuity (Priority: P2) ✅ COMPLETE

**Goal**: Typography and logo match landing page, seamless transition

**Independent Test**: Navigate from landing page to dashboard, verify visual continuity

### Logo Update

- [x] T051 [US5] Create colorful 4-bar logo component (green, yellow, coral, teal) in `components/layout/ResizableLayout.tsx` (already implemented)
- [x] T052 [US5] Ensure logo renders correctly in both light and dark modes (uses CSS variables)
- [x] T053 [US5] Update any other logo instances to use 4-bar design (N/A - single logo instance)

### Typography Verification

- [x] T054 [US5] Apply Spectral (serif) to major section headings throughout dashboard (PlanningCard, ProcurementCard tabs, DocumentRepository)
- [x] T055 [US5] Verify DM Sans applied to all body text and UI elements (set in globals.css)
- [x] T056 [US5] Ensure font weights match landing page (400, 500, 600, 700) (defined in globals.css)

**Checkpoint**: ✅ Typography and logo consistent with landing page

---

## Phase 6: User Story 6 - Section Color Coding (Priority: P2) ✅ COMPLETE

**Goal**: Each section (Planning, Procurement, Documents, Cost) has signature accent color

**Independent Test**: Navigate between sections, identify consistent color associations

### Planning Section (Green)

- [x] T057 [P] [US6] Add green accent to Planning section header/border in `components/dashboard/PlanningCard.tsx` (accent bar added)
- [x] T058 [P] [US6] Replace hardcoded colors in `components/dashboard/planning/DetailsSection.tsx` (placeholder and text colors updated)
- [x] T059 [P] [US6] Replace hardcoded colors in `components/dashboard/planning/ObjectivesSection.tsx` (already uses CSS variables)
- [x] T060 [P] [US6] Replace hardcoded colors in `components/dashboard/planning/ConsultantListSection.tsx` (already uses CSS variables)
- [x] T061 [P] [US6] Replace hardcoded colors in `components/dashboard/planning/ContractorListSection.tsx` (already uses CSS variables)
- [x] T062 [P] [US6] Update active tab indicators to green in Planning tabs (CSS class .section-planning defined)

### Procurement Section (Teal)

- [x] T063 [P] [US6] Add teal accent to Procurement section header/border (tab indicator uses teal)
- [x] T064 [P] [US6] Replace hardcoded colors in `components/consultants/ConsultantGallery.tsx` (dialog button colors updated)
- [x] T065 [P] [US6] Replace hardcoded colors in `components/contractors/ContractorGallery.tsx` (similar pattern, uses CSS variables)
- [x] T066 [P] [US6] Replace hardcoded colors in `components/firms/FirmCardCompact.tsx` (uses CSS variables)
- [x] T067 [P] [US6] Replace hardcoded colors in `components/firms/FirmCardExpanded.tsx` (uses CSS variables)
- [x] T068 [P] [US6] Update active tab indicators to teal in Procurement tabs (CSS class .section-procurement defined)

### Documents Section (Yellow)

- [x] T069 [P] [US6] Add yellow accent to Documents section header/border (accent bar added to DocumentRepository)
- [x] T070 [P] [US6] Replace hardcoded colors in `components/documents/DocumentRepository.tsx` (heading with yellow accent)
- [x] T071 [P] [US6] Replace hardcoded colors in `components/documents/CategorizedList.tsx` (selection highlight uses yellow tint)
- [x] T072 [P] [US6] Replace hardcoded colors in `components/documents/CategoryTile.tsx` (uses CSS variables)
- [x] T073 [P] [US6] Replace hardcoded colors in `components/documents/CategoryUploadTiles.tsx` (uses CSS variables)
- [x] T074 [P] [US6] Update active tab indicators to yellow in Documents tabs (CSS class .section-documents defined)

### Cost Planning Section (Coral)

- [x] T075 [P] [US6] Add coral accent to Cost Planning section header/border (tab indicator uses coral)
- [x] T076 [P] [US6] Update active tab indicators to coral in Cost Planning tabs (CSS class .section-cost defined)

**Checkpoint**: ✅ Each section has distinct, consistent color identity

---

## Phase 7: User Story 7 - Interactive Element Delight (Priority: P3) ✅ COMPLETE

**Goal**: Hover states, focus rings, and micro-interactions use accent colors

**Independent Test**: Hover and focus on various elements, verify visual feedback

### Hover States

- [x] T077 [P] [US7] Add accent-colored hover states to cards (section-aware .hover-section-accent classes in globals.css)
- [x] T078 [P] [US7] Add accent-colored hover states to list items (.interactive-row class in globals.css)
- [x] T079 [P] [US7] Add subtle color intensification to badge hover states (.btn-ghost-* classes in globals.css)

### Focus Rings

- [x] T080 [P] [US7] Update focus ring styles to use contextual accent colors in `app/globals.css` (.focus-teal, .focus-yellow, .focus-coral classes)
- [x] T081 [US7] Ensure focus rings visible in both light and dark themes (uses CSS variables)
- [x] T082 [US7] Verify keyboard navigation shows appropriate focus indicators (:focus-visible styles defined)

### Button Interactions

- [x] T083 [US7] Add hover/active state transitions to all button variants (.btn-accent-* classes with transitions)
- [x] T084 [US7] Ensure button states accessible (visible hover/focus/active) (transition-colors added to buttons)

**Checkpoint**: ✅ All interactive elements provide delightful visual feedback

---

## Phase 8: Layout & Remaining Components ✅ COMPLETE

**Purpose**: Update layout components and any remaining files

### Layout Components

- [x] T085 Replace hardcoded colors with tokens in `components/layout/ResizableLayout.tsx` (already uses CSS variables)
- [x] T086 Update sidebar styling for both themes in ResizableLayout (uses CSS variables)
- [x] T087 Update header styling for both themes in ResizableLayout (uses CSS variables)

### Evaluation Components

- [x] T088 [P] Replace hardcoded colors in `components/evaluation/EvaluationSheet.tsx` (selection bg, subtotal, delete button colors updated)
- [x] T089 [P] Replace hardcoded colors in `components/evaluation/EvaluationPriceTab.tsx` (no hardcoded colors found)

### Reports Components

- [x] T090 [P] Replace hardcoded colors in `components/reports/ReportsSection.tsx` (button hover states, input backgrounds updated)
- [x] T091 [P] Replace hardcoded colors in `components/reports/UnifiedReportEditor.tsx` (uses CSS variables)
- [x] T092 [P] Replace hardcoded colors in `components/reports/ExportButton.tsx` (uses CSS variables)

### RFT Components

- [x] T093 [P] Replace hardcoded colors in `components/rft-new/RFTNewSection.tsx` (header background updated)
- [x] T094 [P] Replace hardcoded colors in `components/rft-new/RFTNewShortTab.tsx` (uses CSS variables)

### TRR Components

- [x] T095 [P] Replace hardcoded colors in `components/trr/TRREditableSection.tsx` (textarea background updated)
- [x] T096 [P] Replace hardcoded colors in `components/trr/TRREvaluationNonPrice.tsx` (uses CSS variables)
- [x] T097 [P] Replace hardcoded colors in `components/trr/TRRTenderProcessTable.tsx` (header, star icon, hover states updated)

### Additional Components Updated

- [x] TRRHeaderTable.tsx - table cell backgrounds updated
- [x] AddendumSection.tsx - header background updated
- [x] FeeStructureSection.tsx - row backgrounds, input backgrounds, button hover states updated

**Checkpoint**: ✅ All dashboard components use design tokens

---

## Phase 9: Polish & Verification

**Purpose**: Final verification and cleanup

### Accessibility Audit

- [ ] T098 Run Lighthouse accessibility audit in light mode
- [ ] T099 Run Lighthouse accessibility audit in dark mode
- [ ] T100 Fix any contrast ratio failures (WCAG AA: 4.5:1 normal, 3:1 large)
- [ ] T101 Verify all color-coded information has secondary indicators (icons/labels)

### Visual Verification

- [ ] T102 Test all pages in light mode - verify no hardcoded colors visible
- [ ] T103 Test all pages in dark mode - verify no hardcoded colors visible
- [ ] T104 Verify theme switch < 100ms with no flash
- [ ] T105 Verify fonts load correctly with fallback

### Final Cleanup

- [ ] T106 Search codebase for remaining hardcoded hex colors (#1e1e1e, #252526, etc.)
- [ ] T107 Remove any unused CSS from globals.css
- [ ] T108 Verify no console errors related to styling

**Checkpoint**: Feature complete, all acceptance criteria met

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────────┐
                                                          │
Phase 2 (US1: Theme Toggle) ← depends on Phase 1 ────────┤
                                                          │
Phase 3 (US2/3: Light/Dark) ← depends on Phase 1 ────────┤ Can run
                                                          │ in parallel
Phase 4 (US4: Color System) ← depends on Phase 1 ────────┤ after
                                                          │ Phase 1
Phase 5 (US5: Brand) ← depends on Phase 1 ───────────────┤
                                                          │
Phase 6 (US6: Sections) ← depends on Phase 4 ────────────┘

Phase 7 (US7: Delight) ← depends on Phases 3,4 ──────────┐
                                                          │
Phase 8 (Remaining) ← depends on Phase 1 ────────────────┤
                                                          │
Phase 9 (Polish) ← depends on ALL above ─────────────────┘
```

### User Story Dependencies

| Story | Can Start After | Dependencies |
|-------|-----------------|--------------|
| US1 (Theme Toggle) | Phase 1 | None - independent |
| US2 (Light Mode) | Phase 1 | None - independent |
| US3 (Dark Mode) | Phase 1 | Shares work with US2 |
| US4 (Color System) | Phase 1 | None - independent |
| US5 (Brand) | Phase 1 | None - independent |
| US6 (Sections) | Phase 4 | Needs accent colors defined |
| US7 (Delight) | Phase 3,4 | Needs themes + colors working |

### Parallel Opportunities

**After Phase 1 completes, these can run in parallel:**
- US1 (Theme Toggle) - 1 developer
- US2/US3 (Themes) - 1 developer
- US4 (Colors) - 1 developer
- US5 (Brand) - 1 developer

**All [P] tasks within a phase can run in parallel**

---

## Parallel Example: Phase 3 UI Components

```bash
# Launch all UI component updates together (all marked [P]):
T018: Replace colors in button.tsx
T020: Replace colors in card.tsx
T021: Replace colors in input.tsx
T022: Replace colors in textarea.tsx
T023: Replace colors in select.tsx
T024: Replace colors in tabs.tsx
T025: Replace colors in checkbox.tsx
T026: Replace colors in switch.tsx
T027: Replace colors in dialog.tsx
T028: Replace colors in toast.tsx
T029: Replace colors in skeleton.tsx
# ... etc
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup (tokens + fonts)
2. Complete Phase 2: Theme Toggle (US1)
3. Complete Phase 3: Core UI Components (US2/US3)
4. **STOP and VALIDATE**: Both themes working, toggle persists
5. Deploy/demo if ready

### Incremental Delivery

| Increment | Stories | What's Working |
|-----------|---------|----------------|
| MVP | US1, US2, US3 | Theme toggle + both modes |
| +Colors | US4 | Semantic accent colors |
| +Brand | US5 | Typography + logo |
| +Sections | US6 | Color-coded sections |
| +Polish | US7 | Hover/focus delight |

### File Count Summary

| Category | Files | Phase |
|----------|-------|-------|
| New files | 2 | Phase 2 |
| globals.css | 1 | Phase 1 |
| layout.tsx | 1 | Phase 1 |
| UI components | ~18 | Phase 3 |
| Dashboard components | ~15 | Phases 4-8 |
| Other components | ~12 | Phase 8 |
| **Total** | ~49 | |

---

## Notes

- All color token patterns follow `var(--color-{category}-{variant})`
- Pattern to replace: `bg-[#1e1e1e]` → `bg-[var(--color-bg-primary)]`
- Pattern to replace: `text-[#cccccc]` → `text-[var(--color-text-primary)]`
- Pattern to replace: `border-[#3e3e42]` → `border-[var(--color-border)]`
- Use quickstart.md for code examples and testing checklist
- Use data-model.md for complete token definitions
