# Tasks: Cost Planning Module

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Status**: Not Started  
**Estimate**: 16-22 days

---

## Task Key

- `[P]` = Parallelizable with other `[P]` tasks in same phase
- `[B]` = Blocking - must complete before next phase
- `[T]` = Has test requirements
- Priority: P0 (must have) → P1 (should have) → P2 (nice to have)

---

## Phase 0: Research & POC (1-2 days)

> **Gate**: Must validate technical assumptions before building

### FortuneSheet Validation
- [ ] T001 `[B]` Create FortuneSheet POC: basic grid with 500 rows, measure render performance
- [ ] T002 `[B]` POC: Row grouping with collapse/expand (native `rowGroup` config)
- [ ] T003 `[B]` POC: Custom context menu integration
- [ ] T004 `[B]` POC: Cell edit callback → external state update flow
- [ ] T005 `[B]` POC: Custom cell renderer for currency formatting

### Realtime Validation
- [ ] T006 `[B]` POC: Supabase Edge Function invocation from pg_net trigger
- [ ] T007 `[B]` POC: Supabase Broadcast channel → React client subscription
- [ ] T008 `[B]` POC: Debounce multiple rapid triggers in Edge Function

### Excel I/O Validation
- [ ] T009 `[P]` POC: SheetJS export with formulas preserved
- [ ] T010 `[P]` POC: SheetJS import with column detection

**Output**: `research.md` documenting findings, blockers, and recommendations

---

## Phase 1: Database Foundation (2-3 days)

> **Dependency**: Phase 0 complete (no blockers found)

### Migrations
- [ ] T011 `[B]` Create migration: `20251127000001_create_companies.sql`
  - companies table with soft delete
  - organisation_id for multi-tenancy
  - Unique constraint on (organisation_id, name)
  
- [ ] T012 `[B]` Create migration: `20251127000002_create_projects.sql`
  - projects table with current_report_month, revision, currency_code
  - CHECK constraint: report month is first of month
  - Soft delete
  
- [ ] T013 `[B]` Create migration: `20251127000003_create_cost_lines.sql`
  - cost_lines table with all columns from spec
  - FK to projects, companies
  - Unique constraint on (project_id, section, sort_order)
  - Soft delete
  
- [ ] T014 `[B]` Create migration: `20251127000004_create_cost_line_allocations.sql`
  - Dynamic fiscal year allocations
  - FK to cost_lines
  - Unique on (cost_line_id, fiscal_year)
  
- [ ] T015 `[B]` Create migration: `20251127000005_create_variations.sql`
  - variations table with amount_forecast + amount_approved
  - Auto-generated variation_number function
  - FK to projects, cost_lines
  - Soft delete
  
- [ ] T016 `[B]` Create migration: `20251127000006_create_invoices.sql`
  - invoices table with period_year + period_month
  - FK to projects, cost_lines, variations (nullable), companies
  - CHECK constraint: period_month 1-12
  - Soft delete
  
- [ ] T017 `[P]` Create migration: `20251127000007_create_cost_line_comments.sql`
  - Cell-level comments table
  
- [ ] T018 `[P]` Create migration: `20251127000008_create_project_snapshots.sql`
  - Snapshot storage with JSONB data
  
- [ ] T019 `[P]` Create migration: `20251127000009_create_import_templates.sql`
  - Column mapping templates per organisation
  
- [ ] T020 `[B]` Create migration: `20251127000010_create_indexes.sql`
  - All indexes from spec (cost_lines, invoices, variations, etc.)
  - Partial indexes for soft delete (WHERE deleted_at IS NULL)
  
- [ ] T021 `[B]` Create migration: `20251127000011_create_rpc_functions.sql`
  - `calculate_cost_plan_totals(p_project_id)` RPC
  - `next_variation_number(p_project_id, p_category)` function
  - `period_to_date(p_year, p_month)` helper
  
- [ ] T022 `[B]` Create migration: `20251127000012_create_realtime_triggers.sql`
  - `notify_cost_plan_change()` trigger function
  - Triggers on invoices, variations, cost_lines
  - Requires pg_net extension

### Edge Function
- [ ] T023 `[B]` Create `supabase/functions/cost-plan-totals/index.ts`
  - Debounce logic (500ms)
  - Call `calculate_cost_plan_totals` RPC
  - Broadcast to project channel
  - Error handling and logging

### Seed Data
- [ ] T024 `[P]` Create `supabase/seed/cost-plan-sample-data.sql`
  - Sample project with ~20 cost lines
  - Sample invoices (mix of periods)
  - Sample variations (forecast + approved)

---

## Phase 2: Type Definitions & API Contracts (1-2 days)

> **Dependency**: Phase 1 migrations complete

### TypeScript Types
- [ ] T025 `[P]` Create `src/types/company.ts`
  - Company interface
  - CreateCompanyInput, UpdateCompanyInput
  
- [ ] T026 `[P]` Create `src/types/cost-plan.ts`
  - CostLine, CostLineWithCalculations
  - CostLineAllocation
  - CostPlanTotals, SectionTotals
  - CreateCostLineInput, UpdateCostLineInput
  
- [ ] T027 `[P]` Create `src/types/invoice.ts`
  - Invoice interface
  - CreateInvoiceInput, UpdateInvoiceInput
  - InvoiceSummary (aggregated)
  
- [ ] T028 `[P]` Create `src/types/variation.ts`
  - Variation interface
  - VariationStatus enum
  - VariationCategory enum
  - CreateVariationInput, UpdateVariationInput
  
- [ ] T029 `[P]` Create `src/types/snapshot.ts`
  - ProjectSnapshot interface
  - SnapshotComparison interface
  
- [ ] T030 `[P]` Create `src/types/realtime.ts`
  - CostPlanTotalsPayload interface
  - RealtimeEvent types
  
- [ ] T031 `[P]` Create `src/types/api.ts`
  - BatchOperation<T> generic
  - PaginatedResponse<T> generic
  - ApiError interface

### Zod Schemas
- [ ] T032 `[P]` Create `src/lib/utils/validation.ts`
  - Zod schemas for all input types
  - Shared validation helpers (cents, dates)

### Generate Supabase Types
- [ ] T033 `[B]` Run `supabase gen types typescript` → `supabase/types/database.ts`

---

## Phase 3: Core API Routes (3-4 days)

> **Dependency**: Phase 2 types complete

### Supabase Client Setup
- [ ] T034 `[B]` Create `src/lib/supabase/client.ts` (browser client)
- [ ] T035 `[B]` Create `src/lib/supabase/server.ts` (server client with service role)
- [ ] T036 `[B]` Create `src/lib/supabase/realtime.ts` (broadcast channel helpers)

### Companies API
- [ ] T037 `[P][T]` Create `src/app/api/companies/route.ts`
  - GET: Search with `?search=` query param, pagination
  - POST: Create company with validation
  
- [ ] T038 `[P][T]` Create `src/app/api/companies/[id]/route.ts`
  - PATCH: Update company
  - DELETE: Soft delete

### Cost Plan API
- [ ] T039 `[B][T]` Create `src/app/api/projects/[projectId]/cost-plan/route.ts`
  - GET: Full cost plan with calculated fields
  - Calls `calculate_cost_plan_totals` for totals
  - Includes cost_lines, invoices count, variations count

### Cost Lines API
- [ ] T040 `[P][T]` Create `src/app/api/projects/[projectId]/cost-lines/route.ts`
  - GET: List all cost lines with calculations
  - POST: Create single cost line
  
- [ ] T041 `[P][T]` Create `src/app/api/projects/[projectId]/cost-lines/[id]/route.ts`
  - PATCH: Update cost line
  - DELETE: Soft delete
  
- [ ] T042 `[B][T]` Create `src/app/api/projects/[projectId]/cost-lines/batch/route.ts`
  - POST: Batch create/update/delete operations
  - Transaction wrapper for atomicity
  
- [ ] T043 `[P][T]` Create `src/app/api/projects/[projectId]/cost-lines/reorder/route.ts`
  - POST: Reorder cost lines within section
  
- [ ] T044 `[P][T]` Create `src/app/api/projects/[projectId]/cost-lines/[id]/allocations/route.ts`
  - GET: List FY allocations
  - PUT: Replace all allocations

### Invoices API
- [ ] T045 `[P][T]` Create `src/app/api/projects/[projectId]/invoices/route.ts`
  - GET: Paginated list with filters (period, cost_line_id)
  - POST: Create invoice
  
- [ ] T046 `[P][T]` Create `src/app/api/projects/[projectId]/invoices/[id]/route.ts`
  - PATCH: Update invoice
  - DELETE: Soft delete
  
- [ ] T047 `[P][T]` Create `src/app/api/projects/[projectId]/invoices/batch/route.ts`
  - POST: Batch operations
  
- [ ] T048 `[P][T]` Create `src/app/api/projects/[projectId]/invoices/summary/route.ts`
  - GET: Aggregated by cost_line_id

### Variations API
- [ ] T049 `[P][T]` Create `src/app/api/projects/[projectId]/variations/route.ts`
  - GET: Paginated list
  - POST: Create (auto-generate variation number)
  
- [ ] T050 `[P][T]` Create `src/app/api/projects/[projectId]/variations/[id]/route.ts`
  - PATCH: Update (handle status transitions)
  - DELETE: Soft delete
  
- [ ] T051 `[P][T]` Create `src/app/api/projects/[projectId]/variations/batch/route.ts`
  - POST: Batch operations

### Snapshot API
- [ ] T052 `[P][T]` Create `src/app/api/projects/[projectId]/cost-plan/snapshot/route.ts`
  - GET: List snapshots
  - POST: Create snapshot (captures full state as JSONB)
  
- [ ] T053 `[P][T]` Create `src/app/api/projects/[projectId]/cost-plan/compare/[snapshotId]/route.ts`
  - GET: Compare current state to snapshot

### Import/Export API
- [ ] T054 `[P]` Create `src/app/api/projects/[projectId]/cost-plan/export/route.ts`
  - GET: Generate Excel file with formulas
  
- [ ] T055 `[P]` Create `src/app/api/projects/[projectId]/cost-plan/import/route.ts`
  - POST: Parse uploaded Excel, return preview/mapping

### Import Templates API
- [ ] T056 `[P][T]` Create `src/app/api/import-templates/route.ts`
  - GET: List templates for organisation
  - POST: Save new template

---

## Phase 4: Calculation & Utility Libraries (1-2 days)

> **Dependency**: Can start parallel to Phase 3

### Calculations
- [ ] T057 `[P][T]` Create `src/lib/calculations/cost-plan-formulas.ts`
  - calculateForecastVariations(costLineId, variations)
  - calculateApprovedVariations(costLineId, variations)
  - calculateFinalForecast(costLine, variations)
  - calculateVariance(budget, finalForecast)
  - calculateETC(finalForecast, claimed)
  
- [ ] T058 `[P][T]` Create `src/lib/calculations/aggregations.ts`
  - calculateSectionTotals(costLines)
  - calculateGrandTotals(costLines)
  - calculateCurrentMonth(invoices, reportMonth)
  
- [ ] T059 `[P][T]` Create `src/lib/calculations/variance.ts`
  - calculateVarianceToBaseline(current, snapshot)
  - formatVarianceDisplay(variance)

### Currency Utilities
- [ ] T060 `[P][T]` Create `src/lib/utils/currency.ts`
  - centsToDollars(cents)
  - dollarsToCents(dollars)
  - formatCurrency(cents, currency, showGst?)
  - parseCurrencyInput(input)

### Date Utilities
- [ ] T061 `[P][T]` Create `src/lib/utils/dates.ts`
  - periodToDate(year, month)
  - dateToperiod(date)
  - formatPeriod(year, month)
  - getFirstOfMonth(date)

---

## Phase 5: React Hooks (2 days)

> **Dependency**: Phase 3 APIs complete

### Data Fetching Hooks
- [ ] T062 `[B]` Create `src/hooks/cost-plan/useCostPlan.ts`
  - Fetch full cost plan
  - React Query configuration
  
- [ ] T063 `[P]` Create `src/hooks/cost-plan/useCostLines.ts`
  - CRUD mutations with optimistic updates
  - Batch mutation support
  
- [ ] T064 `[P]` Create `src/hooks/cost-plan/useInvoices.ts`
  - Paginated fetching
  - CRUD mutations
  
- [ ] T065 `[P]` Create `src/hooks/cost-plan/useVariations.ts`
  - Paginated fetching
  - CRUD mutations with status transition handling
  
- [ ] T066 `[P]` Create `src/hooks/cost-plan/useCostPlanCalculations.ts`
  - Derived calculations from raw data
  - Memoized for performance

### Realtime Hook
- [ ] T067 `[B][T]` Create `src/hooks/cost-plan/useCostPlanRealtime.ts`
  - Subscribe to `cost-plan:{projectId}` channel
  - Handle `totals_updated` events
  - Update React Query cache (totals only)
  - Reconnection handling

### Other Hooks
- [ ] T068 `[P]` Create `src/hooks/useCompanies.ts`
  - Search with debounce
  - Create company mutation
  
- [ ] T069 `[P]` Create `src/hooks/cost-plan/useSnapshots.ts`
  - List, create, compare snapshots
  
- [ ] T070 `[P]` Create `src/hooks/cost-plan/useCostPlanExport.ts`
  - Trigger export, handle download
  
- [ ] T071 `[P]` Create `src/hooks/cost-plan/useCostPlanImport.ts`
  - Upload file, get preview, confirm import

### Utility Hooks
- [ ] T072 `[P]` Create `src/hooks/useDebouncedSave.ts`
  - Generic debounced mutation wrapper
  
- [ ] T073 `[P]` Create `src/hooks/useOptimisticUpdate.ts`
  - Generic optimistic update helper

---

## Phase 6: FortuneSheet Integration (2-3 days)

> **Dependency**: Phase 0 POC validated, Phase 5 hooks ready

### Configuration
- [ ] T074 `[B]` Create `src/lib/fortune-sheet/config.ts`
  - Base FortuneSheet configuration
  - Toolbar/infobar/sheetbar settings
  
- [ ] T075 `[B]` Create `src/lib/fortune-sheet/row-groups.ts`
  - Generate row group config from sections
  - Collapse/expand handlers
  
- [ ] T076 `[P]` Create `src/lib/fortune-sheet/context-menu.ts`
  - Custom menu item definitions
  - Action handlers
  
- [ ] T077 `[P]` Create `src/lib/fortune-sheet/cell-renderers.ts`
  - Currency cell renderer
  - Date cell renderer
  - Dropdown cell renderer

### Column Definitions
- [ ] T078 `[B]` Create `src/components/cost-plan/sheets/sheet-configs/columns.ts`
  - Project Summary columns (A-P per spec)
  - Invoices columns
  - Variations columns
  - Width, type, editable flags
  
- [ ] T079 `[P]` Create `src/components/cost-plan/sheets/sheet-configs/formatting.ts`
  - Conditional formatting rules
  - Variance highlighting (red/green)
  - Input vs calculated cell colors
  
- [ ] T080 `[P]` Create `src/components/cost-plan/sheets/sheet-configs/validation.ts`
  - Cell validation rules
  - Required fields
  - Number ranges

---

## Phase 7: Core UI Components (3-4 days)

> **Dependency**: Phase 6 FortuneSheet config ready

### Page Structure
- [ ] T081 `[B]` Create `src/app/projects/[projectId]/cost-plan/page.tsx`
  - Server component wrapper
  - Initial data fetch
  
- [ ] T082 `[B]` Create `src/app/projects/[projectId]/cost-plan/loading.tsx`
  - Skeleton loader matching sheet layout
  
- [ ] T083 `[P]` Create `src/app/projects/[projectId]/cost-plan/error.tsx`
  - Error boundary with retry

### Main Components
- [ ] T084 `[B]` Create `src/components/cost-plan/CostPlanPage.tsx`
  - Orchestrates header, sheet, status
  - Hooks up data fetching and realtime
  
- [ ] T085 `[B]` Create `src/components/cost-plan/CostPlanHeader.tsx`
  - Project name, revision badge
  - Current month selector (dropdown)
  - GST toggle
  - Action buttons (Export, Import, Snapshot)
  
- [ ] T086 `[B]` Create `src/components/cost-plan/CostPlanSheet.tsx`
  - FortuneSheet wrapper
  - Tab management (3 sheets)
  - Cell change handlers → mutations

### Sheet Components
- [ ] T087 `[B]` Create `src/components/cost-plan/sheets/ProjectSummarySheet.tsx`
  - Map cost lines to FortuneSheet data
  - Section headers and grouping
  - Calculated column population
  
- [ ] T088 `[B]` Create `src/components/cost-plan/sheets/InvoicesSheet.tsx`
  - Map invoices to FortuneSheet data
  - Period column formatting
  
- [ ] T089 `[B]` Create `src/components/cost-plan/sheets/VariationsSheet.tsx`
  - Map variations to FortuneSheet data
  - Status column formatting

### Status Indicators
- [ ] T090 `[P]` Create `src/components/cost-plan/status/SyncIndicator.tsx`
  - Saved / Saving / Error states
  - Last saved timestamp
  
- [ ] T091 `[P]` Create `src/components/cost-plan/status/RealtimeIndicator.tsx`
  - Connected / Disconnected / Reconnecting
  - Tooltip with details
  
- [ ] T092 `[P]` Create `src/components/cost-plan/status/CalculationIndicator.tsx`
  - Shows when recalculating

---

## Phase 8: Custom Cell Components (2 days)

> **Dependency**: Phase 7 core UI in place

- [ ] T093 `[P]` Create `src/components/cost-plan/cells/CompanyAutocomplete.tsx`
  - Search-as-you-type
  - "Add new company" option
  - Integrates with useCompanies hook
  
- [ ] T094 `[P]` Create `src/components/cost-plan/cells/CostLineDropdown.tsx`
  - Grouped by section
  - Shows [code] - description format
  
- [ ] T095 `[P]` Create `src/components/cost-plan/cells/VariationDropdown.tsx`
  - Filters by selected cost line
  - Shows only approved variations
  
- [ ] T096 `[P]` Create `src/components/cost-plan/cells/MonthPicker.tsx`
  - Month/year selector
  - Defaults to project's current_report_month
  
- [ ] T097 `[P]` Create `src/components/cost-plan/cells/CurrencyCell.tsx`
  - Formatted display
  - Raw number input on edit
  - Cents conversion

---

## Phase 9: Context Menus (1 day)

> **Dependency**: Phase 7 core UI in place

- [ ] T098 `[P]` Create `src/components/cost-plan/context-menu/CostLineContextMenu.tsx`
  - Insert row above/below
  - Delete row
  - Link invoice...
  - Create variation...
  - Add comment
  
- [ ] T099 `[P]` Create `src/components/cost-plan/context-menu/InvoiceContextMenu.tsx`
  - Delete invoice
  - Link to cost line...
  - Link to variation...
  - Mark as paid
  
- [ ] T100 `[P]` Create `src/components/cost-plan/context-menu/VariationContextMenu.tsx`
  - Delete variation
  - Change status
  - Link to cost line...

---

## Phase 10: Dialogs (2-3 days)

> **Dependency**: Phase 7 core UI in place

- [ ] T101 `[P]` Create `src/components/cost-plan/dialogs/AddCompanyDialog.tsx`
  - Quick company creation form
  - Triggered from autocomplete
  
- [ ] T102 `[P]` Create `src/components/cost-plan/dialogs/LinkInvoiceDialog.tsx`
  - Select invoice to link to current cost line
  - Search/filter invoices
  
- [ ] T103 `[P]` Create `src/components/cost-plan/dialogs/SnapshotDialog.tsx`
  - Create snapshot form
  - Name input, confirmation
  
- [ ] T104 `[P]` Create `src/components/cost-plan/dialogs/SnapshotCompareDialog.tsx`
  - Select baseline to compare
  - Display variance table
  
- [ ] T105 `[B]` Create `src/components/cost-plan/dialogs/ImportDialog.tsx`
  - File upload dropzone
  - Preview parsed data
  - Proceed to column mapping
  
- [ ] T106 `[B]` Create `src/components/cost-plan/dialogs/ColumnMappingDialog.tsx`
  - Map source columns to target fields
  - Save as template option
  - Fuzzy match suggestions

---

## Phase 11: Excel Import/Export (2 days)

> **Dependency**: Phase 10 dialogs ready

### Export
- [ ] T107 `[B][T]` Create `src/lib/export/excel-export.ts`
  - Build workbook with 3 sheets
  - SheetJS integration
  
- [ ] T108 `[P][T]` Create `src/lib/export/formula-builder.ts`
  - Generate SUMIFS formulas for Claimed, Current Month
  - Generate SUM formulas for subtotals
  
- [ ] T109 `[P]` Create `src/lib/export/format-config.ts`
  - Column widths
  - Number formats
  - Conditional formatting rules

### Import
- [ ] T110 `[B][T]` Create `src/lib/import/excel-import.ts`
  - Parse uploaded file
  - Extract sheets and rows
  
- [ ] T111 `[P][T]` Create `src/lib/import/column-detector.ts`
  - Auto-detect column mappings by header name
  - Confidence scoring
  
- [ ] T112 `[P][T]` Create `src/lib/import/fuzzy-matcher.ts`
  - Match company names to master list
  - Match descriptions to existing cost lines

---

## Phase 12: Testing (2-3 days)

> **Dependency**: Features complete

### Unit Tests
- [ ] T113 `[P]` Test: `src/__tests__/lib/calculations/cost-plan-formulas.test.ts`
  - All calculation functions
  - Edge cases (zero, negative, null)
  
- [ ] T114 `[P]` Test: `src/__tests__/lib/calculations/aggregations.test.ts`
  - Section totals
  - Grand totals
  
- [ ] T115 `[P]` Test: `src/__tests__/lib/import/column-detector.test.ts`
  - Various header formats
  - Confidence thresholds
  
- [ ] T116 `[P]` Test: `src/__tests__/lib/utils/currency.test.ts`
  - Conversion functions
  - Formatting edge cases

### Hook Tests
- [ ] T117 `[P]` Test: `src/__tests__/hooks/useCostPlanCalculations.test.ts`
  - Derived values
  - Memoization behavior
  
- [ ] T118 `[P]` Test: `src/__tests__/hooks/useCostPlanRealtime.test.ts`
  - Subscription setup
  - Cache update on message

### API Tests
- [ ] T119 `[P]` Test: `src/__tests__/api/cost-lines.test.ts`
  - CRUD operations
  - Batch operations
  - Validation errors
  
- [ ] T120 `[P]` Test: `src/__tests__/api/invoices.test.ts`
  - CRUD operations
  - Pagination
  - Summary endpoint

### Component Tests
- [ ] T121 `[P]` Test: `src/__tests__/components/cost-plan/CostPlanSheet.test.tsx`
  - Renders with data
  - Tab switching
  - Cell edit triggers mutation
  
- [ ] T122 `[P]` Test: `src/__tests__/components/cost-plan/dialogs/ImportDialog.test.tsx`
  - File upload
  - Preview display

### E2E Tests (Playwright)
- [ ] T123 `[B]` E2E: Create cost line, verify appears in sheet
- [ ] T124 `[B]` E2E: Add invoice, verify Claimed to Date updates
- [ ] T125 `[B]` E2E: Approve variation, verify Forecast column updates
- [ ] T126 `[P]` E2E: Change current month, verify Current Month column updates
- [ ] T127 `[P]` E2E: Export to Excel, verify file downloads

---

## Phase 13: Polish & Documentation (1-2 days)

> **Dependency**: All features and tests complete

- [ ] T128 `[P]` Add loading skeletons to all async operations
- [ ] T129 `[P]` Add error toasts for failed operations
- [ ] T130 `[P]` Add success toasts for key actions
- [ ] T131 `[P]` Keyboard shortcuts (Cmd+S to save, Esc to cancel)
- [ ] T132 `[P]` Empty states for no invoices/variations
- [ ] T133 `[P]` Create `quickstart.md` developer documentation
- [ ] T134 `[P]` Update `spec.md` with any implementation deviations

---

## Dependencies Summary

```
Phase 0 (POC) ─────────────────────────────────────────────────────────────┐
                                                                           │
Phase 1 (Database) ◄───────────────────────────────────────────────────────┤
       │                                                                   │
       ▼                                                                   │
Phase 2 (Types) ─────────────────────────────────────────────────────┐     │
       │                                                             │     │
       ▼                                                             │     │
Phase 3 (APIs) ◄─────────────────────────────────────────────────────┤     │
       │                                                             │     │
       │              Phase 4 (Calculations) ◄───────────────────────┘     │
       │                     │                                             │
       ▼                     ▼                                             │
Phase 5 (Hooks) ◄────────────┴─────────────────────────────────────────────┘
       │
       │              Phase 6 (FortuneSheet) ◄── Phase 0 (POC)
       │                     │
       ▼                     ▼
Phase 7 (Core UI) ◄──────────┴──────────────────────────────┐
       │                                                     │
       ├──────────────┬──────────────┬──────────────────────┤
       ▼              ▼              ▼                      │
Phase 8 (Cells)  Phase 9 (Menus) Phase 10 (Dialogs)        │
       │              │              │                      │
       └──────────────┴──────────────┴──────────────────────┤
                                                            ▼
                                              Phase 11 (Import/Export)
                                                            │
                                                            ▼
                                              Phase 12 (Testing)
                                                            │
                                                            ▼
                                              Phase 13 (Polish)
```

---

## Risk Checkpoints

| After Phase | Checkpoint |
|-------------|------------|
| Phase 0 | FortuneSheet viable? Realtime working? SheetJS exports formulas? |
| Phase 1 | All migrations run without error? Triggers fire correctly? |
| Phase 3 | APIs return correct calculated values? Batch operations atomic? |
| Phase 7 | Sheet renders 500 rows in < 2s? Cell edits feel instant? |
| Phase 11 | Exported Excel opens correctly? Import handles edge cases? |

---

## Estimated Timeline

| Phase | Days | Parallelizable |
|-------|------|----------------|
| Phase 0: Research & POC | 1-2 | No |
| Phase 1: Database | 2-3 | Partial |
| Phase 2: Types | 1-2 | Yes |
| Phase 3: APIs | 3-4 | Yes |
| Phase 4: Calculations | 1-2 | Yes (with Phase 3) |
| Phase 5: Hooks | 2 | Partial |
| Phase 6: FortuneSheet | 2-3 | Partial |
| Phase 7: Core UI | 3-4 | No |
| Phase 8-10: Cells, Menus, Dialogs | 3-4 | Yes |
| Phase 11: Import/Export | 2 | Partial |
| Phase 12: Testing | 2-3 | Yes |
| Phase 13: Polish | 1-2 | Yes |

**Total**: 16-22 days (with parallelization)

---

**Tasks Version**: 1.0.0  
**Author**: Claude  
**Date**: 2025-11-26  
**Status**: Ready for Implementation
