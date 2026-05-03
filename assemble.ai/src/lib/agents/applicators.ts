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
    addenda,
    addendumTransmittals,
    costLines,
    documents,
    invoices,
    meetingGroups,
    meetings,
    meetingSections,
    notes,
    noteTransmittals,
    programActivities,
    projectStakeholders,
    risks,
    subcategories,
    transmittalItems,
    transmittals,
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
import { and, desc, eq, inArray, isNull, max, or, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getActionByToolName } from '@/lib/actions/registry';
import type { ActionContext } from '@/lib/actions/types';

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
let actionsLoaded = false;

async function ensureActionsRegistered(): Promise<void> {
    if (actionsLoaded) return;
    await Promise.all([
        import('@/lib/actions/definitions/create-note'),
        import('@/lib/actions/definitions/create-program-activity'),
        import('@/lib/actions/definitions/create-program-milestone'),
        import('@/lib/actions/definitions/create-transmittal'),
        import('@/lib/actions/definitions/create-variation'),
        import('@/lib/actions/definitions/attach-documents-to-note'),
        import('@/lib/actions/definitions/set-project-objectives'),
        import('@/lib/actions/definitions/update-cost-line'),
        import('@/lib/actions/definitions/update-note'),
        import('@/lib/actions/definitions/update-program-activity'),
        import('@/lib/actions/definitions/update-program-milestone'),
    ]);
    actionsLoaded = true;
}

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
    let action = getActionByToolName(args.toolName);
    if (!action) {
        await ensureActionsRegistered();
        action = getActionByToolName(args.toolName);
    }
    if (action) {
        if (!action.apply && !action.applyResult) {
            throw new Error(`Action-backed approval "${action.id}" has no apply handler`);
        }
        const parsed = action.inputSchema.safeParse(args.input);
        if (!parsed.success) {
            const compatibleResult = legacyCompatibleInvalidActionInput(action.id, args.input);
            if (compatibleResult) return compatibleResult;
            return {
                kind: 'gone',
                reason: `Invalid input for action "${action.id}": ${parsed.error.message}`,
            };
        }
        const actionCtx: ActionContext = {
            userId: args.ctx.userId ?? 'approval',
            organizationId: args.ctx.organizationId,
            projectId: args.ctx.projectId,
            actorKind: args.ctx.userId ? 'user' : 'system',
            actorId: args.ctx.userId ?? 'approval',
            threadId: args.ctx.threadId ?? null,
            runId: args.ctx.runId ?? null,
        };
        let output: unknown;
        try {
            if (action.applyResult) {
                return action.applyResult(actionCtx, parsed.data, {
                    expectedRowVersion: args.expectedRowVersion,
                }) as Promise<ApplyResult>;
            }
            output = await action.apply!(actionCtx, parsed.data, {
                expectedRowVersion: args.expectedRowVersion,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.startsWith('Document(s) not found in this project:')) {
                return { kind: 'gone', reason: message };
            }
            throw err;
        }
        return { kind: 'applied', output: output as Record<string, unknown> };
    }

    switch (args.toolName) {
        case 'create_cost_line':
            return applyCreateCostLine(args.input, args.ctx);
        case 'record_invoice':
            return applyRecordInvoice(args.input, args.ctx);
        case 'create_addendum':
            return applyCreateAddendum(args.input, args.ctx);
        case 'create_risk':
            return applyCreateRisk(args.input, args.ctx);
        case 'update_risk':
            return applyUpdateRisk(args.input, args.expectedRowVersion, args.ctx);
        case 'update_variation':
            return applyUpdateVariation(args.input, args.expectedRowVersion, args.ctx);
        case 'create_meeting':
            return applyCreateMeeting(args.input, args.ctx);
        case 'update_stakeholder':
            return applyUpdateStakeholder(args.input, args.expectedRowVersion, args.ctx);
        default:
            throw new Error(`No applicator registered for tool "${args.toolName}"`);
    }
}

function legacyCompatibleInvalidActionInput(actionId: string, rawInput: unknown): ApplyResult | null {
    const input = asInput(rawInput);
    if (actionId === 'finance.variations.create' && input.status !== undefined) {
        return {
            kind: 'gone',
            reason: 'Invalid variation status. Use Forecast, Approved, Rejected, or Withdrawn.',
        };
    }
    if (actionId === 'planning.objectives.set') {
        return { kind: 'gone', reason: 'No objective sections were supplied.' };
    }
    return null;
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
async function applyCreateCostLine(
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
async function applyRecordInvoice(
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

async function validateProjectDocuments(
    documentIds: string[],
    ctx: ApplyContext,
    client: DbClient = db
): Promise<{ ok: true; ids: string[] } | { ok: false; reason: string }> {
    const ids = Array.from(new Set(documentIds.filter(Boolean)));
    if (ids.length === 0) return { ok: true, ids: [] };

    const rows = await client
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.projectId, ctx.projectId), inArray(documents.id, ids)));

    const found = new Set(rows.map((row) => row.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
        return {
            ok: false,
            reason: `Document(s) not found in this project: ${missing.join(', ')}`,
        };
    }
    return { ok: true, ids };
}

async function applyCreateAddendum(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const stakeholderId = inputString(input, 'stakeholderId');
    const content = inputString(input, 'content');
    if (!stakeholderId || !content) {
        return { kind: 'gone', reason: 'Missing stakeholder or content on proposed addendum.' };
    }

    const [stakeholder] = await db
        .select({ id: projectStakeholders.id })
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.id, stakeholderId),
                eq(projectStakeholders.projectId, ctx.projectId),
                isNull(projectStakeholders.deletedAt)
            )
        )
        .limit(1);
    if (!stakeholder) {
        return { kind: 'gone', reason: 'Stakeholder no longer exists in this project.' };
    }

    const documentCheck = await validateProjectDocuments(inputStringArray(input, 'documentIds'), ctx);
    if (documentCheck.ok === false) return { kind: 'gone', reason: documentCheck.reason };

    const addendumDate = inputOptionalString(input, 'addendumDate') ?? null;
    const id = uuidv4();
    const now = new Date();

    const output = await db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ maxNum: max(addenda.addendumNumber) })
            .from(addenda)
            .where(and(eq(addenda.projectId, ctx.projectId), eq(addenda.stakeholderId, stakeholderId)))
            .limit(1);

        const addendumNumber = Number(existing?.maxNum ?? 0) + 1;
        const values = {
            id,
            projectId: ctx.projectId,
            stakeholderId,
            addendumNumber,
            content,
            addendumDate,
            createdAt: now,
            updatedAt: now,
        };

        await tx.insert(addenda).values(values);

        if (documentCheck.ids.length > 0) {
            await tx.insert(addendumTransmittals).values(
                documentCheck.ids.map((documentId, index) => ({
                    id: uuidv4(),
                    addendumId: id,
                    documentId,
                    sortOrder: index,
                    createdAt: now,
                }))
            );
        }

        return {
            ...values,
            attachedDocumentIds: documentCheck.ids,
            transmittalCount: documentCheck.ids.length,
        } as unknown as Record<string, unknown>;
    });

    return { kind: 'applied', output };
}

export async function applyCreateTransmittal(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const name = inputString(input, 'name');
    if (!name) return { kind: 'gone', reason: 'Missing transmittal name.' };

    const stakeholderId = inputOptionalString(input, 'stakeholderId') ?? null;
    const subcategoryId = inputOptionalString(input, 'subcategoryId') ?? null;
    const rawDestination = inputOptionalString(input, 'destination') ?? null;
    if (rawDestination && rawDestination !== 'note' && rawDestination !== 'project') {
        return { kind: 'gone', reason: 'Unknown transmittal destination.' };
    }
    const destination = rawDestination ?? (stakeholderId || subcategoryId ? 'project' : 'note');

    if (stakeholderId) {
        const [stakeholder] = await db
            .select({ id: projectStakeholders.id })
            .from(projectStakeholders)
            .where(
                and(
                    eq(projectStakeholders.id, stakeholderId),
                    eq(projectStakeholders.projectId, ctx.projectId),
                    isNull(projectStakeholders.deletedAt)
                )
            )
            .limit(1);
        if (!stakeholder) {
            return { kind: 'gone', reason: 'Stakeholder no longer exists in this project.' };
        }
    }

    if (subcategoryId) {
        const [subcategory] = await db
            .select({ id: subcategories.id })
            .from(subcategories)
            .where(
                and(
                    eq(subcategories.id, subcategoryId),
                    or(eq(subcategories.projectId, ctx.projectId), isNull(subcategories.projectId))
                )
            )
            .limit(1);
        if (!subcategory) {
            return { kind: 'gone', reason: 'Subcategory no longer exists in this project.' };
        }
    }

    if (destination === 'project' && !stakeholderId && !subcategoryId) {
        return {
            kind: 'gone',
            reason:
                'Project transmittals require a stakeholder or subcategory target. Use a Notes section transmittal for untargeted drawing sets.',
        };
    }

    const documentIds = inputStringArray(input, 'documentIds');
    if (documentIds.length === 0) {
        return { kind: 'gone', reason: 'No documents were supplied for the transmittal.' };
    }

    const rows = await db
        .select({
            id: documents.id,
            latestVersionId: documents.latestVersionId,
        })
        .from(documents)
        .where(and(eq(documents.projectId, ctx.projectId), inArray(documents.id, documentIds)));

    const byId = new Map(rows.map((row) => [row.id, row.latestVersionId]));
    const missing = documentIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
        return {
            kind: 'gone',
            reason: `Document(s) not found in this project: ${missing.join(', ')}`,
        };
    }

    const withoutVersion = documentIds.filter((id) => !byId.get(id));
    if (withoutVersion.length > 0) {
        return {
            kind: 'gone',
            reason: `Document(s) do not have a latest version: ${withoutVersion.join(', ')}`,
        };
    }

    const id = uuidv4();
    if (destination === 'note') {
        const now = new Date().toISOString();
        const output = await db.transaction(async (tx) => {
            const values = {
                id,
                projectId: ctx.projectId,
                organizationId: ctx.organizationId,
                title: name,
                content: null,
                isStarred: false,
                color: 'green',
                type: 'transmittal',
                status: 'open',
                noteDate: null,
                rowVersion: 1,
                createdAt: now,
                updatedAt: now,
            };

            await tx.insert(notes).values(values);
            await tx.insert(noteTransmittals).values(
                documentIds.map((documentId) => ({
                    id: uuidv4(),
                    noteId: id,
                    documentId,
                    addedAt: now,
                }))
            );

            return {
                ...values,
                transmittalTarget: 'note',
                attachedDocumentIds: documentIds,
                documentCount: documentIds.length,
            } as unknown as Record<string, unknown>;
        });

        return { kind: 'applied', output };
    }

    const now = new Date();
    const output = await db.transaction(async (tx) => {
        const values = {
            id,
            projectId: ctx.projectId,
            stakeholderId,
            subcategoryId,
            name,
            status: 'DRAFT',
            createdAt: now,
            updatedAt: now,
        };

        await tx.insert(transmittals).values(values);
        await tx.insert(transmittalItems).values(
            documentIds.map((documentId) => ({
                id: uuidv4(),
                transmittalId: id,
                versionId: byId.get(documentId)!,
            }))
        );

        return {
            ...values,
            transmittalTarget: 'project',
            documentIds,
            documentCount: documentIds.length,
        } as unknown as Record<string, unknown>;
    });

    return { kind: 'applied', output };
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

async function attachDocumentsToNote(
    noteId: string,
    documentIds: string[],
    client: DbClient = db
): Promise<void> {
    if (documentIds.length === 0) return;

    const existingRows = await client
        .select({ documentId: noteTransmittals.documentId })
        .from(noteTransmittals)
        .where(eq(noteTransmittals.noteId, noteId));
    const existing = new Set(existingRows.map((row) => row.documentId));
    const now = new Date().toISOString();

    for (const documentId of documentIds) {
        if (existing.has(documentId)) continue;
        await client.insert(noteTransmittals).values({
            id: uuidv4(),
            noteId,
            documentId,
            addedAt: now,
        });
    }
}

async function applyCreateNote(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const title = inputString(input, 'title');
    if (!title) return { kind: 'gone', reason: 'Missing note title on proposal.' };

    const documentCheck = await validateProjectDocuments(inputStringArray(input, 'documentIds'), ctx);
    if (documentCheck.ok === false) return { kind: 'gone', reason: documentCheck.reason };

    const id = uuidv4();
    const now = new Date().toISOString();
    const values = {
        id,
        projectId: ctx.projectId,
        organizationId: ctx.organizationId,
        title,
        content: inputOptionalString(input, 'content') ?? null,
        isStarred: inputOptionalBoolean(input, 'isStarred') ?? false,
        color: inputString(input, 'color') || 'yellow',
        type: inputString(input, 'type') || 'note',
        status: inputString(input, 'status') || 'open',
        noteDate: inputOptionalString(input, 'noteDate') ?? null,
        rowVersion: 1,
        createdAt: now,
        updatedAt: now,
    };

    const output = await db.transaction(async (tx) => {
        await tx.insert(notes).values(values);
        await attachDocumentsToNote(id, documentCheck.ids, tx);
        return {
            ...values,
            attachedDocumentIds: documentCheck.ids,
        } as unknown as Record<string, unknown>;
    });

    return { kind: 'applied', output };
}

export async function applyUpdateNote(
    rawInput: unknown,
    expectedRowVersion: number | null,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const id = inputString(input, 'id');
    if (!id) return { kind: 'gone', reason: 'Missing note id' };

    const documentCheck = await validateProjectDocuments(inputStringArray(input, 'attachDocumentIds'), ctx);
    if (documentCheck.ok === false) return { kind: 'gone', reason: documentCheck.reason };

    const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
        rowVersion: sql`${notes.rowVersion} + 1`,
    };
    for (const key of ['title', 'content', 'color', 'type', 'status', 'noteDate'] as const) {
        if (input[key] !== undefined) updateData[key] = inputNullableString(input, key);
    }
    const isStarred = inputOptionalBoolean(input, 'isStarred');
    if (isStarred !== undefined) updateData.isStarred = isStarred;

    const conditions = [
        eq(notes.id, id),
        eq(notes.projectId, ctx.projectId),
        eq(notes.organizationId, ctx.organizationId),
        isNull(notes.deletedAt),
    ];
    if (expectedRowVersion !== null) conditions.push(eq(notes.rowVersion, expectedRowVersion));

    const updateResult = await db.transaction(async (tx) => {
        const updated = await tx.update(notes).set(updateData).where(and(...conditions)).returning();
        if (updated.length !== 1) return null;
        await attachDocumentsToNote(id, documentCheck.ids, tx);
        return {
            ...(updated[0] as Record<string, unknown>),
            attachedDocumentIds: documentCheck.ids,
        } as Record<string, unknown>;
    });
    if (updateResult) {
        return {
            kind: 'applied',
            output: updateResult,
        };
    }

    const [stillThere] = await db
        .select({ id: notes.id, rowVersion: notes.rowVersion })
        .from(notes)
        .where(
            and(
                eq(notes.id, id),
                eq(notes.projectId, ctx.projectId),
                eq(notes.organizationId, ctx.organizationId),
                isNull(notes.deletedAt)
            )
        )
        .limit(1);
    if (!stillThere) return { kind: 'gone', reason: 'Note no longer exists.' };
    return { kind: 'conflict', reason: conflictReason('note', stillThere.rowVersion, expectedRowVersion) };
}

async function applyCreateRisk(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
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

async function applyUpdateRisk(
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

async function applyUpdateVariation(
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

async function applyCreateMeeting(rawInput: unknown, ctx: ApplyContext): Promise<ApplyResult> {
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

async function applyUpdateStakeholder(
    rawInput: unknown,
    expectedRowVersion: number | null,
    ctx: ApplyContext
): Promise<ApplyResult> {
    const input = asInput(rawInput);
    const id = inputString(input, 'id');
    if (!id) return { kind: 'gone', reason: 'Missing stakeholder id' };

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
        if (input[key] !== undefined) updateData[key] = inputNullableString(input, key);
    }
    const isEnabled = inputOptionalBoolean(input, 'isEnabled');
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    const conditions = [
        eq(projectStakeholders.id, id),
        eq(projectStakeholders.projectId, ctx.projectId),
        isNull(projectStakeholders.deletedAt),
    ];
    if (expectedRowVersion !== null) {
        conditions.push(eq(projectStakeholders.rowVersion, expectedRowVersion));
    }

    const updated = await db.update(projectStakeholders).set(updateData).where(and(...conditions)).returning();
    if (updated.length === 1) return { kind: 'applied', output: updated[0] as Record<string, unknown> };

    const [stillThere] = await db
        .select({ id: projectStakeholders.id, rowVersion: projectStakeholders.rowVersion })
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.id, id),
                eq(projectStakeholders.projectId, ctx.projectId),
                isNull(projectStakeholders.deletedAt)
            )
        )
        .limit(1);
    if (!stillThere) return { kind: 'gone', reason: 'Stakeholder no longer exists.' };
    return { kind: 'conflict', reason: conflictReason('stakeholder', stillThere.rowVersion, expectedRowVersion) };
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
