import { NextRequest, NextResponse } from 'next/server';
import { db, programActivities, programDependencies, programMilestones } from '@/lib/db';
import { eq, or } from 'drizzle-orm';

// Helper to format date as ISO string (date only)
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Propagate date changes to dependent activities (floating activities)
async function propagateDependencies(
    activityId: string,
    projectId: string,
    visited: Set<string>
): Promise<void> {
    if (visited.has(activityId)) return; // Prevent cycles
    visited.add(activityId);

    // Get the updated activity
    const activity = await db
        .select()
        .from(programActivities)
        .where(eq(programActivities.id, activityId))
        .limit(1);

    if (!activity[0] || !activity[0].startDate || !activity[0].endDate) return;

    // Find outgoing dependencies (where this activity is the predecessor)
    const deps = await db
        .select()
        .from(programDependencies)
        .where(eq(programDependencies.fromActivityId, activityId));

    for (const dep of deps) {
        // Get the dependent activity
        const dependent = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.id, dep.toActivityId))
            .limit(1);

        if (!dependent[0] || !dependent[0].startDate || !dependent[0].endDate) continue;

        // Calculate the dependent's current duration to preserve it
        const depStart = new Date(dependent[0].startDate);
        const depEnd = new Date(dependent[0].endDate);
        const duration = depEnd.getTime() - depStart.getTime();

        // Calculate new dates based on dependency type
        let newStart: Date;
        switch (dep.type) {
            case 'FS': // Finish-to-Start: Dependent starts when predecessor finishes
                newStart = new Date(activity[0].endDate);
                break;
            case 'SS': // Start-to-Start: Dependent starts when predecessor starts
                newStart = new Date(activity[0].startDate);
                break;
            case 'FF': // Finish-to-Finish: Dependent ends when predecessor ends
                const predEnd = new Date(activity[0].endDate);
                newStart = new Date(predEnd.getTime() - duration);
                break;
            default:
                continue;
        }
        const newEnd = new Date(newStart.getTime() + duration);

        // Update dependent activity
        await db
            .update(programActivities)
            .set({
                startDate: formatDate(newStart),
                endDate: formatDate(newEnd),
                updatedAt: new Date(),
            })
            .where(eq(programActivities.id, dep.toActivityId));

        // Recursively propagate to downstream dependencies
        await propagateDependencies(dep.toActivityId, projectId, visited);
    }
}

// PATCH /api/projects/[projectId]/program/activities/[id] - Update activity
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;
        const body = await request.json();
        const { name, parentId, startDate, endDate, collapsed, sortOrder } = body;

        // Build update object with only provided fields
        const updates: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (name !== undefined) updates.name = name.trim();
        if (parentId !== undefined) updates.parentId = parentId;
        if (startDate !== undefined) updates.startDate = startDate;
        if (endDate !== undefined) updates.endDate = endDate;
        if (collapsed !== undefined) updates.collapsed = collapsed;
        if (sortOrder !== undefined) updates.sortOrder = sortOrder;

        await db
            .update(programActivities)
            .set(updates)
            .where(eq(programActivities.id, id));

        // If dates were changed, propagate to dependent activities (floating activities)
        if (startDate !== undefined || endDate !== undefined) {
            await propagateDependencies(id, projectId, new Set());
        }

        const updated = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.id, id))
            .limit(1);

        if (!updated[0]) {
            return NextResponse.json(
                { error: 'Activity not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error('Error updating activity:', error);
        return NextResponse.json(
            { error: 'Failed to update activity' },
            { status: 500 }
        );
    }
}

// DELETE /api/projects/[projectId]/program/activities/[id] - Delete activity and children
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { id } = await params;

        // First, get all child activities
        const children = await db
            .select({ id: programActivities.id })
            .from(programActivities)
            .where(eq(programActivities.parentId, id));

        const allIdsToDelete = [id, ...children.map((c) => c.id)];

        // Delete milestones for all activities being deleted
        for (const activityId of allIdsToDelete) {
            await db
                .delete(programMilestones)
                .where(eq(programMilestones.activityId, activityId));
        }

        // Delete dependencies involving these activities
        for (const activityId of allIdsToDelete) {
            await db
                .delete(programDependencies)
                .where(
                    or(
                        eq(programDependencies.fromActivityId, activityId),
                        eq(programDependencies.toActivityId, activityId)
                    )
                );
        }

        // Delete children first
        for (const child of children) {
            await db
                .delete(programActivities)
                .where(eq(programActivities.id, child.id));
        }

        // Delete the parent activity
        await db
            .delete(programActivities)
            .where(eq(programActivities.id, id));

        return NextResponse.json({ success: true, deletedCount: allIdsToDelete.length });
    } catch (error) {
        console.error('Error deleting activity:', error);
        return NextResponse.json(
            { error: 'Failed to delete activity' },
            { status: 500 }
        );
    }
}
