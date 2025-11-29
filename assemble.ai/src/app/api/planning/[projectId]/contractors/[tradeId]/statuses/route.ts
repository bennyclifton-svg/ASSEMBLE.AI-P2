import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractorStatuses } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { contractorStatusSchema } from '@/lib/validations/planning-schema';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; tradeId: string }> }
) {
    try {
        const { tradeId } = await params;
        const body = await request.json();
        const { statusType, isActive } = contractorStatusSchema.parse(body);

        // Update the specific status
        const [updated] = await db
            .update(contractorStatuses)
            .set({
                isActive,
                completedAt: isActive ? new Date().toISOString() : null,
                updatedAt: new Date().toISOString(),
            })
            .where(
                and(
                    eq(contractorStatuses.tradeId, tradeId),
                    eq(contractorStatuses.statusType, statusType)
                )
            )
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Status not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating status:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}
