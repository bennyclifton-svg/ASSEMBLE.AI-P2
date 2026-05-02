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

const mockUpdateReturning = jest.fn().mockResolvedValue([{ id: 'approval-1' }]);
const mockUpdateWhere = jest.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockApply = jest.fn();
const mockEmit = jest.fn();
const mockEmitProject = jest.fn();
const mockWorkflowDependenciesAreApplied = jest.fn();
const mockSyncWorkflowStepForApproval = jest.fn();

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

jest.mock('@/lib/workflows', () => ({
    workflowDependenciesAreApplied: (...args: unknown[]) => mockWorkflowDependenciesAreApplied(...args),
    syncWorkflowStepForApproval: (...args: unknown[]) => mockSyncWorkflowStepForApproval(...args),
}));

import { POST } from '../route';

beforeEach(() => {
    jest.clearAllMocks();
    nextSelectIsApproval = true;
    mockUpdateReturning.mockResolvedValue([{ id: 'approval-1' }]);
    mockWorkflowDependenciesAreApplied.mockResolvedValue({ ok: true });
    mockSyncWorkflowStepForApproval.mockResolvedValue([]);
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
                ctx: expect.objectContaining({ organizationId: 'org-A', projectId: 'proj-1' }),
            })
        );
        expect(mockEmit).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({ type: 'approval_resolved', status: 'applied' })
        );
    });

    it('emits the next unblocked workflow approval after applying a dependency', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        mockApprovalsLimit.mockResolvedValueOnce([pendingApproval]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: baseUser.id }]);
        mockApply.mockResolvedValueOnce({ kind: 'applied', output: { id: 'cl-1', budgetCents: 500000 } });
        mockSyncWorkflowStepForApproval.mockResolvedValueOnce([
            {
                id: 'approval-next',
                runId: 'run-1',
                toolName: 'create_note',
                proposedDiff: { entity: 'note', entityId: null, summary: 'Create note', changes: [] },
                createdAt: '2026-05-03T00:00:00.000Z',
            },
        ]);

        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(200);

        expect(mockEmit).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({
                type: 'awaiting_approval',
                approvalId: 'approval-next',
                toolName: 'create_note',
            })
        );
    });

    it('blocks approval when an earlier workflow dependency has not applied', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        mockApprovalsLimit.mockResolvedValueOnce([pendingApproval]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: baseUser.id }]);
        mockWorkflowDependenciesAreApplied.mockResolvedValueOnce({
            ok: false,
            reason: 'Earlier workflow step is still waiting.',
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body).toEqual({
            status: 'blocked',
            error: 'Earlier workflow step is still waiting.',
        });
        expect(mockApply).not.toHaveBeenCalled();
    });

    it('does not apply when another request has already claimed the approval', async () => {
        mockGetCurrentUser.mockResolvedValue(okSession);
        mockApprovalsLimit.mockResolvedValueOnce([pendingApproval]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: baseUser.id }]);
        mockUpdateReturning.mockResolvedValueOnce([]);

        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(409);
        expect(mockApply).not.toHaveBeenCalled();
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

    test('apply of create_meeting emits meeting created', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'user-A', organizationId: 'org-A' },
        });
        mockApprovalsLimit.mockResolvedValueOnce([
            {
                id: 'approval-5',
                organizationId: 'org-A',
                threadId: 'thread-1',
                projectId: 'proj-99',
                toolName: 'create_meeting',
                input: { title: 'Pre-DA Meeting' },
                expectedRowVersion: null,
                status: 'pending',
            },
        ]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: 'user-A' }]);
        mockApply.mockResolvedValue({
            kind: 'applied',
            output: { id: 'meeting-new', title: 'Pre-DA Meeting' },
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(200);

        expect(mockEmitProject).toHaveBeenCalledWith('proj-99', {
            type: 'entity_updated',
            entity: 'meeting',
            op: 'created',
            id: 'meeting-new',
        });
    });

    test('apply of create_addendum emits addendum created', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'user-A', organizationId: 'org-A' },
        });
        mockApprovalsLimit.mockResolvedValueOnce([
            {
                id: 'approval-6',
                organizationId: 'org-A',
                threadId: 'thread-1',
                projectId: 'proj-99',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stk-mech',
                    content: 'General update to the mechanical design documents.',
                    documentIds: ['doc-1'],
                },
                expectedRowVersion: null,
                status: 'pending',
            },
        ]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: 'user-A' }]);
        mockApply.mockResolvedValue({
            kind: 'applied',
            output: { id: 'addendum-new', addendumNumber: 1 },
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(200);

        expect(mockEmitProject).toHaveBeenCalledWith('proj-99', {
            type: 'entity_updated',
            entity: 'addendum',
            op: 'created',
            id: 'addendum-new',
        });
    });

    test('apply of attach_documents_to_note emits note updated', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'user-A', organizationId: 'org-A' },
        });
        mockApprovalsLimit.mockResolvedValueOnce([
            {
                id: 'approval-7',
                organizationId: 'org-A',
                threadId: 'thread-1',
                projectId: 'proj-99',
                toolName: 'attach_documents_to_note',
                input: { id: 'note-1', attachDocumentIds: ['doc-1'] },
                expectedRowVersion: 2,
                status: 'pending',
            },
        ]);
        mockThreadsLimit.mockResolvedValueOnce([{ userId: 'user-A' }]);
        mockApply.mockResolvedValue({
            kind: 'applied',
            output: { id: 'note-1', attachedDocumentIds: ['doc-1'] },
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });
        expect(res.status).toBe(200);

        expect(mockEmitProject).toHaveBeenCalledWith('proj-99', {
            type: 'entity_updated',
            entity: 'note',
            op: 'updated',
            id: 'note-1',
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
});
