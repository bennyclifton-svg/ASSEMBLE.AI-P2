/**
 * @jest-environment node
 */

const mockWhere = jest.fn();
const mockLeftJoin = jest.fn(() => ({ where: mockWhere }));
const mockFrom = jest.fn(() => ({ leftJoin: mockLeftJoin }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
    },
}));

jest.mock('@/lib/agents/applicators', () => ({
    applyCreateVariation: jest.fn(),
}));

import { createVariationAction } from '../create-variation';
import type { ActionContext } from '../../types';

const ctx: ActionContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'workflow',
    actorId: 'workflow-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

describe('finance.variations.create action', () => {
    beforeEach(() => {
        mockWhere.mockReset();
        mockLeftJoin.mockClear();
        mockFrom.mockClear();
        mockSelect.mockClear();
    });

    it('resolves typoed cost-line labels in workflow proposals', async () => {
        mockWhere.mockResolvedValueOnce([
            {
                id: 'cl-fire',
                section: 'SERVICES',
                costCode: '4.20',
                activity: 'Fire services + fire engineering',
                reference: null,
                stakeholderName: null,
                disciplineOrTrade: 'Fire',
            },
            {
                id: 'cl-mech',
                section: 'SERVICES',
                costCode: '4.10',
                activity: 'Mechanical services',
                reference: 'HVAC',
                stakeholderName: null,
                disciplineOrTrade: 'Mechanical',
            },
        ]);

        const proposal = await createVariationAction.prepareProposal?.(ctx, {
            category: 'Principal',
            description: '12 additional fire hydrants to computer rooms',
            status: 'Approved',
            costLineReference: 'Fire Servcies',
            amountApprovedCents: 77700,
        });

        expect(proposal?.input).toEqual(
            expect.objectContaining({
                costLineId: 'cl-fire',
                costLineReference: 'Fire Servcies',
            })
        );
        expect(proposal?.proposedDiff.changes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: 'Cost line',
                    after: 'Fire - 4.20 - Fire services + fire engineering',
                }),
            ])
        );
    });

    it('does not accept Submitted as a variation status', () => {
        expect(() =>
            createVariationAction.inputSchema.parse({
                category: 'Principal',
                description: 'Additional fire hydrants',
                status: 'Submitted',
            })
        ).toThrow(/Invalid option/);
    });
});
