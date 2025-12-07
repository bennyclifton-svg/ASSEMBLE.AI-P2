import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { costLines } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

interface ReorderUpdate {
    id: string;
    sortOrder: number;
}

/**
 * PATCH /api/projects/[projectId]/cost-lines/reorder
 * Batch update sortOrder for multiple cost lines
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();
        const { updates }: { updates: ReorderUpdate[] } = body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json(
                { error: 'Updates array is required' },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();

        // Update each cost line's sortOrder
        await Promise.all(
            updates.map(async ({ id, sortOrder }) => {
                await db
                    .update(costLines)
                    .set({ sortOrder, updatedAt: now })
                    .where(
                        and(
                            eq(costLines.id, id),
                            eq(costLines.projectId, projectId),
                            isNull(costLines.deletedAt)
                        )
                    );
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error reordering cost lines:', error);
        return NextResponse.json(
            { error: 'Failed to reorder cost lines' },
            { status: 500 }
        );
    }
}
