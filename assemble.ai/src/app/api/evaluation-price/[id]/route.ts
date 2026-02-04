import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { evaluationPrice, evaluationRows, evaluationCells } from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';

/**
 * GET /api/evaluation-price/[id] - Get a single evaluation price instance
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        const [instance] = await db
            .select()
            .from(evaluationPrice)
            .where(eq(evaluationPrice.id, id))
            .limit(1);

        if (!instance) {
            return NextResponse.json({ error: 'Evaluation price not found' }, { status: 404 });
        }

        return NextResponse.json(instance);
    });
}

/**
 * PUT /api/evaluation-price/[id] - Update evaluation price instance
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const body = await request.json();

        const [existing] = await db
            .select()
            .from(evaluationPrice)
            .where(eq(evaluationPrice.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Evaluation price not found' }, { status: 404 });
        }

        await db
            .update(evaluationPrice)
            .set({
                ...body,
                updatedAt: new Date(),
            })
            .where(eq(evaluationPrice.id, id));

        const [updated] = await db
            .select()
            .from(evaluationPrice)
            .where(eq(evaluationPrice.id, id))
            .limit(1);

        return NextResponse.json(updated);
    });
}

/**
 * DELETE /api/evaluation-price/[id] - Delete evaluation price (cascades to rows and cells)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        const [existing] = await db
            .select()
            .from(evaluationPrice)
            .where(eq(evaluationPrice.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Evaluation price not found' }, { status: 404 });
        }

        // Get all row IDs for this evaluation price
        const rows = await db
            .select({ id: evaluationRows.id })
            .from(evaluationRows)
            .where(eq(evaluationRows.evaluationPriceId, id));

        const rowIds = rows.map(r => r.id);

        // Delete cells for these rows
        if (rowIds.length > 0) {
            await db
                .delete(evaluationCells)
                .where(inArray(evaluationCells.rowId, rowIds));
        }

        // Delete the rows
        await db
            .delete(evaluationRows)
            .where(eq(evaluationRows.evaluationPriceId, id));

        // Delete the evaluation price instance
        await db.delete(evaluationPrice).where(eq(evaluationPrice.id, id));

        return NextResponse.json({ success: true, id });
    });
}
