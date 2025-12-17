import { NextRequest, NextResponse } from 'next/server';
import { db, programMilestones } from '@/lib/db';
import { eq, max } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// POST /api/projects/[projectId]/program/activities/[id]/milestones - Create milestone
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { id: activityId } = await params;
        const body = await request.json();
        const { name, date } = body;

        if (!name?.trim()) {
            return NextResponse.json(
                { error: 'Milestone name is required' },
                { status: 400 }
            );
        }

        if (!date) {
            return NextResponse.json(
                { error: 'Milestone date is required' },
                { status: 400 }
            );
        }

        // Get max sort order for this activity's milestones
        const result = await db
            .select({ maxOrder: max(programMilestones.sortOrder) })
            .from(programMilestones)
            .where(eq(programMilestones.activityId, activityId));

        const maxOrder = result[0]?.maxOrder ?? -1;
        const newSortOrder = maxOrder + 1;

        const id = uuidv4();

        await db.insert(programMilestones).values({
            id,
            activityId,
            name: name.trim(),
            date,
            sortOrder: newSortOrder,
        });

        return NextResponse.json({
            id,
            activityId,
            name: name.trim(),
            date,
            sortOrder: newSortOrder,
            createdAt: new Date().toISOString(),
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating milestone:', error);
        return NextResponse.json(
            { error: 'Failed to create milestone' },
            { status: 500 }
        );
    }
}
