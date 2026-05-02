/**
 * update_program_milestone - propose edits to a programme milestone.
 */

import { db } from '@/lib/db';
import { programActivities, programMilestones } from '@/lib/db/pg-schema';
import { and, eq } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    ensureAtLeastOneDefined,
    optionalInteger,
    optionalIsoDate,
    optionalNullableString,
    requiredString,
    updateDiffChanges,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface UpdateProgramMilestoneInput extends Record<string, unknown> {
    id: string;
    name?: string;
    date?: string;
    sortOrder?: number;
    _toolUseId?: string;
}

const TOOL = 'update_program_milestone';
const CHANGE_KEYS = ['name', 'date', 'sortOrder'];

const definition: AgentToolDefinition<UpdateProgramMilestoneInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose edits to one programme milestone. Call list_program first to find the milestone id. The change requires user approval.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Milestone id from list_program.' },
                name: { type: 'string' },
                date: { type: 'string', description: 'YYYY-MM-DD.' },
                sortOrder: { type: 'integer' },
            },
            required: ['id'],
        },
    },
    mutating: true,
    validate(input: unknown): UpdateProgramMilestoneInput {
        const obj = asObject(input, TOOL);
        const out: UpdateProgramMilestoneInput = { id: requiredString(obj, 'id', TOOL) };
        const name = optionalNullableString(obj, 'name', TOOL);
        if (name !== undefined) {
            if (name === null) throw new Error(`${TOOL}: "name" cannot be null`);
            out.name = name;
        }
        const date = optionalIsoDate(obj, 'date', TOOL);
        if (date !== undefined) out.date = date;
        const sortOrder = optionalInteger(obj, 'sortOrder', TOOL);
        if (sortOrder !== undefined) out.sortOrder = sortOrder;
        copyToolUseId(obj, out);
        ensureAtLeastOneDefined(out, CHANGE_KEYS, TOOL);
        return out;
    },
    async execute(ctx: ToolContext, input: UpdateProgramMilestoneInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const [row] = await db
            .select({
                id: programMilestones.id,
                activityId: programMilestones.activityId,
                name: programMilestones.name,
                date: programMilestones.date,
                sortOrder: programMilestones.sortOrder,
                rowVersion: programMilestones.rowVersion,
            })
            .from(programMilestones)
            .innerJoin(programActivities, eq(programMilestones.activityId, programActivities.id))
            .where(and(eq(programMilestones.id, input.id), eq(programActivities.projectId, ctx.projectId)))
            .limit(1);

        if (!row) throw new Error(`Program milestone ${input.id} not found in this project.`);

        const changes = updateDiffChanges(input, row as unknown as Record<string, unknown>, [
            { key: 'name', label: 'Name' },
            { key: 'date', label: 'Date' },
            { key: 'sortOrder', label: 'Sort order' },
        ]);
        if (changes.length === 0) throw new Error(`${TOOL}: proposed values are identical to the current milestone.`);

        const summary = `Update milestone - ${row.name}`;
        const diff: ProposedDiff = {
            entity: 'program_milestone',
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

export { definition as updateProgramMilestoneTool };
