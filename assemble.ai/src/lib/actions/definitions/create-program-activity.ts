import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { programActivities } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { defineAction } from '../define';

const MASTER_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIELD_LABELS = {
    name: 'Name',
    parentId: 'Parent activity',
    startDate: 'Start date',
    endDate: 'End date',
    collapsed: 'Collapsed',
    masterStage: 'Master stage',
    color: 'Colour',
    sortOrder: 'Sort order',
} as const;

const nullableIsoDate = z.union([z.string().regex(ISO_DATE), z.null()]);

const inputSchema = z
    .object({
        name: z.string().trim().min(1),
        parentId: z.union([z.string().trim().min(1), z.null()]).optional(),
        startDate: nullableIsoDate.optional(),
        endDate: nullableIsoDate.optional(),
        collapsed: z.boolean().optional(),
        masterStage: z.union([z.enum(MASTER_STAGES), z.null()]).optional(),
        color: z.union([z.string().trim().min(1), z.null()]).optional(),
        sortOrder: z.number().int().optional(),
        _toolUseId: z.string().optional(),
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

type CreateProgramActivityInput = z.infer<typeof inputSchema>;

function createProgramActivityDiff(input: CreateProgramActivityInput): ProposedDiff {
    const changes: ProposedDiff['changes'] = [
        { field: 'name', label: FIELD_LABELS.name, before: '-', after: input.name },
    ];

    for (const key of [
        'parentId',
        'startDate',
        'endDate',
        'collapsed',
        'masterStage',
        'color',
        'sortOrder',
    ] as const) {
        if (input[key] === undefined) continue;
        changes.push({
            field: key,
            label: FIELD_LABELS[key],
            before: '-',
            after: input[key],
        });
    }

    if (input.sortOrder === undefined) {
        changes.push({
            field: 'sortOrder',
            label: FIELD_LABELS.sortOrder,
            before: '-',
            after: 'Next available',
        });
    }

    return {
        entity: 'program_activity',
        entityId: null,
        summary: `Create programme activity - ${input.name}`,
        changes,
    };
}

async function assertParentActivity(projectId: string, parentId: string | null | undefined): Promise<void> {
    if (!parentId) return;
    const [parent] = await db
        .select({ id: programActivities.id })
        .from(programActivities)
        .where(and(eq(programActivities.id, parentId), eq(programActivities.projectId, projectId)))
        .limit(1);
    if (!parent) {
        throw new Error(`Parent programme activity ${parentId} was not found in this project.`);
    }
}

async function nextSortOrder(projectId: string): Promise<number> {
    const [last] = await db
        .select({ sortOrder: programActivities.sortOrder })
        .from(programActivities)
        .where(eq(programActivities.projectId, projectId))
        .orderBy(desc(programActivities.sortOrder))
        .limit(1);
    return (last?.sortOrder ?? -1) + 1;
}

export const createProgramActivityAction = defineAction<
    CreateProgramActivityInput,
    Record<string, unknown>
>({
    id: 'program.activity.create',
    toolName: 'create_program_activity',
    domain: 'program',
    description: 'Create one programme activity.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['program', 'orchestrator'],
    emits: [{ entity: 'program_activity', op: 'created' }],
    uiTarget: { tab: 'program', focusEntity: 'program_activity' },
    async prepareProposal(ctx, input) {
        await assertParentActivity(ctx.projectId, input.parentId);
        return { proposedDiff: createProgramActivityDiff(input) };
    },
    async apply(ctx, input) {
        await assertParentActivity(ctx.projectId, input.parentId);
        const now = new Date();
        const values = {
            id: crypto.randomUUID(),
            projectId: ctx.projectId,
            parentId: input.parentId ?? null,
            name: input.name,
            startDate: input.startDate ?? null,
            endDate: input.endDate ?? null,
            collapsed: input.collapsed ?? false,
            masterStage: input.masterStage ?? null,
            color: input.color ?? null,
            sortOrder: input.sortOrder ?? (await nextSortOrder(ctx.projectId)),
            rowVersion: 1,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(programActivities).values(values);
        return values as unknown as Record<string, unknown>;
    },
});
