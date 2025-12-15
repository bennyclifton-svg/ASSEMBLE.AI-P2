import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultantStatuses } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { consultantStatusSchema } from '@/lib/validations/planning-schema';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; disciplineId: string }> }
) {
    try {
        const { disciplineId } = await params;
        const body = await request.json();
        const { statusType, isActive } = consultantStatusSchema.parse(body);

        // Update the specific status
        const [updated] = await db
            .update(consultantStatuses)
            .set({
                isActive,
                completedAt: isActive ? new Date().toISOString() : null,
                updatedAt: new Date().toISOString(),
            })
            .where(
                and(
                    eq(consultantStatuses.disciplineId, disciplineId),
                    eq(consultantStatuses.statusType, statusType)
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
