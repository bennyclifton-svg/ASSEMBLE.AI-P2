/**
 * @jest-environment node
 */

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/actions', () => ({
    getAction: jest.fn(),
    parseActionInput: jest.fn(),
    runAction: jest.fn(),
}));

import { getCurrentUser } from '@/lib/auth/get-user';
import { getAction, parseActionInput, runAction } from '@/lib/actions';
import { POST } from '../route';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockGetAction = getAction as jest.MockedFunction<typeof getAction>;
const mockParseActionInput = parseActionInput as jest.MockedFunction<typeof parseActionInput>;
const mockRunAction = runAction as jest.MockedFunction<typeof runAction>;

const params = { params: Promise.resolve({ projectId: 'project-1' }) };

function request(body?: unknown): Request {
    return new Request('http://localhost/api/projects/project-1/weekly-report-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

function user(organizationId: string | null) {
    return {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        organizationId,
    };
}

describe('/api/projects/[projectId]/weekly-report-draft', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAction.mockReturnValue({ id: 'correspondence.weekly_report.create_draft' } as never);
        mockParseActionInput.mockReturnValue({ reportingPeriodStart: '2026-05-08', reportingPeriodEnd: '2026-05-14' } as never);
        mockRunAction.mockResolvedValue({
            invocationId: 'invocation-1',
            output: { id: 'report-1', sectionCount: 5 },
        } as never);
    });

    it('rejects unauthenticated requests', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: null,
            error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
            status: 401,
        });

        const response = await POST(request({}), params);

        expect(response.status).toBe(401);
        expect(mockRunAction).not.toHaveBeenCalled();
    });

    it('runs the registered weekly report draft action for the current project', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: user('org-1'),
            status: 200,
        });

        const response = await POST(
            request({ reportingPeriodStart: '2026-05-08', reportingPeriodEnd: '2026-05-14' }),
            params
        );

        expect(response.status).toBe(201);
        expect(mockGetAction).toHaveBeenCalledWith('correspondence.weekly_report.create_draft');
        expect(mockParseActionInput).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'correspondence.weekly_report.create_draft' }),
            { reportingPeriodStart: '2026-05-08', reportingPeriodEnd: '2026-05-14' }
        );
        expect(mockRunAction).toHaveBeenCalledWith({
            action: expect.objectContaining({ id: 'correspondence.weekly_report.create_draft' }),
            ctx: {
                userId: 'user-1',
                organizationId: 'org-1',
                projectId: 'project-1',
                actorKind: 'user',
                actorId: 'user-1',
            },
            input: { reportingPeriodStart: '2026-05-08', reportingPeriodEnd: '2026-05-14' },
        });
        await expect(response.json()).resolves.toEqual({ id: 'report-1', sectionCount: 5 });
    });
});
