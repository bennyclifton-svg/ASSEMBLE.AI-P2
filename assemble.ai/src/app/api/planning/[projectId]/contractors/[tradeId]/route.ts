import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractorTrades } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = z.object({
    isEnabled: z.boolean().optional(),
    scopeWorks: z.string().optional(),
    scopeDeliverables: z.string().optional(),
    scopePrice: z.string().optional(),
    scopeProgram: z.string().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; tradeId: string }> }
) {
    try {
        const { tradeId } = await params;
        const [trade] = await db
            .select()
            .from(contractorTrades)
            .where(eq(contractorTrades.id, tradeId));

        if (!trade) {
            return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
        }

        return NextResponse.json(trade);
    } catch (error) {
        console.error('Error fetching trade:', error);
        return NextResponse.json({ error: 'Failed to fetch trade' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; tradeId: string }> }
) {
    try {
        const { tradeId } = await params;
        const body = await request.json();
        const validated = updateSchema.parse(body);

        // Update the trade
        const [updated] = await db
            .update(contractorTrades)
            .set({
                ...validated,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(contractorTrades.id, tradeId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating trade:', error);
        return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
    }
}
