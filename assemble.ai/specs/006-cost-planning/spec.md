# Cost Planning Module Specification

> **Module**: Cost Planning  
> **Version**: 0.2.1 (Revised)  
> **Status**: Specification  
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
│     Project     │       │    Company      │       │   Cost Line     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ name            │       │ name            │       │ project_id      │──┐
│ current_month   │──────<│ abn             │>──────│ company_id      │  │
│ revision        │       │ contact_email   │       │ description     │  │
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
| `PC_ITEMS` | PC Items | Provisional cost allowances |
| `CONTINGENCY` | Contingency | Risk allowances (with draw-down tracking) |

### 3.3 Database Schema

```sql
-- ============================================================
-- COMPANIES (Master List)
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL, -- Multi-tenancy
  name VARCHAR(255) NOT NULL,
  abn VARCHAR(20),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete
  
  UNIQUE(organisation_id, name)
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  project_number VARCHAR(50),
  current_report_month DATE NOT NULL,
  revision VARCHAR(10) DEFAULT 'REV A',
  currency_code VARCHAR(3) DEFAULT 'AUD',
  show_gst BOOLEAN DEFAULT FALSE, -- Toggle GST display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Ensure report month is always first of month
  CONSTRAINT chk_report_month_first CHECK (EXTRACT(DAY FROM current_report_month) = 1)
);

-- ============================================================
-- COST LINES (Rows in Project Summary)
-- ============================================================
CREATE TABLE cost_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  section VARCHAR(50) NOT NULL, -- FEES, CONSULTANTS, PC_ITEMS, CONTINGENCY
  cost_code VARCHAR(20),
  description VARCHAR(500) NOT NULL,
  reference VARCHAR(100), -- Contract number, PO reference
  budget_cents BIGINT DEFAULT 0,
  approved_contract_cents BIGINT DEFAULT 0,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(project_id, section, sort_order)
);

-- ============================================================
-- FISCAL YEAR ALLOCATIONS (Dynamic FY columns)
-- ============================================================
CREATE TABLE cost_line_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_line_id UUID NOT NULL REFERENCES cost_lines(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL, -- e.g., 2026 for FY2026
  amount_cents BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(cost_line_id, fiscal_year)
);

-- ============================================================
-- VARIATIONS
-- ============================================================
CREATE TABLE variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_line_id UUID REFERENCES cost_lines(id) ON DELETE SET NULL,
  variation_number VARCHAR(20) NOT NULL, -- e.g., "PV-001", "CV-002"
  category VARCHAR(50) NOT NULL, -- Principal, Contractor, Lessor Works
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Forecast', -- Forecast, Approved, Rejected, Withdrawn
  amount_forecast_cents BIGINT DEFAULT 0, -- What PM forecasts
  amount_approved_cents BIGINT DEFAULT 0, -- What gets approved (can differ)
  date_submitted DATE,
  date_approved DATE,
  requested_by VARCHAR(100),
  approved_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(project_id, variation_number)
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_line_id UUID REFERENCES cost_lines(id) ON DELETE SET NULL,
  variation_id UUID REFERENCES variations(id) ON DELETE SET NULL, -- Optional link to variation
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL,
  po_number VARCHAR(50),
  invoice_number VARCHAR(50) NOT NULL,
  description VARCHAR(500),
  amount_cents BIGINT NOT NULL,
  gst_cents BIGINT DEFAULT 0, -- Store GST separately
  period_year INTEGER NOT NULL, -- e.g., 2025
  period_month INTEGER NOT NULL, -- 1-12
  paid_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid, partial
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT chk_period_month CHECK (period_month BETWEEN 1 AND 12)
);

-- ============================================================
-- COST LINE COMMENTS (Cell-level comments)
-- ============================================================
CREATE TABLE cost_line_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_line_id UUID NOT NULL REFERENCES cost_lines(id) ON DELETE CASCADE,
  column_key VARCHAR(50) NOT NULL, -- e.g., 'budget', 'approved_contract'
  comment_text TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- PROJECT SNAPSHOTS (Baseline comparison)
-- ============================================================
CREATE TABLE project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_name VARCHAR(100) NOT NULL, -- e.g., "REV A", "REV B", "Tender Award"
  snapshot_date DATE NOT NULL,
  snapshot_data JSONB NOT NULL, -- Full denormalized snapshot of cost plan
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, snapshot_name)
);

-- ============================================================
-- COLUMN MAPPING TEMPLATES (Import memory)
-- ============================================================
CREATE TABLE import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  column_mappings JSONB NOT NULL, -- {"MyBudgetCol": "budget_cents", ...}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organisation_id, template_name)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_companies_org ON companies(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cost_lines_project ON cost_lines(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cost_lines_section ON cost_lines(project_id, section, sort_order);
CREATE INDEX idx_allocations_cost_line ON cost_line_allocations(cost_line_id);
CREATE INDEX idx_invoices_project ON invoices(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_cost_line ON invoices(cost_line_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_variation ON invoices(variation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_period ON invoices(period_year, period_month);
CREATE INDEX idx_variations_project ON variations(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_variations_cost_line ON variations(cost_line_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_snapshots_project ON project_snapshots(project_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Convert period year/month to comparable date
CREATE FUNCTION period_to_date(p_year INTEGER, p_month INTEGER) 
RETURNS DATE AS $$
  SELECT make_date(p_year, p_month, 1);
$$ LANGUAGE SQL IMMUTABLE;

-- Generate next variation number
CREATE FUNCTION next_variation_number(p_project_id UUID, p_category VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR(2);
  next_num INTEGER;
BEGIN
  prefix := CASE p_category
    WHEN 'Principal' THEN 'PV'
    WHEN 'Contractor' THEN 'CV'
    WHEN 'Lessor Works' THEN 'LV'
    ELSE 'V'
  END;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(variation_number FROM '[0-9]+') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM variations
  WHERE project_id = p_project_id
    AND variation_number LIKE prefix || '-%';
    
  RETURN prefix || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Calculated Fields (Formula Logic)

### 4.1 Project Summary Calculations

**New Column Order** (logical flow from budget → outcome):

| Col | Field | Formula | Implementation |
|-----|-------|---------|----------------|
| A | Cost Code | - | Direct input |
| B | Company | - | FK to companies table |
| C | Description/Role | - | Direct input |
| D | Reference | - | Contract/PO reference |
| E+ | FY Allocations | - | Dynamic columns from `cost_line_allocations` |
| G | **Budget** | - | Direct input (blue) |
| H | **Approved Contract** | - | Direct input (blue) |
| I | **Forecast Variations** | Sum of forecast variations (unapproved) | `SUM(variations WHERE status IN ('Forecast') AND cost_line_id = X).amount_forecast` |
| J | **Approved Variations** | Sum of approved variations | `SUM(variations WHERE status = 'Approved' AND cost_line_id = X).amount_approved` |
| K | **Final Forecast Cost** | `H + I + J` | `approved_contract + forecast_vars + approved_vars` |
| L | **Variance to Budget** | `G - K` | `budget - final_forecast_cost` |
| M | **Claimed to Date** | Sum of all invoices | `SUM(invoices WHERE cost_line_id = X).amount` |
| N | **Current Month** | Invoices for current period | `SUM(invoices WHERE cost_line_id = X AND period = project.current_report_month)` |
| O | **Estimate to Complete (ETC)** | `K - M` | `final_forecast_cost - claimed_to_date` |

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
| Spreadsheet | **FortuneSheet** | Excel-like UX, row grouping, React-compatible |
| State | **React Query** | Server state sync, optimistic updates |
| Real-time | **WebSocket / SSE** | Live total updates across sessions |
| Export | **SheetJS (xlsx)** | Formula-preserving Excel export |

### 5.2 Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COST REPORT                                    [Nov 2025 ▼] REV A  [⚙️]    │
│  OPTUS MECH PLANT UPGRADE                                                   │
│  Note: All figures exclude GST                    [☐ Show GST]              │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ [Project Summary] │ [Invoices] │ [Variations] │        [📸 Snapshot ▼]│   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ► FEES AND CHARGES                                        Subtotal: $X │ │
│ │   1.01 │ LSL Corp │ LSL Levy │ ... │ $16,112 │ ...                     │ │
│ │   1.02 │ Ryde Council │ Section 7.12 │ ... │ $96,675 │ ...             │ │
│ │                                                                         │ │
│ │ ► CONSULTANTS                                             Subtotal: $X │ │
│ │   2.01 │ Engine Room │ PM - Design │ ... │ $98,497 │ ...               │ │
│ │   2.02 │ Compass │ Stage 1a Design │ ... │ $8,000 │ ...                │ │
│ │   ...                                                                   │ │
│ │                                                                         │ │
│ │ ► PC ITEMS                                                Subtotal: $X │ │
│ │   ...                                                                   │ │
│ │                                                                         │ │
│ │ ► CONTINGENCY                                             Subtotal: $X │ │
│ │   ...                                                                   │ │
│ │─────────────────────────────────────────────────────────────────────────│ │
│ │                                              GRAND TOTAL: $X,XXX,XXX   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [+ Add Row] [Import Excel ▼] [Export Excel] [Save] [● Saved]                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Project Summary Sheet

#### Column Configuration

| Col | Header | Width | Type | Editable | Style | Notes |
|-----|--------|-------|------|----------|-------|-------|
| A | Cost Code | 80px | Text | Yes | Blue | Auto-gen or manual |
| B | Company | 140px | Autocomplete | Yes | Blue | From companies master |
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
    { start: 30, end: 38, hidden: false }, // PC_ITEMS section
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
];
```

### 5.4 Invoices Sheet

#### Column Configuration

| Col | Header | Width | Type | Editable | Notes |
|-----|--------|-------|------|----------|-------|
| A | Date | 100px | Date | Yes | Invoice date |
| B | Company | 140px | Autocomplete | Yes | From master list |
| C | PO Number | 100px | Text | Yes | |
| D | Invoice Number | 110px | Text | Yes | **Required**, duplicate warning |
| E | Description | 250px | Text | Yes | Free text |
| F | Cost Line | 200px | Dropdown | Yes | **Links to Project Summary** |
| G | Variation | 120px | Dropdown | Yes | Optional link to variation |
| H | Amount (Ex GST) | 100px | Currency | Yes | |
| I | GST | 80px | Currency | Yes | Auto-calc option |
| J | Period | 100px | Month Picker | Yes | Defaults to project current month |
| K | Paid? | 80px | Dropdown | Yes | unpaid/paid/partial |

#### Smart Features

1. **Company autocomplete**: Search-as-you-type from companies master list, with "Add new..." option
2. **Cost Line dropdown**: Shows `[cost_code] - [description]` format, grouped by section
3. **Variation dropdown**: Only shows approved variations for the selected cost line
4. **Period default**: Auto-fills project's `current_report_month`
5. **Duplicate detection**: Orange warning if Invoice Number already exists
6. **GST auto-calc**: Option to auto-calculate GST at 10% (Australian default)

#### Drag-to-Link Feature

```typescript
// Drag invoice row onto Project Summary row to auto-link
const handleDragDrop = (invoiceId: string, targetCostLineId: string) => {
  updateInvoice(invoiceId, { cost_line_id: targetCostLineId });
  showToast(`Invoice linked to ${costLine.description}`);
};
```

### 5.5 Variations Sheet

#### Column Configuration

| Col | Header | Width | Type | Editable | Notes |
|-----|--------|-------|------|----------|-------|
| A | Date Submitted | 100px | Date | Yes | |
| B | Requested by | 120px | Text | Yes | |
| C | Variation # | 90px | Text | **Auto** | e.g., PV-001, CV-002 |
| D | Category | 140px | Dropdown | Yes | Principal/Contractor/Lessor |
| E | Description | 300px | Text | Yes | |
| F | Variation To | 200px | Dropdown | Yes | **Links to Cost Line** |
| G | Status | 100px | Dropdown | Yes | Forecast/Approved/Rejected/Withdrawn |
| H | Amount Forecast | 110px | Currency | Yes | PM's estimate |
| I | Amount Approved | 110px | Currency | Yes | Final approved (can differ) |
| J | Date Approved | 100px | Date | Yes | Required if Approved |
| K | Approved By | 120px | Text | Yes | |

#### Business Rules

| Rule | Behavior |
|------|----------|
| New variation | Auto-generate variation number based on category |
| Status → Approved | Date Approved becomes required |
| Status → Approved | `amount_forecast` flows to column I, `amount_approved` to column J in Project Summary |
| Status → Rejected/Withdrawn | Removes from both Forecast and Approved columns |
| Variation To changed | Updates Forecast/Approved totals on affected cost lines |

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

---

## 6. API Endpoints

### 6.1 Projects

```
GET    /api/projects/:id/cost-plan              # Full cost plan with calculations
PATCH  /api/projects/:id                        # Update project (current_month, revision, etc.)
POST   /api/projects/:id/cost-plan/snapshot     # Create baseline snapshot
GET    /api/projects/:id/cost-plan/snapshots    # List snapshots
GET    /api/projects/:id/cost-plan/compare/:snapshotId  # Compare to baseline
```

### 6.2 Cost Lines

```
GET    /api/projects/:id/cost-lines             # List all (with calculated fields)
POST   /api/projects/:id/cost-lines             # Create single
POST   /api/projects/:id/cost-lines/batch       # Batch create/update/delete
PATCH  /api/cost-lines/:id                      # Update single
DELETE /api/cost-lines/:id                      # Soft delete
POST   /api/projects/:id/cost-lines/reorder     # Reorder rows within section
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
GET    /api/cost-lines/:id/allocations          # List allocations for cost line
PUT    /api/cost-lines/:id/allocations          # Replace all allocations
```

### 6.4 Invoices

```
GET    /api/projects/:id/invoices               # List (paginated)
GET    /api/projects/:id/invoices?page=1&limit=50&period=2025-11
POST   /api/projects/:id/invoices               # Create
POST   /api/projects/:id/invoices/batch         # Batch operations
PATCH  /api/invoices/:id                        # Update
DELETE /api/invoices/:id                        # Soft delete
GET    /api/projects/:id/invoices/summary       # Aggregated by cost line
```

### 6.5 Variations

```
GET    /api/projects/:id/variations             # List (paginated)
POST   /api/projects/:id/variations             # Create (auto-generates number)
POST   /api/projects/:id/variations/batch       # Batch operations
PATCH  /api/variations/:id                      # Update
DELETE /api/variations/:id                      # Soft delete
```

### 6.6 Companies (Master List)

```
GET    /api/companies                           # List with search
GET    /api/companies?search=compass&limit=10
POST   /api/companies                           # Create
PATCH  /api/companies/:id                       # Update
DELETE /api/companies/:id                       # Soft delete
```

### 6.7 Import/Export

```
POST   /api/projects/:id/cost-plan/import       # Import from Excel
GET    /api/projects/:id/cost-plan/export       # Export to Excel (with formulas)
GET    /api/import-templates                    # List saved column mappings
POST   /api/import-templates                    # Save column mapping template
```

### 6.8 Real-Time Updates (WebSocket)

```typescript
// WebSocket events
ws.on('cost_plan:updated', (data) => {
  // { project_id, updated_totals: { section_totals, grand_total } }
});

ws.on('invoice:created', (data) => {
  // { invoice, affected_cost_line_id, new_totals }
});

ws.on('variation:status_changed', (data) => {
  // { variation, affected_cost_line_id, new_forecast, new_approved }
});
```

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

**Document Version**: 0.2.1  
**Author**: Claude  
**Date**: 2025-11-26  
**Status**: Revised - Removed Committed Column  
**Reviewers**: [Pending]