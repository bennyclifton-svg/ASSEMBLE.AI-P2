/**
 * create_variation - propose a new variation register item.
 */

import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import { db } from '@/lib/db';
import { costLines, projectStakeholders } from '@/lib/db/pg-schema';
import { and, eq, isNull } from 'drizzle-orm';
import {
    asObject,
    copyToolUseId,
    createDiffChanges,
    moneyValue,
    optionalEnum,
    optionalIsoDate,
    optionalNonNegativeInteger,
    optionalString,
    requiredString,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface CreateVariationInput extends Record<string, unknown> {
    category: VariationCategory;
    description: string;
    status?: VariationStatus;
    costLineId?: string;
    costLineReference?: string;
    disciplineOrTrade?: string;
    amountForecastCents?: number;
    amountApprovedCents?: number;
    dateSubmitted?: string;
    dateApproved?: string;
    requestedBy?: string;
    approvedBy?: string;
    _toolUseId?: string;
}

const VARIATION_CATEGORIES = ['Principal', 'Contractor', 'Lessor Works'] as const;
const VARIATION_STATUSES = ['Forecast', 'Submitted', 'Approved', 'Rejected', 'Withdrawn'] as const;
type VariationCategory = (typeof VARIATION_CATEGORIES)[number];
type VariationStatus = (typeof VARIATION_STATUSES)[number];
const TOOL = 'create_variation';

interface CostLineLookupRow {
    id: string;
    section: string;
    costCode: string | null;
    activity: string;
    reference: string | null;
    stakeholderName: string | null;
    disciplineOrTrade: string | null;
}

const definition: AgentToolDefinition<CreateVariationInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose a new variation. Amounts are in cents. The variation is created only after user approval. ' +
            'If the user gives a discipline/trade and cost-line name instead of an internal id, pass them as disciplineOrTrade and costLineReference; the tool resolves the cost line in this project.',
        inputSchema: {
            type: 'object',
            properties: {
                category: { type: 'string', enum: [...VARIATION_CATEGORIES] },
                description: { type: 'string' },
                status: { type: 'string', enum: [...VARIATION_STATUSES] },
                costLineId: {
                    type: 'string',
                    description: 'Existing cost line id from list_cost_lines. Do not pass an empty string.',
                },
                costLineReference: {
                    type: 'string',
                    description: 'Human cost-line label/activity/cost code from the user, for example "Detail Design".',
                },
                disciplineOrTrade: {
                    type: 'string',
                    description: 'Human discipline/trade/stakeholder label from the user, for example "Mechanical".',
                },
                amountForecastCents: { type: 'integer', minimum: 0 },
                amountApprovedCents: { type: 'integer', minimum: 0 },
                dateSubmitted: { type: 'string', description: 'YYYY-MM-DD.' },
                dateApproved: { type: 'string', description: 'YYYY-MM-DD.' },
                requestedBy: { type: 'string' },
                approvedBy: { type: 'string' },
            },
            required: ['category', 'description'],
        },
    },
    mutating: true,
    validate(input: unknown): CreateVariationInput {
        const obj = asObject(input, TOOL);
        const category = optionalEnum(obj, 'category', VARIATION_CATEGORIES, TOOL);
        if (!category) throw new Error(`${TOOL}: "category" is required`);
        const out: CreateVariationInput = {
            category,
            description: requiredString(obj, 'description', TOOL),
        };
        const status = optionalEnum(obj, 'status', VARIATION_STATUSES, TOOL);
        if (status !== undefined) out.status = status;
        const costLineId = optionalString(obj, 'costLineId', TOOL);
        if (costLineId !== undefined) {
            if (!costLineId) {
                throw new Error(
                    `${TOOL}: "costLineId" must be a non-empty id. If the user supplied a label like "Detail Design", pass it as "costLineReference" and pass the discipline/trade as "disciplineOrTrade".`
                );
            }
            out.costLineId = costLineId;
        }
        for (const key of ['costLineReference', 'disciplineOrTrade', 'requestedBy', 'approvedBy'] as const) {
            const value = optionalString(obj, key, TOOL);
            if (value !== undefined && value) out[key] = value;
        }
        for (const key of ['amountForecastCents', 'amountApprovedCents'] as const) {
            const value = optionalNonNegativeInteger(obj, key, TOOL);
            if (value !== undefined) out[key] = value;
        }
        for (const key of ['dateSubmitted', 'dateApproved'] as const) {
            const value = optionalIsoDate(obj, key, TOOL);
            if (value !== undefined) out[key] = value;
        }
        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: CreateVariationInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const resolvedCostLine = await resolveCostLineForVariation(ctx, input);
        const proposalInput: CreateVariationInput = { ...input };
        if (resolvedCostLine) proposalInput.costLineId = resolvedCostLine.id;

        const changes = createDiffChanges(proposalInput, [
            { key: 'category', label: 'Category' },
            { key: 'description', label: 'Description' },
            { key: 'status', label: 'Status' },
            {
                key: 'costLineId',
                label: 'Cost line',
                format: () => resolvedCostLine?.label ?? proposalInput.costLineId,
            },
            { key: 'amountForecastCents', label: 'Forecast amount', format: moneyValue },
            { key: 'amountApprovedCents', label: 'Approved amount', format: moneyValue },
            { key: 'dateSubmitted', label: 'Date submitted' },
            { key: 'dateApproved', label: 'Date approved' },
            { key: 'requestedBy', label: 'Requested by' },
            { key: 'approvedBy', label: 'Approved by' },
        ]);
        const summary = `Create ${input.category} variation - ${input.description}`;
        const diff: ProposedDiff = {
            entity: 'variation',
            entityId: null,
            summary,
            changes,
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: proposalInput._toolUseId ?? '',
                input: proposalInput,
                proposedDiff: diff,
                expectedRowVersion: null,
            })
        ).toolResult;
    },
};

registerTool(definition);

export { definition as createVariationTool };

async function resolveCostLineForVariation(
    ctx: ToolContext,
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
        .where(
            and(
                eq(costLines.projectId, ctx.projectId),
                isNull(costLines.deletedAt)
            )
        );

    if (input.costLineId) {
        const row = rows.find((candidate) => candidate.id === input.costLineId);
        if (!row) {
            throw new Error(`${TOOL}: cost line "${input.costLineId}" was not found in this project.`);
        }
        return { id: row.id, label: formatCostLineLabel(row) };
    }

    const reference = input.costLineReference;
    const discipline = input.disciplineOrTrade;
    const scored = rows
        .map((row) => ({ row, score: scoreCostLine(row, reference, discipline) }))
        .filter((candidate) => candidate.score >= 0.68)
        .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best) {
        throw new Error(
            `${TOOL}: could not match cost line` +
            `${reference ? ` "${reference}"` : ''}` +
            `${discipline ? ` for "${discipline}"` : ''}. ` +
            'Call list_cost_lines and retry with the exact costLineId, or omit the cost line.'
        );
    }

    const next = scored[1];
    if (next && Math.abs(best.score - next.score) < 0.04) {
        const options = scored.slice(0, 3).map((candidate) => formatCostLineLabel(candidate.row));
        throw new Error(
            `${TOOL}: cost line match is ambiguous (${options.join('; ')}). ` +
            'Call list_cost_lines and retry with the exact costLineId.'
        );
    }

    return { id: best.row.id, label: formatCostLineLabel(best.row) };
}

function scoreCostLine(
    row: CostLineLookupRow,
    reference?: string,
    discipline?: string
): number {
    const refScore = reference
        ? bestTextScore(reference, [row.activity, row.costCode, row.reference, `${row.costCode ?? ''} ${row.activity}`])
        : 1;
    const disciplineScore = discipline
        ? bestTextScore(discipline, [row.stakeholderName, row.disciplineOrTrade])
        : 1;

    if (reference && refScore < 0.62) return 0;
    if (discipline && disciplineScore < 0.62) return 0;
    if (reference && discipline) return refScore * 0.7 + disciplineScore * 0.3;
    return reference ? refScore : disciplineScore;
}

function bestTextScore(query: string, candidates: Array<string | null | undefined>): number {
    return Math.max(0, ...candidates.map((candidate) => textScore(query, candidate ?? '')));
}

function textScore(query: string, candidate: string): number {
    const a = normalizeText(query);
    const b = normalizeText(candidate);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.92;

    const wordsA = new Set(a.split(' ').filter((word) => word.length > 2));
    const wordsB = new Set(b.split(' ').filter((word) => word.length > 2));
    const commonWords = [...wordsA].filter((word) => wordsB.has(word));
    const distance = levenshteinDistance(a, b);
    const editScore = 1 - distance / Math.max(a.length, b.length);
    if (commonWords.length > 0) {
        const wordScore = Math.max(
            0.65,
            commonWords.length / Math.max(wordsA.size, wordsB.size)
        );
        return Math.max(wordScore, editScore);
    }

    return editScore;
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] =
                b.charAt(i - 1) === a.charAt(j - 1)
                    ? matrix[i - 1][j - 1]
                    : Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
        }
    }

    return matrix[b.length][a.length];
}

function formatCostLineLabel(row: CostLineLookupRow): string {
    const owner = row.stakeholderName || row.disciplineOrTrade;
    const line = row.costCode ? `${row.costCode} - ${row.activity}` : row.activity;
    return owner ? `${owner} - ${line}` : line;
}
