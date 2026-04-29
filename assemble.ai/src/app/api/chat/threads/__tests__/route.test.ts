/**
 * @jest-environment node
 *
 * Smoke tests for POST /api/chat/threads — the entry point for the chat dock.
 *
 * Verifies:
 *   1. Unauthenticated requests are rejected.
 *   2. Users without an organization are rejected.
 *   3. Creating a thread for a project that belongs to another org is rejected.
 *   4. The happy path produces a 201 with a thread row.
 */

import { NextRequest } from 'next/server';

const mockGetCurrentUser = jest.fn();
const mockDbSelectLimit = jest.fn();
const mockDbSelectWhere = jest.fn(() => ({ limit: mockDbSelectLimit }));
const mockDbSelectFrom = jest.fn(() => ({ where: mockDbSelectWhere }));
const mockDbSelect = jest.fn(() => ({ from: mockDbSelectFrom }));
const mockDbInsertReturning = jest.fn();
const mockDbInsertValues = jest.fn(() => ({ returning: mockDbInsertReturning }));
const mockDbInsert = jest.fn(() => ({ values: mockDbInsertValues }));

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockDbSelect(),
        insert: () => mockDbInsert(),
    },
}));

import { POST } from '../route';

beforeEach(() => {
    jest.clearAllMocks();
});

function makeRequest(body: unknown): NextRequest {
    return new Request('http://localhost/api/chat/threads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as NextRequest;
}

describe('POST /api/chat/threads', () => {
    it('rejects unauthenticated requests', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: null,
            error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
            status: 401,
        });

        const res = await POST(makeRequest({ projectId: 'proj-1' }));
        expect(res.status).toBe(401);
    });

    it('rejects users without an organization', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u1', email: 'x@y.z', displayName: 'X', organizationId: null },
            status: 200,
        });

        const res = await POST(makeRequest({ projectId: 'proj-1' }));
        expect(res.status).toBe(400);
    });

    it('rejects when projectId is missing', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u1', email: 'x@y.z', displayName: 'X', organizationId: 'org-A' },
            status: 200,
        });

        const res = await POST(makeRequest({}));
        expect(res.status).toBe(400);
    });

    it('rejects when project does not exist', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u1', email: 'x@y.z', displayName: 'X', organizationId: 'org-A' },
            status: 200,
        });
        mockDbSelectLimit.mockResolvedValueOnce([]);

        const res = await POST(makeRequest({ projectId: 'missing' }));
        expect(res.status).toBe(404);
    });

    it('rejects creating a thread for a project owned by another org (multi-tenant)', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u1', email: 'x@y.z', displayName: 'X', organizationId: 'org-A' },
            status: 200,
        });
        mockDbSelectLimit.mockResolvedValueOnce([{ organizationId: 'org-B' }]);

        const res = await POST(makeRequest({ projectId: 'proj-of-org-B' }));
        expect(res.status).toBe(403);
        // Crucial: never inserted anything
        expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('creates a thread on the happy path', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u1', email: 'x@y.z', displayName: 'X', organizationId: 'org-A' },
            status: 200,
        });
        mockDbSelectLimit.mockResolvedValueOnce([{ organizationId: 'org-A' }]);
        mockDbInsertReturning.mockResolvedValueOnce([
            {
                id: 'thread-new',
                projectId: 'proj-1',
                organizationId: 'org-A',
                userId: 'u1',
                title: 'New conversation',
                status: 'active',
            },
        ]);

        const res = await POST(makeRequest({ projectId: 'proj-1' }));
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.thread.id).toBe('thread-new');
        expect(body.thread.organizationId).toBe('org-A');
    });
});
