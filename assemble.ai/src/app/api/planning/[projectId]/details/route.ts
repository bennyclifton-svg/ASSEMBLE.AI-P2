import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectDetails, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { projectDetailsSchema } from '@/lib/validations/planning-schema';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();

        console.log('PUT /api/planning/[projectId]/details - projectId:', projectId);
        console.log('PUT /api/planning/[projectId]/details - body:', body);

        // Validate input
        const validated = projectDetailsSchema.parse(body);

        // Check if details exist
        const [existing] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));

        if (existing) {
            // Update existing
            await db.update(projectDetails)
                .set({
                    ...validated,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(projectDetails.projectId, projectId));
        } else {
            // Create new
            await db.insert(projectDetails).values({
                id: crypto.randomUUID(),
                projectId,
                ...validated,
            });
        }

        // Also update the main projects table name if projectName changed
        if (validated.projectName) {
            await db.update(projects)
                .set({
                    name: validated.projectName,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(projects.id, projectId));
        }

        const [updated] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating project details:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        return NextResponse.json(
            {
                error: 'Failed to update project details',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
