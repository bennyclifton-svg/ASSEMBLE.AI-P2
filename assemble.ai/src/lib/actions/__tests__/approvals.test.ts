/**
 * @jest-environment node
 */

import { z } from 'zod';
import type { ActionDefinition } from '../types';

const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockEmitChatEvent = jest.fn();
const mockEmitProjectEvent = jest.fn();
const mockWorkflowDependenciesAreApplied = jest.fn();
const mockSyncWorkflowStepForApproval = jest.fn();

jest.mock('@/lib/db', () => ({
    db: {
        update: () => mockUpdate(),
    },
}));

jest.mock('@/lib/agents/events', () => ({
    emitChatEvent: (...args: unknown[]) => mockEmitChatEvent(...args),
}));

jest.mock('@/lib/agents/project-events', () => ({
    emitProjectEvent: (...args: unknown[]) => mockEmitProjectEvent(...args),
}));

jest.mock('@/lib/workflows', () => ({
    workflowDependenciesAreApplied: (...args: unknown[]) => mockWorkflowDependenciesAreApplied(...args),
    syncWorkflowStepForApproval: (...args: unknown[]) => mockSyncWorkflowStepForApproval(...args),
}));

jest.mock('@/lib/agents/applicators', () => ({
    applyCreateCostLine: jest.fn(),
    applyRecordInvoice: jest.fn(),
    applyCreateRisk: jest.fn(),
    applyUpdateRisk: jest.fn(),
    applyUpdateVariation: jest.fn(),
    applyCreateMeeting: jest.fn(),
}));

import {
    approveActionProposal,
    rejectActionProposal,
    type ActionApproval,
} from '../approvals';
import { clearActionRegistryForTests, registerAction } from '../registry';

const baseApproval = {
    id: 'approval-1',
    runId: 'run-1',
    threadId: 'thread-1',
    organizationId: 'org-A',
    projectId: 'proj-1',
    toolName: 'test_update_cost_line',
    toolUseId: 'toolu_x',
    input: { id: 'cl-1', budgetCents: 500000 },
    proposedDiff: { entity: 'cost_line', entityId: 'cl-1', summary: 'x', changes: [] },
    status: 'pending',
    appliedOutput: null,
    expectedRowVersion: 3,
    respondedBy: null,
    respondedAt: null,
    expiresAt: null,
    createdAt: new Date('2026-05-03T00:00:00.000Z'),
} as ActionApproval;

beforeEach(() => {
    jest.clearAllMocks();
    clearActionRegistryForTests();
    mockUpdateReturning.mockResolvedValue([{ id: 'approval-1' }]);
    mockWorkflowDependenciesAreApplied.mockResolvedValue({ ok: true });
    mockSyncWorkflowStepForApproval.mockResolvedValue([]);
});

function registerTestAction(
    overrides: Partial<ActionDefinition<{ id: string; budgetCents: number }, Record<string, unknown>>> = {}
) {
    const apply = overrides.apply ?? jest.fn(async () => ({ id: 'cl-1', budgetCents: 275000 }));
    const action = registerAction({
        id: 'test.cost-line.update',
        toolName: 'test_update_cost_line',
        domain: 'test',
        description: 'Update a test cost line',
        inputSchema: z.object({
            id: z.string(),
            budgetCents: z.number(),
        }),
        emits: [{ entity: 'cost_line', op: 'updated' }],
        apply,
        ...overrides,
    });
    return { action, apply };
}

describe('action approval lifecycle', () => {
    it('applies a registered action, merges override input, and emits project/chat events', async () => {
        const { apply } = registerTestAction();

        const result = await approveActionProposal({
            approval: baseApproval,
            userId: 'user-A',
            overrideInput: { budgetCents: 275000 },
        });

        expect(result).toEqual({
            status: 'applied',
            output: { id: 'cl-1', budgetCents: 275000 },
            newlyActionableApprovals: [],
        });
        expect(apply).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-A',
                organizationId: 'org-A',
                projectId: 'proj-1',
                actorKind: 'user',
            }),
            { id: 'cl-1', budgetCents: 275000 },
            { expectedRowVersion: 3 }
        );
        expect(mockEmitChatEvent).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({
                type: 'approval_resolved',
                approvalId: 'approval-1',
                status: 'applied',
            })
        );
        expect(mockEmitProjectEvent).toHaveBeenCalledWith('proj-1', {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'updated',
            id: 'cl-1',
        });
    });

    it('lets actions emit custom project events', async () => {
        const emitEvents = jest.fn();
        registerTestAction({
            emits: [],
            emitEvents,
        });

        const result = await approveActionProposal({
            approval: baseApproval,
            userId: 'user-A',
        });

        expect(result.status).toBe('applied');
        expect(emitEvents).toHaveBeenCalledWith(
            expect.objectContaining({ projectId: 'proj-1' }),
            { id: 'cl-1', budgetCents: 275000 }
        );
        expect(mockEmitProjectEvent).not.toHaveBeenCalled();
    });

    it('emits newly actionable workflow approvals after applying', async () => {
        registerTestAction();
        mockSyncWorkflowStepForApproval.mockResolvedValueOnce([
            {
                id: 'approval-next',
                runId: 'run-1',
                toolName: 'create_note',
                proposedDiff: { entity: 'note', entityId: null, summary: 'Create note', changes: [] },
                createdAt: '2026-05-03T00:00:00.000Z',
            },
        ]);

        const result = await approveActionProposal({
            approval: baseApproval,
            userId: 'user-A',
        });

        expect(result.status).toBe('applied');
        expect(mockEmitChatEvent).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({
                type: 'awaiting_approval',
                approvalId: 'approval-next',
                toolName: 'create_note',
            })
        );
    });

    it('returns blocked before claiming when workflow dependencies are not applied', async () => {
        registerTestAction();
        mockWorkflowDependenciesAreApplied.mockResolvedValue({
            ok: false,
            reason: 'Earlier workflow step is still waiting.',
        });

        const result = await approveActionProposal({
            approval: baseApproval,
            userId: 'user-A',
        });

        expect(result).toEqual({
            status: 'blocked',
            reason: 'Earlier workflow step is still waiting.',
        });
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockEmitProjectEvent).not.toHaveBeenCalled();
    });

    it('marks conflicts and skips project events', async () => {
        registerTestAction({
            apply: undefined,
            applyResult: jest.fn(async () => ({ kind: 'conflict' as const, reason: 'version moved' })),
        });

        const result = await approveActionProposal({
            approval: baseApproval,
            userId: 'user-A',
        });

        expect(result).toEqual({ status: 'conflict', reason: 'version moved' });
        expect(mockEmitChatEvent).toHaveBeenCalledWith(
            'thread-1',
            expect.objectContaining({
                type: 'approval_resolved',
                status: 'conflict',
                error: 'version moved',
            })
        );
        expect(mockEmitProjectEvent).not.toHaveBeenCalled();
    });

    it('rejects a pending proposal and emits approval resolution only', async () => {
        const result = await rejectActionProposal({
            approval: baseApproval,
            userId: 'user-A',
        });

        expect(result).toEqual({ status: 'rejected' });
        expect(mockSyncWorkflowStepForApproval).toHaveBeenCalledWith({
            approvalId: 'approval-1',
            state: 'rejected',
            error: { reason: 'User rejected the proposed action.' },
        });
        expect(mockEmitChatEvent).toHaveBeenCalledWith('thread-1', {
            type: 'approval_resolved',
            approvalId: 'approval-1',
            status: 'rejected',
        });
        expect(mockEmitProjectEvent).not.toHaveBeenCalled();
    });
});
