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
        const { isEnabled, scopeWorks, scopePrice, scopeProgram } = body;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        if (typeof isEnabled === 'boolean') {
            updateData.isEnabled = isEnabled;
        }
        if (scopeWorks !== undefined) {
            updateData.scopeWorks = scopeWorks;
        }
        if (scopePrice !== undefined) {
            updateData.scopePrice = scopePrice;
        }
        if (scopeProgram !== undefined) {
            updateData.scopeProgram = scopeProgram;
        }

        const updated = await db.update(contractorTrades)
            .set(updateData)
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
