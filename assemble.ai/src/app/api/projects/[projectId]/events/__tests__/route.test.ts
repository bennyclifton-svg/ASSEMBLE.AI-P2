/**
 * @jest-environment node
 */
const mockGetCurrentUser = jest.fn();
const mockProjectsLimit = jest.fn();
const mockProjectsWhere = jest.fn(() => ({ limit: mockProjectsLimit }));
const mockProjectsFrom = jest.fn(() => ({ where: mockProjectsWhere }));
const mockSelect = jest.fn(() => ({ from: mockProjectsFrom }));

const mockRegister = jest.fn();
const mockUnregister = jest.fn();

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));
jest.mock('@/lib/db', () => ({
    db: { select: () => mockSelect() },
}));
jest.mock('@/lib/agents/project-events', () => ({
    registerProjectConnection: (...a: unknown[]) => mockRegister(...a),
    unregisterProjectConnection: (...a: unknown[]) => mockUnregister(...a),
}));

import { GET } from '../route';

beforeEach(() => {
    jest.clearAllMocks();
});

const params = Promise.resolve({ projectId: 'proj-1' });

function makeRequest() {
    return new Request('http://localhost/api/projects/proj-1/events') as unknown as Parameters<
        typeof GET
    >[0];
}

describe('GET /api/projects/[projectId]/events', () => {
    test('401 when no user', async () => {
        mockGetCurrentUser.mockResolvedValue({ user: null, status: 401, error: 'unauth' });
        const res = await GET(makeRequest(), { params });
        expect(res.status).toBe(401);
    });

    test('400 when user has no organization', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u', organizationId: null },
        });
        const res = await GET(makeRequest(), { params });
        expect(res.status).toBe(400);
    });

    test('404 when project not found in user org', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u', organizationId: 'org-A' },
        });
        mockProjectsLimit.mockResolvedValue([]);
        const res = await GET(makeRequest(), { params });
        expect(res.status).toBe(404);
    });

    test('returns SSE stream and registers connection when project belongs to org', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'u', organizationId: 'org-A' },
        });
        mockProjectsLimit.mockResolvedValue([{ id: 'proj-1' }]);

        const res = await GET(makeRequest(), { params });
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/event-stream');

        // Read one chunk to trigger the start() callback.
        const reader = res.body!.getReader();
        const { value } = await reader.read();
        expect(value).toBeDefined();
        const text = new TextDecoder().decode(value!);
        expect(text).toContain('event: connected');

        expect(mockRegister).toHaveBeenCalledWith('proj-1', expect.anything());
        await reader.cancel();
        expect(mockUnregister).toHaveBeenCalledWith('proj-1', expect.anything());
    });
});
