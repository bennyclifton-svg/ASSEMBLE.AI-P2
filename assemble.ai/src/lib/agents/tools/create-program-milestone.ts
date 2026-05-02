/**
 * create_program_milestone - propose a new programme milestone.
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
    createDiffChanges,
    optionalInteger,
    requiredIsoDate,
    requiredString,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface CreateProgramMilestoneInput extends Record<string, unknown> {
    activityId: string;
    name: string;
    date: string;
    sortOrder?: number;
    _toolUseId?: string;
}

const TOOL = 'create_program_milestone';

const definition: AgentToolDefinition<CreateProgramMilestoneInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose a new milestone under an existing programme activity. Call list_program first to find the activity id. The change requires user approval.',
        inputSchema: {
            type: 'object',
            properties: {
                activityId: { type: 'string', description: 'Activity id from list_program.' },
                name: { type: 'string' },
                date: { type: 'string', description: 'YYYY-MM-DD.' },
                sortOrder: { type: 'integer' },
            },
            required: ['activityId', 'name', 'date'],
        },
    },
    mutating: true,
    validate(input: unknown): CreateProgramMilestoneInput {
        const obj = asObject(input, TOOL);
        const out: CreateProgramMilestoneInput = {
            activityId: requiredString(obj, 'activityId', TOOL),
            name: requiredString(obj, 'name', TOOL),
            date: requiredIsoDate(obj, 'date', TOOL),
        };
        const sortOrder = optionalInteger(obj, 'sortOrder', TOOL);
        if (sortOrder !== undefined) out.sortOrder = sortOrder;
        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: CreateProgramMilestoneInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const [activity] = await db
            .select({ id: programActivities.id, name: programActivities.name })
            .from(programActivities)
            .where(and(eq(programActivities.id, input.activityId), eq(programActivities.projectId, ctx.projectId)))
            .limit(1);
        if (!activity) throw new Error(`Program activity ${input.activityId} not found in this project.`);

        const changes = createDiffChanges(input, [
            { key: 'activityId', label: 'Activity' },
            { key: 'name', label: 'Name' },
            { key: 'date', label: 'Date' },
            { key: 'sortOrder', label: 'Sort order' },
        ]);
        const summary = `Create milestone - ${input.name}`;
        const diff: ProposedDiff = {
            entity: 'program_milestone',
            entityId: null,
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
                expectedRowVersion: null,
            })
        ).toolResult;
    },
};

registerTool(definition);

export { definition as createProgramMilestoneTool };
