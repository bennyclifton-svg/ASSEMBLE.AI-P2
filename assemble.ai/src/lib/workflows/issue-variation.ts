import { z } from 'zod';
import type { WorkflowPlan, WorkflowPlanStep } from './types';

export const ISSUE_VARIATION_WORKFLOW_KEY = 'issue-variation';

const variationCategorySchema = z.enum(['Principal', 'Contractor', 'Lessor Works']);
const variationStatusSchema = z.enum(['Forecast', 'Submitted', 'Approved', 'Rejected', 'Withdrawn']);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const masterStageSchema = z.enum([
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
]);

const createVariationInputSchema = z.object({
    category: variationCategorySchema.default('Principal'),
    description: z.string().trim().min(1),
    status: variationStatusSchema.default('Submitted'),
    costLineId: z.string().trim().min(1).optional(),
    costLineReference: z.string().trim().min(1).optional(),
    disciplineOrTrade: z.string().trim().min(1).optional(),
    amountForecastCents: z.number().int().nonnegative().optional(),
    amountApprovedCents: z.number().int().nonnegative().optional(),
    dateSubmitted: isoDateSchema.optional(),
    dateApproved: isoDateSchema.optional(),
    requestedBy: z.string().trim().min(1).optional(),
    approvedBy: z.string().trim().min(1).optional(),
});

const updateCostLineInputSchema = z.object({
    id: z.string().trim().min(1).optional(),
    activity: z.string().trim().min(1).optional(),
    section: z.string().trim().min(1).optional(),
    costCode: z.string().trim().min(1).optional(),
    reference: z.string().trim().min(1).optional(),
    budgetCents: z.number().int().nonnegative().optional(),
    approvedContractCents: z.number().int().nonnegative().optional(),
    masterStage: masterStageSchema.optional(),
});

const updateProgramActivityInputSchema = z.object({
    id: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    parentId: z.union([z.string().trim().min(1), z.null()]).optional(),
    startDate: z.union([isoDateSchema, z.null()]).optional(),
    endDate: z.union([isoDateSchema, z.null()]).optional(),
    collapsed: z.boolean().optional(),
    masterStage: z.union([masterStageSchema, z.null()]).optional(),
    color: z.union([z.string().trim().min(1), z.null()]).optional(),
    sortOrder: z.number().int().optional(),
});

const createNoteInputSchema = z.object({
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().optional(),
    isStarred: z.boolean().optional(),
    color: z.enum(['yellow', 'blue', 'green', 'pink', 'white']).optional(),
    type: z.enum(['rfi', 'notice', 'eot', 'defect', 'variation', 'risk', 'transmittal', 'review', 'note']).optional(),
    status: z.enum(['open', 'closed']).optional(),
    noteDate: isoDateSchema.optional(),
    documentIds: z.array(z.string().trim().min(1)).optional(),
});

export const issueVariationWorkflowInputSchema = z.object({
    userGoal: z.string().trim().min(1).optional(),
    evidence: z.array(z.string().trim().min(1)).optional(),
    assumptions: z.array(z.string().trim().min(1)).optional(),
    variation: createVariationInputSchema,
    costLineUpdate: updateCostLineInputSchema.optional(),
    programActivityUpdate: updateProgramActivityInputSchema.optional(),
    note: createNoteInputSchema.optional(),
});

export type IssueVariationWorkflowInput = z.input<typeof issueVariationWorkflowInputSchema>;
type ParsedIssueVariationWorkflowInput = z.infer<typeof issueVariationWorkflowInputSchema>;

const COST_LINE_CHANGE_KEYS = [
    'budgetCents',
    'approvedContractCents',
] as const;

const PROGRAM_ACTIVITY_CHANGE_KEYS = [
    'parentId',
    'startDate',
    'endDate',
    'collapsed',
    'masterStage',
    'color',
    'sortOrder',
] as const;

function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined)
    );
}

function hasAnyDefinedKey<T extends readonly string[]>(
    value: unknown,
    keys: T
): value is Record<T[number], unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return keys.some((key) => record[key] !== undefined);
}

function defaultVariationNoteContent(input: ParsedIssueVariationWorkflowInput): string {
    const lines = [`Client requested variation: ${input.variation.description}.`];
    const costLineLabel = [
        input.variation.disciplineOrTrade,
        input.variation.costLineReference,
        input.costLineUpdate?.costCode,
        input.costLineUpdate?.activity,
        input.costLineUpdate?.reference,
    ]
        .filter(Boolean)
        .join(' - ');
    if (costLineLabel) {
        lines.push(`Cost line mapping: ${costLineLabel}.`);
    }
    if (input.programActivityUpdate?.name) {
        lines.push(`Programme activity mapping: ${input.programActivityUpdate.name}.`);
    }
    return lines.join('\n');
}

export function buildIssueVariationPlan(rawInput: IssueVariationWorkflowInput): WorkflowPlan {
    const input = issueVariationWorkflowInputSchema.parse(rawInput);
    const userGoal =
        input.userGoal ??
        `Issue variation - ${input.variation.description}`;
    const evidence = input.evidence ?? [];
    const assumptions = [...(input.assumptions ?? [])];
    const steps: WorkflowPlanStep[] = [
        {
            stepKey: 'create_variation',
            title: 'Create variation register item',
            actionId: 'finance.variations.create',
            input: asRecord(input.variation),
            dependencyStepKeys: [],
            failurePolicy: 'abort_workflow',
            risk: 'sensitive',
        },
    ];

    if (input.costLineUpdate?.id && hasAnyDefinedKey(input.costLineUpdate, COST_LINE_CHANGE_KEYS)) {
        steps.push({
            stepKey: 'update_cost_plan',
            title: 'Update linked cost plan line',
            actionId: 'finance.cost_plan.update_line',
            input: asRecord(input.costLineUpdate),
            dependencyStepKeys: ['create_variation'],
            failurePolicy: 'ask_user',
            risk: 'propose',
        });
    } else if (input.costLineUpdate?.id) {
        assumptions.push(
            'Cost line was resolved and linked on the variation; no base cost-plan row update was required.'
        );
    } else if (input.costLineUpdate) {
        assumptions.push('Cost plan update was skipped because no resolved cost line id was supplied.');
    }

    if (
        input.programActivityUpdate?.id &&
        hasAnyDefinedKey(input.programActivityUpdate, PROGRAM_ACTIVITY_CHANGE_KEYS)
    ) {
        steps.push({
            stepKey: 'update_program',
            title: 'Update programme activity',
            actionId: 'program.activity.update',
            input: asRecord(input.programActivityUpdate),
            dependencyStepKeys: ['create_variation'],
            failurePolicy: 'ask_user',
            risk: 'propose',
        });
    } else if (input.programActivityUpdate?.id) {
        assumptions.push(
            'Programme activity was resolved for context, but no programme row update was supplied.'
        );
    } else if (input.programActivityUpdate) {
        assumptions.push('Programme activity update was skipped because no resolved activity id was supplied.');
    }

    {
        const noteInput = {
            ...input.note,
            title: input.note?.title ?? `Variation - ${input.variation.description}`,
            content:
                input.note?.content ??
                defaultVariationNoteContent(input),
            type: input.note?.type ?? 'variation',
            status: input.note?.status ?? 'open',
        };
        steps.push({
            stepKey: 'create_note',
            title: 'Create variation note',
            actionId: 'correspondence.note.create',
            input: asRecord(noteInput),
            dependencyStepKeys: steps.map((step) => step.stepKey),
            failurePolicy: 'continue',
            risk: 'confirm',
        });
    }

    const amount =
        input.variation.amountApprovedCents ?? input.variation.amountForecastCents;
    const amountText =
        typeof amount === 'number'
            ? new Intl.NumberFormat('en-AU', {
                  style: 'currency',
                  currency: 'AUD',
                  maximumFractionDigits: 0,
              }).format(amount / 100)
            : 'an unpriced amount';

    const executionBrief = [
        `Understood: prepare an issue-variation workflow for "${input.variation.description}" at ${amountText}.`,
        evidence.length > 0 ? `Evidence used: ${evidence.join('; ')}.` : 'Evidence used: current project context and supplied instruction.',
        assumptions.length > 0 ? `Assumptions: ${assumptions.join('; ')}.` : 'Assumptions: none recorded.',
        `Prepared ${steps.length} dependency-aware step${steps.length === 1 ? '' : 's'}: ${steps.map((step) => step.title).join(' -> ')}.`,
        'Each write step will be presented through explicit approval controls before project data changes.',
    ].join('\n');

    return {
        workflowKey: ISSUE_VARIATION_WORKFLOW_KEY,
        userGoal,
        summary: `Issue variation - ${input.variation.description}`,
        executionBrief,
        evidence,
        assumptions,
        steps,
    };
}
