/**
 * @jest-environment node
 *
 * Approval response API — the most security-critical surface in Phase 3.
 *
 * Verifies:
 *   1. Unauthenticated callers can't approve.
 *   2. A user from a different org cannot approve another org's approval.
 *   3. A user who didn't own the chat thread cannot approve it.
 *   4. Approving a non-pending approval returns 409.
 *   5. Reject path marks the row 'rejected' and emits SSE.
 *   6. Approve happy path applies the mutation and emits SSE.
 *   7. Optimistic-locking conflict returns 409 + status='conflict'.
 */

const mockGetCurrentUser = jest.fn();

const mockApprovalsLimit = jest.fn();
const mockApprovalsWhere = jest.fn(() => ({ limit: mockApprovalsLimit }));
const mockApprovalsFrom = jest.fn(() => ({ where: mockApprovalsWhere }));

const mockThreadsLimit = jest.fn();
const mockThreadsWhere = jest.fn(() => ({ limit: mockThreadsLimit }));
const mockThreadsFrom = jest.fn(() => ({ where: mockThreadsWhere }));

let nextSelectIsApproval = true;
const mockSelect = jest.fn(() => {
    const fromFn = nextSelectIsApproval ? mockApprovalsFrom : mockThreadsFrom;
    nextSelectIsApproval = !nextSelectIsApproval;
    return { from: fromFn };
});

const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockApply = jest.fn();
const mockEmit = jest.fn();
const mockEmitProject = jest.fn();

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
        update: () => mockUpdate(),
    },
}));

jest.mock('@/lib/agents/events', () => ({
    emitChatEvent: (...args: unknown[]) => mockEmit(...args),
}));

jest.mock('@/lib/agents/applicators', () => ({
    applyApproval: (args: unknown) => mockApply(args),
}));

jest.mock('@/lib/agents/project-events', () => ({
    emitProjectEvent: (...args: unknown[]) => mockEmitProject(...args),
}));

import { POST } from '../route';

beforeEach(() => {
    jest.clearAllMocks();
    nextSelectIsApproval = true;
});

function makeRequest(body: unknown) {
    return new Request('http://localhost/api/chat/approvals/abc/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as Parameters<typeof POST>[0];
}

const params = Promise.resolve({ id: 'approval-1' });

const baseUser = {
    id: 'user-A',
    email: 'a@example.com',
    displayName: 'A',
    organizationId: 'org-A',
};
const okSession = { user: baseUser, status: 200 };

const pendingApproval = {
    id: 'approval-1',
    runId: 'run-1',
    threadId: 'thread-1',
    organizationId: 'org-A',
    projectId: 'proj-1',
    toolName: 'update_cost_line',
    toolUseId: 'toolu_x',
    input: { id: 'cl-1', budgetCents: 500000 },
    proposedDiff: { entity: 'cost_line', entityId: 'cl-1', summary: 'x', changes: [] },
    status: 'pending',
    expectedRowVersion: 3,
};

describe('POST /api/chat/approvals/[id]/respond', () => {
    it('rejects unauthenticated callers', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: null,
            error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
            status: 401,
        });
        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(401);
    });

    it('rejects users from a different org (multi-tenant)', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { ...baseUser, organizationId: 'org-B' },
            status: 200,
        });
        // The where clause filters by organizationId, so an approval owned by
        // org-A is invisible to a caller from org-B → no row returned.
        mockApprovalsLimit.mockResolvedValueOnce([]);
        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(404);
        expect(mockApply).not.toHaveBeenCalled();
    });

    it('rejects callers who do not own the thread', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        mockApprovalsLimit.mockResolvedValueOnce([pendingApproval]);
        // Thread owned by a different user.
        mockThreadsLimit.mockResolvedValueOnce([{ userId: 'someone-else' }]);
        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(403);
        expect(mockApply).not.toHaveBeenCalled();
    });

    it('rejects already-resolved approvals with 409', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        mockApprovalsLimit.mockResolvedValueOnce([{ ...pendingApproval, status: 'applied' }]);
        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(409);
    });

    it('rejects malformed decision', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        const res = await POST(makeRequest({ decision: 'maybe' }), { params });
        expect(res.status).toBe(400);
    });

    it('reject path: marks rejected and emits SSE', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        mockApprovalsLimit.mockResolvedValueOnce([pendingApproval]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: baseUser.id }]);

        const res = await POST(makeRequest({ decision: 'reject' }), { params });
        expect(res.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalled();
        expect(mockEmit).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({ type: 'approval_resolved', status: 'rejected' })
        );
        expect(mockApply).not.toHaveBeenCalled();
    });

    it('approve happy path: applies and emits SSE', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        mockApprovalsLimit.mockResolvedValueOnce([pendingApproval]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: baseUser.id }]);
        mockApply.mockResolvedValueOnce({ kind: 'applied', output: { id: 'cl-1', budgetCents: 500000 } });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(200);
        expect(mockApply).toHaveBeenCalledWith(
            expect.objectContaining({
                toolName: 'update_cost_line',
                expectedRowVersion: 3,
                ctx: { organizationId: 'org-A', projectId: 'proj-1' },
            })
        );
        expect(mockEmit).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({ type: 'approval_resolved', status: 'applied' })
        );
    });

    it('approve with optimistic-lock conflict: 409 + status=conflict', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        mockApprovalsLimit.mockResolvedValueOnce([pendingApproval]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: baseUser.id }]);
        mockApply.mockResolvedValueOnce({ kind: 'conflict', reason: 'changed since propose' });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.status).toBe('conflict');
        expect(mockEmit).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({ type: 'approval_resolved', status: 'conflict' })
        );
    });

    test('apply emits entity_updated on the project channel', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'user-A', organizationId: 'org-A' },
        });
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
});
