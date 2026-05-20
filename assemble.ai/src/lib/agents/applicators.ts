/**
 * Approval applicators — the "actually do the mutation" half of the gate.
 *
 * Each mutating tool has a paired applicator here that takes the raw input
 * the agent submitted, the expected rowVersion captured at propose time,
 * and the project scope; it executes the mutation under optimistic-locking
 * and returns the new row.
 *
 * Returning ConflictResult means another writer (a user, or another agent
 * run) bumped the row's version after we proposed but before we applied —
 * the UI should re-prompt the agent with current data.
 */

import { db } from '@/lib/db';
import {
    costLines,
    invoices,
    meetingGroups,
    meetings,
    meetingSections,
    programActivities,
    risks,
    variations,
} from '@/lib/db/pg-schema';
import {
    projectObjectives,
    type ObjectiveSource,
    type ObjectiveType,
    VALID_OBJECTIVE_TYPES,
} from '@/lib/db/objectives-schema';
import { generateVariationNumber } from '@/lib/calculations/cost-plan-formulas';
import { STANDARD_AGENDA_SECTIONS } from '@/lib/constants/sections';
import {
    createAddendumArtifact,
    createTransmittalArtifact,
    updateCommunicationNote,
    type UpdateCommunicationNoteInput,
} from '@/lib/communication/artifacts';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface ApplyContext {
    organizationId: string;
    projectId: string;
    userId?: string;
    threadId?: string | null;
    runId?: string | null;
}

export type ApplyResult =
    | { kind: 'applied'; output: Record<string, unknown> }
    | { kind: 'conflict'; reason: string }
    | { kind: 'gone'; reason: string };

type DbClient = Pick<typeof db, 'select' | 'insert' | 'update'>;
const VALID_VARIATION_STATUSES = ['Forecast', 'Approved', 'Rejected', 'Withdrawn'] as const;
type ValidVariationStatus = (typeof VALID_VARIATION_STATUSES)[number];

function inputVariationStatus(input: Record<string, unknown>): ValidVariationStatus | null {
    const status = inputString(input, 'status') || 'Forecast';
    return VALID_VARIATION_STATUSES.includes(status as ValidVariationStatus)
        ? (status as ValidVariationStatus)
        : null;
}

export async function applyApproval(args: {
    toolName: string;
    input: unknown;
    expectedRowVersion: number | null;
    ctx: ApplyContext;
}): Promise<ApplyResult> {
    const { applyApproval: applyActionApproval } = await import('@/lib/actions/apply');
    return applyActionApproval(args);
}

/**
 * Apply update_cost_line. Conditional UPDATE on (id, project, rowVersion);
 * if row was changed since propose time, return conflict.
 */
export async function applyUpdateCostLine(
    rawInput: unknown,
    expectedRowVersion: number | null,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = rawInput as Record<string, unknown>;
    const id = String(input.id ?? '');
    if (!id) return { kind: 'gone', reason: 'Missing cost line id' };

    const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        rowVersion: sql`${costLines.rowVersion} + 1`,
    };
    if (input.activity !== undefined) updateData.activity = input.activity;
    if (input.section !== undefined) updateData.section = input.section;
    if (input.costCode !== undefined) updateData.costCode = input.costCode;
    if (input.reference !== undefined) updateData.reference = input.reference;
    if (input.budgetCents !== undefined) updateData.budgetCents = input.budgetCents;
    if (input.approvedContractCents !== undefined) {
        updateData.approvedContractCents = input.approvedContractCents;
    }
    if (input.masterStage !== undefined) updateData.masterStage = input.masterStage;

    // Conditional update — only succeeds if rowVersion still matches.
    const conditions = [
        eq(costLines.id, id),
        eq(costLines.projectId, ctx.projectId),
        isNull(costLines.deletedAt),
    ];
    if (expectedRowVersion !== null) {
        conditions.push(eq(costLines.rowVersion, expectedRowVersion));
    }

    const updated = await db
        .update(costLines)
        .set(updateData)
        .where(and(...conditions))
        .returning();

    if (updated.length === 1) {
        return { kind: 'applied', output: updated[0] as Record<string, unknown> };
    }

    // Either the row is gone (deleted) or was changed since propose. Tell them apart.
    const [stillThere] = await db
        .select({ id: costLines.id, rowVersion: costLines.rowVersion })
        .from(costLines)
        .where(
            and(
                eq(costLines.id, id),
                eq(costLines.projectId, ctx.projectId),
                isNull(costLines.deletedAt)
            )
        )
        .limit(1);

    if (!stillThere) {
        return { kind: 'gone', reason: 'Cost line no longer exists.' };
    }
    return {
        kind: 'conflict',
        reason: `The cost line was changed by someone else (version is now ${stillThere.rowVersion}, agent proposed against version ${expectedRowVersion}). Re-read the row and propose again.`,
    };
}

/**
 * Apply create_cost_line. Computes the next sortOrder within the section
 * and inserts. No optimistic-lock check — the row doesn't exist yet.
 */
export async function applyCreateCostLine(
    rawInput: unknown,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = rawInput as Record<string, unknown>;
    const section = String(input.section ?? '');
    const activity = String(input.activity ?? '');
    if (!section || !activity) {
        return { kind: 'gone', reason: 'Missing section or activity on proposed cost line.' };
    }

    // Compute the next sortOrder within the section.
    const existing = await db
        .select({ sortOrder: costLines.sortOrder })
        .from(costLines)
        .where(
            and(
                eq(costLines.projectId, ctx.projectId),
                eq(costLines.section, section),
                isNull(costLines.deletedAt)
            )
        )
        .orderBy(desc(costLines.sortOrder))
        .limit(1);
    const sortOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 1;

    const id = uuidv4();
    const now = new Date();

    await db.insert(costLines).values({
        id,
        projectId: ctx.projectId,
        stakeholderId: typeof input.stakeholderId === 'string' ? input.stakeholderId : null,
        section,
        activity,
        costCode: typeof input.costCode === 'string' ? input.costCode : null,
        reference: typeof input.reference === 'string' ? input.reference : null,
        budgetCents: typeof input.budgetCents === 'number' ? input.budgetCents : 0,
        approvedContractCents:
            typeof input.approvedContractCents === 'number' ? input.approvedContractCents : 0,
        masterStage: typeof input.masterStage === 'string' ? input.masterStage : null,
        sortOrder,
        rowVersion: 1,
        createdAt: now,
        updatedAt: now,
    });

    const [created] = await db.select().from(costLines).where(eq(costLines.id, id)).limit(1);
    return { kind: 'applied', output: (created ?? { id }) as Record<string, unknown> };
}

/**
 * Apply record_invoice. Inserts a new invoices row scoped to the project.
 * No optimistic-lock — invoices are append-only from the agent's side.
 * periodYear/periodMonth are derived at validate() time and passed through.
 */
export async function applyRecordInvoice(
    rawInput: unknown,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = rawInput as Record<string, unknown>;
    const invoiceNumber = typeof input.invoiceNumber === 'string' ? input.invoiceNumber : '';
    const invoiceDate = typeof input.invoiceDate === 'string' ? input.invoiceDate : '';
    const amountCents = typeof input.amountCents === 'number' ? input.amountCents : NaN;
    const periodYear = typeof input.periodYear === 'number' ? input.periodYear : NaN;
    const periodMonth = typeof input.periodMonth === 'number' ? input.periodMonth : NaN;

    if (
        !invoiceNumber ||
        !invoiceDate ||
        !Number.isFinite(amountCents) ||
        !Number.isFinite(periodYear) ||
        !Number.isFinite(periodMonth)
    ) {
        return { kind: 'gone', reason: 'Missing required invoice fields on proposal.' };
    }

    const id = uuidv4();
    const values = {
        id,
        projectId: ctx.projectId,
        costLineId: typeof input.costLineId === 'string' ? input.costLineId : null,
        invoiceNumber,
        invoiceDate,
        description: typeof input.description === 'string' ? input.description : null,
        amountCents,
        gstCents: typeof input.gstCents === 'number' ? input.gstCents : 0,
        periodYear,
        periodMonth,
        paidStatus: typeof input.paidStatus === 'string' ? input.paidStatus : 'unpaid',
        paidDate: typeof input.paidDate === 'string' ? input.paidDate : null,
    };

    await db.insert(invoices).values(values);
    return { kind: 'applied', output: values as unknown as Record<string, unknown> };
}

function asInput(rawInput: unknown): Record<string, unknown> {
    return rawInput && typeof rawInput === 'object'
        ? (rawInput as Record<string, unknown>)
        : {};
}

function inputString(input: Record<string, unknown>, key: string): string {
    return typeof input[key] === 'string' ? String(input[key]) : '';
}

function inputNullableString(input: Record<string, unknown>, key: string): string | null {
    const value = input[key];
    if (value === null) return null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function inputOptionalString(input: Record<string, unknown>, key: string): string | null | undefined {
    if (input[key] === undefined) return undefined;
    return inputNullableString(input, key);
}

function inputOptionalNumber(input: Record<string, unknown>, key: string): number | undefined {
    return typeof input[key] === 'number' ? Number(input[key]) : undefined;
}

function inputOptionalBoolean(input: Record<string, unknown>, key: string): boolean | undefined {
    return typeof input[key] === 'boolean' ? Boolean(input[key]) : undefined;
}

function inputStringArray(input: Record<string, unknown>, key: string): string[] {
    const value = input[key];
    if (!Array.isArray(value)) return [];
    const out: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string' || !item.trim()) continue;
        const trimmed = item.trim();
        if (!out.includes(trimmed)) out.push(trimmed);
    }
    return out;
}

function conflictReason(entity: string, currentVersion: number | null, expectedVersion: number | null): string {
    return `The ${entity} was changed by someone else (version is now ${currentVersion}, agent proposed against version ${expectedVersion}). Re-read the row and propose again.`;
}

export async function applyCreateAddendum(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    return createAddendumArtifact(ctx, {
        stakeholderId: inputString(input, 'stakeholderId'),
        content: inputString(input, 'content'),
        documentIds: inputStringArray(input, 'documentIds'),
        addendumDate: inputOptionalString(input, 'addendumDate') ?? null,
    });
}

export async function applyCreateTransmittal(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    return createTransmittalArtifact(ctx, {
        name: inputString(input, 'name'),
        documentIds: inputStringArray(input, 'documentIds'),
        stakeholderId: inputOptionalString(input, 'stakeholderId') ?? null,
        subcategoryId: inputOptionalString(input, 'subcategoryId') ?? null,
        destination: inputOptionalString(input, 'destination') ?? null,
    });
}

async function validateProjectCostLineId(
    costLineId: string,
    ctx: ApplyContext,
    client: DbClient = db
): Promise<{ ok: true } | { ok: false; reason: string }> {
    const [row] = await client
        .select({ id: costLines.id })
        .from(costLines)
        .where(
            and(
                eq(costLines.id, costLineId),
                eq(costLines.projectId, ctx.projectId),
                isNull(costLines.deletedAt)
            )
        )
        .limit(1);

    if (!row) {
        return {
            ok: false,
            reason: `Cost line ${costLineId} no longer exists in this project.`,
        };
    }
    return { ok: true };
}

export async function applyUpdateNote(
    rawInput: unknown,
    expectedRowVersion: number | null,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const id = inputString(input, 'id');
    const noteInput: UpdateCommunicationNoteInput = {
        id,
        attachDocumentIds: inputStringArray(input, 'attachDocumentIds'),
    };
    for (const key of ['title', 'content', 'color', 'type', 'status', 'noteDate'] as const) {
        if (input[key] !== undefined) noteInput[key] = inputNullableString(input, key);
    }
    const isStarred = inputOptionalBoolean(input, 'isStarred');
    if (isStarred !== undefined) noteInput.isStarred = isStarred;

    return updateCommunicationNote(ctx, noteInput, expectedRowVersion);
}

export async function applyCreateRisk(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const title = inputString(input, 'title');
    if (!title) return { kind: 'gone', reason: 'Missing risk title on proposal.' };

    const [last] = await db
        .select({ order: risks.order })
        .from(risks)
        .where(eq(risks.projectId, ctx.projectId))
        .orderBy(desc(risks.order))
        .limit(1);

    const values = {
        id: uuidv4(),
        projectId: ctx.projectId,
        title,
        description: inputOptionalString(input, 'description') ?? null,
        likelihood: inputOptionalString(input, 'likelihood') ?? null,
        impact: inputOptionalString(input, 'impact') ?? null,
        mitigation: inputOptionalString(input, 'mitigation') ?? null,
        status: inputString(input, 'status') || 'identified',
        order: (last?.order ?? -1) + 1,
        rowVersion: 1,
        updatedAt: new Date(),
    };

    await db.insert(risks).values(values);
    return { kind: 'applied', output: values as unknown as Record<string, unknown> };
}

export async function applyUpdateRisk(
    rawInput: unknown,
    expectedRowVersion: number | null,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const id = inputString(input, 'id');
    if (!id) return { kind: 'gone', reason: 'Missing risk id' };

    const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        rowVersion: sql`${risks.rowVersion} + 1`,
    };
    for (const key of ['title', 'description', 'likelihood', 'impact', 'mitigation', 'status'] as const) {
        if (input[key] !== undefined) updateData[key] = inputNullableString(input, key);
    }

    const conditions = [eq(risks.id, id), eq(risks.projectId, ctx.projectId)];
    if (expectedRowVersion !== null) conditions.push(eq(risks.rowVersion, expectedRowVersion));

    const updated = await db.update(risks).set(updateData).where(and(...conditions)).returning();
    if (updated.length === 1) return { kind: 'applied', output: updated[0] as Record<string, unknown> };

    const [stillThere] = await db
        .select({ id: risks.id, rowVersion: risks.rowVersion })
        .from(risks)
        .where(and(eq(risks.id, id), eq(risks.projectId, ctx.projectId)))
        .limit(1);
    if (!stillThere) return { kind: 'gone', reason: 'Risk no longer exists.' };
    return { kind: 'conflict', reason: conflictReason('risk', stillThere.rowVersion, expectedRowVersion) };
}

export async function applyCreateVariation(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const category = inputString(input, 'category');
    const description = inputString(input, 'description');
    if (!category || !description) {
        return { kind: 'gone', reason: 'Missing variation category or description on proposal.' };
    }
    const costLineId = inputOptionalString(input, 'costLineId') ?? null;
    if (costLineId) {
        const costLineCheck = await validateProjectCostLineId(costLineId, ctx);
        if (costLineCheck.ok === false) return { kind: 'gone', reason: costLineCheck.reason };
    }
    const status = inputVariationStatus(input);
    if (!status) {
        return {
            kind: 'gone',
            reason: 'Invalid variation status. Use Forecast, Approved, Rejected, or Withdrawn.',
        };
    }

    const existing = await db.select().from(variations).where(eq(variations.projectId, ctx.projectId));
    const id = uuidv4();
    const now = new Date();
    const values = {
        id,
        projectId: ctx.projectId,
        costLineId,
        variationNumber: generateVariationNumber(
            existing as unknown as Parameters<typeof generateVariationNumber>[0],
            category as Parameters<typeof generateVariationNumber>[1]
        ),
        category,
        description,
        status,
        amountForecastCents: inputOptionalNumber(input, 'amountForecastCents') ?? 0,
        amountApprovedCents: inputOptionalNumber(input, 'amountApprovedCents') ?? 0,
        dateSubmitted: inputOptionalString(input, 'dateSubmitted') ?? null,
        dateApproved: inputOptionalString(input, 'dateApproved') ?? null,
        requestedBy: inputOptionalString(input, 'requestedBy') ?? null,
        approvedBy: inputOptionalString(input, 'approvedBy') ?? null,
        rowVersion: 1,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(variations).values(values);
    return { kind: 'applied', output: values as unknown as Record<string, unknown> };
}

export async function applyUpdateVariation(
    rawInput: unknown,
    expectedRowVersion: number | null,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const id = inputString(input, 'id');
    if (!id) return { kind: 'gone', reason: 'Missing variation id' };

    const nextCostLineId = inputOptionalString(input, 'costLineId');
    if (input.costLineId !== undefined && nextCostLineId) {
        const costLineCheck = await validateProjectCostLineId(nextCostLineId, ctx);
        if (costLineCheck.ok === false) return { kind: 'gone', reason: costLineCheck.reason };
    }

    const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        rowVersion: sql`${variations.rowVersion} + 1`,
    };
    if (input.costLineId !== undefined) updateData.costLineId = nextCostLineId ?? null;
    if (input.status !== undefined) {
        const status = inputVariationStatus(input);
        if (!status) {
            return {
                kind: 'gone',
                reason: 'Invalid variation status. Use Forecast, Approved, Rejected, or Withdrawn.',
            };
        }
        updateData.status = status;
    }
    for (const key of [
        'category',
        'description',
        'dateSubmitted',
        'dateApproved',
        'requestedBy',
        'approvedBy',
    ] as const) {
        if (input[key] !== undefined) updateData[key] = inputNullableString(input, key);
    }
    for (const key of ['amountForecastCents', 'amountApprovedCents'] as const) {
        const value = inputOptionalNumber(input, key);
        if (value !== undefined) updateData[key] = value;
    }

    const conditions = [
        eq(variations.id, id),
        eq(variations.projectId, ctx.projectId),
        isNull(variations.deletedAt),
    ];
    if (expectedRowVersion !== null) conditions.push(eq(variations.rowVersion, expectedRowVersion));

    const updated = await db.update(variations).set(updateData).where(and(...conditions)).returning();
    if (updated.length === 1) return { kind: 'applied', output: updated[0] as Record<string, unknown> };

    const [stillThere] = await db
        .select({ id: variations.id, rowVersion: variations.rowVersion })
        .from(variations)
        .where(and(eq(variations.id, id), eq(variations.projectId, ctx.projectId), isNull(variations.deletedAt)))
        .limit(1);
    if (!stillThere) return { kind: 'gone', reason: 'Variation no longer exists.' };
    return { kind: 'conflict', reason: conflictReason('variation', stillThere.rowVersion, expectedRowVersion) };
}

export async function applyUpdateProgramActivity(
    rawInput: unknown,
    expectedRowVersion: number | null,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const id = inputString(input, 'id');
    if (!id) return { kind: 'gone', reason: 'Missing programme activity id' };

    const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        rowVersion: sql`${programActivities.rowVersion} + 1`,
    };
    for (const key of ['name', 'parentId', 'startDate', 'endDate', 'masterStage', 'color'] as const) {
        if (input[key] !== undefined) updateData[key] = inputNullableString(input, key);
    }
    const collapsed = inputOptionalBoolean(input, 'collapsed');
    if (collapsed !== undefined) updateData.collapsed = collapsed;
    const sortOrder = inputOptionalNumber(input, 'sortOrder');
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const conditions = [
        eq(programActivities.id, id),
        eq(programActivities.projectId, ctx.projectId),
    ];
    if (expectedRowVersion !== null) conditions.push(eq(programActivities.rowVersion, expectedRowVersion));

    const updated = await db.update(programActivities).set(updateData).where(and(...conditions)).returning();
    if (updated.length === 1) return { kind: 'applied', output: updated[0] as Record<string, unknown> };

    const [stillThere] = await db
        .select({ id: programActivities.id, rowVersion: programActivities.rowVersion })
        .from(programActivities)
        .where(and(eq(programActivities.id, id), eq(programActivities.projectId, ctx.projectId)))
        .limit(1);
    if (!stillThere) return { kind: 'gone', reason: 'Programme activity no longer exists.' };
    return {
        kind: 'conflict',
        reason: conflictReason('programme activity', stillThere.rowVersion, expectedRowVersion),
    };
}

export async function applyCreateMeeting(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const title = inputString(input, 'title');
    if (!title) return { kind: 'gone', reason: 'Missing meeting title on proposal.' };

    const groupId = inputOptionalString(input, 'groupId') ?? null;
    if (groupId) {
        const [group] = await db
            .select({ id: meetingGroups.id })
            .from(meetingGroups)
            .where(
                and(
                    eq(meetingGroups.id, groupId),
                    eq(meetingGroups.projectId, ctx.projectId),
                    eq(meetingGroups.organizationId, ctx.organizationId)
                )
            )
            .limit(1);
        if (!group) return { kind: 'gone', reason: 'Meeting group no longer exists.' };
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const agendaType = inputString(input, 'agendaType') || 'standard';
    const values = {
        id,
        projectId: ctx.projectId,
        organizationId: ctx.organizationId,
        groupId,
        title,
        meetingDate: inputOptionalString(input, 'meetingDate') ?? null,
        agendaType,
        createdAt: now,
        updatedAt: now,
    };

    const sectionsToCreate = STANDARD_AGENDA_SECTIONS.map((section) => ({
        id: uuidv4(),
        meetingId: id,
        sectionKey: section.key,
        sectionLabel: section.label,
        content: null,
        sortOrder: section.sortOrder,
        parentSectionId: null,
        stakeholderId: null,
        createdAt: now,
        updatedAt: now,
    }));

    const output = await db.transaction(async (tx) => {
        await tx.insert(meetings).values(values);
        if (sectionsToCreate.length > 0) {
            await tx.insert(meetingSections).values(sectionsToCreate);
        }
        return {
            ...values,
            sectionCount: sectionsToCreate.length,
            attendeeCount: 0,
            transmittalCount: 0,
        } as unknown as Record<string, unknown>;
    });

    return { kind: 'applied', output };
}

export async function applySetProjectObjectives(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const mode = inputString(input, 'mode') === 'append' ? 'append' : 'replace';
    const source: ObjectiveSource = 'ai_added';
    const now = new Date();
    const sections = VALID_OBJECTIVE_TYPES.map((type) => ({
        type,
        items: inputStringArray(input, type),
    })).filter((section) => section.items.length > 0);

    if (sections.length === 0) {
        return { kind: 'gone', reason: 'No objective sections were supplied.' };
    }

    const output = await db.transaction(async (tx) => {
        const counts: Partial<Record<ObjectiveType, number>> = {};
        const createdIds: string[] = [];

        for (const section of sections) {
            let baseSortOrder = 0;

            if (mode === 'replace') {
                await tx
                    .update(projectObjectives)
                    .set({ isDeleted: true, updatedAt: now })
                    .where(
                        and(
                            eq(projectObjectives.projectId, ctx.projectId),
                            eq(projectObjectives.objectiveType, section.type),
                            eq(projectObjectives.isDeleted, false)
                        )
                    );
            } else {
                const [last] = await tx
                    .select({ sortOrder: projectObjectives.sortOrder })
                    .from(projectObjectives)
                    .where(
                        and(
                            eq(projectObjectives.projectId, ctx.projectId),
                            eq(projectObjectives.objectiveType, section.type),
                            eq(projectObjectives.isDeleted, false)
                        )
                    )
                    .orderBy(desc(projectObjectives.sortOrder))
                    .limit(1);
                baseSortOrder = (last?.sortOrder ?? -1) + 1;
            }

            const inserted = await tx
                .insert(projectObjectives)
                .values(
                    section.items.map((text, index) => ({
                        projectId: ctx.projectId,
                        objectiveType: section.type,
                        source,
                        text,
                        status: 'draft' as const,
                        sortOrder: baseSortOrder + index,
                        isDeleted: false,
                        updatedAt: now,
                    }))
                )
                .returning({ id: projectObjectives.id });

            counts[section.type] = inserted.length;
            createdIds.push(...inserted.map((row) => row.id));
        }

        return {
            id: 'objectives',
            projectId: ctx.projectId,
            mode,
            sections: counts,
            createdIds,
        } as Record<string, unknown>;
    });

    return { kind: 'applied', output };
}
