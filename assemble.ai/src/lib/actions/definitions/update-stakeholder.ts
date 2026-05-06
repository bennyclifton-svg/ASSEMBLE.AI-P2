import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectStakeholders } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { defineAction } from '../define';
import type { ActionApplyResult, ActionContext } from '../types';

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
] as const;

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
] as const;

const FIELD_LABELS: Record<(typeof CHANGE_KEYS)[number], string> = {
    isEnabled: 'Enabled',
    briefServices: 'Brief services',
    briefDeliverables: 'Brief deliverables',
    briefFee: 'Brief fee',
    briefProgram: 'Brief programme',
    scopeWorks: 'Scope works',
    scopePrice: 'Scope price',
    scopeProgram: 'Scope programme',
    notes: 'Notes',
};

const optionalNullableTrimmedString = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    },
    z.union([z.string(), z.null()])
).optional();

const inputSchema = z
    .object({
        id: z.string().trim().min(1),
        isEnabled: z.boolean().optional(),
        briefServices: optionalNullableTrimmedString,
        briefDeliverables: optionalNullableTrimmedString,
        briefFee: optionalNullableTrimmedString,
        briefProgram: optionalNullableTrimmedString,
        scopeWorks: optionalNullableTrimmedString,
        scopePrice: optionalNullableTrimmedString,
        scopeProgram: optionalNullableTrimmedString,
        notes: optionalNullableTrimmedString,
        _toolUseId: z.string().optional(),
    })
    .passthrough()
    .superRefine((input, ctx) => {
        for (const key of USER_MANAGED_KEYS) {
            if (input[key] !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `update_stakeholder: "${key}" is user-managed and cannot be changed by this tool`,
                    path: [key],
                });
            }
        }
        if (!CHANGE_KEYS.some((key) => input[key] !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'update_stakeholder: at least one field to change is required',
                path: ['id'],
            });
        }
    });

type UpdateStakeholderInput = z.infer<typeof inputSchema>;

function sanitizedInput(input: UpdateStakeholderInput): UpdateStakeholderInput {
    const proposedInput: Record<string, unknown> = { id: input.id };
    for (const key of CHANGE_KEYS) {
        if (input[key] !== undefined) proposedInput[key] = input[key];
    }
    if (input._toolUseId !== undefined) proposedInput._toolUseId = input._toolUseId;
    return proposedInput as UpdateStakeholderInput;
}

function updateDiffChanges(
    input: UpdateStakeholderInput,
    current: Record<string, unknown>
): ProposedDiff['changes'] {
    const changes: ProposedDiff['changes'] = [];
    for (const key of CHANGE_KEYS) {
        const next = input[key];
        if (next === undefined) continue;
        const before = current[key];
        if (before === next) continue;
        changes.push({
            field: key,
            label: FIELD_LABELS[key],
            before,
            after: next,
        });
    }
    return changes;
}

function conflictReason(
    currentVersion: number | null,
    expectedVersion: number | null
): string {
    return `The stakeholder was changed by someone else (version is now ${currentVersion}, agent proposed against version ${expectedVersion}). Re-read the row and propose again.`;
}

async function applyUpdateStakeholder(
    ctx: ActionContext,
    input: UpdateStakeholderInput,
    expectedRowVersion: number | null
): Promise<ActionApplyResult<Record<string, unknown>>> {
    const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        rowVersion: sql`${projectStakeholders.rowVersion} + 1`,
    };
    for (const key of [
        'briefServices',
        'briefDeliverables',
        'briefFee',
        'briefProgram',
        'scopeWorks',
        'scopePrice',
        'scopeProgram',
        'notes',
    ] as const) {
        if (input[key] !== undefined) updateData[key] = input[key];
    }
    if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled;

    const conditions = [
        eq(projectStakeholders.id, input.id),
        eq(projectStakeholders.projectId, ctx.projectId),
        isNull(projectStakeholders.deletedAt),
    ];
    if (expectedRowVersion !== null) {
        conditions.push(eq(projectStakeholders.rowVersion, expectedRowVersion));
    }

    const updated = await db.update(projectStakeholders).set(updateData).where(and(...conditions)).returning();
    if (updated.length === 1) {
        return { kind: 'applied', output: updated[0] as Record<string, unknown> };
    }

    const [stillThere] = await db
        .select({ id: projectStakeholders.id, rowVersion: projectStakeholders.rowVersion })
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.id, input.id),
                eq(projectStakeholders.projectId, ctx.projectId),
                isNull(projectStakeholders.deletedAt)
            )
        )
        .limit(1);

    if (!stillThere) return { kind: 'gone', reason: 'Stakeholder no longer exists.' };
    return { kind: 'conflict', reason: conflictReason(stillThere.rowVersion, expectedRowVersion) };
}

export const updateStakeholderAction = defineAction<UpdateStakeholderInput, Record<string, unknown>>({
    id: 'procurement.stakeholder.update',
    toolName: 'update_stakeholder',
    domain: 'procurement',
    description:
        'Propose edits to one project stakeholder brief/scope record. RFT Brief content is stored here: briefServices controls the RFT Service column and briefDeliverables controls the RFT Deliverables column. Call list_stakeholders first to find the current stakeholder id. Do not change name, role, organisation, contact details, discipline/trade, or submission identity fields; those are user-managed. The change requires user approval.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design'],
    emits: [{ entity: 'stakeholder', op: 'updated' }],
    uiTarget: { tab: 'stakeholders', focusEntity: 'stakeholder' },
    async prepareProposal(ctx, input) {
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

        const proposedInput = sanitizedInput(input);
        const changes = updateDiffChanges(proposedInput, row as unknown as Record<string, unknown>);
        if (changes.length === 0) {
            throw new Error('update_stakeholder: proposed values are identical to the current stakeholder.');
        }

        const isRftBriefUpdate = changes.some((change) =>
            ['briefServices', 'briefDeliverables', 'briefFee', 'briefProgram'].includes(change.field)
        );

        return {
            proposedDiff: {
                entity: 'stakeholder',
                entityId: row.id,
                summary: isRftBriefUpdate
                    ? `Update RFT brief - ${row.name}`
                    : `Update stakeholder - ${row.name}`,
                changes,
            },
            expectedRowVersion: row.rowVersion ?? 1,
            input: proposedInput,
        };
    },
    applyResult(ctx, input, meta) {
        return applyUpdateStakeholder(ctx, input, meta?.expectedRowVersion ?? null);
    },
});
