/**
 * update_program_activity - propose edits to a programme activity.
 */

import { db } from '@/lib/db';
import { programActivities } from '@/lib/db/pg-schema';
import { and, eq } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    ensureAtLeastOneDefined,
    optionalBoolean,
    optionalEnum,
    optionalInteger,
    optionalNullableIsoDate,
    optionalNullableString,
    requiredString,
    updateDiffChanges,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface UpdateProgramActivityInput extends Record<string, unknown> {
    id: string;
    name?: string;
    parentId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    collapsed?: boolean;
    masterStage?: MasterStage | null;
    color?: string | null;
    sortOrder?: number;
    _toolUseId?: string;
}

const VALID_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;
type MasterStage = (typeof VALID_STAGES)[number];
const TOOL = 'update_program_activity';
const CHANGE_KEYS = [
    'name',
    'parentId',
    'startDate',
    'endDate',
    'collapsed',
    'masterStage',
    'color',
    'sortOrder',
];

const definition: AgentToolDefinition<UpdateProgramActivityInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose updates to one programme activity. Call list_program first to find the current activity id. The change requires user approval.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Activity id from list_program.' },
                name: { type: 'string' },
                parentId: { type: ['string', 'null'] },
                startDate: { type: ['string', 'null'], description: 'YYYY-MM-DD or null.' },
                endDate: { type: ['string', 'null'], description: 'YYYY-MM-DD or null.' },
                collapsed: { type: 'boolean' },
                masterStage: { type: ['string', 'null'], enum: [...VALID_STAGES, null] },
                color: { type: ['string', 'null'] },
                sortOrder: { type: 'integer' },
            },
            required: ['id'],
        },
    },
    mutating: true,
    validate(input: unknown): UpdateProgramActivityInput {
        const obj = asObject(input, TOOL);
        const out: UpdateProgramActivityInput = { id: requiredString(obj, 'id', TOOL) };
        const name = optionalNullableString(obj, 'name', TOOL);
        if (name !== undefined) {
            if (name === null) throw new Error(`${TOOL}: "name" cannot be null`);
            out.name = name;
        }
        const parentId = optionalNullableString(obj, 'parentId', TOOL);
        if (parentId !== undefined) out.parentId = parentId;
        const startDate = optionalNullableIsoDate(obj, 'startDate', TOOL);
        if (startDate !== undefined) out.startDate = startDate;
        const endDate = optionalNullableIsoDate(obj, 'endDate', TOOL);
        if (endDate !== undefined) out.endDate = endDate;
        if (typeof out.startDate === 'string' && typeof out.endDate === 'string' && out.startDate > out.endDate) {
            throw new Error(`${TOOL}: "startDate" cannot be after "endDate"`);
        }
        const collapsed = optionalBoolean(obj, 'collapsed', TOOL);
        if (collapsed !== undefined) out.collapsed = collapsed;
        if (obj.masterStage === null) out.masterStage = null;
        else {
            const masterStage = optionalEnum(obj, 'masterStage', VALID_STAGES, TOOL);
            if (masterStage !== undefined) out.masterStage = masterStage;
        }
        const color = optionalNullableString(obj, 'color', TOOL);
        if (color !== undefined) out.color = color;
        const sortOrder = optionalInteger(obj, 'sortOrder', TOOL);
        if (sortOrder !== undefined) out.sortOrder = sortOrder;
        copyToolUseId(obj, out);
        ensureAtLeastOneDefined(out, CHANGE_KEYS, TOOL);
        return out;
    },
    async execute(ctx: ToolContext, input: UpdateProgramActivityInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const [row] = await db
            .select()
            .from(programActivities)
            .where(and(eq(programActivities.id, input.id), eq(programActivities.projectId, ctx.projectId)))
            .limit(1);

        if (!row) throw new Error(`Program activity ${input.id} not found in this project.`);

        const effectiveStart = input.startDate === undefined ? row.startDate : input.startDate;
        const effectiveEnd = input.endDate === undefined ? row.endDate : input.endDate;
        if (typeof effectiveStart === 'string' && typeof effectiveEnd === 'string' && effectiveStart > effectiveEnd) {
            throw new Error(`${TOOL}: resulting startDate cannot be after endDate`);
        }

        const changes = updateDiffChanges(input, row as unknown as Record<string, unknown>, [
            { key: 'name', label: 'Name' },
            { key: 'parentId', label: 'Parent activity' },
            { key: 'startDate', label: 'Start date' },
            { key: 'endDate', label: 'End date' },
            { key: 'collapsed', label: 'Collapsed' },
            { key: 'masterStage', label: 'Master stage' },
            { key: 'color', label: 'Colour' },
            { key: 'sortOrder', label: 'Sort order' },
        ]);
        if (changes.length === 0) throw new Error(`${TOOL}: proposed values are identical to the current activity.`);

        const summary = `Update programme activity - ${row.name}`;
        const diff: ProposedDiff = {
            entity: 'program_activity',
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

export { definition as updateProgramActivityTool };
