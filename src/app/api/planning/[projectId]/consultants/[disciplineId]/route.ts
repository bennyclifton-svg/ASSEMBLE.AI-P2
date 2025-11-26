import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultantDisciplines } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const toggleSchema = z.object({
    isEnabled: z.boolean(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; disciplineId: string }> }
) {
    try {
        const { projectId, disciplineId } = await params;
        const body = await request.json();
        const { isEnabled } = toggleSchema.parse(body);

        // Update the discipline
        const [updated] = await db
            .update(consultantDisciplines)
            .set({
                isEnabled,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(consultantDisciplines.id, disciplineId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Discipline not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating discipline:', error);
        return NextResponse.json({ error: 'Failed to update discipline' }, { status: 500 });
    }
}
