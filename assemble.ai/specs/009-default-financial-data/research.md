# Research: Default Financial Data Initialization

**Feature**: 009-default-financial-data
**Date**: 2025-12-06

## 1. Existing Project Initialization Pattern

### Decision
Extend the existing synchronous transaction pattern established in 008-project-initialization.

### Rationale
- better-sqlite3 uses synchronous operations (not async/await)
- Transaction wraps all initialization in atomic operation
- Pattern already proven for 292+ records (disciplines, trades, stages, etc.)
- Adding 22 more records (20 cost lines + 1 variation + 1 invoice) is negligible

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Lazy initialization on first Cost Plan access | Adds latency to first user interaction, complex state management |
| Background worker queue | Overkill for <25 records, adds infrastructure complexity |
| Separate API call after project creation | Breaks atomicity, risk of orphan projects without cost data |

### Reference Implementation
```typescript
// From 008-project-initialization spec
const result = db.transaction((tx) => {
    // 1. Create project
    tx.insert(projects).values(newProject).run();

    // 2-6. Existing initialization (disciplines, trades, stages, etc.)
    // ...

    // 7. NEW: Initialize cost lines
    const costLineRecords = DEFAULT_COST_LINES.map((line, idx) => ({
        id: generateId(),
        projectId,
        section: line.section,
        costCode: line.costCode,
        description: line.description,
        budgetCents: line.budgetCents,
        sortOrder: idx,
    }));
    tx.insert(costLines).values(costLineRecords).run();

    // 8-9. NEW: Initialize sample variation and invoice
    // ...

    return newProject;
});
```

---

## 2. PC_ITEMS → CONSTRUCTION Rename Strategy

### Decision
Update enum in schema and perform data migration in single deployment.

### Rationale
- Schema already updated to use CONSTRUCTION
- 12 TypeScript files need string literal updates
- Single migration script handles existing data
- No backwards compatibility needed (internal enum, not API)

### Migration Script Pattern
```javascript
// scripts/run-migration-0011.js
const db = require('../src/lib/db').db;

// Update existing cost_lines with PC_ITEMS section
db.prepare(`
    UPDATE cost_lines
    SET section = 'CONSTRUCTION'
    WHERE section = 'PC_ITEMS'
`).run();

console.log('Migration complete: PC_ITEMS → CONSTRUCTION');
```

### Files Requiring Update
Already documented in spec.md Breaking Changes section (12 files).

---

## 3. Default Budget Amounts

### Decision
Use nominal amounts that represent typical small commercial project (~$1M total).

### Rationale
- $900,000 total is realistic for small-to-medium fitout projects
- Users expect to modify amounts, but starting from zero is less intuitive
- Amounts provide context for relative scale of line items
- Professional Fees (CONSULTANTS) typically 25-30% for fit-out projects

### Budget Distribution Analysis
| Section | Amount | % of Total | Industry Benchmark |
|---------|--------|------------|-------------------|
| FEES | $100,000 | 11% | 5-15% typical |
| CONSULTANTS | $265,000 | 29% | 20-35% for fit-out |
| CONSTRUCTION | $455,000 | 51% | 40-60% typical |
| CONTINGENCY | $80,000 | 9% | 5-15% typical |

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| All $0 defaults | Users get no sense of relative scale, must enter everything |
| Percentage-based (calculate from budget) | No budget set at project creation, adds complexity |
| Different templates per project type | Scope creep, v1 should be simple |

---

## 4. Sample Variation and Invoice

### Decision
Create one sample of each with clear "delete if not needed" messaging.

### Rationale
- Demonstrates linking between cost lines, variations, and invoices
- Users learn by example, not documentation
- Easy to delete if not wanted
- Links to stable cost lines (PM for invoice, Contingency for variation)

### Sample Data Design
| Entity | Link To | Amount | Purpose |
|--------|---------|--------|---------|
| Sample Variation (PV-001) | 4.01 Construction Contingency | $10,000 forecast | Shows variation workflow |
| Sample Invoice (INV-SAMPLE-001) | 2.01 Project Manager | $1,000 + GST | Shows invoice workflow |

---

## 5. Performance Considerations

### Decision
No special optimization needed for 22 additional inserts.

### Rationale
- SQLite handles batch inserts efficiently
- better-sqlite3 synchronous transaction is already optimized
- Current initialization creates 292 records; adding 22 is <8% increase
- Target of <2 seconds easily achievable

### Benchmark Reference
From 008-project-initialization testing:
- 292 records: ~150ms on typical hardware
- With 22 additional: estimated ~165ms
- Well under 2-second target

---

## Resolved Clarifications

All technical decisions are resolved. No NEEDS CLARIFICATION items remain.

| Original Question | Resolution |
|-------------------|------------|
| How to handle PC_ITEMS rename? | Schema update + data migration in single deployment |
| What amounts for defaults? | $900,000 total with realistic distribution |
| Sample data in variations/invoices? | Yes, one of each to demonstrate linking |
| Performance impact? | Negligible, <8% increase in initialization time |
