import { NextRequest, NextResponse } from 'next/server';
import { db, programActivities } from '@/lib/db';
import { eq, max } from 'drizzle-orm';
import { PROGRAM_COLORS } from '@/types/program';
import { v4 as uuidv4 } from 'uuid';

// POST /api/projects/[projectId]/program/activities - Create activity
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();
        const { name, parentId, startDate, endDate } = body;

        if (!name?.trim()) {
            return NextResponse.json(
                { error: 'Activity name is required' },
                { status: 400 }
            );
        }

        // Get the max sort order for this project
        const result = await db
            .select({ maxOrder: max(programActivities.sortOrder) })
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId));

        const maxOrder = result[0]?.maxOrder ?? -1;
        const newSortOrder = maxOrder + 1;

        // Auto-assign color based on parent or cycling through palette
        let color: string;
        if (parentId) {
            // Child inherits parent's color
            const parent = await db
                .select({ color: programActivities.color })
                .from(programActivities)
                .where(eq(programActivities.id, parentId))
                .limit(1);
            color = parent[0]?.color ?? PROGRAM_COLORS[0];
        } else {
            // Top-level: cycle through colors based on count of top-level activities
            const topLevelCount = await db
                .select()
                .from(programActivities)
                .where(eq(programActivities.projectId, projectId));
            const topLevelParents = topLevelCount.filter((a) => !a.parentId);
            color = PROGRAM_COLORS[topLevelParents.length % PROGRAM_COLORS.length];
        }

        const id = uuidv4();

        await db.insert(programActivities).values({
            id,
            projectId,
            parentId: parentId || null,
            name: name.trim(),
            startDate: startDate || null,
            endDate: endDate || null,
            collapsed: false,
            color,
            sortOrder: newSortOrder,
            // Let database handle createdAt/updatedAt defaults
        });

        const created = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.id, id))
            .limit(1);

        return NextResponse.json(created[0], { status: 201 });
    } catch (error) {
        console.error('Error creating activity:', error);
        return NextResponse.json(
            { error: 'Failed to create activity' },
            { status: 500 }
        );
    }
}
