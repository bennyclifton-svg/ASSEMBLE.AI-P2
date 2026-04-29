/**
 * list_cost_lines — read the project's cost plan.
 *
 * Read-only. Returns cost lines with budget and approved contract amounts,
 * grouped by section. Supports a coarse master-stage filter so the model
 * can ask for, e.g., just the schematic-design lines.
 */

import { db } from '@/lib/db';
import { costLines } from '@/lib/db/pg-schema';
import { and, eq, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

const VALID_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;
type MasterStage = (typeof VALID_STAGES)[number];

interface ListCostLinesInput {
    masterStage?: MasterStage;
    section?: string;
    limit?: number;
}

interface ListCostLinesOutput {
    projectId: string;
    rowCount: number;
    totals: {
        budgetCents: number;
        approvedContractCents: number;
        varianceCents: number;
    };
    rows: Array<{
        id: string;
        section: string;
        masterStage: string | null;
        costCode: string | null;
        activity: string;
        budgetCents: number;
        approvedContractCents: number;
    }>;
    truncated: boolean;
}

const DEFAULT_LIMIT = 100;
const HARD_LIMIT = 500;

const definition: AgentToolDefinition<ListCostLinesInput, ListCostLinesOutput> = {
    spec: {
        name: 'list_cost_lines',
        description:
            'List cost lines from the current project\'s cost plan. Returns each ' +
            'line\'s section, activity, budget (in cents), and approved contract ' +
            'amount (in cents), plus aggregate totals and the budget-vs-contract ' +
            'variance. Use to answer cost-position questions, identify top-variance ' +
            'lines, or summarise the cost plan by section. Filter by masterStage to ' +
            'scope to a phase (initiation, schematic_design, design_development, ' +
            'procurement, delivery).',
        inputSchema: {
            type: 'object',
            properties: {
                masterStage: {
                    type: 'string',
                    enum: [...VALID_STAGES],
                    description: 'Optional. Filter to one master stage.',
                },
                section: {
                    type: 'string',
                    description: 'Optional. Exact-match filter on section name.',
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_LIMIT,
                    description: `Maximum rows to return (default ${DEFAULT_LIMIT}).`,
                },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListCostLinesInput {
        if (input === null || input === undefined) return {};
        if (typeof input !== 'object') {
            throw new Error('list_cost_lines: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        const out: ListCostLinesInput = {};
        if (obj.masterStage !== undefined) {
            if (typeof obj.masterStage !== 'string' || !VALID_STAGES.includes(obj.masterStage as MasterStage)) {
                throw new Error(
                    `list_cost_lines: "masterStage" must be one of ${VALID_STAGES.join(', ')}`
                );
            }
            out.masterStage = obj.masterStage as MasterStage;
        }
        if (obj.section !== undefined) {
            if (typeof obj.section !== 'string') {
                throw new Error('list_cost_lines: "section" must be a string');
            }
            out.section = obj.section;
        }
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit)) {
                throw new Error('list_cost_lines: "limit" must be an integer');
            }
            out.limit = Math.max(1, Math.min(HARD_LIMIT, obj.limit));
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListCostLinesInput): Promise<ListCostLinesOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const conditions = [
            eq(costLines.projectId, ctx.projectId),
            isNull(costLines.deletedAt),
        ];
        if (input.masterStage) conditions.push(eq(costLines.masterStage, input.masterStage));
        if (input.section) conditions.push(eq(costLines.section, input.section));

        const rows = await db
            .select({
                id: costLines.id,
                section: costLines.section,
                masterStage: costLines.masterStage,
                costCode: costLines.costCode,
                activity: costLines.activity,
                budgetCents: costLines.budgetCents,
                approvedContractCents: costLines.approvedContractCents,
                sortOrder: costLines.sortOrder,
            })
            .from(costLines)
            .where(and(...conditions))
            .orderBy(costLines.section, costLines.sortOrder)
            .limit(limit + 1);

        const truncated = rows.length > limit;
        const trimmed = truncated ? rows.slice(0, limit) : rows;

        let budgetTotal = 0;
        let contractTotal = 0;
        for (const r of trimmed) {
            budgetTotal += r.budgetCents ?? 0;
            contractTotal += r.approvedContractCents ?? 0;
        }

        return {
            projectId: ctx.projectId,
            rowCount: trimmed.length,
            totals: {
                budgetCents: budgetTotal,
                approvedContractCents: contractTotal,
                varianceCents: contractTotal - budgetTotal,
            },
            rows: trimmed.map((r) => ({
                id: r.id,
                section: r.section,
                masterStage: r.masterStage ?? null,
                costCode: r.costCode ?? null,
                activity: r.activity,
                budgetCents: r.budgetCents ?? 0,
                approvedContractCents: r.approvedContractCents ?? 0,
            })),
            truncated,
        };
    },
};

registerTool(definition);

export { definition as listCostLinesTool };
