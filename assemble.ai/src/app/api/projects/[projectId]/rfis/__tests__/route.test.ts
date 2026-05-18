/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/agents/project-events', () => ({
    emitProjectEvent: jest.fn(),
}));

jest.mock('@/lib/rfi/service', () => {
    class RfiServiceError extends Error {
        code: string;
        status: number;

        constructor(code: string, message: string, status: number) {
            super(message);
            this.name = 'RfiServiceError';
            this.code = code;
            this.status = status;
        }
    }

    return {
        rfiService: {
            list: jest.fn(),
            create: jest.fn(),
        },
        RfiServiceError,
    };
});

import { getCurrentUser } from '@/lib/auth/get-user';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { rfiService, RfiServiceError } from '@/lib/rfi/service';
import type { RfiRecord } from '@/types/rfi';
import { GET, POST } from '../route';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockEmitProjectEvent = emitProjectEvent as jest.MockedFunction<typeof emitProjectEvent>;
const mockRfiService = rfiService as jest.Mocked<typeof rfiService>;

function request(url: string, body?: unknown): NextRequest {
    return new Request(url, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    }) as unknown as NextRequest;
}

const params = { params: Promise.resolve({ projectId: 'project-1' }) };

function user(organizationId: string | null) {
    return {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        organizationId,
    };
}

function rfi(overrides: Partial<RfiRecord> = {}): RfiRecord {
    return {
        id: 'rfi-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        rfiNumber: 1,
        reference: 'RFI-001',
        title: 'Plant noise',
        question: 'Please confirm.',
        status: 'draft',
        priority: 'medium',
        responsibleStakeholderId: null,
        responsibleParty: null,
        responsiblePartyLabel: 'Unassigned',
        dueDate: null,
        responseText: null,
        responseDate: null,
        sourceNoteId: null,
        sourceNote: null,
        evidenceLinks: [],
        auditTrail: [],
        displayState: 'none',
        isOverdue: false,
        rowVersion: 1,
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        deletedAt: null,
        ...overrides,
    };
}

describe('/api/projects/[projectId]/rfis', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('rejects unauthenticated list requests', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: null,
            error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
            status: 401,
        });

        const response = await GET(request('http://localhost/api/projects/project-1/rfis'), params);

        expect(response.status).toBe(401);
        expect(mockRfiService.list).not.toHaveBeenCalled();
    });

    it('rejects users without an organization', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: user(null),
            status: 200,
        });

        const response = await GET(request('http://localhost/api/projects/project-1/rfis'), params);

        expect(response.status).toBe(400);
        expect(mockRfiService.list).not.toHaveBeenCalled();
    });

    it('lists RFIs scoped to the project and organization', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: user('org-1'),
            status: 200,
        });
        mockRfiService.list.mockResolvedValue({ rfis: [], total: 0, filter: 'overdue' });

        const response = await GET(
            request('http://localhost/api/projects/project-1/rfis?filter=overdue'),
            params
        );

        expect(response.status).toBe(200);
        expect(mockRfiService.list).toHaveBeenCalledWith({
            projectId: 'project-1',
            organizationId: 'org-1',
            filter: 'overdue',
        });
    });

    it('creates an RFI and emits a project refresh event', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: user('org-1'),
            status: 200,
        });
        mockRfiService.create.mockResolvedValue(rfi());

        const response = await POST(
            request('http://localhost/api/projects/project-1/rfis', {
                title: 'Plant noise',
                question: 'Please confirm.',
            }),
            params
        );

        expect(response.status).toBe(201);
        expect(mockRfiService.create).toHaveBeenCalledWith({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Plant noise',
            question: 'Please confirm.',
        });
        expect(mockEmitProjectEvent).toHaveBeenCalledWith('project-1', {
            type: 'entity_updated',
            entity: 'rfi',
            op: 'created',
            id: 'rfi-1',
        });
    });

    it('maps service validation errors', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: user('org-1'),
            status: 200,
        });
        mockRfiService.create.mockRejectedValue(
            new RfiServiceError('VALIDATION', 'title is required.', 400)
        );

        const response = await POST(
            request('http://localhost/api/projects/project-1/rfis', { question: 'Missing title' }),
            params
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('title is required.');
        expect(mockEmitProjectEvent).not.toHaveBeenCalled();
    });
});
