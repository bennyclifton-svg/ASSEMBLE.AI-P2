import { z } from 'zod';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { costLines, projectStakeholders, rftNew } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/actions/types';
import { defineAction } from '../define';
import type { ActionApplyResult, ActionContext } from '../types';

const MASTER_STAGES = [
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
] as const;

const FEE_ROWS_MODE = ['append', 'replace'] as const;

const BRIEF_FIELD_LABELS = {
    briefServices: 'Brief services',
    briefDeliverables: 'Brief deliverables',
    briefFee: 'Brief fee',
    briefProgram: 'Brief programme',
} as const;

const optionalNullableTrimmedString = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    },
    z.union([z.string(), z.null()])
).optional();

const feeRowSchema = z.object({
    description: z.string().trim().min(1),
    costCode: z.string().trim().min(1).optional(),
    reference: z.string().trim().min(1).optional(),
    masterStage: z.enum(MASTER_STAGES).optional(),
    budgetCents: z.number().int().nonnegative().optional(),
    approvedContractCents: z.number().int().nonnegative().optional(),
});

const inputSchema = z
    .object({
        id: z.string().trim().min(1),
        briefServices: optionalNullableTrimmedString,
        briefDeliverables: optionalNullableTrimmedString,
        briefFee: optionalNullableTrimmedString,
        briefProgram: optionalNullableTrimmedString,
        feeStageCount: z.number().int().positive().max(20).optional(),
        feeRowsMode: z.enum(FEE_ROWS_MODE).default('append'),
        feeRows: z.array(feeRowSchema).max(20).optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        const hasBriefChange =
            input.briefServices !== undefined ||
            input.briefDeliverables !== undefined ||
            input.briefFee !== undefined ||
            input.briefProgram !== undefined;
        const hasFeeRows = (input.feeRows?.length ?? 0) > 0;

        if (!hasBriefChange && !hasFeeRows) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'update_rft_brief: supply at least one brief field or one fee row',
                path: ['id'],
            });
        }

        const requestedCount = input.feeStageCount ?? inferredStageCount(input.briefFee);
        if (requestedCount !== null && (input.feeRows?.length ?? 0) !== requestedCount) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `update_rft_brief: the fee instruction requests ${requestedCount} stage(s), so provide exactly ${requestedCount} fee row(s)`,
                path: ['feeRows'],
            });
        }
    });

type UpdateRftBriefInput = z.infer<typeof inputSchema>;

interface ExistingFeeLine {
    id: string;
    activity: string;
    budgetCents: number | null;
    approvedContractCents: number | null;
}

interface UpdateRftBriefOutput {
    id: string;
    projectId: string;
    stakeholderId: string;
    rftId?: string;
    createdRftId?: string;
    costLineRefreshId?: string;
    updatedBriefFields: string[];
    feeRowsMode: (typeof FEE_ROWS_MODE)[number];
    feeRowsCreated: number;
    feeRowsReplaced: number;
    createdCostLineIds: string[];
}

const NUMBER_WORDS: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
};

function inferredStageCount(value: string | null | undefined): number | null {
    if (!value) return null;
    const text = value.toLowerCase();
    const digitMatch = text.match(/\b(?:fee\s+)?(?:in\s+)?(\d{1,2})\s+(?:fee\s+)?(?:stages?|lines?|milestones?)\b/);
    if (digitMatch) return Number(digitMatch[1]);

    const wordPattern = Object.keys(NUMBER_WORDS).join('|');
    const wordMatch = text.match(
        new RegExp(`\\b(?:fee\\s+)?(?:in\\s+)?(${wordPattern})\\s+(?:fee\\s+)?(?:stages?|lines?|milestones?)\\b`)
    );
    return wordMatch ? NUMBER_WORDS[wordMatch[1]] : null;
}

function sanitizedInput(input: UpdateRftBriefInput): UpdateRftBriefInput {
    const out: UpdateRftBriefInput = {
        id: input.id,
        feeRowsMode: input.feeRowsMode ?? 'append',
    };
    for (const key of ['briefServices', 'briefDeliverables', 'briefFee', 'briefProgram'] as const) {
        if (input[key] !== undefined) out[key] = input[key];
    }
    if (input.feeStageCount !== undefined) out.feeStageCount = input.feeStageCount;
    if (input.feeRows !== undefined) {
        out.feeRows = input.feeRows.map((row) => ({
            description: row.description.trim(),
            ...(row.costCode ? { costCode: row.costCode.trim() } : {}),
            ...(row.reference ? { reference: row.reference.trim() } : {}),
            ...(row.masterStage ? { masterStage: row.masterStage } : {}),
            ...(row.budgetCents !== undefined ? { budgetCents: row.budgetCents } : {}),
            ...(row.approvedContractCents !== undefined
                ? { approvedContractCents: row.approvedContractCents }
                : {}),
        }));
    }
    if (input._toolUseId !== undefined) out._toolUseId = input._toolUseId;
    return out;
}

function briefChanges(
    input: UpdateRftBriefInput,
    current: Record<string, unknown>
): ProposedDiff['changes'] {
    const changes: ProposedDiff['changes'] = [];
    for (const key of ['briefServices', 'briefDeliverables', 'briefFee', 'briefProgram'] as const) {
        const next = input[key];
        if (next === undefined) continue;
        const before = current[key] ?? null;
        if (before === next) continue;
        changes.push({
            field: key,
            label: BRIEF_FIELD_LABELS[key],
            before,
            after: next,
        });
    }
    return changes;
}

function formatFeeLines(lines: ExistingFeeLine[]): string {
    if (lines.length === 0) return '-';
    return lines.map((line, index) => `${index + 1}. ${line.activity}`).join('\n');
}

function formatInputFeeRows(input: UpdateRftBriefInput): string {
    const rows = input.feeRows ?? [];
    if (rows.length === 0) return '-';
    return rows.map((row, index) => `${index + 1}. ${row.description}`).join('\n');
}

function committedAmount(line: ExistingFeeLine): number {
    return Number(line.budgetCents ?? 0) + Number(line.approvedContractCents ?? 0);
}

function isoDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
}

async function fetchExistingFeeLines(stakeholderId: string, projectId: string): Promise<ExistingFeeLine[]> {
    return db
        .select({
            id: costLines.id,
            activity: costLines.activity,
            budgetCents: costLines.budgetCents,
            approvedContractCents: costLines.approvedContractCents,
        })
        .from(costLines)
        .where(
            and(
                eq(costLines.projectId, projectId),
                eq(costLines.stakeholderId, stakeholderId),
                eq(costLines.section, 'CONSULTANTS'),
                isNull(costLines.deletedAt)
            )
        )
        .orderBy(asc(costLines.sortOrder));
}

async function fetchFirstRftRecord(stakeholderId: string, projectId: string): Promise<{ id: string } | null> {
    const [record] = await db
        .select({ id: rftNew.id })
        .from(rftNew)
        .where(and(eq(rftNew.projectId, projectId), eq(rftNew.stakeholderId, stakeholderId)))
        .orderBy(asc(rftNew.rftNumber))
        .limit(1);
    return record ?? null;
}

function conflictReason(currentVersion: number | null, expectedVersion: number | null): string {
    return `The stakeholder was changed by someone else (version is now ${currentVersion}, agent proposed against version ${expectedVersion}). Re-read the row and propose again.`;
}

async function applyUpdateRftBrief(
    ctx: ActionContext,
    input: UpdateRftBriefInput,
    expectedRowVersion: number | null
): Promise<ActionApplyResult<UpdateRftBriefOutput>> {
    const feeRows = input.feeRows ?? [];
    const now = new Date();

    const result = await db.transaction(async (tx) => {
        const existingFeeLines = await tx
            .select({
                id: costLines.id,
                activity: costLines.activity,
                budgetCents: costLines.budgetCents,
                approvedContractCents: costLines.approvedContractCents,
            })
            .from(costLines)
            .where(
                and(
                    eq(costLines.projectId, ctx.projectId),
                    eq(costLines.stakeholderId, input.id),
                    eq(costLines.section, 'CONSULTANTS'),
                    isNull(costLines.deletedAt)
                )
            )
            .orderBy(asc(costLines.sortOrder));

        if (input.feeRowsMode === 'replace' && existingFeeLines.some((line) => committedAmount(line) > 0)) {
            return {
                kind: 'conflict' as const,
                reason:
                    'Existing fee lines include non-zero budget or contract amounts. Use the cost plan to change committed amounts, or append new RFT fee-stage rows instead.',
            };
        }

        const updateData: Record<string, unknown> = {
            updatedAt: now,
            rowVersion: sql`${projectStakeholders.rowVersion} + 1`,
        };
        for (const key of ['briefServices', 'briefDeliverables', 'briefFee', 'briefProgram'] as const) {
            if (input[key] !== undefined) updateData[key] = input[key];
        }

        const conditions = [
            eq(projectStakeholders.id, input.id),
            eq(projectStakeholders.projectId, ctx.projectId),
            eq(projectStakeholders.stakeholderGroup, 'consultant'),
            isNull(projectStakeholders.deletedAt),
        ];
        if (expectedRowVersion !== null) conditions.push(eq(projectStakeholders.rowVersion, expectedRowVersion));

        const updated = await tx.update(projectStakeholders).set(updateData).where(and(...conditions)).returning();
        if (updated.length !== 1) return null;

        let feeRowsReplaced = 0;
        if (input.feeRowsMode === 'replace' && feeRows.length > 0 && existingFeeLines.length > 0) {
            await tx
                .update(costLines)
                .set({
                    deletedAt: now,
                    updatedAt: now,
                    rowVersion: sql`${costLines.rowVersion} + 1`,
                })
                .where(
                    and(
                        eq(costLines.projectId, ctx.projectId),
                        eq(costLines.stakeholderId, input.id),
                        eq(costLines.section, 'CONSULTANTS'),
                        isNull(costLines.deletedAt)
                    )
                );
            feeRowsReplaced = existingFeeLines.length;
        }

        let createdCostLineIds: string[] = [];
        if (feeRows.length > 0) {
            const [last] = await tx
                .select({ sortOrder: costLines.sortOrder })
                .from(costLines)
                .where(
                    and(
                        eq(costLines.projectId, ctx.projectId),
                        eq(costLines.section, 'CONSULTANTS'),
                        isNull(costLines.deletedAt)
                    )
                )
                .orderBy(desc(costLines.sortOrder))
                .limit(1);
            const baseSortOrder = (last?.sortOrder ?? 0) + 1;

            const values = feeRows.map((row, index) => ({
                id: randomUUID(),
                projectId: ctx.projectId,
                stakeholderId: input.id,
                section: 'CONSULTANTS',
                costCode: row.costCode ?? null,
                activity: row.description,
                reference: row.reference ?? null,
                budgetCents: row.budgetCents ?? 0,
                approvedContractCents: row.approvedContractCents ?? 0,
                masterStage: row.masterStage ?? null,
                sortOrder: baseSortOrder + index,
                rowVersion: 1,
                createdAt: now,
                updatedAt: now,
            }));

            const inserted = await tx.insert(costLines).values(values).returning({ id: costLines.id });
            createdCostLineIds = inserted.map((row) => row.id);
        }

        const [existingRft] = await tx
            .select({ id: rftNew.id })
            .from(rftNew)
            .where(and(eq(rftNew.projectId, ctx.projectId), eq(rftNew.stakeholderId, input.id)))
            .orderBy(asc(rftNew.rftNumber))
            .limit(1);

        let rftId = existingRft?.id ?? null;
        let createdRftId: string | undefined;
        if (!rftId) {
            rftId = randomUUID();
            createdRftId = rftId;
            await tx.insert(rftNew).values({
                id: rftId,
                projectId: ctx.projectId,
                stakeholderId: input.id,
                rftNumber: 1,
                rftDate: isoDateOnly(now),
                createdAt: now,
                updatedAt: now,
            });
        }

        const updatedBriefFields = ['briefServices', 'briefDeliverables', 'briefFee', 'briefProgram'].filter(
            (key) => input[key as keyof UpdateRftBriefInput] !== undefined
        );

        return {
            kind: 'applied' as const,
            output: {
                id: input.id,
                projectId: ctx.projectId,
                stakeholderId: input.id,
                ...(rftId ? { rftId } : {}),
                ...(createdRftId ? { createdRftId } : {}),
                costLineRefreshId: feeRows.length > 0 || feeRowsReplaced > 0 ? input.id : undefined,
                updatedBriefFields,
                feeRowsMode: input.feeRowsMode,
                feeRowsCreated: createdCostLineIds.length,
                feeRowsReplaced,
                createdCostLineIds,
            },
        };
    });

    if (result) return result;

    const [stillThere] = await db
        .select({ id: projectStakeholders.id, rowVersion: projectStakeholders.rowVersion })
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.id, input.id),
                eq(projectStakeholders.projectId, ctx.projectId),
                eq(projectStakeholders.stakeholderGroup, 'consultant'),
                isNull(projectStakeholders.deletedAt)
            )
        )
        .limit(1);

    if (!stillThere) return { kind: 'gone', reason: 'Consultant stakeholder no longer exists.' };
    return { kind: 'conflict', reason: conflictReason(stillThere.rowVersion, expectedRowVersion) };
}

export const updateRftBriefAction = defineAction<UpdateRftBriefInput, UpdateRftBriefOutput>({
    id: 'procurement.rft_brief.update',
    toolName: 'update_rft_brief',
    domain: 'procurement',
    description:
        'Propose a structured consultant RFT brief update for any discipline. Use this instead of update_stakeholder for RFT brief work. It can update the RFT Services, Deliverables, Fee instruction, Programme text, create staged fee rows that populate the RFT Fee table, and create the first RFT record if the consultant has none. Call list_stakeholders with stakeholderGroup="consultant" first to resolve the consultant stakeholder id. When the user asks for fee in N stages/lines/milestones, provide exactly N feeRows and set feeStageCount to N. The proposal is approval-gated.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design', 'orchestrator'],
    emits: [
        { entity: 'stakeholder', op: 'updated', idFromOutput: 'stakeholderId' },
        { entity: 'cost_line', op: 'updated', idFromOutput: 'costLineRefreshId' },
        { entity: 'rft', op: 'created', idFromOutput: 'createdRftId' },
    ],
    uiTarget: { tab: 'procurement', focusEntity: 'rft' },
    async prepareProposal(ctx, rawInput) {
        const input = sanitizedInput(rawInput);
        const [row] = await db
            .select()
            .from(projectStakeholders)
            .where(
                and(
                    eq(projectStakeholders.id, input.id),
                    eq(projectStakeholders.projectId, ctx.projectId),
                    eq(projectStakeholders.stakeholderGroup, 'consultant'),
                    isNull(projectStakeholders.deletedAt)
                )
            )
            .limit(1);

        if (!row) throw new Error(`Consultant stakeholder ${input.id} not found in this project.`);

        const changes = briefChanges(input, row as unknown as Record<string, unknown>);
        const existingFeeLines = await fetchExistingFeeLines(row.id, ctx.projectId);
        const existingRft = await fetchFirstRftRecord(row.id, ctx.projectId);
        if (!existingRft) {
            changes.unshift({
                field: 'rftRecord',
                label: 'RFT record',
                before: '-',
                after: 'Create RFT 01',
            });
        }
        if ((input.feeRows?.length ?? 0) > 0) {
            if (
                input.feeRowsMode === 'replace' &&
                existingFeeLines.some((line) => committedAmount(line) > 0)
            ) {
                throw new Error(
                    'update_rft_brief: cannot replace existing fee rows because at least one linked cost line has a non-zero budget or contract amount. Append new rows, or edit committed amounts in the cost plan.'
                );
            }
            changes.push({
                field: 'feeRows',
                label: input.feeRowsMode === 'replace' ? 'Fee rows (replace)' : 'Fee rows (append)',
                before: formatFeeLines(existingFeeLines),
                after: formatInputFeeRows(input),
            });
        }
        if (changes.length === 0) {
            throw new Error('update_rft_brief: proposed values are identical to the current RFT brief.');
        }

        return {
            proposedDiff: {
                entity: 'stakeholder',
                entityId: row.id,
                summary: `${existingRft ? 'Update' : 'Create'} RFT brief - ${row.name}`,
                changes,
            },
            expectedRowVersion: row.rowVersion ?? 1,
            input,
        };
    },
    applyResult(ctx, input, meta) {
        return applyUpdateRftBrief(ctx, input, meta?.expectedRowVersion ?? null);
    },
});
