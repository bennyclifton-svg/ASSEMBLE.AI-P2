import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectDetails, projects } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { projectDetailsSchema } from '@/lib/validations/planning-schema';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Try to get project details
        const [details] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));

        if (details) {
            return NextResponse.json(details);
        }

        // Fall back to project name if no details exist
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

        if (project) {
            return NextResponse.json({
                projectId,
                projectName: project.name,
                address: '',
            });
        }

        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    } catch (error) {
        console.error('Error fetching project details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch project details' },
            { status: 500 }
        );
    }
}

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

        // Convert empty strings to null for integer fields (PostgreSQL requirement)
        const sanitized = {
            ...validated,
            lotArea: validated.lotArea === '' || validated.lotArea === undefined ? null :
                     typeof validated.lotArea === 'string' ? parseInt(validated.lotArea, 10) : validated.lotArea,
            numberOfStories: validated.numberOfStories === '' || validated.numberOfStories === undefined ? null :
                            typeof validated.numberOfStories === 'string' ? parseInt(validated.numberOfStories, 10) : validated.numberOfStories,
        };

        // Check if details exist
        const [existing] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));

        if (existing) {
            // Update existing
            await db.update(projectDetails)
                .set({
                    ...sanitized,
                    updatedAt: new Date(),
                })
                .where(eq(projectDetails.projectId, projectId));
        } else {
            // Create new
            await db.insert(projectDetails).values({
                id: crypto.randomUUID(),
                projectId,
                ...sanitized,
            });
        }

        // Also update the main projects table name if projectName changed
        if (sanitized.projectName) {
            await db.update(projects)
                .set({
                    name: sanitized.projectName,
                    updatedAt: new Date(),
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
