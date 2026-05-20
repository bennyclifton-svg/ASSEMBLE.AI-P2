import { z } from 'zod';
import type { ProposedDiff } from '@/lib/actions/types';
import { applyCreateRisk } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const RISK_RATINGS = ['low', 'medium', 'high', 'very_high'] as const;
const RISK_STATUSES = ['identified', 'mitigated', 'closed', 'accepted'] as const;

const inputSchema = z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().optional(),
    likelihood: z.enum(RISK_RATINGS).optional(),
    impact: z.enum(RISK_RATINGS).optional(),
    mitigation: z.string().trim().optional(),
    status: z.enum(RISK_STATUSES).optional(),
    _toolUseId: z.string().optional(),
});

export type CreateRiskInput = z.infer<typeof inputSchema>;

const FIELDS: Array<{ key: keyof CreateRiskInput; label: string }> = [
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'likelihood', label: 'Likelihood' },
    { key: 'impact', label: 'Impact' },
    { key: 'mitigation', label: 'Mitigation' },
    { key: 'status', label: 'Status' },
];

export const createRiskAction = defineAction<CreateRiskInput, Record<string, unknown>>({
    id: 'risk.create',
    toolName: 'create_risk',
    domain: 'risk',
    description: 'Create a project risk register item. The risk is proposed for approval before it is inserted.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'program', 'orchestrator'],
    emits: [{ entity: 'risk', op: 'created' }],
    uiTarget: { tab: 'risks', focusEntity: 'risk' },
    prepareProposal(_ctx, input) {
        const changes: ProposedDiff['changes'] = FIELDS.filter((field) => input[field.key] !== undefined).map(
            (field) => ({
                field: field.key,
                label: field.label,
                before: '-',
                after: input[field.key],
            })
        );
        return {
            proposedDiff: {
                entity: 'risk',
                entityId: null,
                summary: `Create risk - ${input.title}`,
                changes,
            },
            expectedRowVersion: null,
        };
    },
    applyResult(ctx, input) {
        return applyCreateRisk(input, ctx);
    },
});
