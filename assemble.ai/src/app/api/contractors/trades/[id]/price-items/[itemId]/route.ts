import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradePriceItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT /api/contractors/trades/[id]/price-items/[itemId] - Update price item
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { id: tradeId, itemId } = await params;

    try {
        const body = await request.json();
        const { description } = body;

        if (!description || typeof description !== 'string') {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        // Update price item
        const updated = await db.update(tradePriceItems)
            .set({
                description: description.trim(),
                updatedAt: new Date().toISOString(),
            })
            .where(
                and(
                    eq(tradePriceItems.id, itemId),
                    eq(tradePriceItems.tradeId, tradeId)
                )
            )
            .returning();

        if (!updated.length) {
            return NextResponse.json({ error: 'Price item not found' }, { status: 404 });
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error('Error updating price item:', error);
        return NextResponse.json({ error: 'Failed to update price item' }, { status: 500 });
    }
}

// DELETE /api/contractors/trades/[id]/price-items/[itemId] - Delete price item
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { id: tradeId, itemId } = await params;

    try {
        const deleted = await db.delete(tradePriceItems)
            .where(
                and(
                    eq(tradePriceItems.id, itemId),
                    eq(tradePriceItems.tradeId, tradeId)
                )
            )
            .returning();

        if (!deleted.length) {
            return NextResponse.json({ error: 'Price item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting price item:', error);
        return NextResponse.json({ error: 'Failed to delete price item' }, { status: 500 });
    }
}
