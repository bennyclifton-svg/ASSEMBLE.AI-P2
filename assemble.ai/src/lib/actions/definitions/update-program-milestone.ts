import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { programActivities, programMilestones } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import type { ActionApplyResult } from '../types';
import { defineAction } from '../define';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHANGE_KEYS = ['name', 'date', 'sortOrder'] as const;
const FIELD_LABELS: Record<(typeof CHANGE_KEYS)[number], string> = {
    name: 'Name',
    date: 'Date',
    sortOrder: 'Sort order',
};

const inputSchema = z
    .object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1).optional(),
        date: z.string().regex(ISO_DATE).optional(),
        sortOrder: z.number().int().optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!CHANGE_KEYS.some((key) => input[key] !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one programme milestone field is required.',
                path: ['id'],
            });
        }
    });

type UpdateProgramMilestoneInput = z.infer<typeof inputSchema>;

interface MilestoneRow {
    id: string;
    activityId: string;
    name: string;
    date: string;
    sortOrder: number;
    rowVersion: number;
}

async function getMilestone(projectId: string, id: string): Promise<MilestoneRow | null> {
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
        .where(and(eq(programMilestones.id, id), eq(programActivities.projectId, projectId)))
        .limit(1);
    return (row as MilestoneRow | undefined) ?? null;
}

function conflictReason(entity: string, actual: number, expected: number | null): string {
    return `The ${entity} was changed by someone else (version is now ${actual}, agent proposed against version ${expected}). Re-read the row and propose again.`;
}

export const updateProgramMilestoneAction = defineAction<
    UpdateProgramMilestoneInput,
    Record<string, unknown>
>({
    id: 'program.milestone.update',
    toolName: 'update_program_milestone',
    domain: 'program',
    description: 'Update one programme milestone.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['program', 'orchestrator'],
    emits: [{ entity: 'program_milestone', op: 'updated' }],
    uiTarget: { tab: 'program', focusEntity: 'program_milestone' },
    async prepareProposal(ctx, input) {
        const row = await getMilestone(ctx.projectId, input.id);
        if (!row) {
            throw new Error(`Program milestone ${input.id} not found in this project.`);
        }

        const rowRecord = row as unknown as Record<string, unknown>;
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
            throw new Error('The proposed programme milestone values are identical to the current row.');
        }

        return {
            proposedDiff: {
                entity: 'program_milestone',
                entityId: row.id,
                summary: `Update milestone - ${row.name}`,
                changes,
            },
            expectedRowVersion: row.rowVersion ?? 1,
        };
    },
    async applyResult(ctx, input, meta): Promise<ActionApplyResult<Record<string, unknown>>> {
        const current = await getMilestone(ctx.projectId, input.id);
        if (!current) {
            return { kind: 'gone', reason: 'Programme milestone no longer exists.' };
        }

        const updateData: Record<string, unknown> = {
            rowVersion: sql`${programMilestones.rowVersion} + 1`,
        };
        if (input.name !== undefined) updateData.name = input.name;
        if (input.date !== undefined) updateData.date = input.date;
        if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

        const conditions = [eq(programMilestones.id, input.id)];
        const expectedRowVersion = meta?.expectedRowVersion ?? null;
        if (expectedRowVersion !== null) {
            conditions.push(eq(programMilestones.rowVersion, expectedRowVersion));
        }

        const updated = await db.update(programMilestones).set(updateData).where(and(...conditions)).returning();
        if (updated.length === 1) {
            return { kind: 'applied', output: updated[0] as Record<string, unknown> };
        }

        const stillThere = await getMilestone(ctx.projectId, input.id);
        if (!stillThere) {
            return { kind: 'gone', reason: 'Programme milestone no longer exists.' };
        }
        return {
            kind: 'conflict',
            reason: conflictReason('programme milestone', stillThere.rowVersion, expectedRowVersion),
        };
    },
});
