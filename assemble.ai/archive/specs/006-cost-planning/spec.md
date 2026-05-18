# Cost Planning Module Specification

> **Module**: Cost Planning
> **Version**: 0.3.0 (Implementation Update)
> **Status**: As-Built Documentation
> **Constitution Alignment**: Principles IV, V, VI, IX, X, XI

---

## 1. Overview

### 1.1 Purpose

The Cost Planning module provides real-time financial visibility across the project lifecycle, enabling PMs to track budgets, commitments, invoices, and variations in a familiar spreadsheet interface.

### 1.2 Problem Statement

Construction PMs currently manage cost plans in disconnected Excel files, leading to:
- Manual reconciliation of invoices against budget lines
- No automatic rollup of "current month" claims
- Version control issues with multiple stakeholders
- Delayed visibility into cost overruns
- Hard-coded fiscal year columns requiring annual maintenance

### 1.3 Solution

A web-based, spreadsheet-native cost planning tool that:
- Automatically links invoices to budget line items (and optionally to variations)
- Calculates current month totals based on a selectable reporting period
- Tracks both forecast and approved variations separately
- Provides real-time budget variance visibility
- Supports dynamic fiscal year allocations

---

## 2. Constitution Alignment

| Principle | How This Module Complies |
|-----------|--------------------------|
| **IV. Financial Visibility** | Cost tracking from budget → forecast → claimed → ETC |
| **V. Small Firm Optimization** | Single PM can manage multiple projects; no complex setup |
| **VI. Sharp, Actionable Outputs** | Clear variance flags; exportable reports |
| **IX. Spreadsheet-Native UX** | FortuneSheet integration; Excel-like interactions |
| **X. Relational Data Integrity** | Explicit FK linking for invoices → cost lines → variations |
| **XI. Period-Based Reporting** | Native support for reporting months and fiscal year allocations |

---

## 3. Data Model

### 3.1 Entity Relationship

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Project     │       │   Discipline    │       │   Cost Line     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ name            │       │ discipline_name │       │ project_id      │──┐
│ current_month   │──────<│ project_id      │>──────│ discipline_id   │  │
│ revision        │       │ is_enabled      │       │ description     │  │
│ currency_code   │       └─────────────────┘       │ budget          │  │
│ show_gst        │                                 │ approved_contract│  │
└─────────────────┘                                 │ section         │  │
                                                    └────────┬────────┘  │
                          ┌─────────────────┐                │           │
                          │ FY Allocation   │                │           │
                          ├─────────────────┤                │           │
                          │ id              │                │           │
                          │ cost_line_id    │<───────────────┘           │
                          │ fiscal_year     │                            │
                          │ amount_cents    │                            │
                          └─────────────────┘                            │
                                                                         │
        ┌────────────────────────────────────────────────────────────────┘
        │
        │         ┌─────────────────┐       ┌─────────────────┐
        │         │   Variation     │       │    Invoice      │
        │         ├─────────────────┤       ├─────────────────┤
        │         │ id              │       │ id              │
        └────────>│ cost_line_id    │<──────│ variation_id    │ (nullable)
                  │ variation_number│       │ cost_line_id    │
                  │ category        │       │ invoice_number  │
                  │ amount_forecast │       │ amount_cents    │
                  │ amount_approved │       │ period_year     │
                  │ status          │       │ period_month    │
                  └─────────────────┘       │ paid_status     │
                                            └─────────────────┘
```

### 3.2 Cost Line Sections

| Section ID | Name | Description |
|------------|------|-------------|
| `FEES` | Fees and Charges | Council fees, levies, permits |
| `CONSULTANTS` | Consultants | PM, engineers, certifiers |
| `CONSTRUCTION` | Construction | Head contractor, fitout, FF&E |
| `CONTINGENCY` | Contingency | Risk allowances (with draw-down tracking) |

### 3.3 Database Schema

**Technology**: SQLite with Drizzle ORM

**Schema Patterns**:
- Primary keys: Auto-incrementing INTEGER (SQLite standard)
- Timestamps: ISO 8601 TEXT strings
- Soft deletes: `deletedAt` TEXT field (NULL when active)
- Foreign keys: Enabled via `PRAGMA foreign_keys = ON`

```sql
-- ============================================================
-- COMPANIES (Master List)
-- ============================================================
CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  abn TEXT,
  contactName TEXT,
  contactEmail TEXT,
  contactPhone TEXT,
  address TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT -- Soft delete
);

-- ============================================================
-- PROJECTS (Extended for Cost Planning)
-- ============================================================
-- Note: Projects table already exists in main schema
-- Cost planning adds these fields:
--   currentReportMonth TEXT (ISO 8601 date string, first of month)
--   revision TEXT DEFAULT 'REV A'
--   currencyCode TEXT DEFAULT 'AUD'
--   showGst INTEGER DEFAULT 0 (SQLite boolean: 0=false, 1=true)

-- ============================================================
-- COST LINES (Rows in Project Summary)
-- ============================================================
CREATE TABLE cost_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  disciplineId INTEGER REFERENCES consultant_disciplines(id) ON DELETE SET NULL,
  section TEXT NOT NULL, -- FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY
  costCode TEXT,
  description TEXT NOT NULL,
  reference TEXT, -- Contract number, PO reference
  budgetCents INTEGER DEFAULT 0,
  approvedContractCents INTEGER DEFAULT 0,
  sortOrder INTEGER NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);

-- ============================================================
-- FISCAL YEAR ALLOCATIONS (Dynamic FY columns)
-- ============================================================
-- Note: Table exists in schema but not yet exposed in UI/API
CREATE TABLE cost_line_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  costLineId INTEGER NOT NULL REFERENCES cost_lines(id) ON DELETE CASCADE,
  fiscalYear INTEGER NOT NULL, -- e.g., 2026 for FY2026
  amountCents INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- VARIATIONS
-- ============================================================
CREATE TABLE variations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  costLineId INTEGER REFERENCES cost_lines(id) ON DELETE SET NULL,
  variationNumber TEXT NOT NULL, -- e.g., "PV-001", "CV-002"
  category TEXT NOT NULL, -- Principal, Contractor, Lessor Works
  description TEXT NOT NULL,
  status TEXT DEFAULT 'Forecast', -- Forecast, Approved, Rejected, Withdrawn
  amountForecastCents INTEGER DEFAULT 0, -- What PM forecasts
  amountApprovedCents INTEGER DEFAULT 0, -- What gets approved (can differ)
  dateSubmitted TEXT,
  dateApproved TEXT,
  requestedBy TEXT,
  approvedBy TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  costLineId INTEGER REFERENCES cost_lines(id) ON DELETE SET NULL,
  variationId INTEGER REFERENCES variations(id) ON DELETE SET NULL, -- Optional link to variation
  companyId INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  fileAssetId INTEGER REFERENCES file_assets(id) ON DELETE SET NULL, -- Link to uploaded PDF
  invoiceDate TEXT NOT NULL,
  poNumber TEXT,
  invoiceNumber TEXT NOT NULL,
  description TEXT,
  amountCents INTEGER NOT NULL,
  gstCents INTEGER DEFAULT 0, -- Store GST separately
  periodYear INTEGER NOT NULL, -- e.g., 2025
  periodMonth INTEGER NOT NULL, -- 1-12
  paidStatus TEXT DEFAULT 'unpaid', -- unpaid, paid, partial
  paidDate TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);

-- ============================================================
-- COST LINE COMMENTS (Cell-level comments)
-- ============================================================
-- Note: Table exists in schema but not yet exposed in UI/API
CREATE TABLE cost_line_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  costLineId INTEGER NOT NULL REFERENCES cost_lines(id) ON DELETE CASCADE,
  columnKey TEXT NOT NULL, -- e.g., 'budget', 'approvedContract'
  commentText TEXT NOT NULL,
  createdBy INTEGER NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);

-- ============================================================
-- PROJECT SNAPSHOTS (Baseline comparison)
-- ============================================================
-- Note: Table exists, dialogs created, but API not yet implemented
CREATE TABLE project_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projectId INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshotName TEXT NOT NULL, -- e.g., "REV A", "REV B", "Tender Award"
  snapshotDate TEXT NOT NULL,
  snapshotData TEXT NOT NULL, -- JSON string with full denormalized state
  createdBy INTEGER NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- COLUMN MAPPING TEMPLATES (Import memory)
-- ============================================================
-- Note: Table exists but not yet exposed in UI/API
CREATE TABLE import_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  templateName TEXT NOT NULL,
  columnMappings TEXT NOT NULL, -- JSON string: {"MyBudgetCol": "budgetCents", ...}
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
-- Note: SQLite indexes use different syntax than PostgreSQL
CREATE INDEX idx_cost_lines_project ON cost_lines(projectId) WHERE deletedAt IS NULL;
CREATE INDEX idx_cost_lines_section ON cost_lines(projectId, section, sortOrder);
CREATE INDEX idx_allocations_cost_line ON cost_line_allocations(costLineId);
CREATE INDEX idx_invoices_project ON invoices(projectId) WHERE deletedAt IS NULL;
CREATE INDEX idx_invoices_cost_line ON invoices(costLineId) WHERE deletedAt IS NULL;
CREATE INDEX idx_invoices_variation ON invoices(variationId) WHERE deletedAt IS NULL;
CREATE INDEX idx_invoices_period ON invoices(periodYear, periodMonth);
CREATE INDEX idx_variations_project ON variations(projectId) WHERE deletedAt IS NULL;
CREATE INDEX idx_variations_cost_line ON variations(costLineId) WHERE deletedAt IS NULL;
CREATE INDEX idx_snapshots_project ON project_snapshots(projectId);
```

---

## 4. Calculated Fields (Formula Logic)

### 4.1 Project Summary Calculations

**New Column Order** (logical flow from budget → outcome):

| Col | Field | Formula | Implementation |
|-----|-------|---------|----------------|
| A | Cost Code | - | Direct input |
| B | Discipline | - | FK to consultant_disciplines table |
| C | Description/Role | - | Direct input |
| D | Reference | - | Contract/PO reference |
| E+ | FY Allocations | - | ⚠️ NOT YET IN UI (schema only) |
| G | **Budget** | - | Direct input (editable) |
| H | **Approved Contract** | - | Direct input (editable) |
| I | **Forecast Variations** | Sum of forecast variations | `SUM(variations WHERE status = 'Forecast' AND costLineId = X).amountForecastCents` |
| J | **Approved Variations** | Sum of approved variations | `SUM(variations WHERE status = 'Approved' AND costLineId = X).amountApprovedCents` |
| K | **Final Forecast Cost** | `H + I + J` | `approvedContract + forecastVars + approvedVars` |
| L | **Variance to Budget** | `G - K` | `budget - finalForecast` (positive = under budget) |
| M | **Claimed to Date** | Sum of all invoices up to period | `SUM(invoices WHERE costLineId = X AND period <= currentMonth).amountCents` |
| N | **Current Month** | Invoices for exact period | `SUM(invoices WHERE costLineId = X AND periodYear/Month = current).amountCents` |
| O | **Estimate to Complete (ETC)** | `K - M` | `finalForecast - claimedToDate` |

### 4.2 Calculation Notes

| Scenario | Handling |
|----------|----------|
| Variation in "Forecast" status | Shows in column I (Forecast Variations) |
| Variation approved | Moves from I to J (Approved Variations) |
| `amount_approved` differs from `amount_forecast` | J uses `amount_approved`, not forecast |
| Invoice linked to variation | Still counts in Claimed (M), but traceable to variation |

### 4.3 Section Subtotals

Each section displays subtotals using aggregation that:
- Sums all non-deleted data rows in the section
- Excludes subtotal rows themselves
- Updates in real-time as data changes
- Uses FortuneSheet row grouping (not separate subtotal rows)

### 4.4 GST Handling

```typescript
// Display logic based on project.show_gst
const displayAmount = (amountCents: number, gstCents: number, showGst: boolean) => {
  return showGst ? amountCents + gstCents : amountCents;
};
```

---

## 5. User Interface

### 5.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| UI Framework | **React 18 + Next.js 14** | Server components, modern patterns |
| Table Component | **Custom HTML tables** | Flexible, lightweight, full control |
| State Management | **TanStack React Query v5** | Server state sync, optimistic updates |
| Real-time Updates | **Polling (10s interval)** | Simple, works with SQLite |
| Database | **SQLite + Drizzle ORM** | Embedded, no server required |
| Styling | **Tailwind CSS** | Utility-first, consistent design |
| Export | **⚠️ NOT YET IMPLEMENTED** | Planned: ExcelJS for XLSX export |

### 5.2 Layout Structure

**Three-Tab Panel Interface**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COST PLAN                                      [Nov 2025 ▼]  [🔄 Refresh] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Summary Bar:                                                               │
│  Budget: $645K | Final: $645K | Variance: $0 | Claimed: $1.3K | ETC: $643K │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ [Cost Plan] │ [Variations] │ [Invoices]                               │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ COST PLAN TAB (Table View)                                            ┃ │
│ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ │
│ ┃ FEES AND CHARGES                                         Total: $112K ┃ │
│ ┃  ⣿ | 1.01 | LSL Corp | LSL Levy | ... | $16,112 | ...                ┃ │
│ ┃  ⣿ | 1.02 | Ryde Council | Section 7.12 | ... | $96,675 | ...        ┃ │
│ ┃                                                                        ┃ │
│ ┃ CONSULTANTS                                              Total: $106K ┃ │
│ ┃  ⣿ | 2.01 | Engine Room | PM - Design | ... | $98,497 | ...          ┃ │
│ ┃  ⣿ | 2.02 | Compass | Stage 1a Design | ... | $8,000 | ...           ┃ │
│ ┃  + Add Cost Line                                                      ┃ │
│ ┃                                                                        ┃ │
│ ┃ CONSTRUCTION                                             Total: $0    ┃ │
│ ┃  + Add Cost Line                                                      ┃ │
│ ┃                                                                        ┃ │
│ ┃ CONTINGENCY                                              Total: $0    ┃ │
│ ┃  + Add Cost Line                                                      ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                                             │
│ [+ Add] [Import] [Export] [📸 Snapshot]                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Features**:
- ⣿ = Drag handle for reordering within sections
- Inline add forms (not context menu)
- Section headers (not collapsible)
- Summary bar with live totals
- Month selector for period filtering

### 5.3 Project Summary Sheet

#### Column Configuration

| Col | Header | Width | Type | Editable | Style | Notes |
|-----|--------|-------|------|----------|-------|-------|
| A | Cost Code | 80px | Text | Yes | Blue | Auto-gen or manual |
| B | Discipline | 140px | Dropdown | Yes | Blue | From project disciplines |
| C | Description/Role | 250px | Text | Yes | Blue | Primary identifier |
| D | Reference | 100px | Text | Yes | Blue | Contract/PO ref |
| E+ | FY 20XX | 80px | Currency | Yes | Blue | Dynamic columns |
| G | Budget | 100px | Currency | Yes | Blue | Input |
| H | Approved Contract | 110px | Currency | Yes | Blue | Input |
| I | Forecast Vars | 100px | Currency | **No** | Black | Calculated |
| J | Approved Vars | 100px | Currency | **No** | Black | Calculated |
| K | Final Forecast | 110px | Currency | **No** | Black | H+I+J |
| L | Variance | 100px | Currency | **No** | Conditional | G-K |
| M | Claimed | 100px | Currency | **No** | Black | From invoices |
| N | Current Month | 100px | Currency | **No** | Black | Period filter |
| O | ETC | 100px | Currency | **No** | Black | K-M |

#### Conditional Formatting

| Condition | Style |
|-----------|-------|
| Variance to Budget < 0 | Red background (#FFEBEE), red text |
| Variance to Budget > 0 | Green text (#2E7D32) |
| Editable cells (inputs) | Blue text (#0000FF) |
| Calculated cells | Black text |
| Linked from other sheets | Green text (#008000) |
| Cell has comment | Red triangle indicator (top-right) |

#### Row Grouping (FortuneSheet Native)

```typescript
const rowGroupConfig = {
  type: 'row',
  groups: [
    { start: 6, end: 9, hidden: false },   // FEES section
    { start: 13, end: 26, hidden: false }, // CONSULTANTS section
    { start: 30, end: 38, hidden: false }, // CONSTRUCTION section
    { start: 41, end: 45, hidden: false }, // CONTINGENCY section
  ]
};
```

#### Right-Click Context Menu

```typescript
const contextMenuItems = [
  { key: 'insert_above', label: 'Insert Row Above', icon: 'plus' },
  { key: 'insert_below', label: 'Insert Row Below', icon: 'plus' },
  { separator: true },
  { key: 'link_invoice', label: 'Link Invoice...', icon: 'link' },
  { key: 'create_variation', label: 'Create Variation...', icon: 'file-plus' },
  { key: 'view_linked', label: 'View Linked Items', icon: 'eye' },
  { separator: true },
  { key: 'add_comment', label: 'Add Comment', icon: 'message-square' },
  { key: 'delete_row', label: 'Delete Row', icon: 'trash', danger: true },
  // Bulk actions (shown when multiple rows selected)
  { key: 'delete_selected', label: 'Delete Selected ({n} rows)', icon: 'trash', danger: true, bulk: true },
  { key: 'move_to_section', label: 'Move to Section...', icon: 'folder', bulk: true },
];
```

#### Bulk Selection Behavior

**Selection Methods:**
| Action | Behavior |
|--------|----------|
| Click row | Select single row, deselect others |
| Ctrl+Click row | Toggle row selection (add/remove from selection) |
| Shift+Click row | Select range from last clicked row to current row |
| Ctrl+A | Select all rows in current section |
| Escape | Clear all selection |

**Selection Indicator:**
- Selected rows show with highlighted background (light blue)
- Selection count badge appears in toolbar: "3 rows selected"
- Bulk action buttons appear when selection > 1 row

**Bulk Actions Toolbar:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☑ 3 rows selected    [Delete Selected] [Move to Section ▼] [Clear Selection] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Bulk Delete Flow:**
1. User selects multiple rows
2. Clicks "Delete Selected" or presses Delete key
3. Confirmation dialog shows: "Delete 3 cost lines? This will also remove linked invoices and variations."
4. On confirm: Soft-delete all selected rows via batch API
5. Show success toast: "3 cost lines deleted"

**Bulk Move to Section Flow:**
1. User selects multiple rows (can be from different sections)
2. Clicks "Move to Section" dropdown
3. Selects target section (FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY)
4. Rows move to end of target section, sortOrder updated
5. Show success toast: "3 cost lines moved to CONSULTANTS"

### 5.4 Invoices Sheet

#### Column Configuration

| Col | Header | Width | Type | Editable | Notes |
|-----|--------|-------|------|----------|-------|
| A | Invoice No. | 100px | Text | Yes | **Required** |
| B | Description | Auto | Text | Yes | Free text |
| C | Cost Line | 160px | Dropdown | Yes | **Links to Project Summary** |
| D | Period | 80px | Month Picker | Yes | Defaults to current month |
| E | Date | 90px | Date | Yes | Invoice date |
| F | Amount ex GST | 100px | Currency | Yes | Right-aligned |
| G | Status | 80px | Toggle Button | Yes | **Paid/Unpaid toggle** (single click) |
| H | Actions | 40px | Icon | - | + icon in header to add invoice |

#### Toolbar

The toolbar displays only the drop zone indicator:
- **Drop Invoice**: Shows upload icon with "Drop Invoice" text for drag-and-drop PDF uploads

#### Sortable Column Headers

All columns (except Actions) are sortable by clicking the header:
- Click header to sort ascending
- Click again to sort descending
- Sort indicator (chevron up/down) shows current sort direction
- Useful for grouping invoices by period, amount, or status

#### Smart Features

1. **Cost Line dropdown**: Shows `[cost_code] - [discipline/trade] - [activity]` format
2. **Period default**: Auto-fills current month
3. **Status toggle**: Single-click to toggle between Paid (green) and Unpaid (yellow)
4. **Add invoice**: Click + icon in table header to add new row
5. **AI extraction**: Drop PDF invoice to auto-extract invoice data

#### Drag-to-Link Feature

```typescript
// Drag invoice row onto Project Summary row to auto-link
const handleDragDrop = (invoiceId: string, targetCostLineId: string) => {
  updateInvoice(invoiceId, { cost_line_id: targetCostLineId });
  showToast(`Invoice linked to ${costLine.description}`);
};
```

#### Delete Invoice Behavior

| Element | Specification |
|---------|---------------|
| **Trigger** | Trash icon in far-right column, visible on row hover |
| **Icon Style** | Gray (#858585) → Red (#f87171) on hover |
| **Visibility** | Hidden by default, appears on row hover (group-hover pattern) |
| **Confirmation** | Modal dialog: "Are you sure you want to delete [Invoice No.]?" |
| **Warning** | "This action cannot be undone." |
| **Action** | Soft delete (sets `deletedAt` timestamp) |
| **Effect** | Invoice removed from totals and Project Summary calculations |

### 5.5 Variations Sheet

#### UI Layout

| Element | Specification |
|---------|---------------|
| **Toolbar** | Simple bar with "Drop Variation" hint (Upload icon + text) on right |
| **Add Variation** | + icon button in last column header |
| **Filters** | None (removed for simplified UX) |
| **Summary Row** | None (removed for simplified UX) |

#### Column Configuration

All columns are **sortable** by clicking the header. Sort indicator (chevron) shows current sort direction.

| Col | Header | Width | Type | Editable | Notes |
|-----|--------|-------|------|----------|-------|
| A | Variation # | 100px | Text | **Auto** | e.g., PV-001, CV-002 |
| B | Description | flex | Text | Yes | Click to edit inline |
| C | Cost Line | 200px | Dropdown | Yes | Links to Cost Line |
| D | Status | 90px | Dropdown | Yes | Forecast/Approved/Rejected/Withdrawn |
| E | Forecast | 100px | Currency | Yes | PM's estimate |
| F | Approved | 100px | Currency | Yes | Final approved amount |
| G | Date | 100px | Date | Yes | Date submitted |
| H | Cat | 60px | Dropdown | Yes | PV/CV/LV (Principal/Contractor/Lessor) |
| I | (actions) | 40px | Button | - | + icon in header, trash icon on hover |

#### Status Dropdown Options

| Value | Description |
|-------|-------------|
| Forecast | Variation proposed but not approved |
| Approved | Officially approved |
| Rejected | Declined |
| Withdrawn | Pulled back by requester |

#### Category Dropdown Options

| Display | Value | Prefix |
|---------|-------|--------|
| PV | Principal | PV-### |
| CV | Contractor | CV-### |
| LV | Lessor Works | LV-### |

#### Business Rules

| Rule | Behavior |
|------|----------|
| New variation | Auto-generate variation number based on category (click + icon in header) |
| Status → Approved | If Approved amount is 0, copies Forecast amount to Approved |
| Status → Approved | Amounts flow to Forecast/Approved columns in Project Summary |
| Status → Rejected/Withdrawn | Removes from both Forecast and Approved calculations |
| Cost Line changed | Updates Forecast/Approved totals on affected cost lines |
| Column header click | Sorts table by that column (toggle asc/desc) |

#### Variation Number Generation

```typescript
// Auto-prefix based on category
const prefixes = {
  'Principal': 'PV',
  'Contractor': 'CV',
  'Lessor Works': 'LV'
};

// Result: PV-001, PV-002, CV-001, etc.
```

#### Delete Variation Behavior

| Element | Specification |
|---------|---------------|
| **Trigger** | Trash icon in far-right column, visible on row hover |
| **Icon Style** | Gray (#858585) → Red (#f87171) on hover |
| **Visibility** | Hidden by default, appears on row hover (group-hover pattern) |
| **Confirmation** | Modal dialog: "Are you sure you want to delete [Variation No.]?" |
| **Warning** | "This action cannot be undone." |
| **Action** | Soft delete (sets `deletedAt` timestamp) |
| **Effect** | Variation removed from Forecast/Approved totals and Project Summary calculations |

---

## 6. API Endpoints

**Implementation Status**: ✅ = Implemented, ⚠️ = Partial, ❌ = Not Implemented

### 6.1 Projects

```
✅ GET    /api/projects/:projectId/cost-plan              # Full cost plan with calculations
✅ PATCH  /api/projects/:id                               # Update project settings
❌ POST   /api/projects/:id/cost-plan/snapshot            # NOT IMPLEMENTED
❌ GET    /api/projects/:id/cost-plan/snapshots           # NOT IMPLEMENTED
❌ GET    /api/projects/:id/cost-plan/compare/:snapshotId # NOT IMPLEMENTED
```

### 6.2 Cost Lines

```
✅ GET    /api/projects/:projectId/cost-lines         # List all (with calculated fields)
✅ POST   /api/projects/:projectId/cost-lines         # Create single
✅ GET    /api/projects/:projectId/cost-lines/:id     # Get single
✅ PATCH  /api/projects/:projectId/cost-lines/:id     # Update single
✅ DELETE /api/projects/:projectId/cost-lines/:id     # Soft delete
✅ PATCH  /api/projects/:projectId/cost-lines/reorder # Batch reorder (sortOrder)
❌ POST   /api/projects/:id/cost-lines/batch          # NOT IMPLEMENTED (batch CRUD)
```

#### Batch Operation Format

```typescript
interface BatchOperation {
  op: 'create' | 'update' | 'delete';
  id?: string;           // Required for update/delete
  data?: Partial<CostLine>; // Required for create/update
}

// POST /api/projects/:id/cost-lines/batch
{
  "operations": [
    { "op": "update", "id": "cl_001", "data": { "budget_cents": 1000000 } },
    { "op": "create", "data": { "section": "FEES", "description": "New fee" } },
    { "op": "delete", "id": "cl_002" }
  ]
}
```

### 6.3 Fiscal Year Allocations

```
❌ GET    /api/projects/:projectId/cost-lines/:id/allocations  # NOT IMPLEMENTED
❌ PUT    /api/projects/:projectId/cost-lines/:id/allocations  # NOT IMPLEMENTED
```

**Note**: Schema exists but not yet exposed in UI/API

### 6.4 Invoices

```
✅ GET    /api/projects/:projectId/invoices               # List (with filters)
✅ GET    /api/projects/:projectId/invoices?costLineId=X&periodYear=2025&periodMonth=11
✅ POST   /api/projects/:projectId/invoices               # Create manually
✅ POST   /api/projects/:projectId/invoices/upload        # Upload PDF + AI extraction
✅ GET    /api/projects/:projectId/invoices/:id           # Get single
✅ PATCH  /api/projects/:projectId/invoices/:id           # Update
✅ DELETE /api/projects/:projectId/invoices/:id           # Soft delete
❌ POST   /api/projects/:id/invoices/batch                # NOT IMPLEMENTED
❌ GET    /api/projects/:id/invoices/summary              # NOT IMPLEMENTED
```

**Invoice PDF Upload & AI Extraction:**

The `/invoices/upload` endpoint accepts PDF invoices and automatically:
1. Extracts invoice data (number, date, amounts, company name) using AI
2. Matches the company name to existing consultants/contractors
3. Saves the PDF to the Document Repository:
   - **Matched companies**: Stored under `Consultants/[Discipline]` or `Contractors/[Trade]`
   - **Unmatched companies**: Stored under `Uncategorized` category
4. Creates an invoice record linked to the PDF file

This ensures all invoice PDFs are captured in the document repository for audit trails, even when the company cannot be automatically matched.

### 6.5 Variations

```
✅ GET    /api/projects/:projectId/variations             # List (with filters)
✅ GET    /api/projects/:projectId/variations?costLineId=X&status=Approved&category=Principal
✅ POST   /api/projects/:projectId/variations             # Create (auto-generates number)
✅ GET    /api/projects/:projectId/variations/:id         # Get single
✅ PATCH  /api/projects/:projectId/variations/:id         # Update
✅ DELETE /api/projects/:projectId/variations/:id         # Soft delete
❌ POST   /api/projects/:id/variations/batch              # NOT IMPLEMENTED
```

### 6.6 Companies (Master List)

**Note**: Uses `/cost-companies` prefix (not `/companies`)

```
✅ GET    /api/cost-companies                      # List with search
✅ GET    /api/cost-companies?search=compass       # Search by name/abn/contact
✅ POST   /api/cost-companies                      # Create
✅ POST   /api/cost-companies/find-or-create       # Find by name or create new
✅ GET    /api/cost-companies/:id                  # Get single
✅ PATCH  /api/cost-companies/:id                  # Update
✅ DELETE /api/cost-companies/:id                  # Soft delete
```

### 6.7 Import/Export

```
❌ POST   /api/projects/:id/cost-plan/import       # NOT IMPLEMENTED
❌ GET    /api/projects/:id/cost-plan/export       # NOT IMPLEMENTED
❌ GET    /api/import-templates                    # NOT IMPLEMENTED
❌ POST   /api/import-templates                    # NOT IMPLEMENTED
```

**Note**: Dialogs exist but API not implemented

### 6.8 Real-Time Updates

**Implementation**: Polling (not WebSocket/Supabase)

```typescript
// useCostPlan hook polls every 10 seconds
const { data: costPlan } = useQuery({
  queryKey: ['costPlan', projectId, reportMonth],
  queryFn: () => fetchCostPlan(projectId, reportMonth),
  refetchInterval: 10000, // 10 seconds
});
```

**Why Polling**: SQLite doesn't support real-time triggers like PostgreSQL/Supabase

---

## 6.9 AI-Powered Invoice Extraction (Phase 14)

**Status**: ✅ FULLY IMPLEMENTED

### Overview

The system supports drag-and-drop PDF invoice uploads with automatic data extraction using Claude Haiku AI.

### Upload Flow

1. **User Action**: Drag PDF onto Invoices panel or use file picker
2. **PDF Processing**:
   - File validation (PDF only, max size check)
   - Text extraction using multiple parsers:
     - LlamaParse (preferred for complex layouts)
     - Unstructured (fallback)
     - pdf-parse (basic fallback)
3. **AI Extraction**:
   - Claude Haiku analyzes extracted text
   - Returns structured data with confidence scores:
     - Invoice number
     - Invoice date
     - Amount (ex GST)
     - GST amount
     - Description
     - Company name
     - PO number
4. **Company Matching**:
   - Fuzzy match extracted company name against:
     - Existing consultants
     - Existing contractors
     - Cost companies master list
   - Uses Levenshtein distance algorithm
   - Threshold: 80% similarity
5. **Document Storage**:
   - PDF saved to file system
   - FileAsset record created
   - If company matched: Categorized under `Consultants/[Discipline]` or `Contractors/[Trade]`
   - If no match: Stored in `Uncategorized`
6. **Invoice Creation**:
   - Automatically creates invoice record
   - Links to cost line (if match found)
   - Links to PDF file asset
   - Pre-fills period to current month

### API Endpoint

```
POST /api/projects/:projectId/invoices/upload
Content-Type: multipart/form-data

Request:
  file: PDF file

Response:
{
  invoice: {...},           // Created invoice record
  extraction: {
    invoiceNumber: string,
    confidence: number,     // 0-1
    parser: string,         // "llamaparse" | "unstructured" | "pdf-parse"
    fields: {...}          // All extracted fields with confidence
  },
  companyMatch: {
    matched: boolean,
    companyId?: number,
    disciplineId?: number,
    tradeId?: number,
    similarity?: number     // 0-1
  },
  document: {
    documentId: number,
    versionId: number,
    categoryPath: string
  }
}
```

### Components

- **InvoiceDropZone.tsx**: Drag-and-drop upload UI with progress
- **src/lib/invoice/extract.ts**: AI extraction service
- **src/lib/invoice/company-matcher.ts**: Fuzzy matching logic

---

## 7. Import/Export

### 7.1 Excel Import Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Upload File │────>│ Detect      │────>│ Map Columns │────>│ Preview &   │
│             │     │ Structure   │     │ (with AI)   │     │ Confirm     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Save as     │
                                        │ Template?   │
                                        └─────────────┘
```

#### Import Rules

| Detection | Behavior |
|-----------|----------|
| Formula columns | Mark as calculated, don't import static values |
| Company names | Fuzzy match to master list, create new if no match |
| Cost line descriptions | Attempt to link invoices/variations by description |
| Unknown columns | Show in mapping UI, allow user to skip or map |

#### Template Memory

```typescript
interface ImportTemplate {
  id: string;
  name: string;
  column_mappings: {
    [sourceColumn: string]: {
      target_field: string;
      transform?: 'currency_to_cents' | 'date_parse' | 'company_lookup';
    }
  };
}
```

### 7.2 Excel Export

**Requirements:**
- Use SheetJS with formula support
- Preserve all formatting (colors, column widths, number formats)
- Include working formulas (SUMIFS, etc.) not just values
- Maintain section structure with grouping
- Export all three sheets in single workbook

```typescript
// Export configuration
const exportConfig = {
  includeFormulas: true,
  preserveFormatting: true,
  sheets: ['Project Summary', 'Invoices', 'Variations'],
  formulaMap: {
    'claimed_to_date': (row) => `=SUMIFS(Invoices!$H$6:$H$1000,Invoices!$F$6:$F$1000,C${row})`,
    'current_month': (row) => `=SUMIFS(Invoices!$H$6:$H$1000,Invoices!$F$6:$F$1000,C${row},Invoices!$J$6:$J$1000,$N$2)`,
    // ... etc
  }
};
```

---

## 8. Snapshot & Baseline Comparison

### 8.1 Snapshot Creation

```typescript
interface ProjectSnapshot {
  id: string;
  project_id: string;
  snapshot_name: string; // "REV A", "Tender Award", "Monthly - Nov 2025"
  snapshot_date: Date;
  snapshot_data: {
    cost_lines: CostLineWithCalculations[];
    invoices: Invoice[];
    variations: Variation[];
    totals: {
      budget: number;
      final_forecast: number;
      claimed: number;
    };
  };
}
```

### 8.2 Comparison View

```
┌────────────────────────────────────────────────────────────────┐
│ Compare: [Current ▼] vs [REV B - Oct 2025 ▼]                   │
├────────────────────────────────────────────────────────────────┤
│ Description        │ REV B Budget │ Current Budget │ Variance  │
│────────────────────┼──────────────┼────────────────┼───────────│
│ PM Services        │ $100,000     │ $115,000       │ +$15,000  │
│ Structural Eng     │ $45,000      │ $45,000        │ -         │
│ ...                │              │                │           │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. Contingency Tracking (Section-Specific)

### 9.1 Contingency Section Behavior

The CONTINGENCY section has special handling:

| Feature | Behavior |
|---------|----------|
| Draw-down tracking | When variation approved against contingency, deduct from contingency budget |
| Balance display | Show "Original Budget", "Drawn Down", "Remaining" |
| Warnings | Alert when contingency < 5% of total budget |

### 9.2 Contingency Line Item

```typescript
interface ContingencyLine extends CostLine {
  section: 'CONTINGENCY';
  calculated: {
    original_budget: number;
    drawn_down: number;      // Sum of approved variations linked to this line
    remaining: number;       // original - drawn_down
    percent_remaining: number;
  };
}
```

---

## 10. Success Criteria

### 10.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | View/edit Project Summary in spreadsheet interface | P0 |
| F2 | View/edit Invoices in spreadsheet interface | P0 |
| F3 | View/edit Variations in spreadsheet interface | P0 |
| F4 | Current Month selector updates all calculated fields | P0 |
| F5 | Claimed to Date auto-calculates from linked invoices | P0 |
| F6 | Current Month shows invoices for selected period | P0 |
| F7 | **Split** Forecast vs Approved variations (two columns) | P0 |
| F8 | **Company autocomplete** from master list | P0 |
| F9 | Budget Variance highlights overruns in red | P1 |
| F10 | Import existing Excel cost plan | P1 |
| F11 | Export to Excel with formulas | P1 |
| F12 | **Native row grouping** with collapse/expand | P1 |
| F13 | **Cell comments** on cost lines | P1 |
| F14 | **Snapshot/baseline** comparison | P1 |
| F15 | **GST toggle** display option | P1 |
| F16 | **Invoice → Variation linking** | P1 |
| F17 | **Column mapping templates** for import | P2 |
| F18 | Right-click context menu | P2 |
| F19 | Drag-to-link invoices/variations | P2 |
| F20 | Undo/redo support | P2 |
| F21 | WebSocket live totals | P2 |
| F22 | **Bulk row selection** (Shift+Click range, Ctrl+Click toggle) | P1 |
| F23 | **Bulk delete** selected rows with confirmation | P1 |
| F24 | **Bulk section assignment** (move selected rows to different section) | P2 |

### 10.2 Performance Requirements

| Metric | Target |
|--------|--------|
| Initial load (100 cost lines) | < 2 seconds |
| Initial load (500 invoices) | < 3 seconds |
| Cell edit response | < 100ms |
| Recalculation (full sheet) | < 500ms |
| Save to server (single cell) | < 500ms |
| Batch save (50 operations) | < 2 seconds |
| Excel export | < 5 seconds |
| WebSocket total update | < 200ms |

### 10.3 Acceptance Tests

```gherkin
Feature: Current Month Invoice Lookup
  
  Scenario: Changing report month updates Current Month column
    Given a project with current_report_month = "2025-11-01"
    And a cost line "Stage 1a Design" with 2 invoices:
      | amount_cents | period_year | period_month |
      | 550000       | 2025        | 8            |
      | 250000       | 2025        | 11           |
    When I view the Project Summary
    Then the "Current Month" column for "Stage 1a Design" shows $2,500.00
    When I change current_report_month to "2025-08-01"
    Then the "Current Month" column for "Stage 1a Design" shows $5,500.00

Feature: Split Variation Tracking

  Scenario: Forecast variation shows in Forecast column only
    Given a cost line "PM Services" with approved_contract = $100,000
    And a variation for "PM Services" with:
      | amount_forecast | amount_approved | status   |
      | 15000          | 0               | Forecast |
    Then the "Forecast Vars" for "PM Services" shows $15,000
    And the "Approved Vars" for "PM Services" shows $0
    And the "Final Forecast" shows $115,000

  Scenario: Approving variation moves to Approved column
    Given the above variation
    When I change the variation status to "Approved" with amount_approved = $12,000
    Then the "Forecast Vars" for "PM Services" shows $0
    And the "Approved Vars" for "PM Services" shows $12,000
    And the "Final Forecast" shows $112,000

Feature: Invoice to Variation Linking

  Scenario: Invoice linked to variation is traceable
    Given an approved variation "PV-001" for "PM Services" with amount = $15,000
    When I create an invoice for "PM Services" with:
      | amount | variation |
      | 5000   | PV-001    |
    Then the invoice appears in the Invoices sheet linked to "PV-001"
    And the "Claimed to Date" for "PM Services" increases by $5,000

Feature: Company Master List

  Scenario: Company autocomplete suggests existing companies
    When I start typing "Comp" in the Company cell
    Then I see autocomplete suggestions including "Compass-Intell"
    When I select "Compass-Intell"
    Then the cell value is set to "Compass-Intell"
    And the cost line is linked to the company record

Feature: Snapshot Comparison

  Scenario: Compare current state to baseline
    Given a snapshot "REV A" with budget total = $500,000
    And the current budget total = $550,000
    When I select "Compare to REV A"
    Then I see a variance column showing +$50,000 difference

Feature: Bulk Row Selection

  Scenario: Select multiple rows with Shift+Click
    Given I am viewing the Project Summary with 10 cost lines
    When I click on row 3
    And I Shift+Click on row 7
    Then rows 3, 4, 5, 6, 7 are selected
    And the toolbar shows "5 rows selected"
    And bulk action buttons are visible

  Scenario: Toggle selection with Ctrl+Click
    Given rows 3 and 5 are selected
    When I Ctrl+Click on row 4
    Then rows 3, 4, 5 are selected
    When I Ctrl+Click on row 3
    Then rows 4, 5 are selected (row 3 deselected)

  Scenario: Clear selection with Escape
    Given 5 rows are selected
    When I press Escape
    Then no rows are selected
    And bulk action buttons are hidden

Feature: Bulk Delete

  Scenario: Delete multiple cost lines
    Given I have selected 3 cost lines in CONSULTANTS section
    When I click "Delete Selected"
    Then I see a confirmation dialog "Delete 3 cost lines?"
    When I confirm the deletion
    Then all 3 cost lines are soft-deleted
    And the section total updates immediately
    And I see toast "3 cost lines deleted"

  Scenario: Bulk delete includes linked items warning
    Given I select 2 cost lines that have linked invoices
    When I click "Delete Selected"
    Then the confirmation shows "This will also remove linked invoices and variations"

Feature: Bulk Move to Section

  Scenario: Move cost lines to different section
    Given I have selected 2 cost lines in FEES section
    When I click "Move to Section" and select "CONSULTANTS"
    Then the 2 cost lines appear at the end of CONSULTANTS section
    And FEES section total decreases
    And CONSULTANTS section total increases
    And I see toast "2 cost lines moved to CONSULTANTS"
```

---

## 11. Implementation Notes

### 11.1 FortuneSheet Configuration

```typescript
import { Workbook } from '@fortune-sheet/react';

const CostPlanSheet: React.FC = () => {
  const config = {
    data: [projectSummarySheet, invoicesSheet, variationsSheet],
    config: {
      showtoolbar: false,
      showinfobar: false,
      showsheetbar: true,
      showstatisticBar: false,
      enableAddRow: true,
      enableAddBackTop: false,
      row: 100,
      column: 20,
      rowGroup: rowGroupConfig,
      contextMenu: customContextMenu,
    },
    onChange: handleSheetChange,
    onCellUpdated: handleCellUpdate,
  };

  return <Workbook {...config} />;
};
```

### 11.2 State Management

```typescript
// React Query for server state
const { data: costPlan, isLoading } = useQuery({
  queryKey: ['costPlan', projectId],
  queryFn: () => fetchCostPlan(projectId),
});

// Mutations with optimistic updates
const updateCellMutation = useMutation({
  mutationFn: updateCostLineCell,
  onMutate: async (newValue) => {
    // Optimistic update
    queryClient.setQueryData(['costPlan', projectId], (old) => ({
      ...old,
      cost_lines: old.cost_lines.map(cl => 
        cl.id === newValue.id ? { ...cl, ...newValue.data } : cl
      ),
    }));
  },
  onError: (err, newValue, context) => {
    // Rollback on error
    queryClient.setQueryData(['costPlan', projectId], context.previousData);
  },
});

// Debounced save
const debouncedSave = useDebouncedCallback(
  (changes) => updateCellMutation.mutate(changes),
  500
);
```

### 11.3 WebSocket Integration

```typescript
// Real-time updates
useEffect(() => {
  const ws = new WebSocket(`wss://api.assemble.ai/ws/projects/${projectId}`);
  
  ws.on('cost_plan:totals_updated', (data) => {
    queryClient.setQueryData(['costPlan', projectId], (old) => ({
      ...old,
      totals: data.totals,
    }));
  });
  
  return () => ws.close();
}, [projectId]);
```

### 11.4 Amount Storage (Cents)

```typescript
// Always store as cents (BIGINT), display as dollars
const formatCurrency = (cents: number, currency: string = 'AUD'): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(cents / 100);
};

const parseCurrency = (display: string): number => {
  const cleaned = display.replace(/[^0-9.-]/g, '');
  return Math.round(parseFloat(cleaned) * 100);
};
```

---

## 12. Out of Scope (v1)

- Multi-user concurrent editing (same cell)
- Full audit trail UI (who changed what cell when)
- Print-optimized reports
- Mobile-responsive spreadsheet
- Offline support
- Approval workflow for variations (> $X needs sign-off)
- Integration with accounting software

---

## 13. Resolved Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Company Master List | **Separate table with autocomplete** | Free-text leads to data quality chaos |
| Fiscal Year Columns | **Dynamic `cost_line_allocations` table** | Future-proof, handles any project duration |
| Invoice Matching | **Explicit dropdown**, fuzzy only on import | Auto-linking on edit too dangerous |
| Variation Numbering | **Project-scoped with category prefix** | PV-001, CV-001 is industry standard |
| Amount Storage | **Store in cents (BIGINT)** | Avoids DECIMAL rounding issues |
| Bulk Selection | **Excel-style Shift/Ctrl+Click** | Constitution IX requires spreadsheet-native UX; standard Excel behavior |
| Bulk Actions Scope | **Delete + Move Section only** | Most common bulk needs; avoid complexity of bulk cell editing |

---

## Appendix A: Sample API Response

```json
{
  "project": {
    "id": "proj_123",
    "name": "OPTUS MECH PLANT UPGRADE",
    "current_report_month": "2025-11-01",
    "revision": "REV A",
    "currency_code": "AUD",
    "show_gst": false
  },
  "cost_lines": [
    {
      "id": "cl_001",
      "section": "CONSULTANTS",
      "cost_code": "2.03",
      "company": {
        "id": "comp_001",
        "name": "Compass-Intell"
      },
      "description": "Stage 1a Feaso & Concept Design",
      "reference": "PO-4500321848",
      "budget_cents": 800000,
      "approved_contract_cents": 800000,
      "allocations": [
        { "fiscal_year": 2026, "amount_cents": 800000 }
      ],
      "calculated": {
        "forecast_variations_cents": 0,
        "approved_variations_cents": 0,
        "final_forecast_cents": 800000,
        "variance_to_budget_cents": 0,
        "claimed_to_date_cents": 800000,
        "current_month_cents": 250000,
        "etc_cents": 0
      }
    }
  ],
  "totals": {
    "budget_cents": 645000000,
    "final_forecast_cents": 645000000,
    "claimed_cents": 1300000,
    "etc_cents": 643700000
  },
  "invoices_count": 3,
  "variations_count": 1
}
```

---

## Appendix B: Database Migration Path

For existing Excel-based projects, migration script should:

1. Create project record
2. Parse cost lines from Project Summary
3. Create dynamic FY allocations from FY columns
4. Import invoices, attempt fuzzy-match to cost lines
5. Import variations, attempt fuzzy-match to cost lines
6. Present unmatched items for manual linking
7. Create initial snapshot as "Imported Baseline"

---

**Document Version**: 0.3.0
**Author**: Claude
**Date**: 2025-12-09
**Status**: Revised - Added Bulk Selection Requirements (F22-F24)
**Reviewers**: [Pending]