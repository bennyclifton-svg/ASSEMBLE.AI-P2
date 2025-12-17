import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { disciplineFeeItems } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// PUT /api/consultants/disciplines/[id]/fee-items/[itemId] - Update fee item
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { id: disciplineId, itemId } = await params;

    try {
        const body = await request.json();
        const { description } = body;

        if (!description || typeof description !== 'string') {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        // Update fee item
        const updated = await db.update(disciplineFeeItems)
            .set({
                description: description.trim(),
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(disciplineFeeItems.id, itemId),
                    eq(disciplineFeeItems.disciplineId, disciplineId)
                )
            )
            .returning();

        if (!updated.length) {
            return NextResponse.json({ error: 'Fee item not found' }, { status: 404 });
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error('Error updating fee item:', error);
        return NextResponse.json({ error: 'Failed to update fee item' }, { status: 500 });
    }
}

// DELETE /api/consultants/disciplines/[id]/fee-items/[itemId] - Delete fee item
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { id: disciplineId, itemId } = await params;

    try {
        const deleted = await db.delete(disciplineFeeItems)
            .where(
                and(
                    eq(disciplineFeeItems.id, itemId),
                    eq(disciplineFeeItems.disciplineId, disciplineId)
                )
            )
            .returning();

        if (!deleted.length) {
            return NextResponse.json({ error: 'Fee item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting fee item:', error);
        return NextResponse.json({ error: 'Failed to delete fee item' }, { status: 500 });
    }
}
