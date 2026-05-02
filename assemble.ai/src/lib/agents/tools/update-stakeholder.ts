/**
 * update_stakeholder - propose edits to a unified project stakeholder.
 */

import { db } from '@/lib/db';
import { projectStakeholders } from '@/lib/db/pg-schema';
import { and, eq, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    ensureAtLeastOneDefined,
    optionalBoolean,
    optionalNullableString,
    requiredString,
    updateDiffChanges,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface UpdateStakeholderInput extends Record<string, unknown> {
    id: string;
    isEnabled?: boolean;
    briefServices?: string | null;
    briefDeliverables?: string | null;
    briefFee?: string | null;
    briefProgram?: string | null;
    scopeWorks?: string | null;
    scopePrice?: string | null;
    scopeProgram?: string | null;
    notes?: string | null;
    _toolUseId?: string;
}

const TOOL = 'update_stakeholder';
const CHANGE_KEYS = [
    'isEnabled',
    'briefServices',
    'briefDeliverables',
    'briefFee',
    'briefProgram',
    'scopeWorks',
    'scopePrice',
    'scopeProgram',
    'notes',
];
const USER_MANAGED_KEYS = [
    'name',
    'role',
    'organization',
    'contactName',
    'contactEmail',
    'contactPhone',
    'disciplineOrTrade',
    'submissionRef',
    'submissionType',
];

const definition: AgentToolDefinition<UpdateStakeholderInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose edits to one project stakeholder brief/scope record. RFT Brief content is stored here: briefServices controls the RFT Service column and briefDeliverables controls the RFT Deliverables column. Call list_stakeholders first to find the current stakeholder id. Do not change name, role, organisation, contact details, discipline/trade, or submission identity fields; those are user-managed. The change requires user approval.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Stakeholder id from list_stakeholders.' },
                isEnabled: { type: 'boolean' },
                briefServices: { type: ['string', 'null'] },
                briefDeliverables: { type: ['string', 'null'] },
                briefFee: { type: ['string', 'null'] },
                briefProgram: { type: ['string', 'null'] },
                scopeWorks: { type: ['string', 'null'] },
                scopePrice: { type: ['string', 'null'] },
                scopeProgram: { type: ['string', 'null'] },
                notes: { type: ['string', 'null'] },
            },
            required: ['id'],
        },
    },
    mutating: true,
    validate(input: unknown): UpdateStakeholderInput {
        const obj = asObject(input, TOOL);
        const out: UpdateStakeholderInput = { id: requiredString(obj, 'id', TOOL) };
        for (const key of USER_MANAGED_KEYS) {
            if (obj[key] !== undefined) {
                throw new Error(`${TOOL}: "${key}" is user-managed and cannot be changed by this tool`);
            }
        }
        for (const key of CHANGE_KEYS.filter((key) => key !== 'isEnabled') as Array<
            keyof UpdateStakeholderInput & string
        >) {
            const value = optionalNullableString(obj, key, TOOL);
            if (value !== undefined) (out as Record<string, unknown>)[key] = value;
        }
        const isEnabled = optionalBoolean(obj, 'isEnabled', TOOL);
        if (isEnabled !== undefined) out.isEnabled = isEnabled;
        copyToolUseId(obj, out);
        ensureAtLeastOneDefined(out, CHANGE_KEYS, TOOL);
        return out;
    },
    async execute(ctx: ToolContext, input: UpdateStakeholderInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const [row] = await db
            .select()
            .from(projectStakeholders)
            .where(
                and(
                    eq(projectStakeholders.id, input.id),
                    eq(projectStakeholders.projectId, ctx.projectId),
                    isNull(projectStakeholders.deletedAt)
                )
            )
            .limit(1);

        if (!row) throw new Error(`Stakeholder ${input.id} not found in this project.`);

        const changes = updateDiffChanges(input, row as unknown as Record<string, unknown>, [
            { key: 'isEnabled', label: 'Enabled' },
            { key: 'briefServices', label: 'Brief services' },
            { key: 'briefDeliverables', label: 'Brief deliverables' },
            { key: 'briefFee', label: 'Brief fee' },
            { key: 'briefProgram', label: 'Brief programme' },
            { key: 'scopeWorks', label: 'Scope works' },
            { key: 'scopePrice', label: 'Scope price' },
            { key: 'scopeProgram', label: 'Scope programme' },
            { key: 'notes', label: 'Notes' },
        ]);
        if (changes.length === 0) throw new Error(`${TOOL}: proposed values are identical to the current stakeholder.`);

        const isRftBriefUpdate = changes.some((change) =>
            ['briefServices', 'briefDeliverables', 'briefFee', 'briefProgram'].includes(change.field)
        );
        const summary = isRftBriefUpdate
            ? `Update RFT brief - ${row.name}`
            : `Update stakeholder - ${row.name}`;
        const diff: ProposedDiff = {
            entity: 'stakeholder',
            entityId: row.id,
            summary,
            changes,
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input,
                proposedDiff: diff,
                expectedRowVersion: row.rowVersion ?? 1,
            })
        ).toolResult;
    },
};

registerTool(definition);

export { definition as updateStakeholderTool };
