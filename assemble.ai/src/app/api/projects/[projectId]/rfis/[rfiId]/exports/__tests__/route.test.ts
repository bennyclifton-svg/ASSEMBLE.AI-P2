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

jest.mock('@/lib/rfi/issued-artefacts', () => ({
    rfiIssuedArtefactService: {
        list: jest.fn(),
        generate: jest.fn(),
    },
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

    return { RfiServiceError };
});

import { getCurrentUser } from '@/lib/auth/get-user';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { rfiIssuedArtefactService } from '@/lib/rfi/issued-artefacts';
import { RfiServiceError } from '@/lib/rfi/service';
import type { RfiIssuedArtefact } from '@/types/rfi';
import { GET, POST } from '../route';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockEmitProjectEvent = emitProjectEvent as jest.MockedFunction<typeof emitProjectEvent>;
const mockService = rfiIssuedArtefactService as jest.Mocked<typeof rfiIssuedArtefactService>;

function request(url: string, body?: unknown): NextRequest {
    return new Request(url, {
        method: body === undefined ? 'GET' : 'POST',
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

function artefact(overrides: Partial<RfiIssuedArtefact> = {}): RfiIssuedArtefact {
    return {
        id: 'export-1',
        rfiId: 'rfi-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        versionNumber: 1,
        format: 'pdf',
        fileAssetId: 'file-1',
        filename: 'RFI-001 - Plant noise - v01.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        hash: 'hash-1',
        sourceRfiRowVersion: 2,
        generatedBy: 'user-1',
        generatedByName: 'Test User',
        generatedAt: '2026-05-14T00:00:00.000Z',
        createdAt: '2026-05-14T00:00:00.000Z',
        ...overrides,
    };
}

describe('/api/projects/[projectId]/rfis/[rfiId]/exports', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue({ user: user(), status: 200 });
    });

    it('lists issued artefact versions for an RFI', async () => {
        mockService.list.mockResolvedValue({
            issuedArtefacts: [artefact()],
            latestIssuedArtefact: artefact(),
        });

        const response = await GET(request('http://localhost/api/projects/project-1/rfis/rfi-1/exports'), params);

        expect(response.status).toBe(200);
        expect(mockService.list).toHaveBeenCalledWith({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
        });
        const body = await response.json();
        expect(body.latestIssuedArtefact.filename).toBe('RFI-001 - Plant noise - v01.pdf');
    });

    it('generates an issued artefact with actor context and emits a refresh event', async () => {
        mockService.generate.mockResolvedValue(artefact());

        const response = await POST(
            request('http://localhost/api/projects/project-1/rfis/rfi-1/exports', { format: 'pdf' }),
            params
        );

        expect(response.status).toBe(201);
        expect(mockService.generate).toHaveBeenCalledWith({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            actorName: 'Test User',
            format: 'pdf',
        });
        expect(mockEmitProjectEvent).toHaveBeenCalledWith('project-1', {
            type: 'entity_updated',
            entity: 'rfi',
            op: 'updated',
            id: 'rfi-1',
        });
    });

    it('maps invalid export requests without emitting refresh events', async () => {
        mockService.generate.mockRejectedValue(
            new RfiServiceError('VALIDATION', 'Invalid RFI export format.', 400)
        );

        const response = await POST(
            request('http://localhost/api/projects/project-1/rfis/rfi-1/exports', { format: 'xlsx' }),
            params
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Invalid RFI export format.');
        expect(mockEmitProjectEvent).not.toHaveBeenCalled();
    });
});
