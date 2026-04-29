/**
 * update_cost_line — propose a change to one cost line.
 *
 * MUTATING. Does not write directly. Reads the current row, builds a
 * before/after diff, and inserts an approvals row via proposeApproval().
 * The user clicks Approve/Reject in the chat dock; the actual mutation
 * happens in src/app/api/chat/approvals/[id]/respond/route.ts under
 * optimistic-locking.
 *
 * Phase 3 first mutating tool. Acts as the template for future ones
 * (create_variation, update_milestone_dates, etc.).
 */

import { db } from '@/lib/db';
import { costLines } from '@/lib/db/pg-schema';
import { and, eq, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, moneyDiffLabel, type ProposedDiff } from '../approvals';

interface UpdateCostLineInput {
    id: string;
    /** Anthropic tool_use_id, supplied by the runner. Not exposed in the JSON schema. */
    _toolUseId?: string;
    activity?: string;
    section?: string;
    costCode?: string;
    reference?: string;
    budgetCents?: number;
    approvedContractCents?: number;
    masterStage?: string;
}

interface UpdateCostLineOutput {
    status: 'awaiting_approval';
    approvalId: string;
    toolName: string;
    summary: string;
}

const VALID_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;

const FIELD_LABELS: Record<string, string> = {
    activity: 'Activity',
    section: 'Section',
    costCode: 'Cost code',
    reference: 'Reference',
    budgetCents: 'Budget',
    approvedContractCents: 'Approved contract',
    masterStage: 'Master stage',
};

const definition: AgentToolDefinition<UpdateCostLineInput, UpdateCostLineOutput> = {
    spec: {
        name: 'update_cost_line',
        description:
            'Propose an update to one cost line. Specify the cost line id (use ' +
            'list_cost_lines first to find it) and the fields to change. ' +
            'Money fields (budgetCents, approvedContractCents) are in cents — ' +
            'pass 500000 for $5,000. The change is NOT applied immediately; ' +
            'it is presented to the user for approval in the chat. Only ' +
            'include the fields you want to change. ALWAYS read the current ' +
            'row via list_cost_lines before proposing — otherwise you will ' +
            'overwrite values you did not intend to change.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Cost line id (from list_cost_lines).' },
                activity: { type: 'string' },
                section: { type: 'string' },
                costCode: { type: 'string' },
                reference: { type: 'string' },
                budgetCents: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Budget amount in cents (e.g., 500000 = $5,000).',
                },
                approvedContractCents: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Approved contract amount in cents.',
                },
                masterStage: {
                    type: 'string',
                    enum: [...VALID_STAGES],
                },
            },
            required: ['id'],
        },
    },
    mutating: true,
    validate(input: unknown): UpdateCostLineInput {
        if (!input || typeof input !== 'object') {
            throw new Error('update_cost_line: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        if (typeof obj.id !== 'string' || !obj.id) {
            throw new Error('update_cost_line: "id" is required');
        }
        const out: UpdateCostLineInput = { id: obj.id };

        const setStr = (key: keyof UpdateCostLineInput) => {
            const v = obj[key as string];
            if (v === undefined) return;
            if (typeof v !== 'string') {
                throw new Error(`update_cost_line: "${String(key)}" must be a string`);
            }
            (out as unknown as Record<string, unknown>)[key as string] = v;
        };
        setStr('activity');
        setStr('section');
        setStr('costCode');
        setStr('reference');

        if (obj.masterStage !== undefined) {
            if (
                typeof obj.masterStage !== 'string' ||
                !(VALID_STAGES as readonly string[]).includes(obj.masterStage)
            ) {
                throw new Error(
                    `update_cost_line: "masterStage" must be one of ${VALID_STAGES.join(', ')}`
                );
            }
            out.masterStage = obj.masterStage;
        }
        if (obj.budgetCents !== undefined) {
            if (
                typeof obj.budgetCents !== 'number' ||
                !Number.isInteger(obj.budgetCents) ||
                obj.budgetCents < 0
            ) {
                throw new Error('update_cost_line: "budgetCents" must be a non-negative integer');
            }
            out.budgetCents = obj.budgetCents;
        }
        if (obj.approvedContractCents !== undefined) {
            if (
                typeof obj.approvedContractCents !== 'number' ||
                !Number.isInteger(obj.approvedContractCents) ||
                obj.approvedContractCents < 0
            ) {
                throw new Error(
                    'update_cost_line: "approvedContractCents" must be a non-negative integer'
                );
            }
            out.approvedContractCents = obj.approvedContractCents;
        }

        // Reject empty proposals (id only, no field changes)
        const fieldKeys: Array<keyof UpdateCostLineInput> = [
            'activity',
            'section',
            'costCode',
            'reference',
            'budgetCents',
            'approvedContractCents',
            'masterStage',
        ];
        const hasChange = fieldKeys.some((k) => out[k] !== undefined);
        if (!hasChange) {
            throw new Error(
                'update_cost_line: at least one field to change is required (besides id)'
            );
        }

        if (typeof obj._toolUseId === 'string') out._toolUseId = obj._toolUseId;
        return out;
    },
    async execute(ctx: ToolContext, input: UpdateCostLineInput): Promise<UpdateCostLineOutput> {
        await assertProjectOrg(ctx);

        // Read the current row, scoped to this project (multi-tenant safety
        // — no agent should ever see or touch a row from another project).
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
            throw new Error(
                `Cost line ${input.id} not found in this project (or has been deleted).`
            );
        }

        // Build the change set. Skip fields where the proposed value matches
        // the current value — no point asking the user to approve a no-op.
        const changes: ProposedDiff['changes'] = [];
        const proposedRowKeys: Array<keyof UpdateCostLineInput> = [
            'activity',
            'section',
            'costCode',
            'reference',
            'budgetCents',
            'approvedContractCents',
            'masterStage',
        ];
        for (const key of proposedRowKeys) {
            const next = input[key];
            if (next === undefined) continue;
            const current = (row as unknown as Record<string, unknown>)[key as string];
            if (current === next) continue;
            const isMoney = key === 'budgetCents' || key === 'approvedContractCents';
            changes.push({
                field: key as string,
                label: FIELD_LABELS[key as string] ?? (key as string),
                before: isMoney ? moneyDiffLabel(Number(current ?? 0), Number(current ?? 0)).split(' → ')[0] : current,
                after: isMoney ? moneyDiffLabel(Number(current ?? 0), Number(next as number)).split(' → ')[1] : next,
            });
        }

        if (changes.length === 0) {
            // The model proposed values that match the current row exactly.
            // No approval needed; tell it so it can move on.
            throw new Error(
                'update_cost_line: proposed values are identical to the current row. No change required.'
            );
        }

        const summary = `Update cost line ${row.costCode ?? row.id.slice(0, 8)} — ${row.activity}`;
        const diff: ProposedDiff = {
            entity: 'cost_line',
            entityId: row.id,
            summary,
            changes,
        };

        const proposal = await proposeApproval({
            ctx,
            toolName: 'update_cost_line',
            toolUseId: input._toolUseId ?? '',
            input,
            proposedDiff: diff,
            expectedRowVersion: row.rowVersion ?? 1,
        });

        return proposal.toolResult;
    },
};

registerTool(definition);

export { definition as updateCostLineTool };
