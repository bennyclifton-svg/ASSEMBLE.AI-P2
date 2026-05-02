const mockWhere = jest.fn();
const mockLeftJoin = jest.fn(() => ({ where: mockWhere }));
const mockFrom = jest.fn(() => ({ leftJoin: mockLeftJoin }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockProposeApproval = jest.fn();
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

jest.mock('../../approvals', () => ({
    proposeApproval: (...args: unknown[]) => mockProposeApproval(...args),
}));

import { createVariationTool } from '../create-variation';

describe('create_variation execute', () => {
    beforeEach(() => {
        mockWhere.mockReset();
        mockLeftJoin.mockClear();
        mockFrom.mockClear();
        mockSelect.mockClear();
        mockProposeApproval.mockReset();
        mockAssertProjectOrg.mockReset();
        mockProposeApproval.mockResolvedValue({
            toolResult: {
                status: 'awaiting_approval',
                approvalId: 'approval-1',
                toolName: 'create_variation',
                summary: 'Create Principal variation - Aborted Basement Ventilation',
            },
        });
    });

    it('resolves discipline and cost-line labels to a project costLineId before proposing', async () => {
        mockWhere.mockResolvedValueOnce([
            {
                id: 'cl-mech-dd',
                section: 'CONSULTANTS',
                costCode: null,
                activity: 'Detail Design',
                reference: null,
                stakeholderName: 'Mechanical',
                disciplineOrTrade: 'Mechanical',
            },
        ]);

        await createVariationTool.execute(
            {
                userId: 'user-1',
                organizationId: 'org-1',
                projectId: 'project-1',
                threadId: 'thread-1',
                runId: 'run-1',
            },
            {
                category: 'Principal',
                description: 'Aborted Basement Ventilation',
                status: 'Approved',
                disciplineOrTrade: 'Mechanical',
                costLineReference: 'Detail Design',
                amountApprovedCents: 777700,
            }
        );

        expect(mockProposeApproval).toHaveBeenCalledWith(
            expect.objectContaining({
                input: expect.objectContaining({
                    costLineId: 'cl-mech-dd',
                    costLineReference: 'Detail Design',
                    disciplineOrTrade: 'Mechanical',
                }),
                proposedDiff: expect.objectContaining({
                    changes: expect.arrayContaining([
                        expect.objectContaining({
                            label: 'Cost line',
                            after: 'Mechanical - Detail Design',
                        }),
                        expect.objectContaining({
                            label: 'Approved amount',
                            after: '$7,777',
                        }),
                    ]),
                }),
            })
        );
    });
});
