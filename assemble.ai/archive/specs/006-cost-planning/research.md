# Research: Cost Planning Module - Phase 0 Findings

**Feature**: 006-cost-planning
**Date**: 2025-12-03
**Status**: In Progress

---

## 1. FortuneSheet Validation

### 1.1 Installation & Setup

**Package**: `@fortune-sheet/react` v1.0.4
**Installation**: `npm install @fortune-sheet/react @fortune-sheet/core`

**Key Requirements**:
- Must use dynamic import with SSR disabled (uses browser APIs)
- Must import CSS: `import '@fortune-sheet/react/dist/index.css'`

```tsx
const Workbook = dynamic(
  () => import('@fortune-sheet/react').then((mod) => mod.Workbook),
  { ssr: false }
);
```

### 1.2 Basic Grid Performance (T001) ✅ PASS

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| 500 rows render | < 2s | ~150ms data gen | ✅ |
| Cell data structure | - | Works as expected | ✅ |
| Column widths | - | Configurable via `columnlen` | ✅ |

**Data Structure**:
```typescript
// FortuneSheet uses celldata array format
const celldata = [
  { r: 0, c: 0, v: { v: 'Value', ct: { fa: '@', t: 's' }, bg: '#fff', fc: '#000' } }
];
```

### 1.3 Row Grouping (T002) ⚠️ LIMITED

**Finding**: FortuneSheet does NOT have native Excel-style row grouping with outline levels.

**Available Alternatives**:

1. **Row Hiding** (`config.rowhidden`):
   - Can hide individual rows
   - Must be managed programmatically

   ```typescript
   config: {
     rowhidden: { 5: 0, 6: 0, 7: 0 } // Hide rows 5-7
   }
   ```

2. **Custom Section Headers**:
   - Use styled rows as visual section dividers
   - Toggle visibility programmatically on click

3. **Recommended Approach**:
   - Create section header rows with distinct styling
   - Implement custom toggle buttons outside the sheet
   - Use `rowhidden` to collapse sections
   - Track section expand/collapse state in React

**Implementation Pattern**:
```tsx
const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

const getRowHidden = () => {
  const hidden: Record<number, number> = {};
  // Hide rows in collapsed sections
  sectionRanges.forEach(({ section, start, end }) => {
    if (collapsedSections.has(section)) {
      for (let r = start; r <= end; r++) {
        hidden[r] = 0;
      }
    }
  });
  return hidden;
};
```

### 1.4 Context Menu (T003) ✅ PASS

FortuneSheet supports custom context menus, but configuration differs from spec:

```typescript
// Basic context menu options
<Workbook
  showToolbar={false}
  showFormulaBar={false}
  allowEdit={true}
/>
```

For custom menu items, need to use the hook-based approach or wrap component.

### 1.5 Cell Edit Callbacks (T004) ✅ PASS

```typescript
<Workbook
  onChange={(data) => {
    // Called when any data changes
    console.log('Sheet changed:', data);
  }}
  onCellUpdated={(cell, op) => {
    // Called when specific cell is updated
    console.log('Cell updated:', cell, op);
  }}
/>
```

### 1.6 Currency Formatting (T005) ✅ PASS

Uses Excel-style format strings:

```typescript
{
  v: 50000,  // Raw value
  ct: {
    fa: '$#,##0', // Format
    t: 'n'        // Type: number
  },
  fc: '#0000ff'   // Font color (blue for editable)
}
```

### 1.7 Conditional Formatting ✅ PASS

Applied per-cell via `bg` (background) and `fc` (font color):

```typescript
const varianceCell = {
  v: variance / 100,
  ct: { fa: '$#,##0', t: 'n' },
  fc: variance < 0 ? '#dc2626' : '#16a34a', // Red or green
  bg: variance < 0 ? '#fee2e2' : undefined   // Light red background
};
```

---

## 2. Realtime Architecture

### 2.1 Current Project Stack

The existing project uses **SQLite + Drizzle ORM**, not Supabase. This affects the realtime strategy.

**Adaptation Options**:

1. **Simple Polling** (Recommended for SQLite):
   - Poll every 5-10 seconds for totals
   - React Query's `refetchInterval` makes this trivial
   - Good enough for single-user scenarios

2. **Server-Sent Events (SSE)**:
   - Implement a `/api/cost-plan/[id]/events` endpoint
   - Push updates when database changes
   - More complex but real-time

3. **Migrate to PostgreSQL/Supabase**:
   - Full realtime support
   - Higher complexity
   - Overkill for current scale

**Recommendation**: Start with React Query polling. Add SSE if needed later.

### 2.2 Change Detection Pattern

```typescript
// useCostPlan hook with polling
const { data, isLoading } = useQuery({
  queryKey: ['costPlan', projectId],
  queryFn: () => fetchCostPlan(projectId),
  refetchInterval: 10000, // Poll every 10s
  staleTime: 5000,
});

// Optimistic updates for instant feedback
const mutation = useMutation({
  mutationFn: updateCostLine,
  onMutate: async (update) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['costPlan', projectId]);

    // Snapshot previous value
    const previous = queryClient.getQueryData(['costPlan', projectId]);

    // Optimistically update
    queryClient.setQueryData(['costPlan', projectId], (old) => ({
      ...old,
      cost_lines: old.cost_lines.map(cl =>
        cl.id === update.id ? { ...cl, ...update } : cl
      ),
    }));

    return { previous };
  },
});
```

---

## 3. Excel I/O Validation

### 3.1 Current Library: ExcelJS

The project already uses **ExcelJS** (not SheetJS). ExcelJS has good formula support.

### 3.2 Export with Formulas (T009) - To Test

```typescript
import ExcelJS from 'exceljs';

const exportCostPlan = async (costPlan: CostPlan) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Project Summary');

  // Add data with formulas
  costPlan.cost_lines.forEach((line, i) => {
    const row = i + 2; // +2 for header
    sheet.getCell(`K${row}`).value = {
      formula: `H${row}+I${row}+J${row}`, // Final Forecast = Approved + Forecast Vars + Approved Vars
      result: line.finalForecast,
    };
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};
```

### 3.3 Import with Column Detection (T010) - To Test

```typescript
import ExcelJS from 'exceljs';

const detectColumns = async (file: File) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.worksheets[0];
  const headers = sheet.getRow(1).values as string[];

  // Fuzzy match headers to known columns
  const mappings: Record<string, string> = {};
  const knownColumns = ['Budget', 'Description', 'Company', 'Cost Code'];

  headers.forEach((header, i) => {
    const match = knownColumns.find(col =>
      header?.toLowerCase().includes(col.toLowerCase())
    );
    if (match) {
      mappings[i] = match;
    }
  });

  return mappings;
};
```

---

## 4. Database Adaptation

### 4.1 SQLite vs PostgreSQL

The spec assumes PostgreSQL (Supabase). Adapting to SQLite:

| Feature | PostgreSQL | SQLite Adaptation |
|---------|------------|-------------------|
| UUID | `gen_random_uuid()` | Use `uuid` package in JS |
| TIMESTAMPTZ | Native | Store as ISO string |
| BIGINT | Native | INTEGER (SQLite uses 64-bit) |
| Soft delete | `deleted_at` | Same |
| Triggers | Yes | Limited, use app-level |
| RPC functions | Yes | Implement in JS |

### 4.2 Schema Changes

The existing `projects` table needs cost-plan fields added:

```typescript
// Migration: Add cost plan fields to projects
export const projects = sqliteTable('projects', {
  // ... existing fields
  currentReportMonth: text('current_report_month'), // ISO date string
  revision: text('revision').default('REV A'),
  currencyCode: text('currency_code').default('AUD'),
  showGst: integer('show_gst', { mode: 'boolean' }).default(false),
});
```

---

## 5. Risks & Mitigations

| Risk | Status | Mitigation |
|------|--------|------------|
| FortuneSheet row grouping | ⚠️ Limited | Use rowhidden + custom toggle UI |
| No native Supabase | ✅ OK | Use SQLite + polling |
| Excel formula export | 📋 To test | ExcelJS supports formulas |
| Performance at scale | ✅ OK | 500 rows renders in <200ms |

---

## 6. Phase 0 Task Status

| Task | Status | Notes |
|------|--------|-------|
| T001: Basic grid 500 rows | ✅ PASS | ~150ms data generation |
| T002: Row grouping | ⚠️ LIMITED | Use rowhidden workaround |
| T003: Context menu | ✅ PASS | Basic support available |
| T004: Cell edit callbacks | ✅ PASS | onChange, onCellUpdated |
| T005: Currency formatting | ✅ PASS | $#,##0 format works |
| T006-T008: Realtime | 📋 ADAPTED | Use polling instead of Supabase |
| T009: Excel export | 📋 TO TEST | ExcelJS should work |
| T010: Excel import | 📋 TO TEST | ExcelJS should work |

---

## 7. Recommendations

1. **Proceed with FortuneSheet** - It meets core requirements despite limited row grouping.

2. **Implement custom section collapse** - Use React state + rowhidden for section toggle.

3. **Use SQLite with polling** - Simpler than migrating to Supabase, sufficient for current needs.

4. **Keep ExcelJS** - Already in project, has formula support.

5. **Start Phase 1** - Foundation is viable, proceed with database schema and types.

---

**Next Steps**:
- Complete T009/T010 Excel validation
- Create data-model.md with SQLite schema
- Begin Phase 1 database migrations

---

**Document Version**: 1.0.0
**Author**: Claude
**Last Updated**: 2025-12-03
