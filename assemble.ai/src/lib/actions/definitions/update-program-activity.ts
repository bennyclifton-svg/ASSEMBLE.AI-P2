import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { programActivities } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyUpdateProgramActivity } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const MASTER_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHANGE_KEYS = [
    'name',
    'parentId',
    'startDate',
    'endDate',
    'collapsed',
    'masterStage',
    'color',
    'sortOrder',
] as const;

const FIELD_LABELS: Record<(typeof CHANGE_KEYS)[number], string> = {
    name: 'Name',
    parentId: 'Parent activity',
    startDate: 'Start date',
    endDate: 'End date',
    collapsed: 'Collapsed',
    masterStage: 'Master stage',
    color: 'Colour',
    sortOrder: 'Sort order',
};

const nullableIsoDate = z.union([z.string().regex(ISO_DATE), z.null()]);

const inputSchema = z
    .object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1).optional(),
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
        if (!CHANGE_KEYS.some((key) => input[key] !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one programme activity field is required.',
                path: ['id'],
            });
        }
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

type UpdateProgramActivityInput = z.infer<typeof inputSchema>;

export const updateProgramActivityAction = defineAction<
    UpdateProgramActivityInput,
    Record<string, unknown>
>({
    id: 'program.activity.update',
    domain: 'program',
    description: 'Update one programme activity.',
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
        const [row] = await db
            .select()
            .from(programActivities)
            .where(and(eq(programActivities.id, input.id), eq(programActivities.projectId, ctx.projectId)))
            .limit(1);

        if (!row) {
            throw new Error(`Programme activity ${input.id} was not found in this project.`);
        }

        const effectiveStart = input.startDate === undefined ? row.startDate : input.startDate;
        const effectiveEnd = input.endDate === undefined ? row.endDate : input.endDate;
        if (
            typeof effectiveStart === 'string' &&
            typeof effectiveEnd === 'string' &&
            effectiveStart > effectiveEnd
        ) {
            throw new Error('The resulting start date cannot be after the end date.');
        }

        const rowRecord = row as Record<string, unknown>;
        const changes: ProposedDiff['changes'] = [];
        for (const key of CHANGE_KEYS) {
            const next = input[key];
            if (next === undefined) continue;
            const current = rowRecord[key];
            if (current === next) continue;
            changes.push({
                field: key,
                label: FIELD_LABELS[key],
                before: current,
                after: next,
            });
        }

        if (changes.length === 0) {
            throw new Error('The proposed programme activity values are identical to the current row.');
        }

        return {
            proposedDiff: {
                entity: 'program_activity',
                entityId: row.id,
                summary: `Update programme activity - ${row.name}`,
                changes,
            },
            expectedRowVersion: row.rowVersion ?? 1,
        };
    },
    applyResult(ctx, input, meta) {
        return applyUpdateProgramActivity(input, meta?.expectedRowVersion ?? null, ctx);
    },
});
