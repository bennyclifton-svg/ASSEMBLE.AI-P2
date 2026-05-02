/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockGetCurrentUser = jest.fn();
const mockFilterActionablePendingApprovals = jest.fn();
const selectResponses: unknown[] = [];

const mockSelect = jest.fn(() => ({
    from: () => ({
        where: () => ({
            limit: async () => selectResponses.shift(),
            orderBy: async () => selectResponses.shift(),
        }),
    }),
}));

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
    },
}));

jest.mock('@/lib/workflows', () => ({
    filterActionablePendingApprovals: (...args: unknown[]) =>
        mockFilterActionablePendingApprovals(...args),
}));

import { GET } from '../route';

beforeEach(() => {
    jest.clearAllMocks();
    selectResponses.length = 0;
});

const params = Promise.resolve({ threadId: 'thread-1' });

function makeRequest(): NextRequest {
    return new NextRequest('http://localhost/api/chat/threads/thread-1');
}

describe('GET /api/chat/threads/[threadId]', () => {
    it('returns only currently actionable pending approvals', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: {
                id: 'user-1',
                organizationId: 'org-1',
            },
            status: 200,
        });
        const thread = {
            id: 'thread-1',
            organizationId: 'org-1',
            projectId: 'project-1',
        };
        const messages = [{ id: 'message-1', threadId: 'thread-1', role: 'user', content: 'go' }];
        const activeApproval = {
            id: 'approval-active',
            runId: 'run-1',
            toolName: 'create_variation',
            proposedDiff: { entity: 'variation', entityId: null, summary: 'Create variation', changes: [] },
            createdAt: new Date('2026-05-03T00:00:00.000Z'),
        };
        const blockedApproval = {
            id: 'approval-blocked',
            runId: 'run-1',
            toolName: 'create_note',
            proposedDiff: { entity: 'note', entityId: null, summary: 'Create note', changes: [] },
            createdAt: new Date('2026-05-03T00:01:00.000Z'),
        };
        selectResponses.push([thread], messages, [activeApproval, blockedApproval]);
        mockFilterActionablePendingApprovals.mockResolvedValueOnce([activeApproval]);

        const res = await GET(makeRequest(), { params });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(mockFilterActionablePendingApprovals).toHaveBeenCalledWith([
            activeApproval,
            blockedApproval,
        ]);
        expect(body.pendingApprovals).toEqual([
            {
                ...activeApproval,
                createdAt: activeApproval.createdAt.toISOString(),
            },
        ]);
    });
});
