import { NextRequest, NextResponse } from 'next/server';
import { db, programDependencies } from '@/lib/db';
import { eq } from 'drizzle-orm';

// DELETE /api/projects/[projectId]/program/dependencies/[id] - Delete dependency
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { id } = await params;

        await db
            .delete(programDependencies)
            .where(eq(programDependencies.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting dependency:', error);
        return NextResponse.json(
            { error: 'Failed to delete dependency' },
            { status: 500 }
        );
    }
}
