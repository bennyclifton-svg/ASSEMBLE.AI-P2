import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultantDisciplines } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();
        const { isEnabled, briefServices, briefFee, briefProgram } = body;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        if (typeof isEnabled === 'boolean') {
            updateData.isEnabled = isEnabled;
        }
        if (briefServices !== undefined) {
            updateData.briefServices = briefServices;
        }
        if (briefFee !== undefined) {
            updateData.briefFee = briefFee;
        }
        if (briefProgram !== undefined) {
            updateData.briefProgram = briefProgram;
        }

        const updated = await db.update(consultantDisciplines)
            .set(updateData)
            .where(eq(consultantDisciplines.id, id))
            .returning();

        if (!updated.length) {
            return NextResponse.json({ error: 'Discipline not found' }, { status: 404 });
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error('Error updating consultant discipline:', error);
        return NextResponse.json({ error: 'Failed to update discipline' }, { status: 500 });
    }
}
