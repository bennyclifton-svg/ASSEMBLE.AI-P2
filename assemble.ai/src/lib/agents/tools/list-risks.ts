/**
 * list_risks - read project risk register.
 */

import { db } from '@/lib/db';
import { risks } from '@/lib/db/pg-schema';
import { and, asc, eq } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListRisksInput {
    status?: string;
    limit?: number;
}

interface ListRisksOutput {
    projectId: string;
    rowCount: number;
    truncated: boolean;
    rows: Array<{
        id: string;
        title: string;
        description: string | null;
        likelihood: string | null;
        impact: string | null;
        mitigation: string | null;
        status: string | null;
        order: number;
        rowVersion: number;
    }>;
}

const DEFAULT_LIMIT = 50;
const HARD_LIMIT = 200;

const definition: AgentToolDefinition<ListRisksInput, ListRisksOutput> = {
    spec: {
        name: 'list_risks',
        description:
            'List the current project risk register. Use before creating or updating risks and when answering project-risk questions.',
        inputSchema: {
            type: 'object',
            properties: {
                status: { type: 'string', description: 'Optional exact status filter.' },
                limit: { type: 'integer', minimum: 1, maximum: HARD_LIMIT },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListRisksInput {
        if (input === undefined || input === null) return {};
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('list_risks: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        const out: ListRisksInput = {};
        if (obj.status !== undefined) {
            if (typeof obj.status !== 'string') throw new Error('list_risks: "status" must be a string');
            out.status = obj.status.trim();
        }
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit)) {
                throw new Error('list_risks: "limit" must be an integer');
            }
            out.limit = Math.max(1, Math.min(HARD_LIMIT, obj.limit));
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListRisksInput): Promise<ListRisksOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const conditions = [eq(risks.projectId, ctx.projectId)];
        if (input.status) conditions.push(eq(risks.status, input.status));

        const rows = await db
            .select({
                id: risks.id,
                title: risks.title,
                description: risks.description,
                likelihood: risks.likelihood,
                impact: risks.impact,
                mitigation: risks.mitigation,
                status: risks.status,
                order: risks.order,
                rowVersion: risks.rowVersion,
            })
            .from(risks)
            .where(and(...conditions))
            .orderBy(asc(risks.order))
            .limit(limit + 1);

        const truncated = rows.length > limit;
        const trimmed = truncated ? rows.slice(0, limit) : rows;

        return {
            projectId: ctx.projectId,
            rowCount: trimmed.length,
            truncated,
            rows: trimmed.map((row) => ({
                id: row.id,
                title: row.title,
                description: row.description ?? null,
                likelihood: row.likelihood ?? null,
                impact: row.impact ?? null,
                mitigation: row.mitigation ?? null,
                status: row.status ?? null,
                order: row.order,
                rowVersion: row.rowVersion ?? 1,
            })),
        };
    },
};

registerTool(definition);

export { definition as listRisksTool };
