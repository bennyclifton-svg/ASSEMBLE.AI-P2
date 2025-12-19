import { NextRequest, NextResponse } from 'next/server';
import { db, programActivities, programDependencies, programMilestones } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import type { ProgramData } from '@/types/program';

// GET /api/projects/[projectId]/program - List all program data
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Fetch all activities for the project
        const activities = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId))
            .orderBy(asc(programActivities.sortOrder));

        // Fetch all dependencies for the project
        const dependencies = await db
            .select()
            .from(programDependencies)
            .where(eq(programDependencies.projectId, projectId));

        // Fetch all milestones for activities in this project
        const activityIds = activities.map((a) => a.id);
        let milestones: typeof programMilestones.$inferSelect[] = [];

        if (activityIds.length > 0) {
            // Fetch milestones for all activities
            const allMilestones = await db.select().from(programMilestones);
            milestones = allMilestones.filter((m) => activityIds.includes(m.activityId));
        }

        const data: ProgramData = {
            activities: activities.map((a) => ({
                id: a.id,
                projectId: a.projectId,
                parentId: a.parentId,
                name: a.name,
                startDate: a.startDate,
                endDate: a.endDate,
                collapsed: a.collapsed ?? false,
                color: a.color,
                sortOrder: a.sortOrder,
                createdAt: a.createdAt ?? new Date().toISOString(),
                updatedAt: a.updatedAt ?? new Date().toISOString(),
            })),
            dependencies: dependencies.map((d) => ({
                id: d.id,
                projectId: d.projectId,
                fromActivityId: d.fromActivityId,
                toActivityId: d.toActivityId,
                type: d.type as 'FS' | 'SS' | 'FF',
                createdAt: d.createdAt ?? new Date().toISOString(),
            })),
            milestones: milestones.map((m) => ({
                id: m.id,
                activityId: m.activityId,
                name: m.name,
                date: m.date,
                sortOrder: m.sortOrder,
                createdAt: m.createdAt ?? new Date().toISOString(),
            })),
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching program data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch program data' },
            { status: 500 }
        );
    }
}
