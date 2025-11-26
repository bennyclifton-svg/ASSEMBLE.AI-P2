import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractorTrades } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const toggleSchema = z.object({
    isEnabled: z.boolean(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; tradeId: string }> }
) {
    try {
        const { projectId, tradeId } = await params;
        const body = await request.json();
        const { isEnabled } = toggleSchema.parse(body);

        // Update the trade
        const [updated] = await db
            .update(contractorTrades)
            .set({
                isEnabled,
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
