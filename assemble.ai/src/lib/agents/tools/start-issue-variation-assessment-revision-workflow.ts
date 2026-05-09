/**
 * start_issue_variation_assessment_revision_workflow
 *
 * Revises an existing Delivery assessment artifact and drafts a replacement
 * outbound response. It does not create another variation register item.
 */

import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    buildIssueVariationAssessmentRevisionPlan,
    createWorkflowFromPlan,
    issueVariationAssessmentRevisionInputSchema,
    type IssueVariationAssessmentRevisionInput,
} from '@/lib/workflows';

const TOOL = 'start_issue_variation_assessment_revision_workflow';

interface StartIssueVariationAssessmentRevisionWorkflowOutput {
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
    IssueVariationAssessmentRevisionInput,
    StartIssueVariationAssessmentRevisionWorkflowOutput
> = {
    spec: {
        name: TOOL,
        description:
            'Start a workflow to revise an existing Delivery assessment note and draft a revised outbound contractor response. Use this when the user asks to interrogate, strengthen, revise, or add detail to a contractor variation claim assessment. Call list_notes first to find the assessment note id. This workflow does not create another variation.',
        inputSchema: {
            type: 'object',
            properties: {
                userGoal: { type: 'string' },
                inboundCorrespondenceId: {
                    type: 'string',
                    description: 'Linked inbound correspondence id, if known.',
                },
                assessmentNoteId: {
                    type: 'string',
                    description: 'Existing assessment note id from list_notes.',
                },
                revisionInstruction: {
                    type: 'string',
                    description:
                        'The user requested change, such as adding evaluation of the geotechnical report.',
                },
                contractor: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                    },
                },
                variationDescription: { type: 'string' },
                evidence: { type: 'array', items: { type: 'string' } },
                assumptions: { type: 'array', items: { type: 'string' } },
                deliveryAssessment: {
                    type: 'object',
                    properties: {
                        assessmentMode: {
                            type: 'string',
                            enum: ['delivery_lite', 'deep_delivery'],
                        },
                        completeness: {
                            type: 'string',
                            enum: ['complete_enough', 'missing_information'],
                        },
                        summary: { type: 'string' },
                        entitlement: { type: 'string' },
                        quantum: { type: 'string' },
                        programme: { type: 'string' },
                        recommendation: { type: 'string' },
                        contractAssumption: { type: 'string' },
                        missingInformation: { type: 'array', items: { type: 'string' } },
                        documentsReviewed: { type: 'array', items: { type: 'string' } },
                        knowledgeReferences: { type: 'array', items: { type: 'string' } },
                        entitlementReasons: { type: 'array', items: { type: 'string' } },
                        quantumReasons: { type: 'array', items: { type: 'string' } },
                        programmeReasons: { type: 'array', items: { type: 'string' } },
                        evidenceGaps: { type: 'array', items: { type: 'string' } },
                        confidence: { type: 'number', minimum: 0, maximum: 1 },
                    },
                    required: ['summary'],
                },
                outboundCorrespondence: {
                    type: 'object',
                    properties: {
                        draftType: {
                            type: 'string',
                            enum: ['request_particulars', 'assessment_response'],
                        },
                        toEmail: { type: 'string' },
                        toName: { type: 'string' },
                        ccEmails: { type: 'array', items: { type: 'string' } },
                        subject: { type: 'string' },
                        bodyText: { type: 'string' },
                        responseRequiredBy: { type: 'string', description: 'YYYY-MM-DD.' },
                    },
                },
            },
            required: [
                'assessmentNoteId',
                'revisionInstruction',
                'variationDescription',
                'deliveryAssessment',
            ],
        },
    },
    mutating: true,
    validate(input: unknown): IssueVariationAssessmentRevisionInput {
        const parsed = issueVariationAssessmentRevisionInputSchema.safeParse(input);
        if (!parsed.success) {
            throw new Error(`${TOOL}: ${parsed.error.message}`);
        }
        return parsed.data;
    },
    async execute(
        ctx: ToolContext,
        input: IssueVariationAssessmentRevisionInput
    ): Promise<StartIssueVariationAssessmentRevisionWorkflowOutput> {
        await assertProjectOrg(ctx);
        const plan = buildIssueVariationAssessmentRevisionPlan(input);
        const run = await createWorkflowFromPlan({
            plan,
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            projectId: ctx.projectId,
            threadId: ctx.threadId,
            agentRunId: ctx.runId,
            activeAgent: 'delivery',
            viewContext: ctx.viewContext ?? null,
        });

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

export { definition as startIssueVariationAssessmentRevisionWorkflowTool };
