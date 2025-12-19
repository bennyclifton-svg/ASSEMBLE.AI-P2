import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultantDisciplines } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = z.object({
    isEnabled: z.boolean().optional(),
    briefServices: z.string().optional(),
    briefDeliverables: z.string().optional(),
    briefFee: z.string().optional(),
    briefProgram: z.string().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; disciplineId: string }> }
) {
    try {
        const { disciplineId } = await params;
        const [discipline] = await db
            .select()
            .from(consultantDisciplines)
            .where(eq(consultantDisciplines.id, disciplineId));

        if (!discipline) {
            return NextResponse.json({ error: 'Discipline not found' }, { status: 404 });
        }

        return NextResponse.json(discipline);
    } catch (error) {
        console.error('Error fetching discipline:', error);
        return NextResponse.json({ error: 'Failed to fetch discipline' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; disciplineId: string }> }
) {
    try {
        const { disciplineId } = await params;
        const body = await request.json();
        const validated = updateSchema.parse(body);

        // Update the discipline
        const [updated] = await db
            .update(consultantDisciplines)
            .set({
                ...validated,
                updatedAt: new Date(),
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
