import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { variations } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyUpdateVariation } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const VARIATION_CATEGORIES = ['Principal', 'Contractor', 'Lessor Works'] as const;
const VARIATION_STATUSES = ['Forecast', 'Approved', 'Rejected', 'Withdrawn'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHANGE_KEYS = [
    'category',
    'description',
    'status',
    'costLineId',
    'amountForecastCents',
    'amountApprovedCents',
    'dateSubmitted',
    'dateApproved',
    'requestedBy',
    'approvedBy',
] as const;

const inputSchema = z
    .object({
        id: z.string().trim().min(1),
        category: z.enum(VARIATION_CATEGORIES).optional(),
        description: z.string().trim().min(1).optional(),
        status: z.enum(VARIATION_STATUSES).optional(),
        costLineId: z.string().trim().min(1).nullable().optional(),
        amountForecastCents: z.number().int().nonnegative().optional(),
        amountApprovedCents: z.number().int().nonnegative().optional(),
        dateSubmitted: z.string().regex(ISO_DATE).nullable().optional(),
        dateApproved: z.string().regex(ISO_DATE).nullable().optional(),
        requestedBy: z.string().trim().nullable().optional(),
        approvedBy: z.string().trim().nullable().optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!CHANGE_KEYS.some((key) => input[key] !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one variation field is required.',
                path: ['id'],
            });
        }
        for (const key of ['dateSubmitted', 'dateApproved'] as const) {
            const value = input[key];
            if (typeof value === 'string' && !isValidIsoDate(value)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `${key} must be a valid YYYY-MM-DD date`,
                    path: [key],
                });
            }
        }
    });

export type UpdateVariationInput = z.infer<typeof inputSchema>;

const FIELD_LABELS: Record<(typeof CHANGE_KEYS)[number], string> = {
    category: 'Category',
    description: 'Description',
    status: 'Status',
    costLineId: 'Cost line',
    amountForecastCents: 'Forecast amount',
    amountApprovedCents: 'Approved amount',
    dateSubmitted: 'Date submitted',
    dateApproved: 'Date approved',
    requestedBy: 'Requested by',
    approvedBy: 'Approved by',
};

function isValidIsoDate(value: string): boolean {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function moneyValue(cents: unknown): string {
    const n = typeof cents === 'number' ? cents : Number(cents ?? 0);
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
    }).format(n / 100);
}

function formatValue(key: (typeof CHANGE_KEYS)[number], value: unknown): unknown {
    return key === 'amountForecastCents' || key === 'amountApprovedCents'
        ? moneyValue(value)
        : value;
}

export const updateVariationAction = defineAction<UpdateVariationInput, Record<string, unknown>>({
    id: 'finance.variations.update',
    toolName: 'update_variation',
    domain: 'finance',
    description: 'Update one variation register item. The update is proposed for approval first.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'orchestrator'],
    emits: [{ entity: 'variation', op: 'updated' }],
    uiTarget: { tab: 'variations', focusEntity: 'variation' },
    async prepareProposal(ctx, input) {
        const [row] = await db
            .select()
            .from(variations)
            .where(and(eq(variations.id, input.id), eq(variations.projectId, ctx.projectId), isNull(variations.deletedAt)))
            .limit(1);
        if (!row) throw new Error(`Variation ${input.id} not found in this project.`);

        const current = row as unknown as Record<string, unknown>;
        const changes: ProposedDiff['changes'] = [];
        for (const key of CHANGE_KEYS) {
            const next = input[key];
            if (next === undefined) continue;
            if (current[key] === next) continue;
            changes.push({
                field: key,
                label: FIELD_LABELS[key],
                before: formatValue(key, current[key]),
                after: formatValue(key, next),
            });
        }
        if (changes.length === 0) {
            throw new Error('update_variation: proposed values are identical to the current variation.');
        }

        return {
            proposedDiff: {
                entity: 'variation',
                entityId: row.id,
                summary: `Update variation ${row.variationNumber}`,
                changes,
            },
            expectedRowVersion: row.rowVersion ?? 1,
        };
    },
    applyResult(ctx, input, meta) {
        return applyUpdateVariation(input, meta?.expectedRowVersion ?? null, ctx);
    },
});
