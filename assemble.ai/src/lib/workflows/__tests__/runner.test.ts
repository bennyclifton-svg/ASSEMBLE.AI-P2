/**
 * @jest-environment node
 */

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockGetAction = jest.fn();
const mockParseActionInput = jest.fn();
const mockPolicyForActor = jest.fn();
const mockProposeAction = jest.fn();

jest.mock('@/lib/db', () => ({
    db: {
        insert: (...args: unknown[]) => mockInsert(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
    },
}));

jest.mock('@/lib/actions', () => ({
    getAction: (...args: unknown[]) => mockGetAction(...args),
    parseActionInput: (...args: unknown[]) => mockParseActionInput(...args),
    policyForActor: (...args: unknown[]) => mockPolicyForActor(...args),
    proposeAction: (...args: unknown[]) => mockProposeAction(...args),
}));

import { createWorkflowFromPlan } from '../runner';
import type { WorkflowPlan } from '../types';

function setupDbMocks() {
    let stepNumber = 0;
    mockInsert.mockImplementation(() => ({
        values: (values: Record<string, unknown>) => ({
            returning: async () => {
                if (values.workflowKey) {
                    return [{ id: 'workflow-run-1' }];
                }
                stepNumber += 1;
                return [{ id: `workflow-step-${stepNumber}`, stepKey: values.stepKey }];
            },
        }),
    }));

    mockUpdate.mockImplementation(() => ({
        set: () => ({
            where: async () => undefined,
        }),
    }));
}

describe('createWorkflowFromPlan', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupDbMocks();
        mockGetAction.mockImplementation((id: string) => ({ id }));
        mockPolicyForActor.mockReturnValue('propose');
        mockParseActionInput.mockImplementation((_action: unknown, input: Record<string, unknown>) => {
            if (input.invalid) throw new Error('Invalid workflow step input');
            return input;
        });
        mockProposeAction.mockImplementation(async ({ action }: { action: { id: string } }) => ({
            invocationId: `invocation-${action.id}`,
            approvalId: `approval-${action.id}`,
            summary: `Propose ${action.id}`,
            proposedDiff: {
                entity: 'test',
                entityId: null,
                summary: `Propose ${action.id}`,
                changes: [],
            },
        }));
    });

    it('records a failed step instead of throwing away the whole workflow', async () => {
        const plan: WorkflowPlan = {
            workflowKey: 'issue-variation',
            userGoal: 'Issue variation',
            summary: 'Issue variation',
            executionBrief: 'Prepare issue variation workflow.',
            evidence: [],
            assumptions: [],
            steps: [
                {
                    stepKey: 'create_variation',
                    title: 'Create variation',
                    actionId: 'finance.variations.create',
                    input: { description: 'Extra acoustic treatment' },
                    dependencyStepKeys: [],
                    failurePolicy: 'abort_workflow',
                    risk: 'sensitive',
                },
                {
                    stepKey: 'update_cost_plan',
                    title: 'Update cost plan',
                    actionId: 'finance.cost_plan.update_line',
                    input: { invalid: true },
                    dependencyStepKeys: ['create_variation'],
                    failurePolicy: 'ask_user',
                    risk: 'propose',
                },
            ],
        };

        const result = await createWorkflowFromPlan({
            plan,
            userId: 'user-1',
            organizationId: 'org-1',
            projectId: 'project-1',
            threadId: 'thread-1',
            agentRunId: 'run-1',
        });

        expect(result.status).toBe('awaiting_approval');
        expect(result.steps.map((step) => step.state)).toEqual(['awaiting_approval', 'failed']);
        expect(result.steps[1].summary).toBe('Invalid workflow step input');
        expect(mockProposeAction).toHaveBeenCalledTimes(1);
        expect(mockProposeAction).toHaveBeenCalledWith(
            expect.objectContaining({ emit: true })
        );
    });

    it('only emits approval events for dependency-free workflow steps', async () => {
        const plan: WorkflowPlan = {
            workflowKey: 'issue-variation',
            userGoal: 'Issue variation',
            summary: 'Issue variation',
            executionBrief: 'Prepare issue variation workflow.',
            evidence: [],
            assumptions: [],
            steps: [
                {
                    stepKey: 'create_variation',
                    title: 'Create variation',
                    actionId: 'finance.variations.create',
                    input: { description: 'Extra acoustic treatment' },
                    dependencyStepKeys: [],
                    failurePolicy: 'abort_workflow',
                    risk: 'sensitive',
                },
                {
                    stepKey: 'create_note',
                    title: 'Create note',
                    actionId: 'correspondence.note.create',
                    input: { title: 'Variation note' },
                    dependencyStepKeys: ['create_variation'],
                    failurePolicy: 'continue',
                    risk: 'confirm',
                },
            ],
        };

        await createWorkflowFromPlan({
            plan,
            userId: 'user-1',
            organizationId: 'org-1',
            projectId: 'project-1',
            threadId: 'thread-1',
            agentRunId: 'run-1',
        });

        expect(mockProposeAction).toHaveBeenCalledTimes(2);
        expect(mockProposeAction.mock.calls[0][0]).toEqual(
            expect.objectContaining({ emit: true })
        );
        expect(mockProposeAction.mock.calls[1][0]).toEqual(
            expect.objectContaining({ emit: false })
        );
    });
});
