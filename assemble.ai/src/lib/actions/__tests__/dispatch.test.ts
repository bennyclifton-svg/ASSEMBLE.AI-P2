/**
 * @jest-environment node
 */

import { z } from 'zod';

const mockOpenActionInvocation = jest.fn();
const mockFinishActionInvocation = jest.fn();
const mockProposeApproval = jest.fn();
const mockEmitProjectEvent = jest.fn();

jest.mock('../invocations', () => ({
    openActionInvocation: (...args: unknown[]) => mockOpenActionInvocation(...args),
    finishActionInvocation: (...args: unknown[]) => mockFinishActionInvocation(...args),
}));

jest.mock('@/lib/agents/approvals', () => ({
    proposeApproval: (...args: unknown[]) => mockProposeApproval(...args),
}));

jest.mock('@/lib/agents/project-events', () => ({
    emitProjectEvent: (...args: unknown[]) => mockEmitProjectEvent(...args),
}));

import { proposeAction } from '../dispatch';
import type { ActionContext, ActionDefinition } from '../types';

const action: ActionDefinition<{ description: string }, unknown> = {
    id: 'finance.variations.create',
    toolName: 'action_finance_variations_create',
    domain: 'finance',
    description: 'Create a variation',
    inputSchema: z.object({ description: z.string() }),
    preview: (_ctx, input) => ({
        entity: 'variation',
        entityId: null,
        summary: input.description,
        changes: [],
    }),
};

const ctx: ActionContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'workflow',
    actorId: 'workflow-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

describe('proposeAction audit fallback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockOpenActionInvocation.mockResolvedValue('invocation-1');
        mockFinishActionInvocation.mockResolvedValue(undefined);
        mockProposeApproval.mockResolvedValue({
            approvalId: 'approval-1',
            toolResult: {
                status: 'awaiting_approval',
                approvalId: 'approval-1',
                toolName: action.toolName,
                summary: 'Extra acoustic treatment',
            },
        });
    });

    it('still creates an approval when opening the action audit row fails', async () => {
        mockOpenActionInvocation.mockRejectedValueOnce(
            new Error('Failed query: insert into "action_invocations" (...) params: ...')
        );

        const result = await proposeAction({
            action,
            ctx,
            input: { description: 'Extra acoustic treatment' },
        });

        expect(result).toEqual(
            expect.objectContaining({
                invocationId: null,
                approvalId: 'approval-1',
                summary: 'Extra acoustic treatment',
            })
        );
        expect(mockProposeApproval).toHaveBeenCalledTimes(1);
        expect(mockFinishActionInvocation).not.toHaveBeenCalled();
    });

    it('keeps the approval even when finishing the action audit row fails', async () => {
        mockFinishActionInvocation.mockRejectedValueOnce(
            new Error('Failed query: update "action_invocations" (...) params: ...')
        );

        const result = await proposeAction({
            action,
            ctx,
            input: { description: 'Extra acoustic treatment' },
        });

        expect(result).toEqual(
            expect.objectContaining({
                invocationId: 'invocation-1',
                approvalId: 'approval-1',
                summary: 'Extra acoustic treatment',
            })
        );
        expect(mockProposeApproval).toHaveBeenCalledTimes(1);
        expect(mockFinishActionInvocation).toHaveBeenCalledWith(
            'invocation-1',
            expect.objectContaining({
                approvalId: 'approval-1',
                status: 'proposed',
            })
        );
    });
});
