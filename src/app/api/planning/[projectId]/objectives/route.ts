import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectObjectives } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { projectObjectivesSchema } from '@/lib/validations/planning-schema';

export async function PUT(
    request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    try {
        const { projectId } = params;
        const body = await request.json();

        const validated = projectObjectivesSchema.parse(body);

        const [existing] = await db.select().from(projectObjectives).where(eq(projectObjectives.projectId, projectId));

        if (existing) {
            await db.update(projectObjectives)
                .set({
                    ...validated,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(projectObjectives.projectId, projectId));
        } else {
            await db.insert(projectObjectives).values({
                id: crypto.randomUUID(),
                projectId,
                ...validated,
            });
        }

        const [updated] = await db.select().from(projectObjectives).where(eq(projectObjectives.projectId, projectId));
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating project objectives:', error);
        return NextResponse.json(
            { error: 'Failed to update project objectives' },
            { status: 500 }
        );
    }
}
