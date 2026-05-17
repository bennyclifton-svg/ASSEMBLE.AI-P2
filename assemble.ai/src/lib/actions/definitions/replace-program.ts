import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { programActivities } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import type { ActionApplyResult } from '../types';
import { defineAction } from '../define';

const MASTER_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const nullableIsoDate = z.union([z.string().regex(ISO_DATE), z.null()]);

const activitySchema = z
    .object({
        name: z.string().trim().min(1),
        parentId: z.union([z.string().trim().min(1), z.null()]).optional(),
        startDate: nullableIsoDate.optional(),
        endDate: nullableIsoDate.optional(),
        collapsed: z.boolean().optional(),
        masterStage: z.union([z.enum(MASTER_STAGES), z.null()]).optional(),
        color: z.union([z.string().trim().min(1), z.null()]).optional(),
        sortOrder: z.number().int().optional(),
    })
    .superRefine((input, ctx) => {
        if (
            typeof input.startDate === 'string' &&
            typeof input.endDate === 'string' &&
            input.startDate > input.endDate
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Start date cannot be after end date.',
                path: ['startDate'],
            });
        }
    });

const inputSchema = z.object({
    activities: z.array(activitySchema).min(1).max(50),
    _toolUseId: z.string().optional(),
});

type ReplaceProgramInput = z.infer<typeof inputSchema>;

function activitySummary(activity: ReplaceProgramInput['activities'][number], index: number): string {
    const order = activity.sortOrder ?? index;
    const dates =
        activity.startDate || activity.endDate
            ? ` (${activity.startDate ?? 'no start'} to ${activity.endDate ?? 'no finish'})`
            : '';
    const stage = activity.masterStage ? ` [${activity.masterStage}]` : '';
    return `${order + 1}. ${activity.name}${dates}${stage}`;
}

async function currentActivitySummaries(projectId: string): Promise<string[]> {
    const rows = await db
        .select({
            name: programActivities.name,
            startDate: programActivities.startDate,
            endDate: programActivities.endDate,
            masterStage: programActivities.masterStage,
            sortOrder: programActivities.sortOrder,
        })
        .from(programActivities)
        .where(eq(programActivities.projectId, projectId))
        .orderBy(asc(programActivities.sortOrder));

    return rows.map((row, index) =>
        activitySummary(
            {
                name: row.name,
                startDate: row.startDate,
                endDate: row.endDate,
                masterStage: row.masterStage as ReplaceProgramInput['activities'][number]['masterStage'],
                sortOrder: row.sortOrder ?? index,
            },
            index
        )
    );
}

async function replaceProgramDiff(
    projectId: string,
    input: ReplaceProgramInput
): Promise<ProposedDiff> {
    const existing = await currentActivitySummaries(projectId);
    const next = input.activities.map(activitySummary);

    return {
        entity: 'program_activity',
        entityId: null,
        summary: `Replace programme with ${input.activities.length} activities`,
        changes: [
            {
                field: 'existingActivities',
                label: 'Existing programme',
                before:
                    existing.length > 0
                        ? `${existing.length} activities: ${existing.join('; ')}`
                        : 'No existing activities',
                after: 'Delete before creating replacement programme',
            },
            {
                field: 'replacementActivities',
                label: 'Replacement programme',
                before: '-',
                after: `${next.length} activities: ${next.join('; ')}`,
            },
        ],
    };
}

export const replaceProgramAction = defineAction<
    ReplaceProgramInput,
    Record<string, unknown>
>({
    id: 'program.replace',
    toolName: 'replace_program',
    domain: 'program',
    description:
        'Replace the entire project programme in one approval: delete all existing programme activities, milestones, dependencies, expected outputs, and evidence links, then create the supplied replacement activities. Use this when the user says to delete, clear, override, reset, or replace the current programme.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['program', 'orchestrator'],
    emits: [{ entity: 'program_activity', op: 'updated' }],
    uiTarget: { tab: 'program', focusEntity: 'program_activity' },
    async prepareProposal(ctx, input) {
        return { proposedDiff: await replaceProgramDiff(ctx.projectId, input) };
    },
    async applyResult(ctx, input): Promise<ActionApplyResult<Record<string, unknown>>> {
        const now = new Date();
        const created = await db.transaction(async (tx) => {
            await tx.delete(programActivities).where(eq(programActivities.projectId, ctx.projectId));

            const values = input.activities.map((activity, index) => ({
                id: crypto.randomUUID(),
                projectId: ctx.projectId,
                parentId: activity.parentId ?? null,
                name: activity.name,
                startDate: activity.startDate ?? null,
                endDate: activity.endDate ?? null,
                collapsed: activity.collapsed ?? false,
                masterStage: activity.masterStage ?? null,
                color: activity.color ?? null,
                sortOrder: activity.sortOrder ?? index,
                rowVersion: 1,
                createdAt: now,
                updatedAt: now,
            }));

            if (values.length > 0) {
                await tx.insert(programActivities).values(values);
            }

            return values;
        });

        return {
            kind: 'applied',
            output: {
                id: created[0]?.id ?? ctx.projectId,
                deletedExisting: true,
                createdActivityIds: created.map((activity) => activity.id),
                activityCount: created.length,
            },
        };
    },
});
