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
            get: jest.fn(),
            update: jest.fn(),
        },
        RfiServiceError,
    };
});

import { getCurrentUser } from '@/lib/auth/get-user';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { rfiService, RfiServiceError } from '@/lib/rfi/service';
import type { RfiRecord } from '@/types/rfi';
import { GET, PATCH } from '../route';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockEmitProjectEvent = emitProjectEvent as jest.MockedFunction<typeof emitProjectEvent>;
const mockRfiService = rfiService as jest.Mocked<typeof rfiService>;

function request(url: string, method = 'GET', body?: unknown): NextRequest {
    return new Request(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    }) as unknown as NextRequest;
}

const params = { params: Promise.resolve({ projectId: 'project-1', rfiId: 'rfi-1' }) };

function user() {
    return {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        organizationId: 'org-1',
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

describe('/api/projects/[projectId]/rfis/[rfiId]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue({
            user: user(),
            status: 200,
        });
    });

    it('gets an RFI scoped to project and organization', async () => {
        mockRfiService.get.mockResolvedValue(rfi());

        const response = await GET(request('http://localhost/api/projects/project-1/rfis/rfi-1'), params);

        expect(response.status).toBe(200);
        expect(mockRfiService.get).toHaveBeenCalledWith({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
        });
    });

    it('updates an RFI and emits a project refresh event', async () => {
        mockRfiService.update.mockResolvedValue(rfi({ title: 'Updated', status: 'open' }));

        const response = await PATCH(
            request('http://localhost/api/projects/project-1/rfis/rfi-1', 'PATCH', {
                title: 'Updated',
                status: 'open',
            }),
            params
        );

        expect(response.status).toBe(200);
        expect(mockRfiService.update).toHaveBeenCalledWith({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Updated',
            status: 'open',
        });
        expect(mockEmitProjectEvent).toHaveBeenCalledWith('project-1', {
            type: 'entity_updated',
            entity: 'rfi',
            op: 'updated',
            id: 'rfi-1',
        });
    });

    it('maps not-found errors', async () => {
        mockRfiService.get.mockRejectedValue(
            new RfiServiceError('NOT_FOUND', 'RFI not found.', 404)
        );

        const response = await GET(request('http://localhost/api/projects/project-1/rfis/rfi-1'), params);

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error).toBe('RFI not found.');
    });
});
