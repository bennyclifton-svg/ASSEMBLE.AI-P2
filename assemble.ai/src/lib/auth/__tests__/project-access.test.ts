jest.mock('next/server', () => {
    class MockNextResponse {
        status: number;
        private readonly body: unknown;

        constructor(body: unknown, init?: { status?: number }) {
            this.body = body;
            this.status = init?.status ?? 200;
        }

        static json(body: unknown, init?: { status?: number }) {
            return new MockNextResponse(body, init);
        }

        async json() {
            return this.body;
        }
    }

    return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/projects/workspace-access', () => ({
    getProjectForWorkspace: jest.fn(),
}));

jest.mock('@/lib/subscription/entitlement-guards', () => ({
    requireEntitlementActionForUser: jest.fn(),
}));

jest.mock('@/lib/subscription/document-gates', () => ({
    requireDocumentUploadAllowedForProject: jest.fn(),
    requireDocumentExportAllowedForProject: jest.fn(),
}));

jest.mock('@/lib/subscription/ai-usage-meter', () => ({
    requireAiActionAllowed: jest.fn(),
}));

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { getProjectForWorkspace } from '@/lib/projects/workspace-access';
import { requireEntitlementActionForUser } from '@/lib/subscription/entitlement-guards';
import {
    requireDocumentExportAllowedForProject,
    requireDocumentUploadAllowedForProject,
} from '@/lib/subscription/document-gates';
import {
    isAccessDenied,
    requireExportProjectAccess,
    requireProjectReadAccess,
    requireUploadProjectAccess,
    requireWritableProjectAccess,
} from '../project-access';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockGetProjectForWorkspace = getProjectForWorkspace as jest.MockedFunction<typeof getProjectForWorkspace>;
const mockRequireWrite = requireEntitlementActionForUser as jest.MockedFunction<typeof requireEntitlementActionForUser>;
const mockRequireUpload = requireDocumentUploadAllowedForProject as jest.MockedFunction<typeof requireDocumentUploadAllowedForProject>;
const mockRequireExport = requireDocumentExportAllowedForProject as jest.MockedFunction<typeof requireDocumentExportAllowedForProject>;

function user(organizationId: string | null = 'org-1') {
    return {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        organizationId,
    };
}

describe('project access helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue({ user: user(), status: 200 });
        mockGetProjectForWorkspace.mockResolvedValue({ organizationId: 'org-1' });
    });

    it('requires a Better Auth user and workspace', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: null,
            error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
            status: 401,
        });

        const result = await requireProjectReadAccess('project-1');

        expect(isAccessDenied(result)).toBe(true);
        if (isAccessDenied(result)) expect(result.response.status).toBe(401);
    });

    it('requires project ownership before read access', async () => {
        mockGetProjectForWorkspace.mockResolvedValue(null);

        const result = await requireProjectReadAccess('project-1');

        expect(isAccessDenied(result)).toBe(true);
        expect(mockGetProjectForWorkspace).toHaveBeenCalledWith('project-1', 'org-1');
        if (isAccessDenied(result)) expect(result.response.status).toBe(404);
    });

    it('requires writable entitlement before mutations', async () => {
        const denied = NextResponse.json({ code: 'ENTITLEMENT_REQUIRED' }, { status: 402 });
        mockRequireWrite.mockResolvedValue({
            allowed: false,
            entitlement: null,
            response: denied,
        });

        const result = await requireWritableProjectAccess('project-1');

        expect(mockRequireWrite).toHaveBeenCalledWith('user-1', 'write');
        expect(isAccessDenied(result)).toBe(true);
        if (isAccessDenied(result)) expect(result.response.status).toBe(402);
    });

    it('allows upload helper access through the document upload gate', async () => {
        mockRequireUpload.mockResolvedValue({
            allowed: true,
            entitlement: {} as never,
        });

        const result = await requireUploadProjectAccess({
            projectId: 'project-1',
            incomingDocumentCount: 1,
        });

        expect(isAccessDenied(result)).toBe(false);
        expect(mockRequireUpload).toHaveBeenCalledWith({
            userId: 'user-1',
            organizationId: 'org-1',
            projectId: 'project-1',
            incomingDocumentCount: 1,
        });
    });

    it('allows read-only export/download exceptions through the export gate', async () => {
        mockRequireExport.mockResolvedValue({
            allowed: true,
            entitlement: {} as never,
        });

        const result = await requireExportProjectAccess('project-1');

        expect(isAccessDenied(result)).toBe(false);
        expect(mockRequireExport).toHaveBeenCalledWith({
            userId: 'user-1',
            organizationId: 'org-1',
            projectId: 'project-1',
        });
    });
});
