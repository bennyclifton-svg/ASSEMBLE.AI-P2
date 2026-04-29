/**
 * Multi-tenant safety tests.
 *
 * The single most important property to defend: a tool call originating in
 * organization A's chat thread must NEVER be able to read organization B's
 * project data. assertProjectOrg is the chokepoint — these tests lock its
 * behaviour.
 */

import { CrossTenantAccessError, assertProjectOrg, type ToolContext } from '../_context';

// Mock the database module so we can control what `select` returns.
const mockLimit = jest.fn();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
    },
}));

const ctx: ToolContext = {
    userId: 'user-A',
    organizationId: 'org-A',
    projectId: 'proj-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

beforeEach(() => {
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockClear();
    mockLimit.mockClear();
});

describe('assertProjectOrg', () => {
    it('passes when project belongs to caller org', async () => {
        mockLimit.mockResolvedValueOnce([{ organizationId: 'org-A' }]);
        await expect(assertProjectOrg(ctx)).resolves.toBeUndefined();
    });

    it('throws CrossTenantAccessError when project belongs to a different org', async () => {
        mockLimit.mockResolvedValueOnce([{ organizationId: 'org-B' }]);
        await expect(assertProjectOrg(ctx)).rejects.toBeInstanceOf(CrossTenantAccessError);
    });

    it('throws CrossTenantAccessError when project does not exist', async () => {
        mockLimit.mockResolvedValueOnce([]);
        await expect(assertProjectOrg(ctx)).rejects.toBeInstanceOf(CrossTenantAccessError);
    });

    it('throws CrossTenantAccessError when called with a foreign projectId', async () => {
        // Even before hitting the DB, attempting to reach a project not in scope is rejected.
        await expect(assertProjectOrg(ctx, 'someone-elses-project')).rejects.toBeInstanceOf(
            CrossTenantAccessError
        );
        expect(mockSelect).not.toHaveBeenCalled();
    });
});
