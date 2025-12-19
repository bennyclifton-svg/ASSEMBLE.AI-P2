import { NextRequest, NextResponse } from 'next/server';
import { db, programMilestones } from '@/lib/db';
import { eq } from 'drizzle-orm';

// DELETE /api/projects/[projectId]/program/milestones/[id] - Delete milestone
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { id } = await params;

        await db
            .delete(programMilestones)
            .where(eq(programMilestones.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting milestone:', error);
        return NextResponse.json(
            { error: 'Failed to delete milestone' },
            { status: 500 }
        );
    }
}
