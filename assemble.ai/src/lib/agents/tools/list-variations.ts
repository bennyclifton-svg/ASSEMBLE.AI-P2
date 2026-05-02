/**
 * list_variations - read the project variation register.
 */

import { db } from '@/lib/db';
import { variations } from '@/lib/db/pg-schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListVariationsInput {
    status?: string;
    category?: string;
    costLineId?: string;
    limit?: number;
}

interface ListVariationsOutput {
    projectId: string;
    rowCount: number;
    truncated: boolean;
    totals: {
        forecastCents: number;
        approvedCents: number;
    };
    rows: Array<{
        id: string;
        costLineId: string | null;
        variationNumber: string;
        category: string;
        description: string;
        status: string | null;
        amountForecastCents: number;
        amountApprovedCents: number;
        dateSubmitted: string | null;
        dateApproved: string | null;
        requestedBy: string | null;
        approvedBy: string | null;
        rowVersion: number;
    }>;
}

const DEFAULT_LIMIT = 50;
const HARD_LIMIT = 200;

const definition: AgentToolDefinition<ListVariationsInput, ListVariationsOutput> = {
    spec: {
        name: 'list_variations',
        description:
            'List project variations with forecast and approved amounts in cents. Use before creating or updating variation records.',
        inputSchema: {
            type: 'object',
            properties: {
                status: { type: 'string', description: 'Optional exact status filter.' },
                category: { type: 'string', description: 'Optional exact category filter.' },
                costLineId: { type: 'string', description: 'Optional cost-line id filter.' },
                limit: { type: 'integer', minimum: 1, maximum: HARD_LIMIT },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListVariationsInput {
        if (input === undefined || input === null) return {};
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('list_variations: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        const out: ListVariationsInput = {};
        for (const key of ['status', 'category', 'costLineId'] as const) {
            if (obj[key] === undefined) continue;
            if (typeof obj[key] !== 'string') throw new Error(`list_variations: "${key}" must be a string`);
            const value = obj[key].trim();
            if (value) out[key] = value;
        }
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit)) {
                throw new Error('list_variations: "limit" must be an integer');
            }
            out.limit = Math.max(1, Math.min(HARD_LIMIT, obj.limit));
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListVariationsInput): Promise<ListVariationsOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const conditions = [
            eq(variations.projectId, ctx.projectId),
            isNull(variations.deletedAt),
        ];
        if (input.status) conditions.push(eq(variations.status, input.status));
        if (input.category) conditions.push(eq(variations.category, input.category));
        if (input.costLineId) conditions.push(eq(variations.costLineId, input.costLineId));

        const rows = await db
            .select({
                id: variations.id,
                costLineId: variations.costLineId,
                variationNumber: variations.variationNumber,
                category: variations.category,
                description: variations.description,
                status: variations.status,
                amountForecastCents: variations.amountForecastCents,
                amountApprovedCents: variations.amountApprovedCents,
                dateSubmitted: variations.dateSubmitted,
                dateApproved: variations.dateApproved,
                requestedBy: variations.requestedBy,
                approvedBy: variations.approvedBy,
                rowVersion: variations.rowVersion,
            })
            .from(variations)
            .where(and(...conditions))
            .orderBy(asc(variations.variationNumber))
            .limit(limit + 1);

        const truncated = rows.length > limit;
        const trimmed = truncated ? rows.slice(0, limit) : rows;
        const totals = trimmed.reduce(
            (sum, row) => ({
                forecastCents: sum.forecastCents + (row.amountForecastCents ?? 0),
                approvedCents: sum.approvedCents + (row.amountApprovedCents ?? 0),
            }),
            { forecastCents: 0, approvedCents: 0 }
        );

        return {
            projectId: ctx.projectId,
            rowCount: trimmed.length,
            truncated,
            totals,
            rows: trimmed.map((row) => ({
                id: row.id,
                costLineId: row.costLineId ?? null,
                variationNumber: row.variationNumber,
                category: row.category,
                description: row.description,
                status: row.status ?? null,
                amountForecastCents: row.amountForecastCents ?? 0,
                amountApprovedCents: row.amountApprovedCents ?? 0,
                dateSubmitted: row.dateSubmitted ?? null,
                dateApproved: row.dateApproved ?? null,
                requestedBy: row.requestedBy ?? null,
                approvedBy: row.approvedBy ?? null,
                rowVersion: row.rowVersion ?? 1,
            })),
        };
    },
};

registerTool(definition);

export { definition as listVariationsTool };
