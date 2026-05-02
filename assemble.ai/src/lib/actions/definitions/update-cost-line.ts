import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { costLines } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyUpdateCostLine } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const MASTER_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;

const CHANGE_KEYS = [
    'activity',
    'section',
    'costCode',
    'reference',
    'budgetCents',
    'approvedContractCents',
    'masterStage',
] as const;

const FIELD_LABELS: Record<(typeof CHANGE_KEYS)[number], string> = {
    activity: 'Activity',
    section: 'Section',
    costCode: 'Cost code',
    reference: 'Reference',
    budgetCents: 'Budget',
    approvedContractCents: 'Approved contract',
    masterStage: 'Master stage',
};

const inputSchema = z
    .object({
        id: z.string().trim().min(1),
        activity: z.string().optional(),
        section: z.string().optional(),
        costCode: z.string().optional(),
        reference: z.string().optional(),
        budgetCents: z.number().int().nonnegative().optional(),
        approvedContractCents: z.number().int().nonnegative().optional(),
        masterStage: z.enum(MASTER_STAGES).optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!CHANGE_KEYS.some((key) => input[key] !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one cost-line field is required.',
                path: ['id'],
            });
        }
    });

type UpdateCostLineInput = z.infer<typeof inputSchema>;

function formatCents(value: unknown): string {
    const cents = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

export const updateCostLineAction = defineAction<UpdateCostLineInput, Record<string, unknown>>({
    id: 'finance.cost_plan.update_line',
    domain: 'finance',
    description: 'Update one project cost-plan line.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'orchestrator'],
    emits: [{ entity: 'cost_line', op: 'updated' }],
    uiTarget: { tab: 'cost-planning', focusEntity: 'cost_line' },
    async prepareProposal(ctx, input) {
        const [row] = await db
            .select()
            .from(costLines)
            .where(
                and(
                    eq(costLines.id, input.id),
                    eq(costLines.projectId, ctx.projectId),
                    isNull(costLines.deletedAt)
                )
            )
            .limit(1);

        if (!row) {
            throw new Error(`Cost line ${input.id} was not found in this project.`);
        }

        const rowRecord = row as Record<string, unknown>;
        const changes: ProposedDiff['changes'] = [];
        for (const key of CHANGE_KEYS) {
            const next = input[key];
            if (next === undefined) continue;
            const current = rowRecord[key];
            if (current === next) continue;
            const isMoney = key === 'budgetCents' || key === 'approvedContractCents';
            changes.push({
                field: key,
                label: FIELD_LABELS[key],
                before: isMoney ? formatCents(current) : current,
                after: isMoney ? formatCents(next) : next,
            });
        }

        if (changes.length === 0) {
            throw new Error('The proposed cost-line values are identical to the current row.');
        }

        return {
            proposedDiff: {
                entity: 'cost_line',
                entityId: row.id,
                summary: `Update cost line ${row.costCode ?? row.id.slice(0, 8)} - ${row.activity}`,
                changes,
            },
            expectedRowVersion: row.rowVersion ?? 1,
        };
    },
    applyResult(ctx, input, meta) {
        return applyUpdateCostLine(input, meta?.expectedRowVersion ?? null, ctx);
    },
});
