const mockLimit = jest.fn();
const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockLeftJoin = jest.fn(() => ({ where: mockWhere }));
const mockFrom = jest.fn(() => ({ leftJoin: mockLeftJoin }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockAssertProjectOrg = jest.fn();

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
    },
}));

jest.mock('../_context', () => ({
    assertProjectOrg: (...args: unknown[]) => mockAssertProjectOrg(...args),
    CrossTenantAccessError: class CrossTenantAccessError extends Error {},
}));

import { listCostLinesTool } from '../list-cost-lines';

const fireRow = {
    id: 'cl-fire',
    section: 'SERVICES',
    masterStage: 'delivery',
    costCode: '4.20',
    activity: 'Fire services + fire engineering',
    reference: null,
    budgetCents: 1000000,
    approvedContractCents: 0,
    stakeholderId: null,
    stakeholderName: null,
    disciplineOrTrade: 'Fire',
    sortOrder: 1,
};

const mechanicalRow = {
    id: 'cl-mech',
    section: 'SERVICES',
    masterStage: 'delivery',
    costCode: '4.10',
    activity: 'Mechanical services',
    reference: 'HVAC',
    budgetCents: 2000000,
    approvedContractCents: 0,
    stakeholderId: null,
    stakeholderName: null,
    disciplineOrTrade: 'Mechanical',
    sortOrder: 2,
};

describe('list_cost_lines execute', () => {
    beforeEach(() => {
        mockLimit.mockReset();
        mockOrderBy.mockClear();
        mockWhere.mockClear();
        mockLeftJoin.mockClear();
        mockFrom.mockClear();
        mockSelect.mockClear();
        mockAssertProjectOrg.mockReset();
    });

    it('supports fuzzy query matching for typoed cost-line labels', async () => {
        mockLimit.mockResolvedValueOnce([mechanicalRow, fireRow]);

        const result = await listCostLinesTool.execute(
            {
                userId: 'user-1',
                organizationId: 'org-1',
                projectId: 'project-1',
                threadId: 'thread-1',
                runId: 'run-1',
            },
            { query: 'Fire Servcies' }
        );

        expect(result.rows).toEqual([
            expect.objectContaining({
                id: 'cl-fire',
                label: 'Fire - 4.20 - Fire services + fire engineering',
                matchScore: expect.any(Number),
            }),
        ]);
    });

    it('falls back to fuzzy matching when an exact section filter returns no rows', async () => {
        mockLimit
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([mechanicalRow, fireRow]);

        const result = await listCostLinesTool.execute(
            {
                userId: 'user-1',
                organizationId: 'org-1',
                projectId: 'project-1',
                threadId: 'thread-1',
                runId: 'run-1',
            },
            { section: 'Fire Servcies' }
        );

        expect(result.rows).toEqual([
            expect.objectContaining({
                id: 'cl-fire',
                matchScore: expect.any(Number),
            }),
        ]);
    });
});
