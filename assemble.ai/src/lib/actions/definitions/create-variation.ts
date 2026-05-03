import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { costLines, projectStakeholders } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyCreateVariation } from '@/lib/agents/applicators';
import {
    COST_LINE_AMBIGUITY_GAP,
    formatCostLineLabel,
    rankCostLineMatches,
} from '@/lib/agents/cost-line-matching';
import { defineAction } from '../define';

const VARIATION_CATEGORIES = ['Principal', 'Contractor', 'Lessor Works'] as const;
const VARIATION_STATUSES = ['Forecast', 'Approved', 'Rejected', 'Withdrawn'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const inputSchema = z.object({
    category: z.enum(VARIATION_CATEGORIES),
    description: z.string().trim().min(1),
    status: z.enum(VARIATION_STATUSES).optional(),
    costLineId: z.string().optional(),
    costLineReference: z.string().trim().min(1).optional(),
    disciplineOrTrade: z.string().trim().min(1).optional(),
    amountForecastCents: z.number().int().nonnegative().optional(),
    amountApprovedCents: z.number().int().nonnegative().optional(),
    dateSubmitted: z.string().regex(ISO_DATE).optional(),
    dateApproved: z.string().regex(ISO_DATE).optional(),
    requestedBy: z.string().trim().min(1).optional(),
    approvedBy: z.string().trim().min(1).optional(),
    _toolUseId: z.string().optional(),
});

type CreateVariationInput = z.infer<typeof inputSchema>;

function moneyValue(value: unknown): string {
    const cents = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

function addChange(
    changes: ProposedDiff['changes'],
    input: Record<string, unknown>,
    key: string,
    label: string,
    format: (value: unknown) => unknown = (value) => value
): void {
    if (input[key] === undefined) return;
    changes.push({ field: key, label, before: '-', after: format(input[key]) });
}

export const createVariationAction = defineAction<CreateVariationInput, Record<string, unknown>>({
    id: 'finance.variations.create',
    toolName: 'create_variation',
    domain: 'finance',
    description: 'Create a variation register item.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'orchestrator'],
    emits: [{ entity: 'variation', op: 'created' }],
    uiTarget: { tab: 'variations', focusEntity: 'variation' },
    async prepareProposal(ctx, input) {
        const resolvedCostLine = await resolveCostLineForVariation(ctx.projectId, input);
        const proposalInput: CreateVariationInput = { ...input };
        if (resolvedCostLine) proposalInput.costLineId = resolvedCostLine.id;

        const changes: ProposedDiff['changes'] = [];
        const record = proposalInput as Record<string, unknown>;
        addChange(changes, record, 'category', 'Category');
        addChange(changes, record, 'description', 'Description');
        addChange(changes, record, 'status', 'Status');
        if (proposalInput.costLineId !== undefined) {
            changes.push({
                field: 'costLineId',
                label: 'Cost line',
                before: '-',
                after: resolvedCostLine?.label ?? proposalInput.costLineId,
            });
        }
        addChange(changes, record, 'amountForecastCents', 'Forecast amount', moneyValue);
        addChange(changes, record, 'amountApprovedCents', 'Approved amount', moneyValue);
        addChange(changes, record, 'dateSubmitted', 'Date submitted');
        addChange(changes, record, 'dateApproved', 'Date approved');
        addChange(changes, record, 'requestedBy', 'Requested by');
        addChange(changes, record, 'approvedBy', 'Approved by');

        return {
            proposedDiff: {
                entity: 'variation',
                entityId: null,
                summary: `Create ${input.category} variation - ${input.description}`,
                changes,
            },
            input: proposalInput,
        };
    },
    applyResult(ctx, input) {
        return applyCreateVariation(input, ctx);
    },
});

async function resolveCostLineForVariation(
    projectId: string,
    input: CreateVariationInput
): Promise<{ id: string; label: string } | null> {
    if (!input.costLineId && !input.costLineReference && !input.disciplineOrTrade) {
        return null;
    }

    const rows = await db
        .select({
            id: costLines.id,
            section: costLines.section,
            costCode: costLines.costCode,
            activity: costLines.activity,
            reference: costLines.reference,
            stakeholderName: projectStakeholders.name,
            disciplineOrTrade: projectStakeholders.disciplineOrTrade,
        })
        .from(costLines)
        .leftJoin(projectStakeholders, eq(costLines.stakeholderId, projectStakeholders.id))
        .where(and(eq(costLines.projectId, projectId), isNull(costLines.deletedAt)));

    if (input.costLineId) {
        const row = rows.find((candidate) => candidate.id === input.costLineId);
        if (!row) {
            throw new Error(`Cost line ${input.costLineId} was not found in this project.`);
        }
        return { id: row.id, label: formatCostLineLabel(row) };
    }

    const scored = rankCostLineMatches(rows, {
        reference: input.costLineReference,
        discipline: input.disciplineOrTrade,
    });

    const best = scored[0];
    if (!best) {
        throw new Error('Could not match that variation to a project cost line.');
    }

    const next = scored[1];
    if (next && Math.abs(best.score - next.score) < COST_LINE_AMBIGUITY_GAP) {
        const options = scored.slice(0, 3).map((candidate) => formatCostLineLabel(candidate.row));
        throw new Error(`Cost line match is ambiguous: ${options.join('; ')}`);
    }

    return { id: best.row.id, label: formatCostLineLabel(best.row) };
}
