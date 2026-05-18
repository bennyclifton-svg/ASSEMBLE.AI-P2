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
            promoteFromNote: jest.fn(),
        },
        RfiServiceError,
    };
});

import { getCurrentUser } from '@/lib/auth/get-user';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { rfiService, RfiServiceError } from '@/lib/rfi/service';
import type { RfiRecord } from '@/types/rfi';
import { POST } from '../route';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockEmitProjectEvent = emitProjectEvent as jest.MockedFunction<typeof emitProjectEvent>;
const mockRfiService = rfiService as jest.Mocked<typeof rfiService>;

function request(url: string, body?: unknown): NextRequest {
    return new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    }) as unknown as NextRequest;
}

const params = { params: Promise.resolve({ projectId: 'project-1' }) };

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
        title: 'Legacy RFI note',
        question: 'Please confirm.',
        status: 'draft',
        priority: 'medium',
        responsibleStakeholderId: null,
        responsibleParty: null,
        responsiblePartyLabel: 'Unassigned',
        dueDate: null,
        responseText: null,
        responseDate: null,
        sourceNoteId: 'note-1',
        sourceNote: { id: 'note-1', title: 'Legacy RFI note' },
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

describe('/api/projects/[projectId]/rfis/promote-note', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue({
            user: user(),
            status: 200,
        });
    });

    it('promotes an RFI note through the service', async () => {
        mockRfiService.promoteFromNote.mockResolvedValue(rfi());

        const response = await POST(
            request('http://localhost/api/projects/project-1/rfis/promote-note', { noteId: 'note-1' }),
            params
        );

        expect(response.status).toBe(201);
        expect(mockRfiService.promoteFromNote).toHaveBeenCalledWith({
            projectId: 'project-1',
            organizationId: 'org-1',
            noteId: 'note-1',
        });
        expect(mockEmitProjectEvent).toHaveBeenCalledWith('project-1', {
            type: 'entity_updated',
            entity: 'rfi',
            op: 'created',
            id: 'rfi-1',
        });
    });

    it('maps non-RFI notes to validation errors', async () => {
        mockRfiService.promoteFromNote.mockRejectedValue(
            new RfiServiceError('VALIDATION', 'Only notes with type rfi can be promoted.', 400)
        );

        const response = await POST(
            request('http://localhost/api/projects/project-1/rfis/promote-note', { noteId: 'note-2' }),
            params
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Only notes with type rfi can be promoted.');
        expect(mockEmitProjectEvent).not.toHaveBeenCalled();
    });
});
