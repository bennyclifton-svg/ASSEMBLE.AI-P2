# Phase 3X — Broad Write Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the agent approval-gate pattern from cost lines/invoices to all major editable entities — notes, risks, variations, program activities/milestones, and stakeholders — and update every agent specialist's `allowedTools`, system prompt, and matching `docs/agents/` spec document so each agent knows exactly what it can read and write.

**Architecture:** 15 new tools (5 read + 10 write) follow the exact pattern of `update_cost_line`/`create_cost_line`. All new entity tables get a `row_version` column for optimistic locking. Agent specialist TS files (`src/lib/agents/specialists/*.ts`) and their matching `docs/agents/Agent-*.md` spec docs are both updated so the source-of-truth stays in sync.

**Tech Stack:** TypeScript, Drizzle ORM (PostgreSQL), Anthropic SDK tool-use, Next.js App Router, existing approval-gate infrastructure in `src/lib/agents/applicators.ts` and `src/lib/agents/approvals.ts`.

---

## New tool summary

| Tool | Type | Agent(s) |
|------|------|----------|
| `list_notes` | read | Finance, Program, Design |
| `list_risks` | read | Finance, Program |
| `list_variations` | read | Finance |
| `list_stakeholders` | read | Design |
| `list_meetings` | read | Design, Program |
| `create_note` | write | Finance, Program, Design |
| `update_note` | write | Finance, Program, Design |
| `create_risk` | write | Finance, Program |
| `update_risk` | write | Finance, Program |
| `create_variation` | write | Finance |
| `update_variation` | write | Finance |
| `update_program_activity` | write | Program |
| `create_program_milestone` | write | Program |
| `update_program_milestone` | write | Program |
| `update_stakeholder` | write | Design |

---

## Critical files

| File | Role |
|------|------|
| `src/lib/db/pg-schema.ts` | Add `rowVersion` column to 6 tables |
| `drizzle-pg/0041_phase3x_row_versions.sql` | Migration SQL |
| `src/lib/agents/tools/index.ts` | Register all new tools |
| `src/lib/agents/tools/_context.ts` | `assertProjectOrg` — call first in every execute() |
| `src/lib/agents/tools/catalog.ts` | `registerTool`, `AgentToolDefinition` — pattern to follow |
| `src/lib/agents/tools/update-cost-line.ts` | **Reference implementation** for mutating tools |
| `src/lib/agents/tools/list-cost-lines.ts` | **Reference implementation** for read tools |
| `src/lib/agents/applicators.ts` | Add `case` for each new write tool |
| `src/lib/agents/specialists/finance.ts` | Update `allowedTools` + `BASE_PROMPT` |
| `src/lib/agents/specialists/program.ts` | Update `allowedTools` + `BASE_PROMPT` |
| `src/lib/agents/specialists/design.ts` | Update `allowedTools` + `BASE_PROMPT` |
| `src/lib/agents/specialists/orchestrator.ts` | Add routing rules for new domains |
| `docs/agents/Agent-Finance.md` | Sync tool list with TS implementation |
| `docs/agents/Agent-Program.md` | Sync tool list with TS implementation |
| `docs/agents/Agent-Design.md` | Sync tool list with TS implementation |

---

## Task 1 — DB migration: add `row_version` to 6 entity tables

**Files:**
- Create: `drizzle-pg/0041_phase3x_row_versions.sql`
- Modify: `src/lib/db/pg-schema.ts`

**Step 1: Create migration SQL**

```sql
-- drizzle-pg/0041_phase3x_row_versions.sql
ALTER TABLE notes             ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
ALTER TABLE risks             ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
ALTER TABLE variations        ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
ALTER TABLE program_activities ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
ALTER TABLE program_milestones ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
ALTER TABLE project_stakeholders ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
```

**Step 2: Update `pg-schema.ts`**

For each of the 6 tables, add this column after `updatedAt` (or at the end of the column list):

```typescript
rowVersion: integer('row_version').notNull().default(1),
```

Tables to update: `notes`, `risks`, `variations`, `programActivities`, `programMilestones`, `projectStakeholders`.

**Step 3: Apply migration**
```bash
npm run db:push
```

**Step 4: Type-check**
```bash
npm run type-check
```

**Step 5: Commit**
```bash
git add drizzle-pg/0041_phase3x_row_versions.sql src/lib/db/pg-schema.ts
git commit -m "feat(db): add row_version to notes, risks, variations, activities, milestones, stakeholders"
```

---

## Task 2 — Five new read tools

**Files to create:**
- `src/lib/agents/tools/list-notes.ts`
- `src/lib/agents/tools/list-risks.ts`
- `src/lib/agents/tools/list-variations.ts`
- `src/lib/agents/tools/list-stakeholders.ts`
- `src/lib/agents/tools/list-meetings.ts`

**Files to modify:**
- `src/lib/agents/tools/index.ts`

**Test file:** `src/lib/agents/__tests__/tools/list-notes.test.ts` (and similar for each)

### Step 1: Write failing tests for `list_notes`

```typescript
// src/lib/agents/__tests__/tools/list-notes.test.ts
import { listNotesTool } from '../../tools/list-notes';
import { mockCtx } from '../helpers';

describe('list_notes', () => {
  it('validate: accepts empty input', () => {
    expect(() => listNotesTool.validate({})).not.toThrow();
  });
  it('validate: rejects invalid limit', () => {
    expect(() => listNotesTool.validate({ limit: -1 })).toThrow('list_notes');
  });
  it('is not mutating', () => {
    expect(listNotesTool.mutating).toBe(false);
  });
});
```

Run: `npm test -- --testPathPattern="list-notes"` → expect FAIL (file not found).

### Step 2: Implement `list-notes.ts`

```typescript
// src/lib/agents/tools/list-notes.ts
import { db } from '@/lib/db';
import { notes } from '@/lib/db/pg-schema';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListNotesInput { limit?: number; }
interface ListNotesOutput {
  count: number;
  notes: Array<{
    id: string; title: string | null; content: string | null;
    isStarred: boolean | null; color: string | null; noteDate: string | null;
    updatedAt: string | null;
  }>;
}

const definition: AgentToolDefinition<ListNotesInput, ListNotesOutput> = {
  spec: {
    name: 'list_notes',
    description: 'List project notes. Returns title, content, star status, and date. Use this to read notes before proposing updates.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50,
          description: 'Max notes to return (default 20).' },
      },
    },
  },
  mutating: false,
  validate(input: unknown): ListNotesInput {
    if (!input || typeof input !== 'object') return {};
    const obj = input as Record<string, unknown>;
    if (obj.limit !== undefined) {
      if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit) || obj.limit < 1) {
        throw new Error('list_notes: limit must be a positive integer');
      }
    }
    return { limit: obj.limit as number | undefined };
  },
  async execute(ctx: ToolContext, input: ListNotesInput): Promise<ListNotesOutput> {
    await assertProjectOrg(ctx);
    const rows = await db
      .select({
        id: notes.id, title: notes.title, content: notes.content,
        isStarred: notes.isStarred, color: notes.color,
        noteDate: notes.noteDate, updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(and(eq(notes.projectId, ctx.projectId), isNull(notes.deletedAt)))
      .orderBy(desc(notes.updatedAt))
      .limit(input.limit ?? 20);
    return { count: rows.length, notes: rows };
  },
};

registerTool(definition);
export { definition as listNotesTool };
```

### Step 3: Implement remaining four read tools (same pattern)

**`list-risks.ts`**
- Input: `{ status?: string }` (optional filter by 'identified'|'mitigated'|'closed'|'accepted')
- Output: `{ count, risks: [{ id, title, description, likelihood, impact, status, mitigation, order }] }`
- Table: `risks`, filter `eq(risks.projectId, ctx.projectId)` + optional status filter
- Order by `risks.order`

**`list-variations.ts`**
- Input: `{ status?: string }` (optional filter)
- Output: `{ count, variations: [{ id, description, category, status, amountForecastCents, amountApprovedCents, dateSubmitted, dateApproved, requestedBy, approvedBy }] }`
- Table: `variations`, filter by `projectId` + `isNull(deletedAt)`

**`list-stakeholders.ts`**
- Input: `{ group?: string }` (optional: 'client'|'authority'|'consultant'|'contractor')
- Output: `{ count, stakeholders: [{ id, name, organization, role, stakeholderGroup, disciplineOrTrade, isEnabled, notes, briefServices, scopeWorks }] }`
- Table: `projectStakeholders`, filter by `projectId` + `isNull(deletedAt)`

**`list-meetings.ts`**
- Input: `{ limit?: number }`
- Output: `{ count, meetings: [{ id, title, meetingDate, agendaType, sections: [{ sectionLabel, content, sortOrder }] }] }`
- Join `meetings` + `meetingSections` using `meetingSections.meetingId = meetings.id`
- Filter by `meetings.projectId` + `isNull(meetings.deletedAt)`
- Order by `desc(meetings.meetingDate)`, limit 10

### Step 4: Register all 5 in `tools/index.ts`

```typescript
import './list-notes';
import './list-risks';
import './list-variations';
import './list-stakeholders';
import './list-meetings';
```

### Step 5: Run tests
```bash
npm test -- --testPathPattern="list-"
```
Expected: all pass.

### Step 6: Commit
```bash
git add src/lib/agents/tools/list-*.ts src/lib/agents/tools/index.ts src/lib/agents/__tests__/tools/list-*.test.ts
git commit -m "feat(agents): add list_notes, list_risks, list_variations, list_stakeholders, list_meetings read tools"
```

---

## Task 3 — Write tools: Notes (`create_note`, `update_note`)

**Files to create:**
- `src/lib/agents/tools/create-note.ts`
- `src/lib/agents/tools/update-note.ts`

**Files to modify:**
- `src/lib/agents/applicators.ts`
- `src/lib/agents/tools/index.ts`

**Test files:**
- `src/lib/agents/__tests__/tools/create-note.test.ts`
- `src/lib/agents/__tests__/tools/update-note.test.ts`

### Step 1: Write failing tests

```typescript
// src/lib/agents/__tests__/tools/update-note.test.ts
import { updateNoteTool } from '../../tools/update-note';

describe('update_note', () => {
  it('validate: rejects id-only (no changes)', () => {
    expect(() => updateNoteTool.validate({ id: 'note-1' }))
      .toThrow('at least one field to change');
  });
  it('validate: accepts valid update', () => {
    expect(() => updateNoteTool.validate({ id: 'note-1', title: 'New title' }))
      .not.toThrow();
  });
  it('is mutating', () => {
    expect(updateNoteTool.mutating).toBe(true);
  });
});
```

### Step 2: Implement `update-note.ts`

Follow `update-cost-line.ts` exactly. Key details:

```typescript
// src/lib/agents/tools/update-note.ts
// Editable fields: title, content, isStarred (boolean), color, noteDate (ISO string)
// Required: id
// validate: reject if only id provided (no actual changes)
// execute:
//   1. assertProjectOrg(ctx)
//   2. Fetch current note row (id + projectId + isNull(deletedAt))
//   3. Build changes[] diff array (before/after for each changed field)
//   4. Call proposeApproval({ ctx, toolName: 'update_note', toolUseId: input._toolUseId ?? '',
//        input, proposedDiff: { entity: 'note', entityId: row.id, summary, changes },
//        expectedRowVersion: row.rowVersion ?? 1 })
//   5. Return proposal.toolResult
```

### Step 3: Implement `create-note.ts`

Follow `create-cost-line.ts`. Key details:

```typescript
// src/lib/agents/tools/create-note.ts
// Required: title (non-empty string)
// Optional: content, isStarred (boolean), color, noteDate (ISO string)
// execute:
//   1. assertProjectOrg(ctx)
//   2. proposeApproval({ entity: 'note', no expectedRowVersion needed for creates })
//   3. Return proposal.toolResult
// The applicator does the INSERT with rowVersion: 1
```

### Step 4: Add applicators

In `src/lib/agents/applicators.ts`, add two new cases to the dispatch switch:

```typescript
case 'update_note':
  return applyUpdateNote(args.input, args.expectedRowVersion, args.ctx);
case 'create_note':
  return applyCreateNote(args.input, args.ctx);
```

Implement `applyUpdateNote`:
```typescript
async function applyUpdateNote(rawInput, expectedRowVersion, ctx): Promise<ApplyResult> {
  const input = rawInput as { id: string; title?: string; content?: string;
    isStarred?: boolean; color?: string; noteDate?: string; };
  const conditions = [
    eq(notes.id, input.id),
    eq(notes.projectId, ctx.projectId),
    isNull(notes.deletedAt),
  ];
  if (expectedRowVersion !== null) {
    conditions.push(eq(notes.rowVersion, expectedRowVersion));
  }
  const patch: Record<string, unknown> = { updatedAt: new Date(),
    rowVersion: sql`${notes.rowVersion} + 1` };
  if (input.title !== undefined) patch.title = input.title;
  if (input.content !== undefined) patch.content = input.content;
  if (input.isStarred !== undefined) patch.isStarred = input.isStarred;
  if (input.color !== undefined) patch.color = input.color;
  if (input.noteDate !== undefined) patch.noteDate = input.noteDate;

  const updated = await db.update(notes).set(patch).where(and(...conditions)).returning();
  if (updated.length === 1) return { kind: 'applied', output: updated[0] };
  const [exists] = await db.select({ id: notes.id }).from(notes)
    .where(and(eq(notes.id, input.id), isNull(notes.deletedAt))).limit(1);
  return exists
    ? { kind: 'conflict', reason: 'Note was edited by another user — re-read and retry.' }
    : { kind: 'gone', reason: 'Note not found or deleted.' };
}
```

Implement `applyCreateNote`:
```typescript
async function applyCreateNote(rawInput, ctx): Promise<ApplyResult> {
  const input = rawInput as { title: string; content?: string;
    isStarred?: boolean; color?: string; noteDate?: string; };
  const id = crypto.randomUUID();
  const inserted = await db.insert(notes).values({
    id,
    projectId: ctx.projectId,
    title: input.title,
    content: input.content ?? null,
    isStarred: input.isStarred ?? false,
    color: input.color ?? null,
    noteDate: input.noteDate ?? null,
    rowVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return { kind: 'applied', output: inserted[0] };
}
```

### Step 5: Register in `index.ts`
```typescript
import './create-note';
import './update-note';
```

### Step 6: Run tests
```bash
npm test -- --testPathPattern="note"
```

### Step 7: Commit
```bash
git commit -m "feat(agents): add create_note, update_note write tools with approval gate"
```

---

## Task 4 — Write tools: Risks (`create_risk`, `update_risk`)

**Files to create:**
- `src/lib/agents/tools/create-risk.ts`
- `src/lib/agents/tools/update-risk.ts`

**Files to modify:** `src/lib/agents/applicators.ts`, `src/lib/agents/tools/index.ts`

### Risk field reference

| Field | Type | Allowed values |
|-------|------|---------------|
| `title` | string | required for create |
| `description` | string | free text |
| `likelihood` | string | `'low'` \| `'medium'` \| `'high'` \| `'very_high'` |
| `impact` | string | `'low'` \| `'medium'` \| `'high'` \| `'very_high'` |
| `mitigation` | string | free text |
| `status` | string | `'identified'` \| `'mitigated'` \| `'closed'` \| `'accepted'` |

### Step 1: Write failing tests

```typescript
// src/lib/agents/__tests__/tools/update-risk.test.ts
describe('update_risk', () => {
  it('rejects id-only', () => {
    expect(() => updateRiskTool.validate({ id: 'r-1' }))
      .toThrow('at least one field');
  });
  it('rejects invalid likelihood', () => {
    expect(() => updateRiskTool.validate({ id: 'r-1', likelihood: 'extreme' }))
      .toThrow('likelihood');
  });
  it('accepts valid update', () => {
    expect(() => updateRiskTool.validate({ id: 'r-1', status: 'mitigated' }))
      .not.toThrow();
  });
});
```

### Step 2: Implement `update-risk.ts` and `create-risk.ts`

Same pattern as Task 3 (notes). For `update_risk`:
- Validate enum values for `likelihood`, `impact`, `status`
- Table: `risks`, optimistic lock on `rowVersion`

For `create_risk`:
- Required: `title`
- Optional: `description`, `likelihood`, `impact`, `mitigation`, `status` (default `'identified'`)
- Insert with `rowVersion: 1`, set `order` to `(SELECT COALESCE(MAX(order), 0) + 1 FROM risks WHERE project_id = ?)`

### Step 3: Add to applicators and index.ts

```typescript
case 'update_risk':
  return applyUpdateRisk(args.input, args.expectedRowVersion, args.ctx);
case 'create_risk':
  return applyCreateRisk(args.input, args.ctx);
```

### Step 4: Run tests, commit
```bash
npm test -- --testPathPattern="risk"
git commit -m "feat(agents): add create_risk, update_risk write tools"
```

---

## Task 5 — Write tools: Variations (`create_variation`, `update_variation`)

**Files to create:**
- `src/lib/agents/tools/create-variation.ts`
- `src/lib/agents/tools/update-variation.ts`

**Files to modify:** `src/lib/agents/applicators.ts`, `src/lib/agents/tools/index.ts`

### Variation field reference

| Field | Type | Notes |
|-------|------|-------|
| `description` | string | required for create |
| `category` | string | free text |
| `status` | string | `'Forecast'` \| `'Submitted'` \| `'Approved'` \| `'Rejected'` |
| `amountForecastCents` | integer ≥ 0 | dollars × 100 |
| `amountApprovedCents` | integer ≥ 0 | dollars × 100 |
| `dateSubmitted` | string | ISO date `'YYYY-MM-DD'` |
| `dateApproved` | string | ISO date `'YYYY-MM-DD'` |
| `requestedBy` | string | |
| `approvedBy` | string | |

### Step 1: Write failing tests

```typescript
describe('update_variation', () => {
  it('rejects id-only', () => {
    expect(() => updateVariationTool.validate({ id: 'v-1' }))
      .toThrow('at least one field');
  });
  it('rejects negative amountForecastCents', () => {
    expect(() => updateVariationTool.validate({ id: 'v-1', amountForecastCents: -100 }))
      .toThrow('amountForecastCents');
  });
  it('rejects invalid status', () => {
    expect(() => updateVariationTool.validate({ id: 'v-1', status: 'Pending' }))
      .toThrow('status');
  });
});
```

### Step 2: Implement tools

Same pattern as previous tasks. Money fields use the `minimum: 0` JSON schema constraint and validate as non-negative integers.

In the tool description for the JSON schema, document cents:
```
"amountForecastCents": { "type": "integer", "minimum": 0,
  "description": "Forecast amount in cents (e.g., 5000000 = $50,000)." }
```

### Step 3: Add to applicators and index.ts

```typescript
case 'update_variation':
  return applyUpdateVariation(args.input, args.expectedRowVersion, args.ctx);
case 'create_variation':
  return applyCreateVariation(args.input, args.ctx);
```

### Step 4: Run tests, commit
```bash
npm test -- --testPathPattern="variation"
git commit -m "feat(agents): add create_variation, update_variation write tools"
```

---

## Task 6 — Write tools: Program (`update_program_activity`, `create_program_milestone`, `update_program_milestone`)

**Files to create:**
- `src/lib/agents/tools/update-program-activity.ts`
- `src/lib/agents/tools/create-program-milestone.ts`
- `src/lib/agents/tools/update-program-milestone.ts`

**Files to modify:** `src/lib/agents/applicators.ts`, `src/lib/agents/tools/index.ts`

### Field reference

**`update_program_activity`:**
- `id` (required), `name` (string), `startDate` (ISO `'YYYY-MM-DD'`), `endDate` (ISO `'YYYY-MM-DD'`)
- Validate: reject if `endDate < startDate` when both provided

**`create_program_milestone`:**
- `name` (required), `date` (required ISO string), `activityId` (required — parent activity id)
- Applicator: verify `activityId` belongs to `ctx.projectId` before insert

**`update_program_milestone`:**
- `id` (required), `name` (string), `date` (ISO string)

### Date validation helper (put in `_context.ts` or inline):
```typescript
function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
```

### Step 1: Write failing tests

```typescript
describe('update_program_activity', () => {
  it('rejects end before start', () => {
    expect(() => updateProgramActivityTool.validate({
      id: 'a-1', startDate: '2026-06-01', endDate: '2026-05-01'
    })).toThrow('endDate');
  });
  it('rejects invalid date format', () => {
    expect(() => updateProgramActivityTool.validate({ id: 'a-1', startDate: '01/06/2026' }))
      .toThrow('startDate');
  });
});
```

### Step 2: Implement all three tools

Follow established pattern. `create_program_milestone` applicator must verify the parent `activityId` is in this project before inserting.

### Step 3: Add to applicators and index.ts

```typescript
case 'update_program_activity':
  return applyUpdateProgramActivity(args.input, args.expectedRowVersion, args.ctx);
case 'create_program_milestone':
  return applyCreateProgramMilestone(args.input, args.ctx);
case 'update_program_milestone':
  return applyUpdateProgramMilestone(args.input, args.expectedRowVersion, args.ctx);
```

### Step 4: Run tests, commit
```bash
npm test -- --testPathPattern="program"
git commit -m "feat(agents): add program write tools (update_activity, create/update_milestone)"
```

---

## Task 7 — Write tool: Stakeholders (`update_stakeholder`)

**Files to create:**
- `src/lib/agents/tools/update-stakeholder.ts`

**Files to modify:** `src/lib/agents/applicators.ts`, `src/lib/agents/tools/index.ts`

### AI-writable fields only (NOT name/role/organization — those are user-managed identity)

| Field | Type |
|-------|------|
| `notes` | string |
| `briefServices` | string |
| `briefDeliverables` | string |
| `briefFee` | string |
| `briefProgram` | string |
| `scopeWorks` | string |
| `scopePrice` | string |
| `scopeProgram` | string |
| `isEnabled` | boolean |

### Step 1: Implement `update-stakeholder.ts`

The tool description should note: "Use this to update brief/scope text for consultants and contractors. Do not attempt to change name, role, or organisation — those are user-managed."

### Step 2: Add applicator

```typescript
case 'update_stakeholder':
  return applyUpdateStakeholder(args.input, args.expectedRowVersion, args.ctx);
```

### Step 3: Run tests, commit
```bash
npm test -- --testPathPattern="stakeholder"
git commit -m "feat(agents): add update_stakeholder write tool"
```

---

## Task 8 — Update Finance specialist

**Files:**
- Modify: `src/lib/agents/specialists/finance.ts`
- Modify: `docs/agents/Agent-Finance.md`

### Step 1: Update `allowedTools` array

```typescript
allowedTools: [
  'search_rag',
  'list_cost_lines',
  'update_cost_line',
  'create_cost_line',
  'record_invoice',
  // Phase 3X additions:
  'list_risks',
  'list_variations',
  'create_variation',
  'update_variation',
  'list_notes',
  'create_note',
],
```

### Step 2: Update `BASE_PROMPT` — add to the capabilities section

After the existing tool descriptions, add:

```
- list_risks — read the project risk register. Relevant for cost-related risks (budget overrun, contingency drawdown, market risk, scope risk).
- list_variations — read all variations with their forecast/approved amounts and status.
- create_variation — propose a new variation entry (always goes to approval gate). Required fields: description. Money fields in cents.
- update_variation — propose updating a variation's status, amounts, dates, or parties. Always show before/after amounts in dollars in your reply.
- list_notes — read project notes.
- create_note — propose recording a financial decision, assumption, or instruction as a project note.
```

### Step 3: Add entity awareness section to `BASE_PROMPT`

Add a new section **after** the capabilities section:

```
## Entity awareness
The following entities exist in this project database. Use list_* tools to read them before proposing changes:
- Cost lines (list_cost_lines) — budget and contract amounts by activity/section/stage
- Variations (list_variations) — scope changes with forecast and approved amounts
- Invoices — progress claims and supplier invoices (record_invoice to add)
- Risks (list_risks) — project risk register with likelihood/impact/mitigation
- Notes (list_notes) — project notes and decision records
- Uploaded documents (search_rag) — reports, specifications, drawings
- Program activities and milestones — accessible via Program specialist
- Stakeholders — accessible via Design specialist
```

### Step 4: Update `docs/agents/Agent-Finance.md`

Add the same tool list and entity awareness section to the markdown spec.

### Step 5: Run tests
```bash
npm test -- --testPathPattern="finance"
```

### Step 6: Commit
```bash
git commit -m "feat(agents): Finance — add variations/risks/notes tools + entity awareness prompt"
```

---

## Task 9 — Update Program specialist

**Files:**
- Modify: `src/lib/agents/specialists/program.ts`
- Modify: `docs/agents/Agent-Program.md`

### Update `allowedTools`

```typescript
allowedTools: [
  'list_program',
  'search_rag',
  // Phase 3X additions:
  'list_risks',
  'create_risk',
  'update_risk',
  'update_program_activity',
  'create_program_milestone',
  'update_program_milestone',
  'list_notes',
  'create_note',
  'list_meetings',
],
```

### Update `BASE_PROMPT` capabilities section

```
- list_risks — read programme-relevant risks (authority delays, design freeze delays, weather, subcontractor risk).
- create_risk — propose a new programme risk entry.
- update_risk — propose updating risk likelihood, impact, mitigation, or status after a mitigation action is taken.
- update_program_activity — propose updating a programme activity name or start/end dates. Dates must be YYYY-MM-DD.
- create_program_milestone — propose a new milestone attached to a parent activity.
- update_program_milestone — propose changing a milestone name or date.
- list_notes — read project notes relevant to programme decisions.
- create_note — propose recording a programme decision, assumption, or delay event as a note.
- list_meetings — read recent meeting records and decisions.
```

### Add entity awareness section (programme-domain version)

```
## Entity awareness
Entities accessible by the Program specialist:
- Programme activities (list_program, update_program_activity) — WBS hierarchy with start/end dates
- Programme milestones (list_program, create/update_program_milestone) — key dates on activities
- Risks (list_risks, create/update_risk) — schedule-impacting risks
- Notes (list_notes, create_note) — programme decisions and delay records
- Meetings (list_meetings) — meeting minutes and action items
- Uploaded documents (search_rag) — programme reports, delay assessments
```

### Update `docs/agents/Agent-Program.md`, run tests, commit
```bash
git commit -m "feat(agents): Program — add risk/activity/milestone/note/meeting tools + entity awareness"
```

---

## Task 10 — Update Design specialist

**Files:**
- Modify: `src/lib/agents/specialists/design.ts`
- Modify: `docs/agents/Agent-Design.md`

### Update `allowedTools`

```typescript
allowedTools: [
  'search_rag',
  // Phase 3X additions:
  'list_stakeholders',
  'update_stakeholder',
  'list_notes',
  'create_note',
  'update_note',
  'list_meetings',
],
```

### Update `BASE_PROMPT` capabilities section

```
- list_stakeholders — read the project consultant and client stakeholder register, including brief/scope text.
- update_stakeholder — propose updating a stakeholder's brief services, deliverables, fee, or programme obligations (not name/role/organisation).
- list_notes — read project notes, design decisions, and action items.
- create_note — propose creating a design decision note, RFI log entry, or action item.
- update_note — propose updating an existing note's content, title, or date.
- list_meetings — read design team meeting minutes and action items.
```

### Add entity awareness section

```
## Entity awareness
Entities accessible by the Design specialist:
- Stakeholders (list_stakeholders, update_stakeholder) — consultants, contractors, authorities, client contacts with brief/scope text
- Notes (list_notes, create/update_note) — design decisions, assumptions, action items
- Meetings (list_meetings) — design team and authority meetings
- Uploaded documents (search_rag) — drawings, reports, specifications, DA documents
- Cost plan — accessible via Finance specialist
- Programme — accessible via Program specialist
```

### Update `docs/agents/Agent-Design.md`, run tests, commit
```bash
git commit -m "feat(agents): Design — add stakeholder/note/meeting tools + entity awareness"
```

---

## Task 11 — Update Orchestrator routing rules

**Files:**
- Modify: `src/lib/agents/specialists/orchestrator.ts`

### Add new domain routing rules to `BASE_PROMPT`

In the routing rules section, add:

```
Additional routing rules (Phase 3X entities):
- Risks → Finance for budget/cost risks; Program for schedule/delay risks.
  If unclear, route to both with "from a [cost / schedule] risk perspective".
- Variations → always Finance.
- Notes → whichever domain the note topic belongs to (cost note → Finance;
  programme note → Program; design decision → Design; general → Design).
- Programme activities/milestones → always Program.
- Stakeholder briefs/consultant scope text → always Design.
- Meetings → Design for design-team meetings; Program for progress/site meetings.
  When unclear, prefer Design.
```

### Commit
```bash
git commit -m "feat(agents): Orchestrator — add Phase 3X routing rules for new entity domains"
```

---

## Task 12 — Verification

### Step 1: Full test suite
```bash
npm test -- --testPathPattern="src/lib/agents"
```
Expected: all existing 67 tests + new tests pass.

### Step 2: Type check
```bash
npm run type-check
```

### Step 3: Build check
```bash
npm run build
```

### Step 4: Manual smoke tests (in the running app)

| Test | Expected |
|------|----------|
| Ask Finance: "list the current variations" | Returns list with amounts in dollars |
| Ask Finance: "create a variation for provisional sum — structural steel, $75,000 forecast" | Shows approval card |
| Ask Finance: "create a risk — contractor insolvency, high likelihood, high impact" | Shows approval card |
| Ask Program: "update the slab pour milestone to 20 June 2026" | Shows approval card with date diff |
| Ask Program: "the concrete pour is delayed — update activity 'Structure' end date to 2026-07-15" | Shows approval card |
| Ask Design: "list the consultants and their brief services" | Returns stakeholder list |
| Ask Design: "add a note — architect confirmed facade system, awaiting thermal modelling sign-off" | Shows approval card |
| Approve any card | DB writes, cross-tab SSE refresh fires |
| Reject any card | No DB change |

### Step 5: Final commit
```bash
git commit -m "test(agents): phase 3X broad write tools — end-to-end verified"
```

---

## Task 13 — Update Phase 5 agent spec docs (Correspondence, Delivery, Procurement, Feasibility)

> No TypeScript code in this task. Docs only. Phase 5 still builds the specialist TS files.

**Files:**
- Modify: `docs/agents/Agent-Correspondence.md`
- Modify: `docs/agents/Agent-Delivery.md`
- Modify: `docs/agents/Agent-Procurement.md`
- Modify: `docs/agents/Agent-Feasibility.md`

For each of the four documents, add two new sections:
1. **"Phase 3X tools available"** — tools this agent will be granted when its TS specialist is built in Phase 5.
2. **"Tools still needed (Phase 5)"** — tools not yet built, flagged for Phase 5 implementation.

---

### Correspondence (`docs/agents/Agent-Correspondence.md`)

**Phase 3X tools available:**

| Tool | Use |
|------|-----|
| `list_notes` | Read project notes and decision records |
| `create_note` | Record correspondence decisions and instructions as notes |
| `list_stakeholders` | Look up contact details and stakeholder roles for addressing correspondence |
| `list_meetings` | Review meeting minutes for context before drafting correspondence |
| `search_rag` | Search uploaded documents for reference material |

**Tools still needed (Phase 5):**

| Tool | Entity | Notes |
|------|--------|-------|
| `list_correspondence` | Correspondence register | Read outbound/inbound correspondence log |
| `create_correspondence_entry` | Correspondence register | Propose adding a new correspondence entry |
| `create_rfi` | RFI register | Propose drafting a new RFI form |
| `update_rfi` | RFI register | Propose marking an RFI as responded |
| `list_transmittals` | Transmittals | Read existing transmittals (transmittals table exists) |

---

### Delivery (`docs/agents/Agent-Delivery.md`)

**Phase 3X tools available:**

| Tool | Use |
|------|-----|
| `list_variations` | Read the full variation register |
| `create_variation` | Propose a new variation entry |
| `update_variation` | Propose updating variation status, amounts, or approval details |
| `list_risks` | Read the project risk register |
| `create_risk` | Propose a new delivery-phase risk |
| `update_risk` | Propose updating risk status after mitigation |
| `list_notes` | Read delivery decisions and site notes |
| `create_note` | Propose recording a site instruction, defect note, or delivery decision |
| `update_program_activity` | Propose updating programme activity dates (e.g., after a delay event) |
| `create_program_milestone` | Propose new programme milestone (e.g., PC, DLP end) |
| `update_program_milestone` | Propose updating a milestone date |
| `list_stakeholders` | Read contractor and subcontractor contact details |
| `search_rag` | Search uploaded documents (specifications, drawings, contract) |

**Tools still needed (Phase 5):**

| Tool | Entity | Notes |
|------|--------|-------|
| `create_defect` | Defects register | New table required (Phase 5 schema task) |
| `update_defect` | Defects register | Mark defect as rectified or disputed |
| `list_defects` | Defects register | Read open/closed defects |
| `create_eot_claim` | EOT claims register | New table required (Phase 5 schema task) |
| `list_progress_claims` | Invoices table (repurposed) | Use existing invoices table |

---

### Procurement (`docs/agents/Agent-Procurement.md`)

**Phase 3X tools available:**

| Tool | Use |
|------|-----|
| `list_stakeholders` | Read consultant and contractor register for tender list |
| `update_stakeholder` | Propose updating contractor scope of works or price text |
| `list_variations` | Read variation register during TRR/contract administration |
| `list_notes` | Read procurement decisions and briefing notes |
| `create_note` | Propose recording a tender decision, clarification, or procurement assumption |
| `search_rag` | Search uploaded specifications, reports, and tender documents |

**Tools still needed (Phase 5):**

| Tool | Entity | Notes |
|------|--------|-------|
| `list_addenda` | Addenda table (already exists) | Read issued addenda for a tender |
| `create_addendum` | Addenda table (already exists) | Propose a new addendum |
| `list_rfts` | RFTs table (already exists) | Read RFT documents |
| `create_tender_evaluation_entry` | Tender evaluation | New table required (Phase 5) |

---

### Feasibility (`docs/agents/Agent-Feasibility.md`)

**Phase 3X tools available:**

| Tool | Use |
|------|-----|
| `list_risks` | Read site and planning risks |
| `create_risk` | Propose a new feasibility/planning risk entry |
| `update_risk` | Propose updating risk status after due diligence |
| `list_stakeholders` | Read authority and stakeholder contacts |
| `update_stakeholder` | Propose updating stakeholder engagement notes or brief |
| `list_notes` | Read site assessment notes and due diligence findings |
| `create_note` | Propose recording a site constraint, planning issue, or due diligence finding |
| `search_rag` | Search uploaded reports (geotech, survey, planning certificates) |

**Tools still needed (Phase 5):**

| Tool | Entity | Notes |
|------|--------|-------|
| `list_cost_lines` | Cost plan | Read feasibility cost estimate lines (already exists — grant at Phase 5) |
| `create_cost_line` | Cost plan | Propose a feasibility-stage cost estimate entry (already exists — grant at Phase 5) |

> Note: Feasibility is the lightest Phase 5 build — most tools it needs already exist. It mostly needs `list_cost_lines` and `create_cost_line` granted from Finance's existing tool set, plus `search_rag`.

---

### Step: Commit docs updates
```bash
git add docs/agents/Agent-Correspondence.md docs/agents/Agent-Delivery.md \
        docs/agents/Agent-Procurement.md docs/agents/Agent-Feasibility.md
git commit -m "docs(agents): add Phase 3X tool lists and Phase 5 gaps for Correspondence/Delivery/Procurement/Feasibility"
```

---

## Verification checklist

- [ ] DB migration applied — `row_version` column on all 6 tables
- [ ] 5 read tools registered and tested
- [ ] 10 write tools registered, tested, and applicators wired
- [ ] Finance `allowedTools` updated + `BASE_PROMPT` documents all 11 tools
- [ ] Program `allowedTools` updated + `BASE_PROMPT` documents all 10 tools
- [ ] Design `allowedTools` updated + `BASE_PROMPT` documents all 6 tools
- [ ] Orchestrator routing rules cover all new domains
- [ ] `docs/agents/Agent-Finance.md`, `Agent-Program.md`, `Agent-Design.md` in sync with TS
- [ ] All agent tests pass
- [ ] Type check clean
- [ ] Build clean
- [ ] Manual smoke tests passed (read, propose, approve, reject)
- [ ] `docs/agents/Agent-Correspondence.md` has Phase 3X tool table + Phase 5 gap list
- [ ] `docs/agents/Agent-Delivery.md` has Phase 3X tool table + Phase 5 gap list
- [ ] `docs/agents/Agent-Procurement.md` has Phase 3X tool table + Phase 5 gap list
- [ ] `docs/agents/Agent-Feasibility.md` has Phase 3X tool table + Phase 5 gap list
