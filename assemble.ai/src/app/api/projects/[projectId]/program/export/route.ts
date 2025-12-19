import { NextRequest, NextResponse } from 'next/server';
import { db, programActivities, programMilestones, projects } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { exportProgramToPDF } from '@/lib/export/program-pdf';

// GET /api/projects/[projectId]/program/export - Export program to PDF
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Get project info
        const project = await db
            .select()
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);

        if (!project[0]) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Get activities
        const activities = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId));

        // Get milestones
        const milestones = await db
            .select()
            .from(programMilestones);

        // Filter milestones to only those belonging to this project's activities
        const activityIds = new Set(activities.map((a) => a.id));
        const projectMilestones = milestones.filter((m) => activityIds.has(m.activityId));

        // Export to PDF
        const pdfBuffer = await exportProgramToPDF({
            activities: activities.map((a) => ({
                id: a.id,
                name: a.name,
                parentId: a.parentId,
                startDate: a.startDate,
                endDate: a.endDate,
                color: a.color,
            })),
            milestones: projectMilestones.map((m) => ({
                id: m.id,
                activityId: m.activityId,
                name: m.name,
                date: m.date,
            })),
            projectName: project[0].name,
        });

        // Return PDF
        const filename = `${project[0].name.replace(/[^a-zA-Z0-9]/g, '_')}_Program_${new Date().toISOString().split('T')[0]}.pdf`;

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error exporting program:', error);
        return NextResponse.json(
            { error: 'Failed to export program' },
            { status: 500 }
        );
    }
}
