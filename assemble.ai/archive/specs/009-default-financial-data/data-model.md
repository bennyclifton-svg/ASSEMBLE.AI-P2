# Data Model: Default Financial Data Initialization

**Feature**: 009-default-financial-data
**Date**: 2025-12-06

## 1. Entities

### 1.1 Default Cost Line Template

A static configuration object (not a database table) defining the template for default cost lines.

```typescript
interface DefaultCostLineTemplate {
  section: 'FEES' | 'CONSULTANTS' | 'CONSTRUCTION' | 'CONTINGENCY';
  costCode: string;      // e.g., "1.01", "2.03"
  description: string;   // e.g., "Project Manager"
  budgetCents: number;   // Default budget in cents (e.g., 5000000 = $50,000)
  notes?: string;        // Optional notes for reference
}
```

### 1.2 Cost Line (Existing Entity - No Schema Change)

The existing `cost_lines` table stores instantiated cost lines per project.

```typescript
// Existing schema (schema.ts) - section enum updated
section: text('section', {
  enum: ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY']
}).notNull()
```

### 1.3 Variation (Existing Entity - No Schema Change)

Sample variation links to a cost line via `costLineId`.

### 1.4 Invoice (Existing Entity - No Schema Change)

Sample invoice links to a cost line via `costLineId`.

---

## 2. Default Cost Line Data

### 2.1 FEES Section (4 items, $100,000)

| costCode | description | budgetCents | notes |
|----------|-------------|-------------|-------|
| 1.01 | Council Fees | 2500000 | Development application fees |
| 1.02 | Section 7.12 Levy | 5000000 | Infrastructure contributions (NSW) |
| 1.03 | Long Service Leave Levy | 1500000 | LSL contribution (~2.35% of contract) |
| 1.04 | Authority Fees | 1000000 | Water, power, gas connection fees |

### 2.2 CONSULTANTS Section (10 items, $265,000)

| costCode | description | budgetCents | notes |
|----------|-------------|-------------|-------|
| 2.01 | Project Manager | 5000000 | PM fees through all stages |
| 2.02 | Architect | 8000000 | Design and documentation |
| 2.03 | Town Planner | 1500000 | Planning approvals, DA preparation |
| 2.04 | Structural | 2500000 | Structural design |
| 2.05 | Civil Engineer | 1500000 | Site works, drainage |
| 2.06 | Surveyor | 800000 | Site survey, setout |
| 2.07 | BCA Consultant | 1200000 | Building Code Australia compliance |
| 2.08 | Building Certifier | 2000000 | Certification and inspections |
| 2.09 | Quantity Surveyor | 2500000 | Cost estimation, BoQ |
| 2.10 | Fire Engineer | 1500000 | Fire safety engineering |

### 2.3 CONSTRUCTION Section (5 items, $455,000)

| costCode | description | budgetCents | notes |
|----------|-------------|-------------|-------|
| 3.01 | Prelims & Margin | 15000000 | Preliminaries and contractor margin |
| 3.02 | Fitout Works | 20000000 | Tenant fitout allowance |
| 3.03 | FF&E | 5000000 | Furniture, fixtures, equipment |
| 3.04 | IT/AV Systems | 3000000 | Technology, audiovisual |
| 3.05 | Landscaping | 2500000 | Soft and hard landscaping |

### 2.4 CONTINGENCY Section (1 item, $80,000)

| costCode | description | budgetCents | notes |
|----------|-------------|-------------|-------|
| 4.01 | Construction Contingency | 8000000 | Typically 5-10% of construction costs |

---

## 3. Sample Variation Data

| Field | Value | Notes |
|-------|-------|-------|
| variationNumber | "PV-001" | Principal Variation prefix |
| category | "Principal" | Owner-initiated change |
| description | "Sample variation - delete if not needed" | Clear user guidance |
| status | "Forecast" | Not yet approved |
| amountForecastCents | 1000000 | $10,000 |
| amountApprovedCents | 0 | Not approved |
| costLineId | (link to 4.01) | Links to Construction Contingency |
| requestedBy | "System" | Auto-generated indicator |
| dateSubmitted | (creation date) | ISO date string |

---

## 4. Sample Invoice Data

| Field | Value | Notes |
|-------|-------|-------|
| invoiceNumber | "INV-SAMPLE-001" | Clear sample identifier |
| companyId | null | No company linked |
| description | "Sample invoice - delete if not needed" | Clear user guidance |
| amountCents | 100000 | $1,000 |
| gstCents | 10000 | $100 GST |
| costLineId | (link to 2.01) | Links to Project Manager |
| periodYear | (current year) | e.g., 2025 |
| periodMonth | (current month) | 1-12 |
| paidStatus | "unpaid" | Default status |
| invoiceDate | (creation date) | ISO date string |

---

## 5. Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                           projects                                   │
│  (id, name, status, ...)                                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ 1:N
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  cost_lines   │     │   variations    │     │    invoices     │
│ (20 defaults) │◄────│ (1 sample)      │     │ (1 sample)      │
│               │     │ costLineId──────┼────►│ costLineId──────┼──┐
│ id            │     │                 │     │                 │  │
│ projectId     │     │ projectId       │     │ projectId       │  │
│ section       │     │ variationNumber │     │ invoiceNumber   │  │
│ costCode      │     │ amountForecast  │     │ amountCents     │  │
│ description   │     │ amountApproved  │     │ gstCents        │  │
│ budgetCents   │     │ status          │     │ paidStatus      │  │
│ sortOrder     │     └─────────────────┘     └─────────────────┘  │
└───────────────┘                                                   │
        ▲                                                           │
        └───────────────────────────────────────────────────────────┘
```

---

## 6. Validation Rules

### 6.1 Cost Line Validation
- `section` MUST be one of: FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY
- `costCode` MUST follow pattern: `\d+\.\d{2}` (e.g., "1.01", "2.10")
- `description` MUST NOT be empty
- `budgetCents` MUST be >= 0
- `sortOrder` MUST be unique within project

### 6.2 Variation Validation
- `variationNumber` MUST be unique within project
- `category` MUST be one of: Principal, Contractor, Lessor Works
- `status` MUST be one of: Forecast, Approved, Rejected, Withdrawn
- `costLineId` MUST reference existing cost line in same project (if set)

### 6.3 Invoice Validation
- `invoiceNumber` MUST be unique within project
- `periodMonth` MUST be 1-12
- `periodYear` MUST be reasonable (2020-2100)
- `costLineId` MUST reference existing cost line in same project (if set)

---

## 7. State Transitions

### 7.1 Project Initialization State Machine

```
[Project Created]
    │
    ▼
[Initialize Disciplines] (existing - 37 items)
    │
    ▼
[Initialize Trades] (existing - 21 items)
    │
    ▼
[Initialize Stages] (existing - 5 items)
    │
    ▼
[Initialize Details] (existing - 1 record)
    │
    ▼
[Initialize Objectives] (existing - 1 record)
    │
    ▼
[Initialize Cost Lines] ◄── NEW (20 items)
    │
    ▼
[Initialize Sample Variation] ◄── NEW (1 item)
    │
    ▼
[Initialize Sample Invoice] ◄── NEW (1 item)
    │
    ▼
[Project Ready]
```

All steps within single atomic transaction. Failure at any step rolls back entire operation.

---

## 8. Migration: PC_ITEMS → CONSTRUCTION

### 8.1 Schema Change
Already applied in `schema.ts`:
```typescript
section: text('section', {
  enum: ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY']  // Changed from PC_ITEMS
}).notNull()
```

### 8.2 Data Migration
```sql
-- drizzle/0011_default_financial_data.sql
UPDATE cost_lines
SET section = 'CONSTRUCTION'
WHERE section = 'PC_ITEMS';
```

### 8.3 Code Updates Required
See spec.md Breaking Changes section for full file list.
