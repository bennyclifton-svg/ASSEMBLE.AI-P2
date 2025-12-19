import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractorStatuses } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tradeId } = await params;

    try {
        const body = await request.json();
        const { statusType, isActive } = body;

        if (!statusType || typeof isActive !== 'boolean') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        // Check if status record exists
        const existing = await db.select()
            .from(contractorStatuses)
            .where(and(
                eq(contractorStatuses.tradeId, tradeId),
                eq(contractorStatuses.statusType, statusType)
            ));

        let result;
        const now = new Date();
        if (existing.length > 0) {
            // Update
            result = await db.update(contractorStatuses)
                .set({
                    isActive,
                    updatedAt: now,
                    completedAt: isActive ? now : null
                })
                .where(eq(contractorStatuses.id, existing[0].id))
                .returning();
        } else {
            // Insert
            result = await db.insert(contractorStatuses)
                .values({
                    id: uuidv4(),
                    tradeId,
                    statusType,
                    isActive,
                    completedAt: isActive ? now : null
                })
                .returning();
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error updating contractor status:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}
