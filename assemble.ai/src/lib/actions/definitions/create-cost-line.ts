import { z } from 'zod';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyCreateCostLine } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const MASTER_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;

const FIELD_LABELS: Record<string, string> = {
    section: 'Section',
    activity: 'Activity',
    costCode: 'Cost code',
    reference: 'Reference',
    budgetCents: 'Budget',
    approvedContractCents: 'Approved contract',
    masterStage: 'Master stage',
    stakeholderId: 'Stakeholder',
};

const inputSchema = z.object({
    section: z.string().trim().min(1),
    activity: z.string().trim().min(1),
    costCode: z.string().optional(),
    reference: z.string().optional(),
    budgetCents: z.number().int().nonnegative().optional(),
    approvedContractCents: z.number().int().nonnegative().optional(),
    masterStage: z.enum(MASTER_STAGES).optional(),
    stakeholderId: z.string().optional(),
    _toolUseId: z.string().optional(),
});

export type CreateCostLineInput = z.infer<typeof inputSchema>;

function afterValue(input: CreateCostLineInput, key: keyof CreateCostLineInput): unknown {
    const value = input[key];
    if (key === 'budgetCents' || key === 'approvedContractCents') {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            maximumFractionDigits: 0,
        }).format(Number(value) / 100);
    }
    return value;
}

export const createCostLineAction = defineAction<CreateCostLineInput, Record<string, unknown>>({
    id: 'finance.cost_plan.create_line',
    toolName: 'create_cost_line',
    domain: 'finance',
    description:
        'Create a new project cost-plan line. The line is proposed for approval before it is inserted.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'orchestrator'],
    emits: [{ entity: 'cost_line', op: 'created' }],
    uiTarget: { tab: 'cost-planning', focusEntity: 'cost_line' },
    prepareProposal(_ctx, input) {
        const keys: Array<keyof CreateCostLineInput> = [
            'section',
            'costCode',
            'activity',
            'reference',
            'masterStage',
            'budgetCents',
            'approvedContractCents',
            'stakeholderId',
        ];
        const changes: ProposedDiff['changes'] = keys
            .filter((key) => input[key] !== undefined)
            .map((key) => ({
                field: key,
                label: FIELD_LABELS[key],
                before: '-',
                after: afterValue(input, key),
            }));

        return {
            proposedDiff: {
                entity: 'cost_line',
                entityId: null,
                summary: `Create cost line in ${input.section} - ${input.activity}`,
                changes,
            },
            expectedRowVersion: null,
        };
    },
    applyResult(ctx, input) {
        return applyCreateCostLine(input, ctx);
    },
});
