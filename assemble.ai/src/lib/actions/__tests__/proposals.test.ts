/**
 * @jest-environment node
 */

const mockReturning = jest.fn();
const mockValues = jest.fn(() => ({ returning: mockReturning }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockEmitChatEvent = jest.fn();

jest.mock('@/lib/db', () => ({
    db: {
        insert: () => mockInsert(),
    },
}));

jest.mock('@/lib/agents/events', () => ({
    emitChatEvent: (...args: unknown[]) => mockEmitChatEvent(...args),
}));

import { moneyDiffLabel, proposeApproval } from '../proposals';

const ctx = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

const proposedDiff = {
    entity: 'cost_line',
    entityId: 'cl-1',
    summary: 'Update cost line',
    changes: [{ field: 'budgetCents', label: 'Budget', before: 100, after: 200 }],
};

describe('action approval proposals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockReturning.mockResolvedValue([
            {
                id: 'approval-1',
                createdAt: new Date('2026-05-03T00:00:00.000Z'),
            },
        ]);
    });

    it('inserts a pending approval and emits awaiting_approval by default', async () => {
        const result = await proposeApproval({
            ctx,
            toolName: 'update_cost_line',
            toolUseId: 'toolu-1',
            input: { id: 'cl-1', budgetCents: 200 },
            proposedDiff,
            expectedRowVersion: 3,
        });

        expect(mockValues).toHaveBeenCalledWith(
            expect.objectContaining({
                runId: 'run-1',
                threadId: 'thread-1',
                organizationId: 'org-1',
                projectId: 'project-1',
                toolName: 'update_cost_line',
                toolUseId: 'toolu-1',
                input: { id: 'cl-1', budgetCents: 200 },
                proposedDiff,
                expectedRowVersion: 3,
                status: 'pending',
            })
        );
        expect(mockEmitChatEvent).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({
                type: 'awaiting_approval',
                runId: 'run-1',
                approvalId: 'approval-1',
                toolName: 'update_cost_line',
                proposedDiff,
            })
        );
        expect(result).toEqual({
            approvalId: 'approval-1',
            toolResult: {
                status: 'awaiting_approval',
                approvalId: 'approval-1',
                toolName: 'update_cost_line',
                summary: 'Update cost line',
            },
        });
    });

    it('can defer chat emission for blocked workflow approvals', async () => {
        await proposeApproval({
            ctx,
            toolName: 'update_cost_line',
            toolUseId: 'toolu-1',
            input: { id: 'cl-1', budgetCents: 200 },
            proposedDiff,
            expectedRowVersion: null,
            emit: false,
        });

        expect(mockEmitChatEvent).not.toHaveBeenCalled();
    });

    it('formats money diffs consistently for legacy tools', () => {
        expect(moneyDiffLabel(100000, 250000)).toBe('$1,000 \u2192 $2,500');
    });
});
