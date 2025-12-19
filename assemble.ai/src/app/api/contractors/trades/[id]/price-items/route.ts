import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradePriceItems, contractorTrades } from '@/lib/db';
import { eq, asc, max } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/contractors/trades/[id]/price-items - List price items for trade
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tradeId } = await params;

    try {
        // Verify trade exists
        const trade = await db.query.contractorTrades.findFirst({
            where: eq(contractorTrades.id, tradeId),
        });

        if (!trade) {
            return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
        }

        // Get all price items for this trade, ordered by sortOrder
        const items = await db.query.tradePriceItems.findMany({
            where: eq(tradePriceItems.tradeId, tradeId),
            orderBy: [asc(tradePriceItems.sortOrder)],
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching price items:', error);
        return NextResponse.json({ error: 'Failed to fetch price items' }, { status: 500 });
    }
}

// POST /api/contractors/trades/[id]/price-items - Create price item
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tradeId } = await params;

    try {
        const body = await request.json();
        const { description } = body;

        if (!description || typeof description !== 'string') {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        // Verify trade exists
        const trade = await db.query.contractorTrades.findFirst({
            where: eq(contractorTrades.id, tradeId),
        });

        if (!trade) {
            return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
        }

        // Get max sort order for this trade
        const maxOrderResult = await db.select({ maxOrder: max(tradePriceItems.sortOrder) })
            .from(tradePriceItems)
            .where(eq(tradePriceItems.tradeId, tradeId));

        const nextSortOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

        // Create new price item
        const newItem = await db.insert(tradePriceItems)
            .values({
                id: nanoid(),
                tradeId,
                description: description.trim(),
                sortOrder: nextSortOrder,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return NextResponse.json(newItem[0], { status: 201 });
    } catch (error) {
        console.error('Error creating price item:', error);
        return NextResponse.json({ error: 'Failed to create price item' }, { status: 500 });
    }
}

// PUT /api/contractors/trades/[id]/price-items - Reorder price items
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tradeId } = await params;

    try {
        const body = await request.json();
        const { itemIds } = body;

        if (!Array.isArray(itemIds)) {
            return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 });
        }

        // Update sort orders based on array position
        for (let i = 0; i < itemIds.length; i++) {
            await db.update(tradePriceItems)
                .set({
                    sortOrder: i,
                    updatedAt: new Date(),
                })
                .where(eq(tradePriceItems.id, itemIds[i]));
        }

        // Return updated items
        const items = await db.query.tradePriceItems.findMany({
            where: eq(tradePriceItems.tradeId, tradeId),
            orderBy: [asc(tradePriceItems.sortOrder)],
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error('Error reordering price items:', error);
        return NextResponse.json({ error: 'Failed to reorder price items' }, { status: 500 });
    }
}
