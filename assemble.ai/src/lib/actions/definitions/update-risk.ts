import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { risks } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/actions/types';
import { applyUpdateRisk } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const RISK_RATINGS = ['low', 'medium', 'high', 'very_high'] as const;
const RISK_STATUSES = ['identified', 'mitigated', 'closed', 'accepted'] as const;
const CHANGE_KEYS = ['title', 'description', 'likelihood', 'impact', 'mitigation', 'status'] as const;

const inputSchema = z
    .object({
        id: z.string().trim().min(1),
        title: z.string().trim().min(1).optional(),
        description: z.string().trim().nullable().optional(),
        likelihood: z.enum(RISK_RATINGS).nullable().optional(),
        impact: z.enum(RISK_RATINGS).nullable().optional(),
        mitigation: z.string().trim().nullable().optional(),
        status: z.enum(RISK_STATUSES).optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!CHANGE_KEYS.some((key) => input[key] !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one risk field is required.',
                path: ['id'],
            });
        }
    });

export type UpdateRiskInput = z.infer<typeof inputSchema>;

const FIELD_LABELS: Record<(typeof CHANGE_KEYS)[number], string> = {
    title: 'Title',
    description: 'Description',
    likelihood: 'Likelihood',
    impact: 'Impact',
    mitigation: 'Mitigation',
    status: 'Status',
};

export const updateRiskAction = defineAction<UpdateRiskInput, Record<string, unknown>>({
    id: 'risk.update',
    toolName: 'update_risk',
    domain: 'risk',
    description: 'Update one project risk register item. The update is proposed for approval first.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'program', 'orchestrator'],
    emits: [{ entity: 'risk', op: 'updated' }],
    uiTarget: { tab: 'risks', focusEntity: 'risk' },
    async prepareProposal(ctx, input) {
        const [row] = await db
            .select()
            .from(risks)
            .where(and(eq(risks.id, input.id), eq(risks.projectId, ctx.projectId)))
            .limit(1);
        if (!row) throw new Error(`Risk ${input.id} not found in this project.`);

        const current = row as unknown as Record<string, unknown>;
        const changes: ProposedDiff['changes'] = [];
        for (const key of CHANGE_KEYS) {
            const next = input[key];
            if (next === undefined) continue;
            if (current[key] === next) continue;
            changes.push({
                field: key,
                label: FIELD_LABELS[key],
                before: current[key],
                after: next,
            });
        }
        if (changes.length === 0) {
            throw new Error('update_risk: proposed values are identical to the current risk.');
        }

        return {
            proposedDiff: {
                entity: 'risk',
                entityId: row.id,
                summary: `Update risk - ${row.title}`,
                changes,
            },
            expectedRowVersion: row.rowVersion ?? 1,
        };
    },
    applyResult(ctx, input, meta) {
        return applyUpdateRisk(input, meta?.expectedRowVersion ?? null, ctx);
    },
});
