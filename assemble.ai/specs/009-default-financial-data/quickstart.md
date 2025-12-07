# Quickstart: Default Financial Data Initialization

**Feature**: 009-default-financial-data
**Time to implement**: ~2-3 hours

## Prerequisites

- [ ] 008-project-initialization implemented and working
- [ ] Cost Planning module (006) functional
- [ ] Database migrations up to date

## Implementation Steps

### Step 1: Create Default Cost Lines Constants (30 min)

Create `src/lib/constants/default-cost-lines.ts`:

```typescript
export interface DefaultCostLineTemplate {
  section: 'FEES' | 'CONSULTANTS' | 'CONSTRUCTION' | 'CONTINGENCY';
  costCode: string;
  description: string;
  budgetCents: number;
  notes?: string;
}

export const DEFAULT_COST_LINES: DefaultCostLineTemplate[] = [
  // FEES Section ($100,000)
  { section: 'FEES', costCode: '1.01', description: 'Council Fees', budgetCents: 2500000 },
  { section: 'FEES', costCode: '1.02', description: 'Section 7.12 Levy', budgetCents: 5000000 },
  { section: 'FEES', costCode: '1.03', description: 'Long Service Leave Levy', budgetCents: 1500000 },
  { section: 'FEES', costCode: '1.04', description: 'Authority Fees', budgetCents: 1000000 },

  // CONSULTANTS Section ($265,000)
  { section: 'CONSULTANTS', costCode: '2.01', description: 'Project Manager', budgetCents: 5000000 },
  { section: 'CONSULTANTS', costCode: '2.02', description: 'Architect', budgetCents: 8000000 },
  { section: 'CONSULTANTS', costCode: '2.03', description: 'Town Planner', budgetCents: 1500000 },
  { section: 'CONSULTANTS', costCode: '2.04', description: 'Structural', budgetCents: 2500000 },
  { section: 'CONSULTANTS', costCode: '2.05', description: 'Civil Engineer', budgetCents: 1500000 },
  { section: 'CONSULTANTS', costCode: '2.06', description: 'Surveyor', budgetCents: 800000 },
  { section: 'CONSULTANTS', costCode: '2.07', description: 'BCA Consultant', budgetCents: 1200000 },
  { section: 'CONSULTANTS', costCode: '2.08', description: 'Building Certifier', budgetCents: 2000000 },
  { section: 'CONSULTANTS', costCode: '2.09', description: 'Quantity Surveyor', budgetCents: 2500000 },
  { section: 'CONSULTANTS', costCode: '2.10', description: 'Fire Engineer', budgetCents: 1500000 },

  // CONSTRUCTION Section ($455,000)
  { section: 'CONSTRUCTION', costCode: '3.01', description: 'Prelims & Margin', budgetCents: 15000000 },
  { section: 'CONSTRUCTION', costCode: '3.02', description: 'Fitout Works', budgetCents: 20000000 },
  { section: 'CONSTRUCTION', costCode: '3.03', description: 'FF&E', budgetCents: 5000000 },
  { section: 'CONSTRUCTION', costCode: '3.04', description: 'IT/AV Systems', budgetCents: 3000000 },
  { section: 'CONSTRUCTION', costCode: '3.05', description: 'Landscaping', budgetCents: 2500000 },

  // CONTINGENCY Section ($80,000)
  { section: 'CONTINGENCY', costCode: '4.01', description: 'Construction Contingency', budgetCents: 8000000 },
];

// Helper to find cost line for linking
export function findCostLineByCode(lines: { costCode: string; id: string }[], code: string) {
  return lines.find(l => l.costCode === code);
}
```

### Step 2: Update Project Creation Route (45 min)

Extend `src/app/api/projects/route.ts`:

```typescript
import { DEFAULT_COST_LINES, findCostLineByCode } from '@/lib/constants/default-cost-lines';
import { costLines, variations, invoices } from '@/lib/db/schema';

// Inside the transaction, after existing initialization...

// 7. Initialize default cost lines
const costLineRecords = DEFAULT_COST_LINES.map((line, idx) => ({
  id: `${projectId}-cl-${idx}`,
  projectId,
  section: line.section,
  costCode: line.costCode,
  description: line.description,
  budgetCents: line.budgetCents,
  approvedContractCents: 0,
  sortOrder: idx,
}));
tx.insert(costLines).values(costLineRecords).run();

// 8. Initialize sample variation (linked to Construction Contingency)
const contingencyLine = findCostLineByCode(costLineRecords, '4.01');
const variationId = `${projectId}-var-sample`;
tx.insert(variations).values({
  id: variationId,
  projectId,
  costLineId: contingencyLine?.id,
  variationNumber: 'PV-001',
  category: 'Principal',
  description: 'Sample variation - delete if not needed',
  status: 'Forecast',
  amountForecastCents: 1000000,
  amountApprovedCents: 0,
  requestedBy: 'System',
  dateSubmitted: new Date().toISOString().split('T')[0],
}).run();

// 9. Initialize sample invoice (linked to Project Manager)
const pmLine = findCostLineByCode(costLineRecords, '2.01');
const now = new Date();
tx.insert(invoices).values({
  id: `${projectId}-inv-sample`,
  projectId,
  costLineId: pmLine?.id,
  invoiceNumber: 'INV-SAMPLE-001',
  description: 'Sample invoice - delete if not needed',
  amountCents: 100000,
  gstCents: 10000,
  periodYear: now.getFullYear(),
  periodMonth: now.getMonth() + 1,
  paidStatus: 'unpaid',
  invoiceDate: now.toISOString().split('T')[0],
}).run();
```

### Step 3: PC_ITEMS → CONSTRUCTION Migration (30 min)

1. Create migration script `scripts/run-migration-0011.js`:

```javascript
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/local.db'));

console.log('Running migration: PC_ITEMS → CONSTRUCTION...');

const result = db.prepare(`
  UPDATE cost_lines
  SET section = 'CONSTRUCTION'
  WHERE section = 'PC_ITEMS'
`).run();

console.log(`Updated ${result.changes} rows`);
console.log('Migration complete!');

db.close();
```

2. Update all TypeScript files (see spec.md Breaking Changes for full list):
   - `src/types/cost-plan.ts`
   - `src/components/cost-plan/*.tsx`
   - `src/lib/calculations/*.ts`
   - etc.

### Step 4: Test (30 min)

1. Create a new project via UI
2. Navigate to Cost Plan tab
3. Verify:
   - [ ] 20 cost lines present across 4 sections
   - [ ] FEES section shows $100,000 total
   - [ ] CONSULTANTS section shows $265,000 total
   - [ ] CONSTRUCTION section shows $455,000 total
   - [ ] CONTINGENCY section shows $80,000 total
   - [ ] Variations tab has 1 sample (PV-001)
   - [ ] Invoices tab has 1 sample (INV-SAMPLE-001)

### Step 5: Run Migration on Existing Data (15 min)

```bash
node scripts/run-migration-0011.js
```

## Verification Checklist

- [ ] New project creation includes 20 default cost lines
- [ ] Default budget totals $900,000
- [ ] Sample variation links to Construction Contingency
- [ ] Sample invoice links to Project Manager
- [ ] Existing projects show CONSTRUCTION (not PC_ITEMS)
- [ ] No TypeScript errors after enum rename
- [ ] Cost Plan UI displays all sections correctly

## Rollback

If issues occur:

1. Revert schema.ts enum change
2. Run reverse migration:
   ```sql
   UPDATE cost_lines SET section = 'PC_ITEMS' WHERE section = 'CONSTRUCTION';
   ```
3. Revert TypeScript file changes
4. Remove DEFAULT_COST_LINES from project creation

## Next Steps

After implementation:
1. Run `/speckit.tasks` to generate detailed task breakdown
2. Create PR for code review
3. Test on staging environment
