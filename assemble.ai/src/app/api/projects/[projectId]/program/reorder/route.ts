import { NextRequest, NextResponse } from 'next/server';
import { db, programActivities } from '@/lib/db';
import { eq } from 'drizzle-orm';

// POST /api/projects/[projectId]/program/reorder - Reorder activities
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();
        const { activities } = body;

        if (!Array.isArray(activities)) {
            return NextResponse.json(
                { error: 'activities array is required' },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();

        // Update each activity's sortOrder and parentId
        for (const activity of activities) {
            if (!activity.id || activity.sortOrder === undefined) {
                continue;
            }

            await db
                .update(programActivities)
                .set({
                    parentId: activity.parentId ?? null,
                    sortOrder: activity.sortOrder,
                    updatedAt: now,
                })
                .where(eq(programActivities.id, activity.id));
        }

        return NextResponse.json({ success: true, updated: activities.length });
    } catch (error) {
        console.error('Error reordering activities:', error);
        return NextResponse.json(
            { error: 'Failed to reorder activities' },
            { status: 500 }
        );
    }
}
