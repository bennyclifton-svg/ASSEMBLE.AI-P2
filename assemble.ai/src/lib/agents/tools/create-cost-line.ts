/**
 * create_cost_line — propose a brand-new cost line.
 *
 * MUTATING. Does not write directly. Builds a "before: empty / after:
 * proposed values" diff and inserts an approvals row via proposeApproval().
 * The actual INSERT happens in applicators.ts when the user clicks Approve.
 *
 * Phase 3 second mutating tool. Same pattern as update_cost_line — the
 * model never bypasses the approval gate.
 */

import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, moneyDiffLabel, type ProposedDiff } from '../approvals';

interface CreateCostLineInput {
    section: string;
    activity: string;
    costCode?: string;
    reference?: string;
    budgetCents?: number;
    approvedContractCents?: number;
    masterStage?: string;
    stakeholderId?: string;
    /** Anthropic tool_use_id, supplied by the runner. */
    _toolUseId?: string;
}

interface CreateCostLineOutput {
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
    section: 'Section',
    activity: 'Activity',
    costCode: 'Cost code',
    reference: 'Reference',
    budgetCents: 'Budget',
    approvedContractCents: 'Approved contract',
    masterStage: 'Master stage',
    stakeholderId: 'Stakeholder',
};

const definition: AgentToolDefinition<CreateCostLineInput, CreateCostLineOutput> = {
    spec: {
        name: 'create_cost_line',
        description:
            'Propose a brand-new cost line for the project. Specify the section ' +
            '(e.g., "FEES", "CONSULTANTS", "DEVELOPER", or whatever sections the ' +
            'project uses — call list_cost_lines first to see existing sections) ' +
            'and the activity description. Optional: cost code, master stage, ' +
            'budget and contract amounts (in cents — pass 6600000 for $66,000). ' +
            'The line is NOT created immediately; it is presented to the user ' +
            'for approval as an inline card in the chat.',
        inputSchema: {
            type: 'object',
            properties: {
                section: {
                    type: 'string',
                    description: 'Section name. Use list_cost_lines first to see existing sections.',
                },
                activity: {
                    type: 'string',
                    description: 'Short description of the activity (e.g., "Fire NSW referral fees").',
                },
                costCode: { type: 'string', description: 'Optional cost code (e.g., "1.07").' },
                reference: { type: 'string' },
                budgetCents: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Budget in cents (e.g., 6600000 = $66,000).',
                },
                approvedContractCents: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Approved contract amount in cents.',
                },
                masterStage: {
                    type: 'string',
                    enum: [...VALID_STAGES],
                    description: 'Optional. Project phase the line belongs to.',
                },
                stakeholderId: {
                    type: 'string',
                    description:
                        'Optional. Project stakeholder to associate with this line. Look up via the stakeholders module first if needed.',
                },
            },
            required: ['section', 'activity'],
        },
    },
    mutating: true,
    validate(input: unknown): CreateCostLineInput {
        if (!input || typeof input !== 'object') {
            throw new Error('create_cost_line: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        if (typeof obj.section !== 'string' || !obj.section.trim()) {
            throw new Error('create_cost_line: "section" is required and must be a non-empty string');
        }
        if (typeof obj.activity !== 'string' || !obj.activity.trim()) {
            throw new Error('create_cost_line: "activity" is required and must be a non-empty string');
        }
        const out: CreateCostLineInput = {
            section: obj.section.trim(),
            activity: obj.activity.trim(),
        };

        const optStr = (key: 'costCode' | 'reference' | 'masterStage' | 'stakeholderId') => {
            const v = obj[key];
            if (v === undefined) return;
            if (typeof v !== 'string') {
                throw new Error(`create_cost_line: "${key}" must be a string`);
            }
            out[key] = v;
        };
        optStr('costCode');
        optStr('reference');
        optStr('stakeholderId');

        if (obj.masterStage !== undefined) {
            if (
                typeof obj.masterStage !== 'string' ||
                !(VALID_STAGES as readonly string[]).includes(obj.masterStage)
            ) {
                throw new Error(
                    `create_cost_line: "masterStage" must be one of ${VALID_STAGES.join(', ')}`
                );
            }
            out.masterStage = obj.masterStage;
        }

        const optMoney = (key: 'budgetCents' | 'approvedContractCents') => {
            const v = obj[key];
            if (v === undefined) return;
            if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
                throw new Error(`create_cost_line: "${key}" must be a non-negative integer`);
            }
            out[key] = v;
        };
        optMoney('budgetCents');
        optMoney('approvedContractCents');

        if (typeof obj._toolUseId === 'string') out._toolUseId = obj._toolUseId;
        return out;
    },
    async execute(ctx: ToolContext, input: CreateCostLineInput): Promise<CreateCostLineOutput> {
        await assertProjectOrg(ctx);

        // Build the diff — "before" is the empty state, "after" is the proposal.
        // Surface money in dollars for the UI (the underlying field is cents).
        const changes: ProposedDiff['changes'] = [];
        const visibleKeys: Array<keyof CreateCostLineInput> = [
            'section',
            'costCode',
            'activity',
            'reference',
            'masterStage',
            'budgetCents',
            'approvedContractCents',
            'stakeholderId',
        ];
        for (const key of visibleKeys) {
            const value = input[key];
            if (value === undefined) continue;
            const isMoney = key === 'budgetCents' || key === 'approvedContractCents';
            changes.push({
                field: key as string,
                label: FIELD_LABELS[key as string] ?? (key as string),
                before: '—',
                after: isMoney
                    ? moneyDiffLabel(0, Number(value)).split(' → ')[1]
                    : value,
            });
        }

        const summary = `Create cost line in ${input.section} — ${input.activity}`;
        const diff: ProposedDiff = {
            entity: 'cost_line',
            entityId: null, // doesn't exist yet
            summary,
            changes,
        };

        const proposal = await proposeApproval({
            ctx,
            toolName: 'create_cost_line',
            toolUseId: input._toolUseId ?? '',
            input,
            proposedDiff: diff,
            expectedRowVersion: null, // create has no row to lock against
        });

        return proposal.toolResult;
    },
};

registerTool(definition);

export { definition as createCostLineTool };
