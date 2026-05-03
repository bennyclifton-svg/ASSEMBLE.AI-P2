/**
 * @jest-environment node
 */

const mockLimit = jest.fn();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockInnerJoin = jest.fn(() => ({ where: mockWhere }));
const mockFrom = jest.fn(() => ({ where: mockWhere, innerJoin: mockInnerJoin }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
    },
}));

import { createProgramMilestoneAction } from '../create-program-milestone';
import { updateProgramMilestoneAction } from '../update-program-milestone';
import type { ActionContext } from '../../types';

const ctx: ActionContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'agent',
    actorId: 'run-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

describe('program milestone actions', () => {
    beforeEach(() => {
        mockLimit.mockReset();
        mockWhere.mockClear();
        mockInnerJoin.mockClear();
        mockFrom.mockClear();
        mockSelect.mockClear();
    });

    it('previews milestone creation against the resolved activity', async () => {
        mockLimit.mockResolvedValueOnce([{ id: 'act-1', name: 'Design approvals' }]);

        const proposal = await createProgramMilestoneAction.prepareProposal?.(ctx, {
            activityId: 'act-1',
            name: 'DA lodgement',
            date: '2026-06-01',
        });

        expect(proposal?.proposedDiff.summary).toBe('Create milestone - DA lodgement');
        expect(proposal?.proposedDiff.changes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ label: 'Activity', after: 'Design approvals' }),
                expect.objectContaining({ label: 'Date', after: '2026-06-01' }),
            ])
        );
    });

    it('previews milestone updates with the captured row version', async () => {
        mockLimit.mockResolvedValueOnce([
            {
                id: 'ms-1',
                activityId: 'act-1',
                name: 'DA lodgement',
                date: '2026-06-01',
                sortOrder: 2,
                rowVersion: 4,
            },
        ]);

        const proposal = await updateProgramMilestoneAction.prepareProposal?.(ctx, {
            id: 'ms-1',
            date: '2026-06-05',
        });

        expect(proposal?.expectedRowVersion).toBe(4);
        expect(proposal?.proposedDiff.summary).toBe('Update milestone - DA lodgement');
        expect(proposal?.proposedDiff.changes).toEqual([
            expect.objectContaining({
                label: 'Date',
                before: '2026-06-01',
                after: '2026-06-05',
            }),
        ]);
    });

    it('validates milestone input schemas', () => {
        expect(
            createProgramMilestoneAction.inputSchema.safeParse({
                activityId: 'act-1',
                name: 'DA lodgement',
                date: '2026-06-01',
            }).success
        ).toBe(true);
        expect(
            createProgramMilestoneAction.inputSchema.safeParse({
                activityId: 'act-1',
                name: 'DA lodgement',
                date: '01/06/2026',
            }).success
        ).toBe(false);
        expect(updateProgramMilestoneAction.inputSchema.safeParse({ id: 'ms-1' }).success).toBe(false);
    });
});
