# Apply Budget Estimate to Cost Plan

**Date:** 2026-02-14
**Status:** Design approved

## Summary

Add an "Apply Budget Estimate" button to the Cost Plan toolbar that allows users to distribute the profiler's estimated cost range across budget line items using predefined percentage allocations per building class. The feature opens a preview dialog where users can adjust the total budget (via slider) and individual line item percentages before committing.

## Motivation

The building profiler already generates a cost estimate range (e.g. $16M–$30M) based on complexity scoring and market data. Currently there is no way to flow this estimate into the cost plan's budget line items — users must manually populate each line. This feature bridges that gap with a single click.

## User Flow

1. User opens the Cost Plan tab (which already has line items from templates or manual entry)
2. User clicks **"Apply Budget Estimate"** button in the toolbar (next to "Clear All")
3. Preview dialog opens showing:
   - Total budget slider (range = profiler estimate low–high, default = midpoint)
   - Line item table with allocated percentages and dollar amounts
   - Per-line % adjusters with lock toggles
   - Contingency % input (pre-filled from complexity score suggestion)
4. User adjusts total and/or individual percentages — all values update in real-time
5. User clicks **"Apply to Cost Plan"** — budgets are written to cost lines
6. Dialog closes, cost plan reflects the new budget values

## Button Availability

The "Apply Budget Estimate" button is **disabled** (with tooltip) when:
- The profiler has no completed complexity score
- The estimate range is not yet calculated
- There are no cost lines in the cost plan

## Allocation Profiles

### Structure

Each building class/project type has a stored allocation profile — a set of percentage splits per cost line activity that total 100%.

```typescript
interface AllocationProfile {
  id: string;
  projectType: string;          // e.g. "residential_multi"
  buildingClass: string;        // e.g. "Class 2"
  label: string;                // e.g. "NCC Class 2 — Residential (Multi-storey)"
  sections: AllocationSection[];
}

interface AllocationSection {
  section: 'FEES' | 'CONSULTANTS' | 'CONSTRUCTION' | 'CONTINGENCY';
  items: AllocationItem[];
}

interface AllocationItem {
  activity: string;             // Maps to cost line activity name
  percent: number;              // % of total budget
}
```

### Building Classes to Research

| Profile | NCC Class | Description |
|---------|-----------|-------------|
| 1 | Class 1a | Houses, townhouses |
| 2 | Class 2 | Apartments, multi-residential |
| 3 | Class 3 | Hotels, boarding houses |
| 4 | Class 5 | Offices |
| 5 | Class 6 | Retail, shops |
| 6 | Class 7 | Carparks, warehouses |
| 7 | Class 8 | Factories, industrial |
| 8 | Class 9a | Healthcare |
| 9 | Class 9b | Assembly (schools, community) |

### Data Sources

- Australian Institute of Quantity Surveyors (AIQS) benchmarks
- Rawlinsons Australian Construction Handbook
- BCIS elemental cost breakdowns
- Published QS reports for Australian projects

### Storage

Static JSON file at `src/lib/data/allocation-profiles.json`. No DB table needed — these change infrequently and are easy to review/edit in version control.

## Preview Dialog UX

### Top Bar — Total Budget Control

- Estimate range label (e.g. "$16M – $30M")
- Horizontal slider constrained to estimate low/high bounds, thumb at midpoint
- Dollar input field (editable) synced with slider
- Moving either updates all line item amounts in real-time

### Middle — Line Item Table

| Column | Description |
|--------|-------------|
| Section | Section header with total (e.g. "CONSTRUCTION — 70% — $16.1M") |
| Activity | Cost line activity name |
| Allocation % | Editable with +/- steppers |
| Lock | Toggle to lock a line's % when other lines adjust |
| Budget Amount | Calculated: total × (line % / 100) |

**Percentage adjustment behaviour:**
- When a line's % is adjusted, other **unlocked** lines in the same section scale proportionally to maintain the section total
- If all percentages no longer sum to 100%, show a warning badge with the delta

### Bottom — Actions

- Contingency % input (pre-filled from complexity score's suggested range)
- **"Apply to Cost Plan"** button
- **"Cancel"** button

## Mapping Logic

The allocation profile's activity names must be matched to the user's existing cost plan lines.

### Matching Strategy

1. **Exact match** — profile activity matches cost line `activity` field
2. **Fuzzy match** — normalize both strings (lowercase, strip whitespace/punctuation), match on similarity
3. **Unmatched profile items** — shown in preview as "new" rows (greyed, with "Add to Cost Plan" checkbox)
4. **Unmatched cost lines** — shown at bottom as "Unallocated" with 0%, user can manually set %

### On Apply

- **Matched lines:** `budgetCents` updated with calculated amount
- **Opted-in new items:** new `cost_lines` rows created with budget
- **Unallocated lines:** left untouched (unless user manually set a %)
- **Never deletes** existing cost lines or data

## New Files

| File | Purpose |
|------|---------|
| `src/lib/data/allocation-profiles.json` | Researched % breakdowns per building class |
| `src/components/cost-plan/ApplyEstimateDialog.tsx` | Preview dialog component |
| `src/lib/calculations/estimate-allocation.ts` | Matching, distribution, and rounding logic |

## Modified Files

| File | Change |
|------|--------|
| `src/components/cost-plan/CostPlanPanel.tsx` | Add "Apply Budget Estimate" button to toolbar |
| `src/lib/calculations/cost-plan-formulas.ts` | Add allocation calculation helpers |

## No Backend Changes

- Writes to existing `budgetCents` field via existing cost plan API
- Allocation profiles are static JSON
- Profiler estimate range already available client-side

## Implementation Order

1. Research allocation profiles → produce JSON with ~10 building class profiles
2. Build allocation calculation logic (matching, distributing, rounding to cents)
3. Build the preview dialog (slider, table, % adjusters, lock toggles)
4. Wire button into CostPlanPanel toolbar, gate on profiler data availability
5. Apply logic — write matched/new budgets via existing mutation
