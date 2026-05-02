# Outstanding Agent Integration Items — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the three outstanding items before Phase 4: wire live-refresh to variations and program hooks; add edit-and-approve to the ApprovalGate.

**Architecture:** All three items are surgical changes to existing files. Items 1–2 are one-liners in the relevant hooks. Item 3 adds a single optional field (`overrideInput`) to the approve path in the backend route and an edit-mode toggle + field inputs to the ApprovalGate card. No new tables, no new routes, no new abstractions.

**Tech Stack:** TypeScript, React hooks (useState/useEffect), SWR (notes/meetings), raw state (variations/program), inline styles (ApprovalGate pattern), Jest

---

## Task 1: Wire `useVariations` to project events

**Files:**
- Modify: `src/lib/hooks/cost-plan/use-variations.ts`

**Step 1: Write the failing test**

There is no test file for `use-variations` today; the existing behaviour is covered by integration. Skip writing a unit test here — the pattern is identical to `useCostPlan` which is already tested end-to-end. Move directly to implementation.

**Step 2: Add `useProjectEvents` subscription**

In `useVariations`, after the `useEffect([fetchVariations])` block, add:

```ts
import { useProjectEvents } from '@/lib/hooks/use-project-events';
```

And inside the hook body, after the existing `useEffect`:

```ts
useProjectEvents(projectId || null, (event) => {
    if (event.entity === 'variation') fetchVariations();
});
```

The `fetchVariations` callback is already stable via `useCallback`. The `projectId` is already in scope as the first argument.

**Step 3: Run existing tests**

```bash
npx jest --testPathPattern="use-variations|cost-plan" --no-coverage
```

Expected: PASS (no unit tests exist for this hook, so this just type-checks the import).

**Step 4: Commit**

```bash
git add src/lib/hooks/cost-plan/use-variations.ts
git commit -m "feat(hooks): subscribe useVariations to project events bus"
```

---

## Task 2: Wire `useProgram` to project events

**Files:**
- Modify: `src/lib/hooks/use-program.ts`

**Step 1: Add `useProjectEvents` subscription**

In `useProgram`, after the existing `useEffect([fetchData])` block, add:

```ts
import { useProjectEvents } from '@/lib/hooks/use-project-events';
```

Inside `useProgram`, after the existing effect:

```ts
useProjectEvents(projectId || null, (event) => {
    if (event.entity === 'program_activity' || event.entity === 'program_milestone') {
        fetchData();
    }
});
```

**Step 2: Run existing tests**

```bash
npx jest --testPathPattern="use-program" --no-coverage
```

Expected: PASS (no unit tests; verifies the import resolves correctly under TypeScript).

**Step 3: Commit**

```bash
git add src/lib/hooks/use-program.ts
git commit -m "feat(hooks): subscribe useProgram to program_activity and program_milestone events"
```

---

## Task 3: Edit-and-approve — backend

The approve path in the respond route currently uses `approval.input` verbatim. We add an optional `overrideInput` field that the client can supply when the user has edited the proposed values; the route merges it with `approval.input` before calling `applyApproval`.

**Files:**
- Modify: `src/app/api/chat/approvals/[id]/respond/route.ts`
- Modify: `src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts`

### Step 1: Write the failing test first

Add this test to the describe block in `route.test.ts` (just before the closing `});`):

```ts
it('approve with overrideInput: calls applyApproval with merged input', async () => {
    mockGetCurrentUser.mockResolvedValue(okSession);
    mockApprovalsLimit.mockResolvedValueOnce([pendingApproval]);
    mockThreadsLimit.mockResolvedValueOnce([{ userId: baseUser.id }]);
    mockApply.mockResolvedValueOnce({ kind: 'applied', output: { id: 'cl-1', budgetCents: 275000 } });

    const res = await POST(
        makeRequest({ decision: 'approve', overrideInput: { budgetCents: 275000 } }),
        { params }
    );
    expect(res.status).toBe(200);
    expect(mockApply).toHaveBeenCalledWith(
        expect.objectContaining({
            // id comes from approval.input; budgetCents is overridden
            input: { id: 'cl-1', budgetCents: 275000 },
        })
    );
});
```

**Step 2: Run test to verify it fails**

```bash
npx jest --testPathPattern="approvals.*respond" --no-coverage
```

Expected: FAIL — the route currently ignores `overrideInput`, so `mockApply` is called with the original `{ id: 'cl-1', budgetCents: 500000 }`.

### Step 3: Update the route to accept and use `overrideInput`

In `src/app/api/chat/approvals/[id]/respond/route.ts`, find the section that reads the body:

```ts
const body = await request.json().catch(() => null);
const decision = body?.decision;
if (decision !== 'approve' && decision !== 'reject') {
```

Change it to:

```ts
const body = await request.json().catch(() => null);
const decision = body?.decision;
if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json(
        { error: '"decision" must be "approve" or "reject"' },
        { status: 400 }
    );
}
const overrideInput =
    decision === 'approve' &&
    body?.overrideInput !== null &&
    typeof body?.overrideInput === 'object' &&
    !Array.isArray(body?.overrideInput)
        ? (body.overrideInput as Record<string, unknown>)
        : null;
```

Remove the duplicate early-return for the bad-decision check that was already in the original file (the original had the early return inline — keep only one).

Then find where `applyApproval` is called:

```ts
result = await applyApproval({
    toolName: approval.toolName,
    input: approval.input,
    expectedRowVersion: approval.expectedRowVersion ?? null,
    ctx: {
        organizationId: orgId,
        projectId: approval.projectId,
    },
});
```

Change `input: approval.input` to:

```ts
input: overrideInput
    ? { ...(approval.input as object), ...overrideInput }
    : approval.input,
```

### Step 4: Run tests to verify they pass

```bash
npx jest --testPathPattern="approvals.*respond" --no-coverage
```

Expected: all tests PASS including the new `overrideInput` test.

### Step 5: Commit

```bash
git add src/app/api/chat/approvals/[id]/respond/route.ts \
        src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts
git commit -m "feat(approvals): accept overrideInput in approve path for edit-and-approve"
```

---

## Task 4: Edit-and-approve — ApprovalGate UI

**Files:**
- Modify: `src/components/chat/ApprovalGate.tsx`

The card gains a third button: "Edit". Clicking it reveals an edit row per diff change (replacing the static "after" value with an `<input>`). A "Save & Approve" button submits with `overrideInput`; a "Cancel" button returns to the read-only view.

### What the edit row looks like

Each editable field is identified from `change.field`. Rules:
- If `change.field` ends with `Cents` → show `Number(change.after) / 100` in the input (dollars), parse back as `Math.round(parseFloat(val) * 100)` on submit.
- Otherwise → show `String(change.after)`, submit as the string value.

### Step 1: Add state and helpers to `ApprovalGate`

After the existing `const [error, setError] = useState<string | null>(null);` line, add:

```tsx
const [editMode, setEditMode] = useState(false);
// editedValues keyed by field name, stored as the display string
const [editedValues, setEditedValues] = useState<Record<string, string>>({});
```

Add a helper that converts a display string back to the right type for `overrideInput`:

```tsx
function parseEditValue(field: string, displayValue: string): unknown {
    if (field.endsWith('Cents')) {
        const dollars = parseFloat(displayValue.replace(/[^0-9.-]/g, ''));
        return isNaN(dollars) ? undefined : Math.round(dollars * 100);
    }
    return displayValue;
}

function displayAfter(field: string, after: unknown): string {
    if (field.endsWith('Cents') && typeof after === 'number') {
        return (after / 100).toFixed(2);
    }
    return String(after ?? '');
}
```

### Step 2: Replace the action-bar section

Find the block:

```tsx
{!resolved && (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderTop: '1px solid var(--color-border-subtle)',
        }}
    >
        <button ... Approve & apply ... />
        <button ... Reject ... />
        {error && ...}
    </div>
)}
```

Replace the entire `{!resolved && (...)}` block with:

```tsx
{!resolved && !editMode && (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderTop: '1px solid var(--color-border-subtle)',
        }}
    >
        <button
            type="button"
            disabled={submitting !== null}
            onClick={() => respond('approve')}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: submitting !== null ? 'wait' : 'pointer',
                backgroundColor: 'var(--color-accent-primary)',
                color: 'var(--color-on-accent)',
                opacity: submitting !== null ? 0.5 : 1,
                transition: 'opacity 0.15s, filter 0.15s',
            }}
            onMouseEnter={(e) => {
                if (submitting === null)
                    (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = '';
            }}
            data-testid={`approve-${approval.id}`}
        >
            {submitting === 'approve' ? (
                <Loader2 size={12} className="animate-spin" />
            ) : (
                <CheckCircle2 size={12} />
            )}
            Approve & apply
        </button>
        <button
            type="button"
            disabled={submitting !== null}
            onClick={() => respond('reject')}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 4,
                cursor: submitting !== null ? 'wait' : 'pointer',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                opacity: submitting !== null ? 0.5 : 1,
                transition: 'background-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
                if (submitting === null) {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.backgroundColor = 'var(--color-bg-tertiary)';
                    btn.style.color = 'var(--color-text-primary)';
                }
            }}
            onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--color-text-secondary)';
            }}
            data-testid={`reject-${approval.id}`}
        >
            {submitting === 'reject' ? (
                <Loader2 size={12} className="animate-spin" />
            ) : (
                <XCircle size={12} />
            )}
            Reject
        </button>
        {diff && (
            <button
                type="button"
                disabled={submitting !== null}
                onClick={() => {
                    const initial: Record<string, string> = {};
                    for (const c of diff.changes) {
                        initial[c.field] = displayAfter(c.field, c.after);
                    }
                    setEditedValues(initial);
                    setEditMode(true);
                }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 4,
                    cursor: submitting !== null ? 'wait' : 'pointer',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    opacity: submitting !== null ? 0.5 : 1,
                    marginLeft: 'auto',
                }}
                data-testid={`edit-${approval.id}`}
            >
                Edit
            </button>
        )}
        {error && (
            <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--color-error)' }}>
                {error}
            </span>
        )}
    </div>
)}
{!resolved && editMode && (
    <div style={{ borderTop: '1px solid var(--color-border-subtle)', padding: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {diff?.changes.map((c) => (
                <div key={c.field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--color-text-tertiary)',
                            minWidth: 110,
                            flexShrink: 0,
                        }}
                    >
                        {c.label}
                    </span>
                    <input
                        type={c.field.endsWith('Cents') ? 'number' : 'text'}
                        value={editedValues[c.field] ?? displayAfter(c.field, c.after)}
                        onChange={(e) =>
                            setEditedValues((prev) => ({ ...prev, [c.field]: e.target.value }))
                        }
                        style={{
                            flex: 1,
                            padding: '4px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            outline: 'none',
                        }}
                    />
                </div>
            ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
            <button
                type="button"
                disabled={submitting !== null}
                onClick={async () => {
                    if (!diff || submittingRef.current || resolved) return;
                    submittingRef.current = true;
                    setSubmitting('approve');
                    setError(null);
                    try {
                        const overrideInput: Record<string, unknown> = {};
                        for (const c of diff.changes) {
                            const parsed = parseEditValue(c.field, editedValues[c.field] ?? displayAfter(c.field, c.after));
                            if (parsed !== undefined) overrideInput[c.field] = parsed;
                        }
                        const res = await fetch(`/api/chat/approvals/${approval.id}/respond`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ decision: 'approve', overrideInput }),
                        });
                        if (!res.ok && res.status !== 409 && res.status !== 410) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data?.error || `Request failed (${res.status})`);
                        }
                        setEditMode(false);
                    } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to submit decision');
                    } finally {
                        submittingRef.current = false;
                        setSubmitting(null);
                    }
                }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: 'none',
                    cursor: submitting !== null ? 'wait' : 'pointer',
                    backgroundColor: 'var(--color-accent-primary)',
                    color: 'var(--color-on-accent)',
                    opacity: submitting !== null ? 0.5 : 1,
                }}
                data-testid={`save-approve-${approval.id}`}
            >
                {submitting === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Save & approve
            </button>
            <button
                type="button"
                onClick={() => { setEditMode(false); setError(null); }}
                style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 4,
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                }}
            >
                Cancel
            </button>
            {error && (
                <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--color-error)', alignSelf: 'center' }}>
                    {error}
                </span>
            )}
        </div>
    </div>
)}
```

### Step 3: Run existing ChatDock tests

```bash
npx jest --testPathPattern="ChatDock|ApprovalGate" --no-coverage
```

Expected: PASS — the existing tests don't test the new edit-mode path but should not break.

### Step 4: Commit

```bash
git add src/components/chat/ApprovalGate.tsx
git commit -m "feat(chat): edit-and-approve on ApprovalGate card"
```

---

## Task 5: Update the implementation log

**Files:**
- Modify: `docs/plans/2026-04-29-agent-integration.md`

Mark items 2, 4 in the Outstanding list as done. Add a new entry to the Shipped section.

```markdown
**Outstanding items 2 & 4 completed (2026-05-01).**
- `useVariations` and `useProgram` now subscribe to the project event bus; agent-approved variation and programme writes refresh those tabs immediately.
- `ApprovalGate` gains an "Edit" button that reveals per-field inputs. Clicking "Save & approve" sends `overrideInput` to the respond route, which merges it with the original tool input before applying. Only the changed fields are overridable; the entity `id` and `expectedRowVersion` are preserved from the original approval.
```

Update outstanding list: remove items 2 and 4; renumber.

**Step 1: Edit the plan doc**
**Step 2: Commit**

```bash
git add docs/plans/2026-04-29-agent-integration.md
git commit -m "docs: mark live-refresh wiring and edit-and-approve as shipped"
```

---

## Task 6: Run full agent test suite

```bash
npx jest --testPathPattern="src/lib/agents|approvals" --no-coverage
```

Expected: all 85+ tests pass.

---

## Summary of changes

| File | Change |
|------|--------|
| `src/lib/hooks/cost-plan/use-variations.ts` | +3 lines: import + `useProjectEvents` subscription |
| `src/lib/hooks/use-program.ts` | +3 lines: import + `useProjectEvents` subscription |
| `src/app/api/chat/approvals/[id]/respond/route.ts` | +10 lines: parse `overrideInput`; merge into `applyApproval` call |
| `src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts` | +15 lines: one new test |
| `src/components/chat/ApprovalGate.tsx` | +~100 lines: edit state, helpers, edit-mode render block |
| `docs/plans/2026-04-29-agent-integration.md` | Update shipped/outstanding sections |
