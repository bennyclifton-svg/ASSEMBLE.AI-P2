import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { programActivities, programMilestones } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { defineAction } from '../define';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const inputSchema = z.object({
    activityId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    date: z.string().regex(ISO_DATE),
    sortOrder: z.number().int().optional(),
    _toolUseId: z.string().optional(),
});

type CreateProgramMilestoneInput = z.infer<typeof inputSchema>;

async function getActivity(projectId: string, activityId: string): Promise<{ id: string; name: string } | null> {
    const [activity] = await db
        .select({ id: programActivities.id, name: programActivities.name })
        .from(programActivities)
        .where(and(eq(programActivities.id, activityId), eq(programActivities.projectId, projectId)))
        .limit(1);
    return activity ?? null;
}

function createProgramMilestoneDiff(
    input: CreateProgramMilestoneInput,
    activityName?: string
): ProposedDiff {
    const changes: ProposedDiff['changes'] = [
        {
            field: 'activityId',
            label: 'Activity',
            before: '-',
            after: activityName ?? input.activityId,
        },
        { field: 'name', label: 'Name', before: '-', after: input.name },
        { field: 'date', label: 'Date', before: '-', after: input.date },
    ];

    if (input.sortOrder !== undefined) {
        changes.push({
            field: 'sortOrder',
            label: 'Sort order',
            before: '-',
            after: input.sortOrder,
        });
    }

    return {
        entity: 'program_milestone',
        entityId: null,
        summary: `Create milestone - ${input.name}`,
        changes,
    };
}

async function nextSortOrder(activityId: string): Promise<number> {
    const [last] = await db
        .select({ sortOrder: programMilestones.sortOrder })
        .from(programMilestones)
        .where(eq(programMilestones.activityId, activityId))
        .orderBy(desc(programMilestones.sortOrder))
        .limit(1);
    return (last?.sortOrder ?? -1) + 1;
}

export const createProgramMilestoneAction = defineAction<
    CreateProgramMilestoneInput,
    Record<string, unknown>
>({
    id: 'program.milestone.create',
    toolName: 'create_program_milestone',
    domain: 'program',
    description: 'Create one programme milestone under an existing activity.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['program', 'orchestrator'],
    emits: [{ entity: 'program_milestone', op: 'created' }],
    uiTarget: { tab: 'program', focusEntity: 'program_milestone' },
    async prepareProposal(ctx, input) {
        const activity = await getActivity(ctx.projectId, input.activityId);
        if (!activity) {
            throw new Error(`Program activity ${input.activityId} not found in this project.`);
        }
        return {
            proposedDiff: createProgramMilestoneDiff(input, activity.name),
        };
    },
    async apply(ctx, input) {
        const activity = await getActivity(ctx.projectId, input.activityId);
        if (!activity) {
            throw new Error('Programme activity no longer exists.');
        }

        const values = {
            id: crypto.randomUUID(),
            activityId: input.activityId,
            name: input.name,
            date: input.date,
            sortOrder: input.sortOrder ?? (await nextSortOrder(input.activityId)),
            rowVersion: 1,
            createdAt: new Date(),
        };

        await db.insert(programMilestones).values(values);
        return values as unknown as Record<string, unknown>;
    },
});
