/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockGetCurrentUser = jest.fn();
const mockRegisterChatConnection = jest.fn();
const mockUnregisterChatConnection = jest.fn();
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

jest.mock('@/lib/agents/events', () => ({
    registerChatConnection: (...args: unknown[]) => mockRegisterChatConnection(...args),
    unregisterChatConnection: (...args: unknown[]) => mockUnregisterChatConnection(...args),
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
    return new NextRequest('http://localhost/api/chat/threads/thread-1/stream');
}

async function readStreamFor(response: Response, waitMs = 20): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    let text = '';

    for (let i = 0; i < 4; i += 1) {
        const next = await Promise.race([
            reader.read(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), waitMs)),
        ]);
        if (!next || next.done) break;
        text += decoder.decode(next.value, { stream: true });
    }

    await reader.cancel();
    return text;
}

describe('GET /api/chat/threads/[threadId]/stream', () => {
    it('replays only actionable pending approvals on reconnect', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: {
                id: 'user-1',
                organizationId: 'org-1',
            },
            status: 200,
        });
        const activeApproval = {
            id: 'approval-active',
            runId: 'run-1',
            toolName: 'create_variation',
            proposedDiff: { entity: 'variation', entityId: null, summary: 'Create variation', changes: [] },
            status: 'pending',
            createdAt: new Date('2026-05-03T00:00:00.000Z'),
        };
        const blockedApproval = {
            id: 'approval-blocked',
            runId: 'run-1',
            toolName: 'create_note',
            proposedDiff: { entity: 'note', entityId: null, summary: 'Create note', changes: [] },
            status: 'pending',
            createdAt: new Date('2026-05-03T00:01:00.000Z'),
        };
        selectResponses.push(
            [{ id: 'thread-1', userId: 'user-1' }],
            [activeApproval, blockedApproval]
        );
        mockFilterActionablePendingApprovals.mockResolvedValueOnce([activeApproval]);

        const response = await GET(makeRequest(), { params });
        const streamed = await readStreamFor(response);

        expect(response.status).toBe(200);
        expect(mockFilterActionablePendingApprovals).toHaveBeenCalledWith([
            activeApproval,
            blockedApproval,
        ]);
        expect(streamed).toContain('approval-active');
        expect(streamed).not.toContain('approval-blocked');
    });
});
