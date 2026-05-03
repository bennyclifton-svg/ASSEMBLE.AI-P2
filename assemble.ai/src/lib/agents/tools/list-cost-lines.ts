/**
 * list_cost_lines — read the project's cost plan.
 *
 * Read-only. Returns cost lines with budget and approved contract amounts,
 * grouped by section. Supports a coarse master-stage filter so the model
 * can ask for, e.g., just the schematic-design lines.
 */

import { db } from '@/lib/db';
import { costLines, projectStakeholders } from '@/lib/db/pg-schema';
import { and, eq, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    COST_LINE_LIST_MATCH_THRESHOLD,
    formatCostLineLabel,
    rankCostLineMatches,
    type CostLineMatchRow,
} from '@/lib/agents/cost-line-matching';

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
    query?: string;
    section?: string;
    limit?: number;
}

type CostLineRow = CostLineMatchRow & {
    masterStage: string | null;
    budgetCents: number | null;
    approvedContractCents: number | null;
    stakeholderId: string | null;
    sortOrder: number | null;
};

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
        reference: string | null;
        label: string;
        matchScore?: number;
        budgetCents: number;
        approvedContractCents: number;
        stakeholderId: string | null;
        stakeholderName: string | null;
        disciplineOrTrade: string | null;
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
            'procurement, delivery). Includes stakeholder/discipline labels so you can map a user phrase like "Mechanical / Detail Design" to a cost line id. Use query for user-supplied cost-line names or near matches, including typos such as "Fire Servcies" or category/line wording such as "Developer Expenses / Long Service Levy"; use section only when filtering by an exact section name.',
        inputSchema: {
            type: 'object',
            properties: {
                masterStage: {
                    type: 'string',
                    enum: [...VALID_STAGES],
                    description: 'Optional. Filter to one master stage.',
                },
                query: {
                    type: 'string',
                    description:
                        'Optional fuzzy search across section/category aliases, cost code, activity, reference, stakeholder, and discipline labels. Prefer this for user-provided cost-line names.',
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
        if (obj.query !== undefined) {
            if (typeof obj.query !== 'string') {
                throw new Error('list_cost_lines: "query" must be a string');
            }
            const query = obj.query.trim();
            if (query) out.query = query;
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
        const query = input.query ?? null;
        const exactSectionFilter = input.section && !query ? input.section : null;
        const fetchLimit = query ? HARD_LIMIT : limit;
        let rows = await fetchCostLines(ctx, input, fetchLimit, exactSectionFilter);
        let scoredById = new Map<string, number>();

        if (query) {
            const scored = rankCostLineMatches(
                rows,
                { reference: query },
                COST_LINE_LIST_MATCH_THRESHOLD
            );
            rows = scored.map((candidate) => candidate.row as CostLineRow);
            scoredById = new Map(scored.map((candidate) => [candidate.row.id, candidate.score]));
        } else if (input.section && rows.length === 0) {
            const fallbackRows = await fetchCostLines(ctx, input, HARD_LIMIT, null);
            const scored = rankCostLineMatches(
                fallbackRows,
                { reference: input.section },
                COST_LINE_LIST_MATCH_THRESHOLD
            );
            rows = scored.map((candidate) => candidate.row as CostLineRow);
            scoredById = new Map(scored.map((candidate) => [candidate.row.id, candidate.score]));
        }

        const truncated = rows.length > limit;
        const trimmed = truncated ? rows.slice(0, limit) : rows;

        return costLineOutput(ctx.projectId, trimmed, truncated, scoredById);
    },
};

async function fetchCostLines(
    ctx: ToolContext,
    input: ListCostLinesInput,
    limit: number,
    section: string | null
): Promise<CostLineRow[]> {
    const conditions = [
        eq(costLines.projectId, ctx.projectId),
        isNull(costLines.deletedAt),
    ];
    if (input.masterStage) conditions.push(eq(costLines.masterStage, input.masterStage));
    if (section) conditions.push(eq(costLines.section, section));

    return db
        .select({
            id: costLines.id,
            section: costLines.section,
            masterStage: costLines.masterStage,
            costCode: costLines.costCode,
            activity: costLines.activity,
            reference: costLines.reference,
            budgetCents: costLines.budgetCents,
            approvedContractCents: costLines.approvedContractCents,
            stakeholderId: costLines.stakeholderId,
            stakeholderName: projectStakeholders.name,
            disciplineOrTrade: projectStakeholders.disciplineOrTrade,
            sortOrder: costLines.sortOrder,
        })
        .from(costLines)
        .leftJoin(projectStakeholders, eq(costLines.stakeholderId, projectStakeholders.id))
        .where(and(...conditions))
        .orderBy(costLines.section, costLines.sortOrder)
        .limit(limit + 1);
}

function costLineOutput(
    projectId: string,
    rows: CostLineRow[],
    truncated: boolean,
    scoredById: Map<string, number>
): ListCostLinesOutput {
    let budgetTotal = 0;
    let contractTotal = 0;
    for (const r of rows) {
        budgetTotal += r.budgetCents ?? 0;
        contractTotal += r.approvedContractCents ?? 0;
    }

    return {
        projectId,
        rowCount: rows.length,
        totals: {
            budgetCents: budgetTotal,
            approvedContractCents: contractTotal,
            varianceCents: contractTotal - budgetTotal,
        },
        rows: rows.map((r) => {
            const score = scoredById.get(r.id);
            return {
                id: r.id,
                section: r.section,
                masterStage: r.masterStage ?? null,
                costCode: r.costCode ?? null,
                activity: r.activity,
                reference: r.reference ?? null,
                label: formatCostLineLabel(r),
                ...(score !== undefined ? { matchScore: Number(score.toFixed(3)) } : {}),
                budgetCents: r.budgetCents ?? 0,
                approvedContractCents: r.approvedContractCents ?? 0,
                stakeholderId: r.stakeholderId ?? null,
                stakeholderName: r.stakeholderName ?? null,
                disciplineOrTrade: r.disciplineOrTrade ?? null,
            };
        }),
        truncated,
    };
}

registerTool(definition);

export { definition as listCostLinesTool };
