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
import { costLines, invoices } from '@/lib/db/pg-schema';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface ApplyContext {
    organizationId: string;
    projectId: string;
}

export type ApplyResult =
    | { kind: 'applied'; output: Record<string, unknown> }
    | { kind: 'conflict'; reason: string }
    | { kind: 'gone'; reason: string };

export async function applyApproval(args: {
    toolName: string;
    input: unknown;
    expectedRowVersion: number | null;
    ctx: ApplyContext;
}): Promise<ApplyResult> {
    switch (args.toolName) {
        case 'update_cost_line':
            return applyUpdateCostLine(args.input, args.expectedRowVersion, args.ctx);
        case 'create_cost_line':
            return applyCreateCostLine(args.input, args.ctx);
        case 'record_invoice':
            return applyRecordInvoice(args.input, args.ctx);
        default:
            throw new Error(`No applicator registered for tool "${args.toolName}"`);
    }
}

/**
 * Apply update_cost_line. Conditional UPDATE on (id, project, rowVersion);
 * if row was changed since propose time, return conflict.
 */
async function applyUpdateCostLine(
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
