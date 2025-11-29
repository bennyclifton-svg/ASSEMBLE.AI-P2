import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractorTrades } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();
        const { isEnabled } = body;

        if (typeof isEnabled !== 'boolean') {
            return NextResponse.json({ error: 'isEnabled must be a boolean' }, { status: 400 });
        }

        const updated = await db.update(contractorTrades)
            .set({ isEnabled })
            .where(eq(contractorTrades.id, id))
            .returning();

        if (!updated.length) {
            return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error('Error updating contractor trade:', error);
        return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
    }
}
