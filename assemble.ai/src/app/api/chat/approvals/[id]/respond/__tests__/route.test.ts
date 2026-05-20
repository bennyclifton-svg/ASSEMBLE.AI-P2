/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();
const mockLoadActionApprovalForResponse = jest.fn();
const mockRejectActionProposal = jest.fn();
const mockApproveActionProposal = jest.fn();

const mockThreadsLimit = jest.fn();
const mockThreadsWhere = jest.fn(() => ({ limit: mockThreadsLimit }));
const mockThreadsFrom = jest.fn(() => ({ where: mockThreadsWhere }));
const mockSelect = jest.fn(() => ({ from: mockThreadsFrom }));

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock('@/lib/actions/approvals', () => ({
    loadActionApprovalForResponse: (args: unknown) => mockLoadActionApprovalForResponse(args),
    rejectActionProposal: (args: unknown) => mockRejectActionProposal(args),
    approveActionProposal: (args: unknown) => mockApproveActionProposal(args),
}));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
    },
}));

import { POST } from '../route';

beforeEach(() => {
    jest.clearAllMocks();
    mockThreadsLimit.mockResolvedValue([{ userId: 'user-A' }]);
    mockRejectActionProposal.mockResolvedValue({ status: 'rejected' });
    mockApproveActionProposal.mockResolvedValue({
        status: 'applied',
        output: { id: 'cl-1', budgetCents: 500000 },
        newlyActionableApprovals: [],
    });
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
    appliedOutput: null,
    expectedRowVersion: 3,
    respondedBy: null,
    respondedAt: null,
    expiresAt: null,
    createdAt: new Date('2026-05-03T00:00:00.000Z'),
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
        expect(mockLoadActionApprovalForResponse).not.toHaveBeenCalled();
    });

    it('rejects users without an organization', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { ...baseUser, organizationId: null },
            status: 200,
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(400);
        expect(mockLoadActionApprovalForResponse).not.toHaveBeenCalled();
    });

    it('rejects malformed decisions', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });

        const res = await POST(makeRequest({ decision: 'maybe' }), { params });

        expect(res.status).toBe(400);
        expect(mockLoadActionApprovalForResponse).not.toHaveBeenCalled();
    });

    it('returns 404 when the approval is not visible to the caller organization', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { ...baseUser, organizationId: 'org-B' },
            status: 200,
        });
        mockLoadActionApprovalForResponse.mockResolvedValue({ status: 'not_found' });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(404);
        expect(mockLoadActionApprovalForResponse).toHaveBeenCalledWith({
            approvalId: 'approval-1',
            organizationId: 'org-B',
        });
        expect(mockApproveActionProposal).not.toHaveBeenCalled();
    });

    it('returns 409 for already-resolved approvals', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'already_resolved',
            approvalStatus: 'applied',
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(409);
        expect(mockApproveActionProposal).not.toHaveBeenCalled();
    });

    it('rejects callers who do not own the thread', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });
        mockThreadsLimit.mockResolvedValue([{ userId: 'someone-else' }]);

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(403);
        expect(mockApproveActionProposal).not.toHaveBeenCalled();
    });

    it('delegates rejection to the action approval module', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });

        const res = await POST(makeRequest({ decision: 'reject' }), { params });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: 'rejected' });
        expect(mockRejectActionProposal).toHaveBeenCalledWith({
            approval: pendingApproval,
            userId: 'user-A',
        });
        expect(mockApproveActionProposal).not.toHaveBeenCalled();
    });

    it('maps an already-claimed rejection to 409', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });
        mockRejectActionProposal.mockResolvedValue({ status: 'already_claimed' });

        const res = await POST(makeRequest({ decision: 'reject' }), { params });

        expect(res.status).toBe(409);
    });

    it('delegates approval to the action approval module', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            status: 'applied',
            output: { id: 'cl-1', budgetCents: 500000 },
        });
        expect(mockApproveActionProposal).toHaveBeenCalledWith({
            approval: pendingApproval,
            userId: 'user-A',
            overrideInput: null,
        });
    });

    it('passes overrideInput through for approval resolution', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });

        const res = await POST(
            makeRequest({ decision: 'approve', overrideInput: { budgetCents: 275000 } }),
            { params }
        );

        expect(res.status).toBe(200);
        expect(mockApproveActionProposal).toHaveBeenCalledWith({
            approval: pendingApproval,
            userId: 'user-A',
            overrideInput: { budgetCents: 275000 },
        });
    });

    it('maps blocked approval results to 409', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });
        mockApproveActionProposal.mockResolvedValue({
            status: 'blocked',
            reason: 'Earlier workflow step is still waiting.',
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({
            status: 'blocked',
            error: 'Earlier workflow step is still waiting.',
        });
    });

    it('maps already-claimed approval results to 409', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });
        mockApproveActionProposal.mockResolvedValue({ status: 'already_claimed' });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(409);
    });

    it('maps optimistic-lock conflicts to 409', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });
        mockApproveActionProposal.mockResolvedValue({
            status: 'conflict',
            reason: 'changed since propose',
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({
            status: 'conflict',
            error: 'changed since propose',
        });
    });

    it('maps gone approval results to 410', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: baseUser, status: 200 });
        mockLoadActionApprovalForResponse.mockResolvedValue({
            status: 'ready',
            approval: pendingApproval,
        });
        mockApproveActionProposal.mockResolvedValue({
            status: 'gone',
            reason: 'Cost line no longer exists.',
        });

        const res = await POST(makeRequest({ decision: 'approve' }), { params });

        expect(res.status).toBe(410);
        expect(await res.json()).toEqual({
            status: 'gone',
            error: 'Cost line no longer exists.',
        });
    });
});
