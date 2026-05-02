/**
 * start_issue_variation_workflow - create the first dependency-aware workflow plan.
 *
 * The tool creates workflow state and action-backed approval cards. It does not
 * apply any project data changes directly.
 */

import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    buildIssueVariationPlan,
    createWorkflowFromPlan,
    issueVariationWorkflowInputSchema,
    type IssueVariationWorkflowInput,
} from '@/lib/workflows';
import {
    getAction,
    parseActionInput,
    policyForActor,
    proposeAction,
} from '@/lib/actions';
import type { ActionContext, ActionPolicy } from '@/lib/actions/types';
import type { WorkflowPlan, WorkflowPlanStep } from '@/lib/workflows/types';

const TOOL = 'start_issue_variation_workflow';

interface StartIssueVariationWorkflowOutput {
    status: 'workflow_plan_ready';
    workflowRunId: string;
    workflowKey: string;
    executionBrief: string;
    steps: Array<{
        id: string;
        stepKey: string;
        title: string;
        actionId: string;
        state: string;
        approvalId: string | null;
        risk: string;
        dependencyStepIds: string[];
        summary: string | null;
    }>;
}

const definition: AgentToolDefinition<
    IssueVariationWorkflowInput,
    StartIssueVariationWorkflowOutput
> = {
    spec: {
        name: TOOL,
        description:
            'Start the issue-variation workflow. Use this when the user wants to create/issue a variation and the operational outcome may also require cost-plan, programme, and note/correspondence steps. The tool creates a workflow run, dependency-aware workflow steps, and explicit approval cards backed by registered application actions. It does not apply project data directly. Gather evidence first with read tools; ask one branch-setting question only if a required mapping is genuinely ambiguous.',
        inputSchema: {
            type: 'object',
            properties: {
                userGoal: { type: 'string' },
                evidence: { type: 'array', items: { type: 'string' } },
                assumptions: { type: 'array', items: { type: 'string' } },
                variation: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            enum: ['Principal', 'Contractor', 'Lessor Works'],
                            description:
                                'Variation category. Defaults to Principal when the request comes from the client/principal and no category is supplied.',
                        },
                        description: { type: 'string' },
                        status: {
                            type: 'string',
                            enum: ['Forecast', 'Submitted', 'Approved', 'Rejected', 'Withdrawn'],
                            description:
                                'Variation status. Defaults to Submitted for issue-variation workflows.',
                        },
                        costLineId: { type: 'string' },
                        costLineReference: { type: 'string' },
                        disciplineOrTrade: { type: 'string' },
                        amountForecastCents: { type: 'integer', minimum: 0 },
                        amountApprovedCents: { type: 'integer', minimum: 0 },
                        dateSubmitted: { type: 'string', description: 'YYYY-MM-DD.' },
                        dateApproved: { type: 'string', description: 'YYYY-MM-DD.' },
                        requestedBy: { type: 'string' },
                        approvedBy: { type: 'string' },
                    },
                    required: ['description'],
                },
                costLineUpdate: {
                    type: 'object',
                    description:
                        'Optional cost-plan update. Include only when the workflow should change cost-line fields such as budget or approved contract. If the cost line is only being linked to the variation, put the id on variation.costLineId and omit this object.',
                    properties: {
                        id: { type: 'string' },
                        activity: { type: 'string' },
                        section: { type: 'string' },
                        costCode: { type: 'string' },
                        reference: { type: 'string' },
                        budgetCents: { type: 'integer', minimum: 0 },
                        approvedContractCents: { type: 'integer', minimum: 0 },
                        masterStage: {
                            type: 'string',
                            enum: [
                                'initiation',
                                'schematic_design',
                                'design_development',
                                'procurement',
                                'delivery',
                            ],
                        },
                    },
                },
                programActivityUpdate: {
                    type: 'object',
                    description:
                        'Optional programme update. Include only when the workflow should change programme fields such as dates, name, order, or stage. If the programme activity is only context for the variation/note, record it in evidence, assumptions, or note content and omit this object.',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        parentId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                        startDate: {
                            anyOf: [{ type: 'string' }, { type: 'null' }],
                            description: 'YYYY-MM-DD or null.',
                        },
                        endDate: {
                            anyOf: [{ type: 'string' }, { type: 'null' }],
                            description: 'YYYY-MM-DD or null.',
                        },
                        collapsed: { type: 'boolean' },
                        masterStage: {
                            anyOf: [
                                {
                                    type: 'string',
                                    enum: [
                                        'initiation',
                                        'schematic_design',
                                        'design_development',
                                        'procurement',
                                        'delivery',
                                    ],
                                },
                                { type: 'null' },
                            ],
                        },
                        color: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                        sortOrder: { type: 'integer' },
                    },
                },
                note: {
                    type: 'object',
                    description:
                        'Optional note to create as part of the variation workflow. If omitted, the workflow creates a brief variation note from the supplied variation and mapping context.',
                    properties: {
                        title: { type: 'string' },
                        content: { type: 'string' },
                        isStarred: { type: 'boolean' },
                        color: { type: 'string', enum: ['yellow', 'blue', 'green', 'pink', 'white'] },
                        type: {
                            type: 'string',
                            enum: ['rfi', 'notice', 'eot', 'defect', 'variation', 'risk', 'transmittal', 'review', 'note'],
                        },
                        status: { type: 'string', enum: ['open', 'closed'] },
                        noteDate: { type: 'string', description: 'YYYY-MM-DD.' },
                        documentIds: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
            required: ['variation'],
        },
    },
    mutating: true,
    validate(input: unknown): IssueVariationWorkflowInput {
        const parsed = issueVariationWorkflowInputSchema.safeParse(input);
        if (!parsed.success) {
            throw new Error(`${TOOL}: ${parsed.error.message}`);
        }
        return parsed.data;
    },
    async execute(
        ctx: ToolContext,
        input: IssueVariationWorkflowInput
    ): Promise<StartIssueVariationWorkflowOutput> {
        await assertProjectOrg(ctx);
        const plan = buildIssueVariationPlan(input);
        let run: CreatedIssueVariationWorkflow;
        try {
            run = await createWorkflowFromPlan({
                plan,
                userId: ctx.userId,
                organizationId: ctx.organizationId,
                projectId: ctx.projectId,
                threadId: ctx.threadId,
                agentRunId: ctx.runId,
                activeAgent: 'orchestrator',
                viewContext: ctx.viewContext ?? null,
            });
        } catch (err) {
            if (!isWorkflowStorageUnavailableError(err)) throw err;
            run = await createApprovalCardsWithoutWorkflowState(ctx, plan, err);
        }

        return {
            status: 'workflow_plan_ready',
            workflowRunId: run.workflowRunId,
            workflowKey: run.workflowKey,
            executionBrief: run.executionBrief,
            steps: run.steps.map((step) => ({
                id: step.id,
                stepKey: step.stepKey,
                title: step.title,
                actionId: step.actionId,
                state: step.state,
                approvalId: step.approvalId,
                risk: step.risk,
                dependencyStepIds: step.dependencyStepIds,
                summary: step.summary,
            })),
        };
    },
};

registerTool(definition);

export { definition as startIssueVariationWorkflowTool };

type CreatedIssueVariationWorkflow = Awaited<ReturnType<typeof createWorkflowFromPlan>>;

function isWorkflowStorageUnavailableError(err: unknown): boolean {
    const record = err as { code?: unknown; message?: unknown };
    if (record.code === '42P01') return true;
    const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';
    return message.includes('workflow_runs') || message.includes('workflow_steps');
}

async function createApprovalCardsWithoutWorkflowState(
    ctx: ToolContext,
    plan: WorkflowPlan,
    err: unknown
): Promise<CreatedIssueVariationWorkflow> {
    const message = err instanceof Error ? err.message : String(err);
    const steps: CreatedIssueVariationWorkflow['steps'] = [];

    for (const planStep of plan.steps) {
        steps.push(await proposePlanStepWithoutWorkflowState(ctx, planStep));
    }

    const approvalCount = steps.filter((step) => step.approvalId).length;
    return {
        workflowRunId: `fallback:${ctx.runId}`,
        workflowKey: plan.workflowKey,
        status: approvalCount > 0 ? 'awaiting_approval' : 'failed',
        executionBrief:
            `${plan.executionBrief}\nWorkflow audit storage is unavailable, so approval cards were created without durable workflow step records. Storage error: ${message}`,
        steps,
    };
}

async function proposePlanStepWithoutWorkflowState(
    ctx: ToolContext,
    planStep: WorkflowPlanStep
): Promise<CreatedIssueVariationWorkflow['steps'][number]> {
    const action = getAction(planStep.actionId);
    const risk: ActionPolicy = action ? planStep.risk ?? policyForActor(action, 'workflow') : planStep.risk ?? 'propose';
    const stepId = `fallback:${ctx.runId}:${planStep.stepKey}`;

    if (!action) {
        return {
            id: stepId,
            stepKey: planStep.stepKey,
            title: planStep.title,
            actionId: planStep.actionId,
            state: 'failed',
            approvalId: null,
            invocationId: null,
            risk,
            dependencyStepIds: [],
            summary: `Action "${planStep.actionId}" is not registered.`,
            preview: null,
        };
    }

    try {
        const parsedInput = parseActionInput(action, planStep.input);
        const actionCtx: ActionContext = {
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            projectId: ctx.projectId,
            actorKind: 'workflow',
            actorId: `fallback:${ctx.runId}`,
            threadId: ctx.threadId,
            runId: ctx.runId,
            workflowStepId: null,
            viewContext: ctx.viewContext ?? null,
        };
        const proposal = await proposeAction({
            action,
            ctx: actionCtx,
            input: parsedInput,
            toolUseId: `workflow-fallback:${ctx.runId}:${planStep.stepKey}`,
        });
        return {
            id: stepId,
            stepKey: planStep.stepKey,
            title: planStep.title,
            actionId: planStep.actionId,
            state: 'awaiting_approval',
            approvalId: proposal.approvalId,
            invocationId: proposal.invocationId,
            risk,
            dependencyStepIds: [],
            summary: proposal.summary,
            preview: proposal.proposedDiff,
        };
    } catch (stepErr) {
        return {
            id: stepId,
            stepKey: planStep.stepKey,
            title: planStep.title,
            actionId: planStep.actionId,
            state: 'failed',
            approvalId: null,
            invocationId: null,
            risk,
            dependencyStepIds: [],
            summary: stepErr instanceof Error ? stepErr.message : String(stepErr),
            preview: null,
        };
    }
}
