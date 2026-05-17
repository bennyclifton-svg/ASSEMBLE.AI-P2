# Tasks: Cost Planning Module

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)
**Status**: Implemented (Core Features Complete), Bulk Selection Pending
**Estimate**: 20-26.5 days (Actual: ~18 days + Phase 15 pending)
**Progress**: Phase 0 ✅ | Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅ | Phase 5 ✅ | Phase 7 ✅ | Phase 8 ✅ | Phase 9 ✅ | Phase 10 ✅ | Phase 14 ✅ | **Phase 15 ⏳**
**Architecture**: SQLite + Custom Tables (not PostgreSQL + FortuneSheet)

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
- [X] T001 `[B]` Create FortuneSheet POC: basic grid with 500 rows, measure render performance
- [X] T002 `[B]` POC: Row grouping with collapse/expand *(LIMITED - use rowhidden workaround)*
- [X] T003 `[B]` POC: Custom context menu integration
- [X] T004 `[B]` POC: Cell edit callback → external state update flow
- [X] T005 `[B]` POC: Custom cell renderer for currency formatting

### Realtime Validation
- [X] T006-T008 `[B]` *(ADAPTED)* Use polling instead of Supabase - SQLite doesn't support triggers

### Excel I/O Validation
- [ ] T009 `[P]` POC: ExcelJS export with formulas preserved *(changed from SheetJS)*
- [ ] T010 `[P]` POC: ExcelJS import with column detection *(changed from SheetJS)*

**Output**: `research.md` documenting findings, blockers, and recommendations

---

## Phase 1: Database Foundation (2-3 days)

> **Dependency**: Phase 0 complete (no blockers found)
> **ADAPTED**: Using SQLite + Drizzle ORM instead of PostgreSQL/Supabase

### Schema & Migrations ✅ COMPLETE
- [X] T011-T020 `[B]` Combined migration: `drizzle/0008_cost_planning.sql`
  - companies table with soft delete
  - cost_lines table with all columns
  - cost_line_allocations for FY columns
  - variations table with forecast/approved
  - invoices table with period year/month
  - cost_line_comments table
  - project_snapshots table (JSON storage)
  - import_templates table
  - All indexes created

- [X] T021 `[B]` *(ADAPTED)* Calculation functions moved to TypeScript (SQLite doesn't support stored procedures)

- [X] T022-T023 `[B]` *(ADAPTED)* Realtime replaced with React Query polling (SQLite doesn't support triggers → Edge Functions)

### Seed Data
- [ ] T024 `[P]` Create seed data script for cost plan sample data

---

## Phase 2: Type Definitions & Calculations ✅ COMPLETE

> **Dependency**: Phase 1 migrations complete

### TypeScript Types ✅
- [X] T025-T031 `[P]` Created types in `src/types/`:
  - `cost-plan.ts` - CostLine, Company, CostPlanTotals, SectionTotals
  - `variation.ts` - Variation, VariationStatus, VariationCategory
  - `invoice.ts` - Invoice, InvoiceSummary, Period helpers
  - `index.ts` - Central exports

### Calculation Utilities ✅
- [X] T032 `[P]` Created `src/lib/calculations/cost-plan-formulas.ts`
  - calculateFinalForecast, calculateVarianceToBudget, calculateETC
  - sumVariationsForCostLine, sumInvoicesForCostLine
  - calculateSectionTotals, calculateCostPlanTotals
  - Currency helpers (centsToDollars, formatCurrency)
  - generateVariationNumber

### Zod Schemas (Deferred)
- [ ] T033 `[P]` Create Zod validation schemas (can add when building API routes)

---

## Phase 3: Core API Routes ✅ COMPLETE

> **Dependency**: Phase 2 types complete
> **ADAPTED**: Using SQLite + Drizzle, not Supabase

### Client Setup ✅
- [X] T034-T036 `[B]` *(ADAPTED)* Using existing `src/lib/db` with Drizzle ORM

### Companies API ✅
- [X] T037 `[P]` Created `src/app/api/cost-companies/route.ts`
  - GET: Search with `?search=` query param
  - POST: Create company

- [X] T038 `[P]` Created `src/app/api/cost-companies/[id]/route.ts`
  - GET, PATCH, DELETE

### Cost Plan API ✅
- [X] T039 `[B]` Created `src/app/api/projects/[projectId]/cost-plan/route.ts`
  - GET: Full cost plan with calculated fields
  - Uses TypeScript calculation functions
  - Includes cost_lines with company, allocations, calculated fields

### Cost Lines API ✅
- [X] T040 `[P]` Created `src/app/api/projects/[projectId]/cost-lines/route.ts`
  - GET: List all cost lines
  - POST: Create single cost line

- [X] T041 `[P]` Created `src/app/api/projects/[projectId]/cost-lines/[id]/route.ts`
  - GET, PATCH, DELETE

- [ ] T042-T044 `[P]` Batch operations and reorder (deferred to Phase 5)

### Invoices API ✅
- [X] T045 `[P]` Created `src/app/api/projects/[projectId]/invoices/route.ts`
  - GET: List with filters (costLineId, periodYear, periodMonth)
  - POST: Create invoice

- [X] T046 `[P]` Created `src/app/api/projects/[projectId]/invoices/[id]/route.ts`
  - GET, PATCH, DELETE

### Variations API ✅
- [X] T049 `[P]` Created `src/app/api/projects/[projectId]/variations/route.ts`
  - GET: List with filters
  - POST: Create (auto-generates variation number)

- [X] T050 `[P]` Created `src/app/api/projects/[projectId]/variations/[id]/route.ts`
  - GET, PATCH, DELETE

- [ ] T042-T048 `[P]` Batch operations and summary endpoints (deferred to Phase 5)

### Snapshot API (Deferred to Phase 5)
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

## Phase 4: Calculation & Utility Libraries (1-2 days) ✅ COMPLETE

> **Dependency**: Can start parallel to Phase 3

### Calculations
- [X] T057 `[P][T]` Create `src/lib/calculations/cost-plan-formulas.ts`
  - calculateForecastVariations(costLineId, variations)
  - calculateApprovedVariations(costLineId, variations)
  - calculateFinalForecast(costLine, variations)
  - calculateVariance(budget, finalForecast)
  - calculateETC(finalForecast, claimed)

- [X] T058 `[P][T]` Create `src/lib/calculations/aggregations.ts`
  - calculateSectionTotals(costLines)
  - calculateGrandTotals(costLines)
  - calculateCurrentMonth(invoices, reportMonth)

- [X] T059 `[P][T]` Create `src/lib/calculations/variance.ts`
  - calculateVarianceToBaseline(current, snapshot)
  - formatVarianceDisplay(variance)

### Currency Utilities
- [X] T060 `[P][T]` Create `src/lib/utils/currency.ts`
  - centsToDollars(cents)
  - dollarsToCents(dollars)
  - formatCurrency(cents, currency, showGst?)
  - parseCurrencyInput(input)

### Date Utilities
- [X] T061 `[P][T]` Create `src/lib/utils/dates.ts`
  - periodToDate(year, month)
  - dateToperiod(date)
  - formatPeriod(year, month)
  - getFirstOfMonth(date)

---

## Phase 4: React Hooks & UI (2 days) ✅ COMPLETE

> **Dependency**: Phase 3 APIs complete
> **ADAPTED**: Combined hooks and basic UI into single phase

### Data Fetching Hooks ✅
- [X] T062 `[B]` Created `src/lib/hooks/cost-plan/use-cost-plan.ts`
  - Fetch full cost plan with calculations
  - 10-second polling for realtime updates

- [X] T063 `[P]` Created `src/lib/hooks/cost-plan/use-cost-lines.ts`
  - CRUD mutations (create, update, delete)

- [X] T064 `[P]` Created `src/lib/hooks/cost-plan/use-invoices.ts`
  - Filtering by costLineId, period
  - CRUD mutations

- [X] T065 `[P]` Created `src/lib/hooks/cost-plan/use-variations.ts`
  - Filtering by costLineId, status
  - CRUD mutations

- [X] T068 `[P]` Created `src/lib/hooks/cost-plan/use-companies.ts`
  - Search with filtering
  - Create company mutation

### UI Components ✅
- [X] T084 `[B]` Created `src/app/projects/[projectId]/cost-plan/page.tsx`
  - Cost plan page with header, summary bar, sheet
  - Add line dialog

- [X] T086 `[B]` Created `src/components/cost-plan/CostPlanSheet.tsx`
  - FortuneSheet wrapper with row mapping
  - Section headers and grouping
  - Cell edit handlers → mutations

- [X] T102 `[P]` Created `src/components/cost-plan/InvoiceDialog.tsx`
  - List invoices for cost line
  - Add new invoice form

### Deferred to Phase 5
- [ ] T066 `[P]` Create `src/hooks/cost-plan/useCostPlanCalculations.ts`
  - Derived calculations from raw data
  - Memoized for performance

- [ ] T067 `[B][T]` *(ADAPTED)* Realtime uses 10s polling (SQLite limitation)

- [ ] T069 `[P]` Create `src/hooks/cost-plan/useSnapshots.ts`
  - List, create, compare snapshots

- [ ] T070 `[P]` Create `src/hooks/cost-plan/useCostPlanExport.ts`
  - Trigger export, handle download

- [ ] T071 `[P]` Create `src/hooks/cost-plan/useCostPlanImport.ts`
  - Upload file, get preview, confirm import

---

## Phase 5: FortuneSheet Integration & Polish (2-3 days) ✅ COMPLETE

> **Dependency**: Phase 0 POC validated, Phase 5 hooks ready

### Configuration
- [X] T074 `[B]` Create `src/lib/fortune-sheet/config.ts`
  - Base FortuneSheet configuration
  - Toolbar/infobar/sheetbar settings

- [X] T075 `[B]` Create `src/lib/fortune-sheet/row-groups.ts`
  - Generate row group config from sections
  - Collapse/expand handlers

- [X] T076 `[P]` Create `src/lib/fortune-sheet/context-menu.ts`
  - Custom menu item definitions
  - Action handlers

- [X] T077 `[P]` Create `src/lib/fortune-sheet/cell-renderers.ts`
  - Currency cell renderer
  - Date cell renderer
  - Dropdown cell renderer

### Column Definitions
- [X] T078 `[B]` Create `src/components/cost-plan/sheets/sheet-configs/columns.ts`
  - Project Summary columns (A-P per spec)
  - Invoices columns
  - Variations columns
  - Width, type, editable flags

- [X] T079 `[P]` Create `src/components/cost-plan/sheets/sheet-configs/formatting.ts`
  - Conditional formatting rules
  - Variance highlighting (red/green)
  - Input vs calculated cell colors

- [X] T080 `[P]` Create `src/components/cost-plan/sheets/sheet-configs/validation.ts`
  - Cell validation rules
  - Required fields
  - Number ranges

---

## Phase 7: Core UI Components (3-4 days) ✅ COMPLETE

> **Dependency**: Phase 6 FortuneSheet config ready

### Page Structure
- [X] T081 `[B]` Create `src/app/projects/[projectId]/cost-plan/page.tsx`
  - *(Previously created in Phase 4 as client component)*

- [X] T082 `[B]` Create `src/app/projects/[projectId]/cost-plan/loading.tsx`
  - Skeleton loader matching sheet layout

- [X] T083 `[P]` Create `src/app/projects/[projectId]/cost-plan/error.tsx`
  - Error boundary with retry

### Main Components
- [X] T084 `[B]` Create `src/components/cost-plan/CostPlanPage.tsx`
  - *(Implemented as CostPlanPanel.tsx with tabs)*

- [X] T085 `[B]` Create `src/components/cost-plan/CostPlanHeader.tsx`
  - *(Header inline in page.tsx and CostPlanPanel.tsx)*

- [X] T086 `[B]` Create `src/components/cost-plan/CostPlanSheet.tsx`
  - FortuneSheet wrapper
  - Tab management (3 sheets)
  - Cell change handlers → mutations

### Sheet Components
- [X] T087 `[B]` Create `src/components/cost-plan/sheets/ProjectSummarySheet.tsx`
  - Map cost lines to FortuneSheet data
  - Section headers and grouping
  - Calculated column population

- [X] T088 `[B]` Create `src/components/cost-plan/sheets/InvoicesSheet.tsx`
  - Map invoices to FortuneSheet data
  - Period column formatting

- [X] T089 `[B]` Create `src/components/cost-plan/sheets/VariationsSheet.tsx`
  - Map variations to FortuneSheet data
  - Status column formatting

### Status Indicators
- [X] T090 `[P]` Create `src/components/cost-plan/status/SyncIndicator.tsx`
  - Saved / Saving / Error states
  - Last saved timestamp

- [X] T091 `[P]` Create `src/components/cost-plan/status/RealtimeIndicator.tsx`
  - Connected / Disconnected / Reconnecting
  - Tooltip with details

- [X] T092 `[P]` Create `src/components/cost-plan/status/CalculationIndicator.tsx`
  - Shows when recalculating

---

## Phase 8: Custom Cell Components (2 days) ✅ COMPLETE

> **Dependency**: Phase 7 core UI in place

- [X] T093 `[P]` Create `src/components/cost-plan/cells/CompanyAutocomplete.tsx`
  - Search-as-you-type
  - "Add new company" option
  - Integrates with useCompanies hook

- [X] T094 `[P]` Create `src/components/cost-plan/cells/CostLineDropdown.tsx`
  - Grouped by section
  - Shows [code] - description format

- [X] T095 `[P]` Create `src/components/cost-plan/cells/VariationDropdown.tsx`
  - Filters by selected cost line
  - Shows only approved variations

- [X] T096 `[P]` Create `src/components/cost-plan/cells/MonthPicker.tsx`
  - Month/year selector
  - Defaults to project's current_report_month

- [X] T097 `[P]` Create `src/components/cost-plan/cells/CurrencyCell.tsx`
  - Formatted display
  - Raw number input on edit
  - Cents conversion

---

## Phase 9: Context Menus (1 day) ✅ COMPLETE

> **Dependency**: Phase 7 core UI in place

- [X] T098 `[P]` Create `src/components/cost-plan/context-menu/CostLineContextMenu.tsx`
  - Insert row above/below
  - Delete row
  - Link invoice...
  - Create variation...
  - Add comment

- [X] T099 `[P]` Create `src/components/cost-plan/context-menu/InvoiceContextMenu.tsx`
  - Delete invoice
  - Link to cost line...
  - Link to variation...
  - Mark as paid

- [X] T100 `[P]` Create `src/components/cost-plan/context-menu/VariationContextMenu.tsx`
  - Delete variation
  - Change status
  - Link to cost line...

---

## Phase 10: Dialogs (2-3 days) ✅ COMPLETE

> **Dependency**: Phase 7 core UI in place

- [X] T101 `[P]` ~~Create `src/components/cost-plan/dialogs/AddCompanyDialog.tsx`~~
  - **SKIPPED** - Redundant: Companies with full details enter via Consultant/Contractor cards
  - CompanyAutocomplete.tsx has inline name-only creation for quick adds

- [X] T102 `[P]` Create `src/components/cost-plan/dialogs/LinkInvoiceDialog.tsx`
  - Select invoice to link to current cost line
  - Search/filter invoices by status, date, company
  - Sort by date, amount, number

- [X] T103 `[P]` Create `src/components/cost-plan/dialogs/SnapshotDialog.tsx`
  - List existing snapshots with totals
  - Create snapshot with suggested names
  - Delete confirmation, compare, export actions

- [X] T104 `[P]` Create `src/components/cost-plan/dialogs/SnapshotCompareDialog.tsx`
  - Side-by-side comparison with current state
  - Shows added/removed/changed/unchanged status
  - Section expand/collapse, changes-only filter

- [X] T105 `[B]` Create `src/components/cost-plan/dialogs/ImportDialog.tsx`
  - Drag & drop file upload (xlsx, xls, csv)
  - Auto-detect columns and show preview
  - Step-by-step wizard flow

- [X] T106 `[B]` Create `src/components/cost-plan/dialogs/ColumnMappingDialog.tsx`
  - Map source columns to target cost plan fields
  - Auto-map suggestions with fuzzy matching
  - Save as template for reuse

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

## Phase 14: AI Invoice Extraction (2-2.5 days) ✅ COMPLETE

> **Dependency**: Phase 10 complete, existing RAG/parsing infrastructure
> **Feature**: Drag-and-drop invoice PDFs with AI extraction

### Backend Services ✅
- [X] T140 `[B]` Create `src/lib/invoice/extract.ts`
  - AI-powered invoice data extraction service
  - Uses LlamaParse/Unstructured/pdf-parse for document parsing
  - Claude Haiku for intelligent data extraction
  - Returns: invoiceNumber, invoiceDate, amountCents, gstCents, description, companyName, poNumber
  - Confidence scores for each field

- [X] T141 `[B]` Create `src/lib/invoice/company-matcher.ts`
  - Fuzzy match company names to existing companies/consultants/contractors
  - Lookup discipline/trade for matched company
  - Returns: companyId, disciplineId/tradeId, categoryPath for document storage

- [X] T142 `[B]` Create `src/app/api/projects/[projectId]/invoices/upload/route.ts`
  - Accept PDF file (FormData)
  - Call extraction service → get invoice data
  - Match company → get discipline/trade
  - Save PDF to Document Repository:
    - If company matched: save under Consultants/[Discipline] or Contractors/[Trade]
    - If no match: save under Uncategorized category
  - Auto-create Invoice record with fileAssetId link
  - Return created invoice with extraction metadata

### Frontend Components ✅
- [X] T143 `[P]` Create `src/components/cost-plan/InvoiceDropZone.tsx`
  - Drag-and-drop component wrapping InvoicesPanel
  - Drop zone overlay with visual feedback
  - Progress indicator during extraction ("Extracting invoice...")
  - Toast notification on success/error
  - Shows extraction confidence and company match details

- [X] T144 `[P]` Update `src/components/cost-plan/InvoicesPanel.tsx`
  - Wrapped with InvoiceDropZone
  - Added "Drop PDF" hint in toolbar
  - Auto-refresh on successful upload

### Schema Updates ✅
- [X] T145 `[P]` Add `file_asset_id` to invoices schema
  - Migration: `drizzle/0010_invoice_file_asset.sql`
  - Updated Invoice type with `fileAssetId?: string`
  - Updated schema.ts with fileAssetId column
  - Links invoice to source PDF for viewing original document

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
| Phase 14: AI Invoice Extraction | 2-2.5 | Partial |
| Phase 15: Bulk Selection & Operations | 1-2 | Partial |

**Total**: 20-26.5 days (with parallelization)

---

---

## Phase 15: Bulk Selection & Operations (1-2 days)

> **Dependency**: Phase 7 Core UI complete
> **Feature**: Multi-row selection with bulk delete and move operations
> **Priority**: P1

### Selection Infrastructure
- [ ] T150 `[B]` Create `src/lib/hooks/cost-plan/use-row-selection.ts`
  - Track selected row IDs in state
  - Implement Shift+Click range selection logic
  - Implement Ctrl+Click toggle selection
  - Clear selection on Escape key
  - Select all in section with Ctrl+A

- [ ] T151 `[B]` Update `src/components/cost-plan/CostPlanSheet.tsx`
  - Add selection highlight styling to selected rows
  - Wire up click handlers for selection
  - Pass selection state to context menu

### Bulk Actions UI
- [ ] T152 `[P]` Create `src/components/cost-plan/BulkActionsToolbar.tsx`
  - Show when selection.length > 1
  - Display selection count badge
  - Delete Selected button
  - Move to Section dropdown
  - Clear Selection button

- [ ] T153 `[P]` Create `src/components/cost-plan/dialogs/BulkDeleteDialog.tsx`
  - Confirmation dialog with count
  - Warning about linked invoices/variations
  - Call batch delete API

- [ ] T154 `[P]` Create `src/components/cost-plan/dialogs/BulkMoveSectionDialog.tsx`
  - Section dropdown (FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY)
  - Preview of affected rows
  - Call batch update API

### API Support
- [ ] T155 `[B]` Implement `POST /api/projects/:projectId/cost-lines/batch`
  - Support delete operations array
  - Support update operations (section change)
  - Atomic transaction for all operations
  - Return updated totals

### Context Menu Updates
- [ ] T156 `[P]` Update context menu for bulk actions
  - Show "Delete Selected (n rows)" when multiple selected
  - Show "Move to Section..." when multiple selected
  - Hide single-row actions when bulk selected

---

## Deferred Features (Future Work)

The following features were originally specified but deferred for future implementation:

### Phase 6: FortuneSheet Integration (SKIPPED)
- **Reason**: Implemented custom table-based UI instead
- **Tasks Skipped**: T074-T080 (FortuneSheet config, row groups, cell renderers)
- **Alternative**: Custom HTML tables with drag-and-drop, inline editing

### Phase 11: Excel Import/Export (DEFERRED)
- **Status**: Dialogs created but API not implemented
- **Remaining Tasks**:
  - [ ] T107 Create excel-export.ts (ExcelJS integration)
  - [ ] T108 Create formula-builder.ts
  - [ ] T109 Create format-config.ts
  - [ ] T110 Create excel-import.ts
  - [ ] T111 Create column-detector.ts
  - [ ] T112 Create fuzzy-matcher.ts
- **Priority**: P1 (Should have)

### Phase 12: Testing (MINIMAL)
- **Status**: Basic testing only, comprehensive suite deferred
- **Remaining Tasks**:
  - [ ] T113-T116 Unit tests (calculations, aggregations, utilities)
  - [ ] T117-T118 Hook tests (calculations, realtime)
  - [ ] T119-T120 API tests (CRUD, validation)
  - [ ] T121-T122 Component tests (sheets, dialogs)
  - [ ] T123-T127 E2E tests (Playwright)
- **Priority**: P1 (Should have)

### Phase 13: Polish & Documentation (PARTIAL)
- **Completed**:
  - [X] T128 Loading skeletons
  - [X] T129 Error toasts
  - [X] T130 Success toasts
  - [X] T134 Spec.md updated (this document)
- **Deferred**:
  - [ ] T131 Keyboard shortcuts (Cmd+S, Esc)
  - [ ] T132 Empty states
  - [ ] T133 quickstart.md developer documentation
- **Priority**: P2 (Nice to have)

### Additional Deferred Features

#### Fiscal Year Allocations UI
  - **Schema**: ✅ Exists
  - **API**: ❌ Not implemented
  - **UI**: ❌ Not implemented
  - **Priority**: P1

#### Snapshot/Baseline Comparison
  - **Schema**: ✅ Exists
  - **Dialogs**: ✅ Created
  - **API**: ❌ Not implemented
  - **Priority**: P1

#### Cost Line Comments
  - **Schema**: ✅ Exists
  - **API**: ❌ Not implemented
  - **UI**: ❌ Not implemented
  - **Priority**: P2

#### Row Grouping/Collapse
  - **Status**: Section headers exist but not collapsible
  - **Priority**: P2

#### GST Toggle Display
  - **Schema**: ✅ Field exists (showGst)
  - **UI**: ❌ Toggle not visible
  - **Priority**: P2

#### Context Menus (Right-Click)
  - **Components**: ✅ Created
  - **Integration**: ⚠️ Unknown status
  - **Priority**: P2

#### Drag-to-Link Invoices/Variations
  - **Current**: Dropdown selection
  - **Planned**: Drag invoice row onto cost line
  - **Priority**: P2

#### Undo/Redo Support
  - **Status**: Not started
  - **Priority**: P2

#### Real-Time WebSocket Updates
  - **Current**: 10-second polling
  - **Requires**: Migration to PostgreSQL/Supabase
  - **Priority**: P3 (Nice to have)

---

**Tasks Version**: 1.2.0
**Author**: Claude
**Date**: 2025-12-09 (Updated)
**Status**: Core Implementation Complete, Bulk Selection Tasks Added (Phase 15)
