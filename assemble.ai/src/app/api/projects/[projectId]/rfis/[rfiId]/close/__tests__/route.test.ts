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

jest.mock('@/lib/rfi/service', () => ({
    rfiService: {
        close: jest.fn(),
    },
    RfiServiceError: class RfiServiceError extends Error {
        code: string;
        status: number;

        constructor(code: string, message: string, status: number) {
            super(message);
            this.name = 'RfiServiceError';
            this.code = code;
            this.status = status;
        }
    },
}));

import { getCurrentUser } from '@/lib/auth/get-user';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { rfiService } from '@/lib/rfi/service';
import type { RfiRecord } from '@/types/rfi';
import { POST } from '../route';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockEmitProjectEvent = emitProjectEvent as jest.MockedFunction<typeof emitProjectEvent>;
const mockRfiService = rfiService as jest.Mocked<typeof rfiService>;

const params = { params: Promise.resolve({ projectId: 'project-1', rfiId: 'rfi-1' }) };

function request(url: string): NextRequest {
    return new Request(url, { method: 'POST' }) as unknown as NextRequest;
}

function rfi(): RfiRecord {
    return {
        id: 'rfi-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        rfiNumber: 1,
        reference: 'RFI-001',
        title: 'Plant noise',
        question: 'Please confirm.',
        status: 'closed',
        priority: 'medium',
        responsibleStakeholderId: null,
        responsibleParty: null,
        responsiblePartyLabel: 'Unassigned',
        dueDate: null,
        responseText: 'Confirmed.',
        responseDate: '2026-05-14',
        sourceNoteId: null,
        sourceNote: null,
        evidenceLinks: [],
        auditTrail: [],
        displayState: 'none',
        isOverdue: false,
        rowVersion: 3,
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        deletedAt: null,
    };
}

describe('/api/projects/[projectId]/rfis/[rfiId]/close', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue({
            user: {
                id: 'user-1',
                email: 'user@example.com',
                displayName: 'Test User',
                organizationId: 'org-1',
            },
            status: 200,
        });
    });

    it('closes an RFI with actor context and emits a refresh event', async () => {
        mockRfiService.close.mockResolvedValue(rfi());

        const response = await POST(request('http://localhost/api/projects/project-1/rfis/rfi-1/close'), params);

        expect(response.status).toBe(200);
        expect(mockRfiService.close).toHaveBeenCalledWith({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            actorName: 'Test User',
        });
        expect(mockEmitProjectEvent).toHaveBeenCalledWith('project-1', {
            type: 'entity_updated',
            entity: 'rfi',
            op: 'updated',
            id: 'rfi-1',
        });
    });
});
