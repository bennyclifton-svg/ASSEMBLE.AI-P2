# Phase 3.5 — Cross-tab live updates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When the user approves an agent-proposed mutation in the chat, the cost-plan tab refreshes within ~1 second without a manual reload.

**Architecture:** Add a second SSE channel keyed by `projectId` (parallel to the existing thread-keyed chat channel). The `/api/chat/approvals/[id]/respond` handler emits an `entity_updated` event after each successful applicator write. The cost-plan tab subscribes to its project's event stream via a small `useProjectEvents` hook, and refetches when the relevant `entity_updated` event arrives.

**Tech Stack:** Next.js 16 App Router, Server-Sent Events, in-process `globalThis`-pinned Map (same pattern as [src/lib/agents/events.ts](src/lib/agents/events.ts)), React hook with `EventSource`.

**Scope (in):**
- New per-project SSE bus + route + client hook.
- Emit `entity_updated` from the approvals respond route on `applied` results.
- Wire `useCostPlan` to refetch on `cost_line` events.

**Scope (out):**
- Emitting `entity_updated` for non-agent writes (manual edits, imports). Keep the existing 10-second poll in [use-cost-plan.ts](src/lib/hooks/cost-plan/use-cost-plan.ts) as a fallback for those.
- Variations / milestones / transmittals refresh wiring — there are no applicators for those yet.
- Redis pub/sub. Same in-process Map limitation as the chat events bus; Phase 6 swaps both at once.

---

## Task 1: Create per-project SSE event bus

**Files:**
- Create: `src/lib/agents/project-events.ts`
- Test: `src/lib/agents/__tests__/project-events.test.ts`

**Why a separate module from `events.ts`?** The chat bus is keyed by `threadId` and encodes chat-specific event types. The project bus is keyed by `projectId` and emits entity-update events that any project-scoped tab might listen for. Keeping them separate avoids overloading event-type discriminators and keeps the chat bus's typed `ChatEvent` union narrow.

**Step 1: Write the failing test**

Create `src/lib/agents/__tests__/project-events.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import {
    emitProjectEvent,
    registerProjectConnection,
    unregisterProjectConnection,
    type ProjectEvent,
} from '../project-events';

function makeController() {
    const enqueued: Uint8Array[] = [];
    const controller = {
        enqueue: (chunk: Uint8Array) => enqueued.push(chunk),
    } as unknown as ReadableStreamDefaultController;
    return { controller, enqueued };
}

function decode(chunks: Uint8Array[]): string {
    return chunks.map((c) => new TextDecoder().decode(c)).join('');
}

describe('project-events bus', () => {
    test('emits to a registered controller for the matching project', () => {
        const { controller, enqueued } = makeController();
        registerProjectConnection('proj-1', controller);

        const event: ProjectEvent = {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'updated',
            id: 'cl-9',
        };
        emitProjectEvent('proj-1', event);

        expect(enqueued.length).toBe(1);
        const text = decode(enqueued);
        expect(text).toContain('event: entity_updated');
        expect(text).toContain('"id":"cl-9"');

        unregisterProjectConnection('proj-1', controller);
    });

    test('does not deliver events to a different project', () => {
        const { controller: a, enqueued: aOut } = makeController();
        const { controller: b, enqueued: bOut } = makeController();
        registerProjectConnection('proj-A', a);
        registerProjectConnection('proj-B', b);

        emitProjectEvent('proj-A', {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'updated',
            id: 'x',
        });

        expect(aOut.length).toBe(1);
        expect(bOut.length).toBe(0);

        unregisterProjectConnection('proj-A', a);
        unregisterProjectConnection('proj-B', b);
    });

    test('unregistering removes the controller from the set', () => {
        const { controller, enqueued } = makeController();
        registerProjectConnection('proj-X', controller);
        unregisterProjectConnection('proj-X', controller);

        emitProjectEvent('proj-X', {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'created',
            id: 'cl-1',
        });

        expect(enqueued.length).toBe(0);
    });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/agents/__tests__/project-events.test.ts -t "project-events bus"`
Expected: FAIL — `Cannot find module '../project-events'`.

**Step 3: Implement `src/lib/agents/project-events.ts`**

```typescript
/**
 * Per-project SSE event bus.
 *
 * Mirrors the chat event bus (./events.ts) but keyed by projectId so any
 * project-scoped UI surface (cost-plan tab, variations panel, etc.) can
 * subscribe and react to entity changes — most importantly, mutations
 * applied via the agent approval gate.
 *
 * In-process Map, pinned to globalThis for the same reason as the chat bus
 * (Next.js dev hot-reload would otherwise produce multiple Map instances and
 * silently drop events). Phase 6 swaps this for Redis pub/sub.
 */

declare global {
    var __assembleProjectConnections:
        | Map<string, Set<ReadableStreamDefaultController>>
        | undefined;
}

const connections: Map<string, Set<ReadableStreamDefaultController>> =
    globalThis.__assembleProjectConnections ??
    (globalThis.__assembleProjectConnections = new Map());
const encoder = new TextEncoder();

export type ProjectEntity = 'cost_line';
export type ProjectEntityOp = 'created' | 'updated' | 'deleted';

export type ProjectEvent = {
    type: 'entity_updated';
    entity: ProjectEntity;
    op: ProjectEntityOp;
    id: string;
};

export function registerProjectConnection(
    projectId: string,
    controller: ReadableStreamDefaultController
): void {
    if (!connections.has(projectId)) connections.set(projectId, new Set());
    connections.get(projectId)!.add(controller);
}

export function unregisterProjectConnection(
    projectId: string,
    controller: ReadableStreamDefaultController
): void {
    const set = connections.get(projectId);
    if (!set) return;
    set.delete(controller);
    if (set.size === 0) connections.delete(projectId);
}

export function emitProjectEvent(projectId: string, event: ProjectEvent): void {
    const set = connections.get(projectId);
    if (!set) return;
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    const bytes = encoder.encode(message);
    for (const controller of set) {
        try {
            controller.enqueue(bytes);
        } catch {
            // controller closed; cleanup happens via the cancel() callback
        }
    }
}
```

**Step 4: Run the test to verify it passes**

Run: `npx jest src/lib/agents/__tests__/project-events.test.ts -t "project-events bus"`
Expected: PASS, 3 tests.

**Step 5: Commit**

```bash
git add src/lib/agents/project-events.ts src/lib/agents/__tests__/project-events.test.ts
git commit -m "feat(agents): add per-project SSE event bus for live updates

Mirrors the chat event bus pattern but keyed by projectId, so project-
scoped tabs (cost-plan first) can subscribe to entity-updated events and
refresh themselves the moment an agent-approved mutation is applied."
```

---

## Task 2: Add `/api/projects/[projectId]/events` SSE route

**Files:**
- Create: `src/app/api/projects/[projectId]/events/route.ts`
- Test: `src/app/api/projects/[projectId]/events/__tests__/route.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/projects/[projectId]/events/__tests__/route.test.ts`:

```typescript
/**
 * @jest-environment node
 */
const mockGetCurrentUser = jest.fn();
const mockProjectsLimit = jest.fn();
const mockProjectsWhere = jest.fn(() => ({ limit: mockProjectsLimit }));
const mockProjectsFrom = jest.fn(() => ({ where: mockProjectsWhere }));
const mockSelect = jest.fn(() => ({ from: mockProjectsFrom }));

const mockRegister = jest.fn();
const mockUnregister = jest.fn();

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));
jest.mock('@/lib/db', () => ({
    db: { select: () => mockSelect() },
}));
jest.mock('@/lib/agents/project-events', () => ({
    registerProjectConnection: (...a: unknown[]) => mockRegister(...a),
    unregisterProjectConnection: (...a: unknown[]) => mockUnregister(...a),
}));

import { GET } from '../route';

beforeEach(() => {
    jest.clearAllMocks();
});

const params = Promise.resolve({ projectId: 'proj-1' });

function makeRequest() {
    return new Request('http://localhost/api/projects/proj-1/events') as unknown as Parameters<
        typeof GET
    >[0];
}

describe('GET /api/projects/[projectId]/events', () => {
    test('401 when no user', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: null, status: 401, error: 'unauth' });
        const res = await GET(makeRequest(), { params });
        expect(res.status).toBe(401);
    });

    test('400 when user has no organization', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u', organizationId: null },
        });
        const res = await GET(makeRequest(), { params });
        expect(res.status).toBe(400);
    });

    test('404 when project not found in user org', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u', organizationId: 'org-A' },
        });
        mockProjectsLimit.mockResolvedValue([]);
        const res = await GET(makeRequest(), { params });
        expect(res.status).toBe(404);
    });

    test('returns SSE stream and registers connection when project belongs to org', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u', organizationId: 'org-A' },
        });
        mockProjectsLimit.mockResolvedValue([{ id: 'proj-1' }]);

        const res = await GET(makeRequest(), { params });
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/event-stream');

        // Read one chunk to trigger the start() callback.
        const reader = res.body!.getReader();
        const { value } = await reader.read();
        expect(value).toBeDefined();
        const text = new TextDecoder().decode(value!);
        expect(text).toContain('event: connected');

        expect(mockRegister).toHaveBeenCalledWith('proj-1', expect.anything());
        await reader.cancel();
    });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx jest src/app/api/projects/[projectId]/events/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'`.

**Step 3: Implement `src/app/api/projects/[projectId]/events/route.ts`**

```typescript
/**
 * /api/projects/[projectId]/events
 *
 * Server-Sent Events. Emits entity_updated events when project-scoped
 * mutations land (today: agent-approved cost-line writes). Auth-gated:
 * caller must belong to the project's organization.
 *
 * Pattern mirrors src/app/api/chat/threads/[threadId]/stream/route.ts.
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { and, eq } from 'drizzle-orm';
import {
    registerProjectConnection,
    unregisterProjectConnection,
} from '@/lib/agents/project-events';

interface RouteParams {
    params: Promise<{ projectId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { projectId } = await params;

    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return new Response('Unauthorized', { status: 401 });
    }
    const orgId = authResult.user.organizationId;
    if (!orgId) {
        return new Response('User has no organization', { status: 400 });
    }

    const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
        .limit(1);

    if (!project) {
        return new Response('Project not found', { status: 404 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            registerProjectConnection(projectId, controller);
            controller.enqueue(
                encoder.encode(`event: connected\ndata: ${JSON.stringify({ projectId })}\n\n`)
            );
        },
        cancel(controller) {
            unregisterProjectConnection(projectId, controller);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
```

**Step 4: Run the test to verify it passes**

Run: `npx jest src/app/api/projects/[projectId]/events/__tests__/route.test.ts`
Expected: PASS, 4 tests.

**Step 5: Commit**

```bash
git add src/app/api/projects/[projectId]/events
git commit -m "feat(api): add /api/projects/[projectId]/events SSE route

Auth-gated per-project SSE channel. Project must belong to caller's org.
Emits 'connected' on subscribe; subsequent events come from
emitProjectEvent in the agent approval pipeline."
```

---

## Task 3: Emit `entity_updated` from the approvals respond route

**Files:**
- Modify: `src/app/api/chat/approvals/[id]/respond/route.ts:110-129`
- Modify: `src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts` (extend, don't rewrite)

**Why in the respond route, not the applicator?** The respond route already has `approval.projectId`, `approval.toolName`, and the applied output in scope; the applicator does too but it's a pure mutation primitive. Keeping the SSE emit at the API layer (next to `approval_resolved`) means the applicator stays a pure DB function with no side-channels — easier to reason about, easier to test, and easier to reuse later (e.g. a future bulk-apply endpoint).

**Step 1: Add a failing test**

Append a new test to `src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts`. The existing file mocks `@/lib/agents/events` for `emitChatEvent`; we add a mock for `@/lib/agents/project-events` and verify the emit happens on the apply path.

Add at the top, alongside the existing mocks (after the existing `jest.mock('@/lib/agents/applicators', ...)` block):

```typescript
const mockEmitProject = jest.fn();
jest.mock('@/lib/agents/project-events', () => ({
    emitProjectEvent: (...args: unknown[]) => mockEmitProject(...args),
}));
```

Add a new test (place it after the existing "approve happy path" test):

```typescript
test('apply emits entity_updated on the project channel', async () => {
    mockGetCurrentUser.mockResolvedValue({
        user: { id: 'user-A', organizationId: 'org-A' },
    });
    // First select: approval lookup
    // Second select: thread ownership lookup
    mockApprovalsLimit.mockResolvedValueOnce([
        {
            id: 'approval-1',
            organizationId: 'org-A',
            threadId: 'thread-1',
            projectId: 'proj-99',
            toolName: 'update_cost_line',
            input: { id: 'cl-7', budgetCents: 12345 },
            expectedRowVersion: 3,
            status: 'pending',
        },
    ]);
    mockThreadsLimit.mockResolvedValueOnce([{ userId: 'user-A' }]);

    mockApply.mockResolvedValue({
        kind: 'applied',
        output: { id: 'cl-7', budgetCents: 12345, rowVersion: 4 },
    });

    const res = await POST(makeRequest({ decision: 'approve' }), { params });
    expect(res.status).toBe(200);

    expect(mockEmitProject).toHaveBeenCalledWith('proj-99', {
        type: 'entity_updated',
        entity: 'cost_line',
        op: 'updated',
        id: 'cl-7',
    });
});

test('apply of create_cost_line emits op=created', async () => {
    mockGetCurrentUser.mockResolvedValue({
        user: { id: 'user-A', organizationId: 'org-A' },
    });
    mockApprovalsLimit.mockResolvedValueOnce([
        {
            id: 'approval-2',
            organizationId: 'org-A',
            threadId: 'thread-1',
            projectId: 'proj-99',
            toolName: 'create_cost_line',
            input: { section: 'CONSTRUCTION', activity: 'Slab' },
            expectedRowVersion: null,
            status: 'pending',
        },
    ]);
    mockThreadsLimit.mockResolvedValueOnce([{ userId: 'user-A' }]);
    mockApply.mockResolvedValue({
        kind: 'applied',
        output: { id: 'cl-new', section: 'CONSTRUCTION', activity: 'Slab' },
    });

    const res = await POST(makeRequest({ decision: 'approve' }), { params });
    expect(res.status).toBe(200);

    expect(mockEmitProject).toHaveBeenCalledWith('proj-99', {
        type: 'entity_updated',
        entity: 'cost_line',
        op: 'created',
        id: 'cl-new',
    });
});

test('reject does NOT emit entity_updated', async () => {
    mockGetCurrentUser.mockResolvedValue({
        user: { id: 'user-A', organizationId: 'org-A' },
    });
    mockApprovalsLimit.mockResolvedValueOnce([
        {
            id: 'approval-3',
            organizationId: 'org-A',
            threadId: 'thread-1',
            projectId: 'proj-99',
            toolName: 'update_cost_line',
            input: { id: 'cl-7' },
            expectedRowVersion: 1,
            status: 'pending',
        },
    ]);
    mockThreadsLimit.mockResolvedValueOnce([{ userId: 'user-A' }]);

    const res = await POST(makeRequest({ decision: 'reject' }), { params });
    expect(res.status).toBe(200);

    expect(mockEmitProject).not.toHaveBeenCalled();
});

test('conflict does NOT emit entity_updated', async () => {
    mockGetCurrentUser.mockResolvedValue({
        user: { id: 'user-A', organizationId: 'org-A' },
    });
    mockApprovalsLimit.mockResolvedValueOnce([
        {
            id: 'approval-4',
            organizationId: 'org-A',
            threadId: 'thread-1',
            projectId: 'proj-99',
            toolName: 'update_cost_line',
            input: { id: 'cl-7' },
            expectedRowVersion: 2,
            status: 'pending',
        },
    ]);
    mockThreadsLimit.mockResolvedValueOnce([{ userId: 'user-A' }]);
    mockApply.mockResolvedValue({ kind: 'conflict', reason: 'version moved' });

    const res = await POST(makeRequest({ decision: 'approve' }), { params });
    expect(res.status).toBe(409);

    expect(mockEmitProject).not.toHaveBeenCalled();
});
```

**Step 2: Run tests, expect failure**

Run: `npx jest src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts`
Expected: FAIL — the four new tests, because the route doesn't import or call `emitProjectEvent` yet.

**Step 3: Implement the emit in the respond route**

Modify [src/app/api/chat/approvals/[id]/respond/route.ts](src/app/api/chat/approvals/[id]/respond/route.ts).

Add to the imports at the top (next to the existing `import { emitChatEvent }` line):

```typescript
import { emitProjectEvent, type ProjectEntity } from '@/lib/agents/project-events';
```

Add this small helper above `POST`:

```typescript
/** Map a mutating tool name → the entity type it touches. */
function entityForTool(toolName: string): ProjectEntity | null {
    switch (toolName) {
        case 'update_cost_line':
        case 'create_cost_line':
            return 'cost_line';
        default:
            return null;
    }
}
```

Inside the `if (result.kind === 'applied') { ... }` block (currently lines 110-129), after the existing `emitChatEvent(approval.threadId, { type: 'approval_resolved', ... })` call and before the `return NextResponse.json(...)`, add:

```typescript
const entity = entityForTool(approval.toolName);
const appliedId = (result.output as { id?: unknown })?.id;
if (entity && typeof appliedId === 'string') {
    emitProjectEvent(approval.projectId, {
        type: 'entity_updated',
        entity,
        op: approval.toolName === 'create_cost_line' ? 'created' : 'updated',
        id: appliedId,
    });
}
```

**Step 4: Run tests, expect pass**

Run: `npx jest src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts`
Expected: PASS, all tests including the four new ones.

**Step 5: Commit**

```bash
git add src/app/api/chat/approvals/[id]/respond/route.ts src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts
git commit -m "feat(approvals): emit project entity_updated on apply

After a successful applicator write, fan out an entity_updated event on
the per-project SSE channel so any open project-scoped tab can refresh
itself. Reject and conflict paths do not emit."
```

---

## Task 4: Add `useProjectEvents` client hook

**Files:**
- Create: `src/lib/hooks/use-project-events.ts`
- Test: `src/lib/hooks/__tests__/use-project-events.test.ts`

**Why a callback-based hook, not a state hook?** Listeners want to call `refetch()`, not re-render on every event. Returning state would force every consumer to mirror state→effect, which is what we're trying to avoid.

**Step 1: Write the failing test**

Create `src/lib/hooks/__tests__/use-project-events.test.ts`:

```typescript
/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useProjectEvents, type ProjectEvent } from '../use-project-events';

class MockEventSource {
    static instances: MockEventSource[] = [];
    listeners = new Map<string, ((e: MessageEvent) => void)[]>();
    onerror: ((e: Event) => void) | null = null;
    closed = false;

    constructor(public url: string) {
        MockEventSource.instances.push(this);
    }

    addEventListener(type: string, fn: (e: MessageEvent) => void) {
        const arr = this.listeners.get(type) ?? [];
        arr.push(fn);
        this.listeners.set(type, arr);
    }

    removeEventListener(type: string, fn: (e: MessageEvent) => void) {
        const arr = this.listeners.get(type) ?? [];
        this.listeners.set(
            type,
            arr.filter((f) => f !== fn)
        );
    }

    close() {
        this.closed = true;
    }

    fire(type: string, data: unknown) {
        const arr = this.listeners.get(type) ?? [];
        const ev = { data: JSON.stringify(data) } as MessageEvent;
        for (const fn of arr) fn(ev);
    }
}

beforeEach(() => {
    MockEventSource.instances = [];
    (globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource =
        MockEventSource;
});

describe('useProjectEvents', () => {
    test('opens an EventSource at /api/projects/:id/events', () => {
        renderHook(() => useProjectEvents('proj-1', () => {}));
        expect(MockEventSource.instances).toHaveLength(1);
        expect(MockEventSource.instances[0].url).toBe('/api/projects/proj-1/events');
    });

    test('invokes the callback when entity_updated fires', () => {
        const onEvent = jest.fn();
        renderHook(() => useProjectEvents('proj-1', onEvent));

        const ev: ProjectEvent = {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'updated',
            id: 'cl-9',
        };
        MockEventSource.instances[0].fire('entity_updated', ev);

        expect(onEvent).toHaveBeenCalledWith(ev);
    });

    test('does not open a connection when projectId is null', () => {
        renderHook(() => useProjectEvents(null, () => {}));
        expect(MockEventSource.instances).toHaveLength(0);
    });

    test('closes the EventSource on unmount', () => {
        const { unmount } = renderHook(() => useProjectEvents('proj-1', () => {}));
        const src = MockEventSource.instances[0];
        unmount();
        expect(src.closed).toBe(true);
    });
});
```

**Step 2: Run tests, expect failure**

Run: `npx jest src/lib/hooks/__tests__/use-project-events.test.ts`
Expected: FAIL — `Cannot find module '../use-project-events'`.

**Step 3: Implement the hook**

Create `src/lib/hooks/use-project-events.ts`:

```typescript
/**
 * useProjectEvents — subscribes to /api/projects/[projectId]/events and
 * invokes a callback for each entity_updated event.
 *
 * Callback-style (not state) so consumers can call refetch() in their own
 * data hooks without forcing a re-render on every event. Mirrors the
 * shape of use-chat-stream.ts but minimal — there is only one event type
 * to handle today.
 */

import { useEffect, useRef } from 'react';

export type ProjectEvent = {
    type: 'entity_updated';
    entity: 'cost_line';
    op: 'created' | 'updated' | 'deleted';
    id: string;
};

export function useProjectEvents(
    projectId: string | null,
    onEvent: (event: ProjectEvent) => void
): void {
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    useEffect(() => {
        if (!projectId) return;
        const source = new EventSource(`/api/projects/${projectId}/events`);

        const handle = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                onEventRef.current({ type: 'entity_updated', ...data });
            } catch (err) {
                console.error('[useProjectEvents] failed to parse event', err);
            }
        };
        source.addEventListener('entity_updated', handle as EventListener);

        return () => {
            source.removeEventListener('entity_updated', handle as EventListener);
            source.close();
        };
    }, [projectId]);
}
```

**Step 4: Run tests, expect pass**

Run: `npx jest src/lib/hooks/__tests__/use-project-events.test.ts`
Expected: PASS, 4 tests.

**Step 5: Commit**

```bash
git add src/lib/hooks/use-project-events.ts src/lib/hooks/__tests__/use-project-events.test.ts
git commit -m "feat(hooks): add useProjectEvents client hook

Callback-style subscriber for the per-project SSE channel. Consumers
pass a handler that runs on every entity_updated event; the hook owns
the EventSource lifecycle (open on mount with a projectId, close on
unmount or projectId change)."
```

---

## Task 5: Wire `useCostPlan` to refetch on `cost_line` events

**Files:**
- Modify: `src/lib/hooks/cost-plan/use-cost-plan.ts`

**Decision on the existing 10-second poll:** Keep it. It catches non-agent writes (manual edits in another tab, imports, generate-from-template). The SSE channel piggy-backs on top — instant refresh for agent applies, eventual consistency for everything else. Removing the poll would regress those paths and is out of scope for Phase 3.5.

**Step 1: Modify the hook**

Edit [src/lib/hooks/cost-plan/use-cost-plan.ts](src/lib/hooks/cost-plan/use-cost-plan.ts).

Add to the imports at the top:

```typescript
import { useProjectEvents } from '@/lib/hooks/use-project-events';
```

Inside `useCostPlan`, after the existing `useEffect` that sets up the 10-second poll (around line 60), add:

```typescript
// Live refresh: when an agent-applied mutation lands on a cost_line in
// this project, refetch immediately rather than waiting for the next poll.
useProjectEvents(projectId || null, (event) => {
    if (event.entity === 'cost_line') {
        fetchCostPlan();
    }
});
```

No new tests for this wiring — `useProjectEvents` and `fetchCostPlan` are independently tested. An end-to-end smoke test is covered by Task 6.

**Step 2: Verify the existing cost-plan tests still pass**

Run: `npx jest src/lib/hooks/cost-plan`
Expected: PASS for any existing tests; or "no tests found" if none — that's fine, this is a wiring change.

Also run the full test suite to confirm nothing else broke:

Run: `npx jest`
Expected: PASS for all suites.

**Step 3: Commit**

```bash
git add src/lib/hooks/cost-plan/use-cost-plan.ts
git commit -m "feat(cost-plan): refetch on agent-applied cost_line events

Subscribes useCostPlan to the per-project SSE channel and refetches
immediately on any cost_line entity_updated event. The existing 10s
poll is retained as fallback for non-agent writes (manual edits in
another tab, imports, generate-from-template)."
```

---

## Task 6: Manual end-to-end verification

**Why manual?** This is a multi-process flow (browser EventSource ↔ Next.js dev server ↔ DB) and the value being verified is "the table refreshed without me reloading" — exactly the kind of thing a unit test cannot prove. Skip a Playwright test for now (the project doesn't have one set up for the chat dock yet); add one in a later quality pass if regressions emerge.

**Steps:**

1. Start the dev environment:

   ```bash
   npm run db:up
   npm run dev
   ```

2. Open a project in the browser. Confirm the cost plan tab loads.

3. Open the chat dock. Ask Finance to update a cost line, e.g.:
   > "Update the slab cost line to $250,000."

4. When the approval card appears, click **Approve**.

5. **Expected:** within ~1 second, the cost-plan table reflects the new value. No manual reload.

6. Open the same project in a **second browser tab**. Repeat the approve flow in tab A. **Expected:** tab B's cost-plan refreshes too.

7. Test the reject path. Ask Finance to update a different cost line, click **Reject**. **Expected:** the cost-plan table does **not** refresh (no event was emitted, status stays as before).

8. Test the conflict path (harder to reproduce manually — optional). Edit the cost line manually in another tab between propose and approve. **Expected:** approve returns conflict, table does not refresh.

9. Open browser DevTools → Network → filter `events`. Confirm one open SSE connection per project tab, sending periodic `connected` event then `entity_updated` events on demand.

**If any step fails:** stop and debug before claiming complete. See @superpowers:verification-before-completion — evidence before assertions.

**Commit (docs only):**

```bash
git add docs/plans/2026-04-29-phase-3-5-cross-tab-live-updates.md
git commit -m "docs: add Phase 3.5 cross-tab live updates plan"
```

(If the plan is already committed before execution starts, skip this commit.)

---

## Update the agent-integration plan after merging

After Task 6 verifies clean, edit [docs/plans/2026-04-29-agent-integration.md](docs/plans/2026-04-29-agent-integration.md):

1. In **### Shipped** (line ~324), add a new bullet:

   > **Phase 3.5 — Cross-tab live updates (2026-04-29).** Per-project SSE channel at `/api/projects/[projectId]/events` emitting `entity_updated` on agent-approved cost-line writes. `useCostPlan` subscribes and refetches on the matching event; the 10-second poll is retained as fallback for non-agent writes. Same in-process `globalThis`-pinned Map pattern as the chat events bus.

2. In **### Outstanding (in priority order)** (line 344), remove item 1 (cross-tab live updates) and renumber.

3. Commit:

   ```bash
   git add docs/plans/2026-04-29-agent-integration.md
   git commit -m "docs: mark Phase 3.5 cross-tab live updates shipped"
   ```

---

## Files touched (summary)

**New:**
- `src/lib/agents/project-events.ts`
- `src/lib/agents/__tests__/project-events.test.ts`
- `src/app/api/projects/[projectId]/events/route.ts`
- `src/app/api/projects/[projectId]/events/__tests__/route.test.ts`
- `src/lib/hooks/use-project-events.ts`
- `src/lib/hooks/__tests__/use-project-events.test.ts`

**Modified:**
- `src/app/api/chat/approvals/[id]/respond/route.ts` (add emit on apply)
- `src/app/api/chat/approvals/[id]/respond/__tests__/route.test.ts` (4 new tests)
- `src/lib/hooks/cost-plan/use-cost-plan.ts` (subscribe + refetch)
- `docs/plans/2026-04-29-agent-integration.md` (log shipped + outstanding update)
