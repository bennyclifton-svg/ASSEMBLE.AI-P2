# Implementation Plan: Cost Planning Module

**Branch**: `006-cost-planning` | **Date**: 2025-11-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-cost-planning/spec.md`

---

## Summary

The Cost Planning module provides real-time financial visibility across the project lifecycle. It replaces disconnected Excel files with a web-based, spreadsheet-native tool (FortuneSheet) that automatically links invoices to budget lines, tracks variations (forecast vs approved), and calculates current month claims and ETC.

**Core Capabilities:**
- Spreadsheet-native UI with FortuneSheet (Excel-like interactions)
- Real-time calculations (Claimed, Current Month, ETC, Variance)
- Split variation tracking (Forecast vs Approved amounts)
- Committed cost tracking (PO issued but not invoiced)
- Company master list with autocomplete
- Dynamic fiscal year allocations (no hard-coded FY columns)
- Excel import/export with formula preservation
- Snapshot/baseline comparison
- **Server-side aggregated real-time updates** (not row-level broadcasts)

---

## Technical Context

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Framework** | Next.js 14 (App Router) | Server components, API routes, modern patterns |
| **Language** | TypeScript 5.x | Type safety for financial calculations |
| **Database** | PostgreSQL (Supabase) | Relational integrity, soft deletes, audit trail |
| **Real-Time** | Supabase Broadcast + Edge Functions | Server-side aggregation, low bandwidth (see below) |
| **Spreadsheet UI** | FortuneSheet | Excel-like UX per Constitution IX |
| **State Management** | TanStack React Query v5 | Server state, optimistic updates, caching |
| **Excel I/O** | SheetJS (xlsx) | Formula-preserving export |
| **Testing** | Vitest + React Testing Library | Fast, modern test runner |
| **Validation** | Zod | Runtime type checking for API |

**Performance Targets:**
| Metric | Target |
|--------|--------|
| Initial load (100 cost lines) | < 2 seconds |
| Cell edit response | < 100ms (optimistic) |
| Full sheet recalculation | < 500ms |
| Save to server | < 500ms |
| Real-time total update | < 300ms end-to-end |
| Excel export | < 5 seconds |

**Scale Expectations:**
- ~100-500 cost lines per project
- ~500-1000 invoices per project
- ~50-200 variations per project

---

## Real-Time Architecture

### Why Not postgres_changes Directly?

Supabase Realtime's `postgres_changes` broadcasts every row change:

| Scenario | postgres_changes | Our Approach |
|----------|------------------|--------------|
| 500 invoice import | 500 messages × ~1KB = 500KB | 1 message × 200 bytes |
| Rapid cell edits | Every keystroke (debounced) | Single aggregated update |
| Calculation | Client-side (slow, duplicated) | Server-side (once) |
| Bandwidth | High | Low |

### Hybrid Approach: Supabase Broadcast + Edge Functions

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐     ┌────────────┐
│ DB Trigger      │────>│ Edge Function        │────>│ Supabase        │────>│ Clients    │
│ (on any change) │     │ (debounce + calc)    │     │ Broadcast       │     │ (receive)  │
└─────────────────┘     └──────────────────────┘     └─────────────────┘     └────────────┘
        │                         │                          │                      │
        │                         │                          │                      │
   Fires on:               - 500ms debounce            Broadcasts to:         Updates only
   - invoices              - Calc totals via RPC       project channel        totals in
   - variations            - Single broadcast                                 React Query
   - cost_lines                                                               cache
```

### What Gets Broadcast

```typescript
// Payload: ~200 bytes (vs ~1KB per row with postgres_changes)
interface CostPlanTotalsPayload {
  project_id: string;
  totals: {
    budget_cents: number;
    committed_cents: number;
    final_forecast_cents: number;
    variance_cents: number;
    claimed_cents: number;
    current_month_cents: number;
    etc_cents: number;
  };
  section_totals: {
    [section: string]: {
      budget_cents: number;
      claimed_cents: number;
      // ... per-section aggregates
    };
  };
  updated_at: string;
}
```

### Benefits

1. **10× less bandwidth** - Aggregates only, not full rows
2. **No client-side recalculation** - Server computes once
3. **Debouncing built-in** - Batch rapid changes (500ms window)
4. **Selective subscription** - Per-project channels
5. **No new infrastructure** - Uses Supabase Edge Functions + Realtime

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Implementation |
|-----------|--------|----------------|
| **IV. Financial Visibility** | ✅ | Budget → Committed → Forecast → Claimed → ETC flow |
| **V. Small Firm Optimization** | ✅ | Single PM can manage; no complex setup |
| **VI. Sharp, Actionable Outputs** | ✅ | Red variance flags, exportable Excel reports |
| **IX. Spreadsheet-Native UX** | ✅ | FortuneSheet with row grouping, context menus |
| **X. Relational Data Integrity** | ✅ | Explicit FKs: Invoice → CostLine → Variation |
| **XI. Period-Based Reporting** | ✅ | `period_year` + `period_month` on invoices |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-cost-planning/
├── plan.md                    # This file
├── spec.md                    # Feature specification (v0.2.0)
├── research.md                # Phase 0 output - FortuneSheet POC findings
├── data-model.md              # Phase 1 output - ERD and schema details
├── api-contracts.md           # Phase 1 output - OpenAPI/TypeScript contracts
├── quickstart.md              # Phase 1 output - Developer onboarding
└── tasks.md                   # Phase 2 output - Granular implementation tasks
```

### Source Code (repository root)

```text
src/
├── app/                                    # Next.js App Router
│   ├── api/
│   │   ├── companies/
│   │   │   ├── route.ts                   # GET (search), POST
│   │   │   └── [id]/
│   │   │       └── route.ts               # PATCH, DELETE
│   │   │
│   │   ├── import-templates/
│   │   │   └── route.ts                   # GET, POST
│   │   │
│   │   └── projects/
│   │       └── [projectId]/
│   │           ├── cost-plan/
│   │           │   ├── route.ts           # GET full cost plan with calculations
│   │           │   ├── export/
│   │           │   │   └── route.ts       # GET export to Excel
│   │           │   ├── import/
│   │           │   │   └── route.ts       # POST import from Excel
│   │           │   ├── snapshot/
│   │           │   │   └── route.ts       # GET list, POST create
│   │           │   └── compare/
│   │           │       └── [snapshotId]/
│   │           │           └── route.ts   # GET comparison data
│   │           │
│   │           ├── cost-lines/
│   │           │   ├── route.ts           # GET, POST
│   │           │   ├── [id]/
│   │           │   │   ├── route.ts       # PATCH, DELETE
│   │           │   │   └── allocations/
│   │           │   │       └── route.ts   # GET, PUT fiscal year allocations
│   │           │   ├── batch/
│   │           │   │   └── route.ts       # POST batch create/update/delete
│   │           │   └── reorder/
│   │           │       └── route.ts       # POST reorder within section
│   │           │
│   │           ├── invoices/
│   │           │   ├── route.ts           # GET (paginated), POST
│   │           │   ├── [id]/
│   │           │   │   └── route.ts       # PATCH, DELETE
│   │           │   ├── batch/
│   │           │   │   └── route.ts       # POST batch operations
│   │           │   └── summary/
│   │           │       └── route.ts       # GET aggregated by cost line
│   │           │
│   │           └── variations/
│   │               ├── route.ts           # GET (paginated), POST
│   │               ├── [id]/
│   │               │   └── route.ts       # PATCH, DELETE
│   │               └── batch/
│   │                   └── route.ts       # POST batch operations
│   │
│   └── projects/
│       └── [projectId]/
│           └── cost-plan/
│               ├── page.tsx               # Main cost plan page
│               ├── loading.tsx            # Loading skeleton
│               └── error.tsx              # Error boundary
│
├── components/
│   └── cost-plan/
│       ├── CostPlanPage.tsx               # Page-level orchestration
│       ├── CostPlanHeader.tsx             # Title, month selector, revision
│       ├── CostPlanSheet.tsx              # FortuneSheet wrapper
│       │
│       ├── sheets/
│       │   ├── ProjectSummarySheet.tsx    # Project Summary tab config
│       │   ├── InvoicesSheet.tsx          # Invoices tab config
│       │   ├── VariationsSheet.tsx        # Variations tab config
│       │   └── sheet-configs/
│       │       ├── columns.ts             # Column definitions per sheet
│       │       ├── formatting.ts          # Conditional formatting rules
│       │       └── validation.ts          # Cell validation rules
│       │
│       ├── dialogs/
│       │   ├── ImportDialog.tsx           # Excel import wizard
│       │   ├── ColumnMappingDialog.tsx    # Import column mapping
│       │   ├── SnapshotDialog.tsx         # Create snapshot
│       │   ├── SnapshotCompareDialog.tsx  # Compare to baseline
│       │   ├── LinkInvoiceDialog.tsx      # Link invoice to cost line
│       │   └── AddCompanyDialog.tsx       # Quick-add company
│       │
│       ├── context-menu/
│       │   ├── CostLineContextMenu.tsx    # Right-click menu for cost lines
│       │   ├── InvoiceContextMenu.tsx     # Right-click menu for invoices
│       │   └── VariationContextMenu.tsx   # Right-click menu for variations
│       │
│       ├── cells/
│       │   ├── CompanyAutocomplete.tsx    # Company cell with autocomplete
│       │   ├── CostLineDropdown.tsx       # Cost line selector
│       │   ├── VariationDropdown.tsx      # Variation selector
│       │   ├── MonthPicker.tsx            # Period month selector
│       │   └── CurrencyCell.tsx           # Formatted currency input
│       │
│       └── status/
│           ├── SyncIndicator.tsx          # Saved/Saving/Error status
│           ├── RealtimeIndicator.tsx      # Connected/Disconnected status
│           └── CalculationIndicator.tsx   # Calculating spinner
│
├── hooks/
│   ├── cost-plan/
│   │   ├── useCostPlan.ts                 # Main data fetching hook
│   │   ├── useCostLines.ts                # Cost lines CRUD
│   │   ├── useInvoices.ts                 # Invoices CRUD with pagination
│   │   ├── useVariations.ts               # Variations CRUD
│   │   ├── useCostPlanCalculations.ts     # Derived/calculated values
│   │   ├── useCostPlanExport.ts           # Excel export logic
│   │   ├── useCostPlanImport.ts           # Excel import logic
│   │   ├── useCostPlanRealtime.ts         # Supabase Broadcast subscription
│   │   └── useSnapshots.ts                # Snapshot management
│   │
│   ├── useCompanies.ts                    # Companies master list
│   ├── useDebouncedSave.ts                # Debounced mutation helper
│   └── useOptimisticUpdate.ts             # Optimistic update helper
│
├── lib/
│   ├── api/
│   │   ├── client.ts                      # API client setup
│   │   ├── cost-plan.ts                   # Cost plan API functions
│   │   ├── cost-lines.ts                  # Cost lines API functions
│   │   ├── invoices.ts                    # Invoices API functions
│   │   ├── variations.ts                  # Variations API functions
│   │   └── companies.ts                   # Companies API functions
│   │
│   ├── calculations/
│   │   ├── cost-plan-formulas.ts          # Core calculation logic
│   │   ├── aggregations.ts                # Section subtotals, grand totals
│   │   └── variance.ts                    # Variance calculations
│   │
│   ├── export/
│   │   ├── excel-export.ts                # SheetJS export with formulas
│   │   ├── formula-builder.ts             # Build Excel formulas from data
│   │   └── format-config.ts               # Excel formatting config
│   │
│   ├── import/
│   │   ├── excel-import.ts                # SheetJS import parsing
│   │   ├── column-detector.ts             # Auto-detect column mappings
│   │   └── fuzzy-matcher.ts               # Fuzzy match companies/cost lines
│   │
│   ├── fortune-sheet/
│   │   ├── config.ts                      # FortuneSheet base config
│   │   ├── row-groups.ts                  # Section grouping logic
│   │   ├── context-menu.ts                # Context menu definitions
│   │   └── cell-renderers.ts              # Custom cell renderers
│   │
│   ├── supabase/
│   │   ├── client.ts                      # Supabase client (browser)
│   │   ├── server.ts                      # Supabase client (server)
│   │   ├── realtime.ts                    # Broadcast channel setup
│   │   └── queries/
│   │       ├── cost-plan.ts               # Cost plan queries
│   │       ├── invoices.ts                # Invoice queries
│   │       └── variations.ts              # Variation queries
│   │
│   └── utils/
│       ├── currency.ts                    # Cents ↔ dollars conversion
│       ├── dates.ts                       # Period date helpers
│       └── validation.ts                  # Shared validation schemas
│
├── types/
│   ├── cost-plan.ts                       # CostPlan, CostLine types
│   ├── invoice.ts                         # Invoice types
│   ├── variation.ts                       # Variation types
│   ├── company.ts                         # Company types
│   ├── snapshot.ts                        # Snapshot types
│   ├── realtime.ts                        # Broadcast payload types
│   ├── api.ts                             # API request/response types
│   └── fortune-sheet.ts                   # FortuneSheet type extensions
│
└── __tests__/
    ├── components/
    │   └── cost-plan/
    │       ├── CostPlanSheet.test.tsx
    │       └── dialogs/
    │           └── ImportDialog.test.tsx
    ├── hooks/
    │   ├── useCostPlanCalculations.test.ts
    │   └── useCostPlanRealtime.test.ts
    ├── lib/
    │   ├── calculations/
    │   │   └── cost-plan-formulas.test.ts
    │   └── import/
    │       └── column-detector.test.ts
    └── api/
        └── cost-lines.test.ts

supabase/
├── functions/
│   └── cost-plan-totals/
│       ├── index.ts                       # Edge Function: debounce + calc + broadcast
│       └── _shared/
│           └── cors.ts                    # CORS headers
│
├── migrations/
│   ├── 20251127000001_create_companies.sql
│   ├── 20251127000002_create_projects.sql
│   ├── 20251127000003_create_cost_lines.sql
│   ├── 20251127000004_create_cost_line_allocations.sql
│   ├── 20251127000005_create_variations.sql
│   ├── 20251127000006_create_invoices.sql
│   ├── 20251127000007_create_cost_line_comments.sql
│   ├── 20251127000008_create_project_snapshots.sql
│   ├── 20251127000009_create_import_templates.sql
│   ├── 20251127000010_create_indexes.sql
│   ├── 20251127000011_create_rpc_functions.sql
│   └── 20251127000012_create_realtime_triggers.sql
│
├── seed/
│   └── cost-plan-sample-data.sql          # Sample data for development
│
└── types/
    └── database.ts                        # Generated Supabase types
```

---

## Database Schema Summary

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `companies` | Master list of contractors/consultants | → Many cost_lines, invoices |
| `projects` | Project header (name, current_month, revision) | → Many cost_lines |
| `cost_lines` | Budget line items (rows in Project Summary) | → project, company |
| `cost_line_allocations` | Dynamic FY columns (year + amount) | → cost_line |
| `variations` | Change orders (forecast & approved amounts) | → project, cost_line |
| `invoices` | Invoice register | → project, cost_line, variation (optional), company |
| `cost_line_comments` | Cell-level comments | → cost_line |
| `project_snapshots` | Baseline snapshots for comparison | → project |
| `import_templates` | Saved column mappings for Excel import | → organisation |

**Key Design Decisions:**
- All amounts stored in **cents (BIGINT)** to avoid floating-point issues
- **Soft delete** (`deleted_at`) on all main tables for audit trail
- **Period** stored as `period_year` + `period_month` integers (not DATE)
- **Variation numbers** auto-generated with category prefix (PV-001, CV-001)

---

## Real-Time Implementation Details

### 1. Database Triggers

```sql
-- Migration: 20251127000012_create_realtime_triggers.sql

-- Function to notify Edge Function of changes
CREATE OR REPLACE FUNCTION notify_cost_plan_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  payload := json_build_object(
    'project_id', COALESCE(NEW.project_id, OLD.project_id),
    'table', TG_TABLE_NAME,
    'operation', TG_OP
  );
  
  -- Call Edge Function via pg_net (async HTTP)
  PERFORM net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/cost-plan-totals',
    headers := json_build_object('Content-Type', 'application/json')::jsonb,
    body := payload::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers on all cost-affecting tables
CREATE TRIGGER invoices_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION notify_cost_plan_change();

CREATE TRIGGER variations_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON variations
  FOR EACH ROW EXECUTE FUNCTION notify_cost_plan_change();

CREATE TRIGGER cost_lines_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cost_lines
  FOR EACH ROW EXECUTE FUNCTION notify_cost_plan_change();
```

### 2. Edge Function (Debounce + Calculate + Broadcast)

```typescript
// supabase/functions/cost-plan-totals/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './_shared/cors.ts'

// In-memory debounce map (per Edge Function instance)
const pendingUpdates = new Map<string, number>()
const DEBOUNCE_MS = 500

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { project_id } = await req.json()
    
    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Debounce: Clear existing timeout, set new one
    const existingTimeout = pendingUpdates.get(project_id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule the actual calculation
    const timeoutId = setTimeout(async () => {
      await calculateAndBroadcast(project_id)
      pendingUpdates.delete(project_id)
    }, DEBOUNCE_MS)

    pendingUpdates.set(project_id, timeoutId)

    return new Response(
      JSON.stringify({ status: 'queued', project_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function calculateAndBroadcast(projectId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Call RPC function to calculate totals
  const { data: totals, error } = await supabase.rpc('calculate_cost_plan_totals', {
    p_project_id: projectId
  })

  if (error) {
    console.error('Error calculating totals:', error)
    return
  }

  // Broadcast to project-specific channel
  const channel = supabase.channel(`cost-plan:${projectId}`)
  
  await channel.send({
    type: 'broadcast',
    event: 'totals_updated',
    payload: {
      project_id: projectId,
      totals,
      updated_at: new Date().toISOString()
    }
  })

  // Clean up channel
  await supabase.removeChannel(channel)
  
  console.log(`Broadcast totals for project ${projectId}`)
}
```

### 3. Server-Side Calculation RPC

```sql
-- Migration: 20251127000011_create_rpc_functions.sql

CREATE OR REPLACE FUNCTION calculate_cost_plan_totals(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  project_month DATE;
BEGIN
  -- Get current report month
  SELECT current_report_month INTO project_month
  FROM projects WHERE id = p_project_id;

  SELECT json_build_object(
    'budget_cents', COALESCE(SUM(cl.budget_cents), 0),
    'approved_contract_cents', COALESCE(SUM(cl.approved_contract_cents), 0),
    'committed_cents', COALESCE(SUM(cl.committed_cents), 0),
    'forecast_variations_cents', COALESCE(SUM(v_forecast.amount), 0),
    'approved_variations_cents', COALESCE(SUM(v_approved.amount), 0),
    'final_forecast_cents', COALESCE(SUM(
      cl.approved_contract_cents + 
      cl.committed_cents + 
      COALESCE(v_forecast.amount, 0) + 
      COALESCE(v_approved.amount, 0)
    ), 0),
    'variance_cents', COALESCE(SUM(
      cl.budget_cents - (
        cl.approved_contract_cents + 
        cl.committed_cents + 
        COALESCE(v_forecast.amount, 0) + 
        COALESCE(v_approved.amount, 0)
      )
    ), 0),
    'claimed_cents', COALESCE((
      SELECT SUM(amount_cents) FROM invoices 
      WHERE project_id = p_project_id AND deleted_at IS NULL
    ), 0),
    'current_month_cents', COALESCE((
      SELECT SUM(amount_cents) FROM invoices 
      WHERE project_id = p_project_id 
        AND deleted_at IS NULL
        AND period_year = EXTRACT(YEAR FROM project_month)
        AND period_month = EXTRACT(MONTH FROM project_month)
    ), 0),
    'section_totals', (
      SELECT json_object_agg(section, section_data)
      FROM (
        SELECT 
          cl2.section,
          json_build_object(
            'budget_cents', SUM(cl2.budget_cents),
            'final_forecast_cents', SUM(
              cl2.approved_contract_cents + cl2.committed_cents
            ),
            'claimed_cents', COALESCE((
              SELECT SUM(i.amount_cents) 
              FROM invoices i 
              WHERE i.cost_line_id = ANY(ARRAY_AGG(cl2.id))
                AND i.deleted_at IS NULL
            ), 0)
          ) as section_data
        FROM cost_lines cl2
        WHERE cl2.project_id = p_project_id AND cl2.deleted_at IS NULL
        GROUP BY cl2.section
      ) sections
    )
  ) INTO result
  FROM cost_lines cl
  LEFT JOIN LATERAL (
    SELECT SUM(amount_forecast_cents) as amount
    FROM variations 
    WHERE cost_line_id = cl.id 
      AND status = 'Forecast' 
      AND deleted_at IS NULL
  ) v_forecast ON true
  LEFT JOIN LATERAL (
    SELECT SUM(amount_approved_cents) as amount
    FROM variations 
    WHERE cost_line_id = cl.id 
      AND status = 'Approved' 
      AND deleted_at IS NULL
  ) v_approved ON true
  WHERE cl.project_id = p_project_id AND cl.deleted_at IS NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Client-Side Subscription Hook

```typescript
// src/hooks/cost-plan/useCostPlanRealtime.ts
import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { CostPlanTotalsPayload } from '@/types/realtime'

export function useCostPlanRealtime(projectId: string) {
  const queryClient = useQueryClient()

  const handleTotalsUpdate = useCallback((payload: CostPlanTotalsPayload) => {
    // Update only totals in cache (no full refetch needed)
    queryClient.setQueryData(
      ['costPlan', projectId],
      (old: CostPlanData | undefined) => {
        if (!old) return old
        return {
          ...old,
          totals: payload.totals,
          section_totals: payload.totals.section_totals
        }
      }
    )

    // Also invalidate any dependent queries
    queryClient.invalidateQueries({
      queryKey: ['costPlanSummary', projectId],
      refetchType: 'none' // Don't refetch, just mark stale
    })
  }, [projectId, queryClient])

  useEffect(() => {
    const channel = supabase
      .channel(`cost-plan:${projectId}`)
      .on('broadcast', { event: 'totals_updated' }, ({ payload }) => {
        console.log('Received totals update:', payload)
        handleTotalsUpdate(payload as CostPlanTotalsPayload)
      })
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, handleTotalsUpdate])
}
```

### 5. Type Definitions

```typescript
// src/types/realtime.ts
export interface CostPlanTotalsPayload {
  project_id: string
  totals: {
    budget_cents: number
    approved_contract_cents: number
    committed_cents: number
    forecast_variations_cents: number
    approved_variations_cents: number
    final_forecast_cents: number
    variance_cents: number
    claimed_cents: number
    current_month_cents: number
    section_totals: {
      [section: string]: {
        budget_cents: number
        final_forecast_cents: number
        claimed_cents: number
      }
    }
  }
  updated_at: string
}
```

---

## API Endpoints Summary

### Core Resources

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/projects/:id/cost-plan` | Full cost plan with calculations |
| `POST` | `/api/projects/:id/cost-plan/import` | Import from Excel |
| `GET` | `/api/projects/:id/cost-plan/export` | Export to Excel |
| `POST` | `/api/projects/:id/cost-plan/snapshot` | Create baseline snapshot |
| `GET` | `/api/projects/:id/cost-plan/compare/:snapshotId` | Compare to baseline |

### Cost Lines

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/projects/:id/cost-lines` | List with calculated fields |
| `POST` | `/api/projects/:id/cost-lines` | Create single |
| `POST` | `/api/projects/:id/cost-lines/batch` | Batch operations |
| `PATCH` | `/api/cost-lines/:id` | Update single |
| `DELETE` | `/api/cost-lines/:id` | Soft delete |
| `POST` | `/api/projects/:id/cost-lines/reorder` | Reorder within section |

### Invoices

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/projects/:id/invoices` | List (paginated) |
| `POST` | `/api/projects/:id/invoices` | Create |
| `POST` | `/api/projects/:id/invoices/batch` | Batch operations |
| `PATCH` | `/api/invoices/:id` | Update |
| `DELETE` | `/api/invoices/:id` | Soft delete |
| `GET` | `/api/projects/:id/invoices/summary` | Aggregated by cost line |

### Variations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/projects/:id/variations` | List (paginated) |
| `POST` | `/api/projects/:id/variations` | Create (auto-generates number) |
| `POST` | `/api/projects/:id/variations/batch` | Batch operations |
| `PATCH` | `/api/variations/:id` | Update |
| `DELETE` | `/api/variations/:id` | Soft delete |

### Companies

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/companies?search=...` | Search with autocomplete |
| `POST` | `/api/companies` | Create |
| `PATCH` | `/api/companies/:id` | Update |
| `DELETE` | `/api/companies/:id` | Soft delete |

---

## Implementation Phases

### Phase 0: Research & POC (1-2 days)

- [ ] FortuneSheet integration POC
  - Row grouping with collapse/expand
  - Custom context menu
  - Cell edit → callback integration
  - Performance with 500 rows
- [ ] Supabase Realtime Broadcast POC
  - Edge Function trigger → broadcast flow
  - Client subscription
  - Debouncing behavior
- [ ] SheetJS export POC
  - Formula preservation
  - Formatting preservation

**Output**: `research.md` with findings and recommendations

### Phase 1: Foundation (3-4 days)

- [ ] Database migrations (all 12 files including triggers)
- [ ] Type definitions (Zod schemas + TypeScript)
- [ ] API contracts (request/response types)
- [ ] Base API routes (CRUD for all resources)
- [ ] Calculation RPC function (`calculate_cost_plan_totals`)
- [ ] Edge Function (`cost-plan-totals`)
- [ ] Supabase client setup

**Output**: `data-model.md`, `api-contracts.md`, `quickstart.md`

### Phase 2: Core UI (4-5 days)

- [ ] FortuneSheet integration
- [ ] Project Summary sheet (all columns, formatting)
- [ ] Invoices sheet
- [ ] Variations sheet
- [ ] Tab switching
- [ ] Section row grouping
- [ ] Conditional formatting (variance highlighting)

### Phase 3: Data Flow (3-4 days)

- [ ] React Query integration
- [ ] Optimistic updates
- [ ] Debounced save
- [ ] `useCostPlanRealtime` hook
- [ ] Realtime connection indicator
- [ ] Company autocomplete
- [ ] Cost line / variation dropdowns

### Phase 4: Advanced Features (3-4 days)

- [ ] Excel import wizard
- [ ] Column mapping UI
- [ ] Import template save/load
- [ ] Excel export with formulas
- [ ] Snapshot creation
- [ ] Snapshot comparison view

### Phase 5: Polish & Testing (2-3 days)

- [ ] Context menus (right-click)
- [ ] Cell comments
- [ ] Error handling & validation
- [ ] Loading states
- [ ] Unit tests (calculations, API)
- [ ] Integration tests (import/export, realtime)
- [ ] E2E tests (critical paths)

**Total Estimate**: 16-22 days

---

## Complexity Tracking

| Complexity | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Edge Function for realtime | Server-side aggregation, 10× less bandwidth | `postgres_changes` broadcasts every row = noisy, slow for 500+ rows |
| Batch API endpoints | Spreadsheet edits often affect multiple cells at once | Individual calls would cause race conditions and poor UX |
| Dynamic FY allocations table | Projects span different year ranges | Hard-coded columns require schema changes annually |
| Debouncing in Edge Function | Rapid edits shouldn't spam calculations | Without debounce, bulk import triggers 500 calc/broadcast cycles |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| FortuneSheet doesn't support required features | Medium | High | Phase 0 POC to validate; fallback to Luckysheet or Handsontable |
| Excel export loses formulas | Medium | Medium | Test SheetJS thoroughly in POC; may need custom formula builder |
| Edge Function cold start latency | Low | Medium | Keep function warm; first request may be slower |
| Supabase Realtime connection drops | Low | Low | Auto-reconnect built-in; show connection status to user |
| Performance with large datasets | Low | Medium | Virtualization in FortuneSheet; pagination on API |

---

## Dependencies

**External Libraries (to be added to package.json):**
```json
{
  "@fortune-sheet/react": "^0.1.x",
  "@tanstack/react-query": "^5.x",
  "xlsx": "^0.18.x",
  "@supabase/supabase-js": "^2.x",
  "zod": "^3.x",
  "date-fns": "^3.x"
}
```

**Dev Dependencies:**
```json
{
  "vitest": "^1.x",
  "@testing-library/react": "^14.x",
  "@types/node": "^20.x",
  "supabase": "^1.x"
}
```

**Supabase Extensions Required:**
- `pg_net` - For async HTTP calls from triggers to Edge Functions

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Set in Supabase Dashboard → Database → Settings
# Used by triggers to call Edge Functions
app.settings.edge_function_url=https://your-project.supabase.co/functions/v1
```

---

## Open Items for Phase 0

1. **FortuneSheet License**: Confirm MIT license is acceptable
2. **Supabase Plan**: Confirm Edge Functions and Realtime are available on current plan
3. **pg_net Extension**: Verify it's enabled or can be enabled
4. **Existing Project Schema**: Does `projects` table already exist? Need to check for conflicts
5. **Auth Integration**: How does this integrate with existing auth (user_id for created_by)?

---

## References

- [Feature Specification](spec.md) - Full requirements
- [Constitution](../../../constitution.md) - Guiding principles
- [FortuneSheet Docs](https://github.com/ruilisi/fortune-sheet) - Spreadsheet library
- [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast) - Broadcast channels
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) - Serverless functions
- [SheetJS Docs](https://docs.sheetjs.com/) - Excel I/O
- [pg_net Extension](https://supabase.com/docs/guides/database/extensions/pg_net) - Async HTTP from Postgres

---

**Plan Version**: 1.1.0  
**Author**: Claude  
**Date**: 2025-11-26  
**Status**: Ready for Phase 0 Research  
**Changelog**:
- 1.1.0: Added hybrid Supabase Broadcast architecture for real-time (replaces postgres_changes)
- 1.0.0: Initial plan
