import { NextRequest, NextResponse } from 'next/server';
import { db, coachingChecklists } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * PATCH /api/projects/[projectId]/coaching/checklists/[checklistId]
 * Dismiss or undismiss a checklist.
 * Body: { isDismissed: boolean }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; checklistId: string }> }
) {
    try {
        const { projectId, checklistId } = await params;
        const body = await request.json();
        const { isDismissed } = body;

        if (typeof isDismissed !== 'boolean') {
            return NextResponse.json(
                { error: 'isDismissed (boolean) is required' },
                { status: 400 }
            );
        }

        const [checklist] = await db
            .select()
            .from(coachingChecklists)
            .where(
                and(
                    eq(coachingChecklists.id, checklistId),
                    eq(coachingChecklists.projectId, projectId)
                )
            );

        if (!checklist) {
            return NextResponse.json(
                { error: 'Checklist not found' },
                { status: 404 }
            );
        }

        await db
            .update(coachingChecklists)
            .set({
                isDismissed,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(coachingChecklists.id, checklistId));

        const [updated] = await db
            .select()
            .from(coachingChecklists)
            .where(eq(coachingChecklists.id, checklistId));

        return NextResponse.json({
            ...updated,
            items: typeof updated.items === 'string' ? JSON.parse(updated.items) : updated.items,
        });
    } catch (error) {
        console.error('Error updating checklist:', error);
        return NextResponse.json(
            { error: 'Failed to update checklist' },
            { status: 500 }
        );
    }
}
