import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { disciplineFeeItems, consultantDisciplines } from '@/lib/db';
import { eq, asc, max } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/consultants/disciplines/[id]/fee-items - List fee items for discipline
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: disciplineId } = await params;

    try {
        // Verify discipline exists
        const discipline = await db.query.consultantDisciplines.findFirst({
            where: eq(consultantDisciplines.id, disciplineId),
        });

        if (!discipline) {
            return NextResponse.json({ error: 'Discipline not found' }, { status: 404 });
        }

        // Get all fee items for this discipline, ordered by sortOrder
        const items = await db.query.disciplineFeeItems.findMany({
            where: eq(disciplineFeeItems.disciplineId, disciplineId),
            orderBy: [asc(disciplineFeeItems.sortOrder)],
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching fee items:', error);
        return NextResponse.json({ error: 'Failed to fetch fee items' }, { status: 500 });
    }
}

// POST /api/consultants/disciplines/[id]/fee-items - Create fee item
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: disciplineId } = await params;

    try {
        const body = await request.json();
        const { description } = body;

        if (!description || typeof description !== 'string') {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        // Verify discipline exists
        const discipline = await db.query.consultantDisciplines.findFirst({
            where: eq(consultantDisciplines.id, disciplineId),
        });

        if (!discipline) {
            return NextResponse.json({ error: 'Discipline not found' }, { status: 404 });
        }

        // Get max sort order for this discipline
        const maxOrderResult = await db.select({ maxOrder: max(disciplineFeeItems.sortOrder) })
            .from(disciplineFeeItems)
            .where(eq(disciplineFeeItems.disciplineId, disciplineId));

        const nextSortOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

        // Create new fee item
        const newItem = await db.insert(disciplineFeeItems)
            .values({
                id: nanoid(),
                disciplineId,
                description: description.trim(),
                sortOrder: nextSortOrder,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .returning();

        return NextResponse.json(newItem[0], { status: 201 });
    } catch (error) {
        console.error('Error creating fee item:', error);
        return NextResponse.json({ error: 'Failed to create fee item' }, { status: 500 });
    }
}

// PUT /api/consultants/disciplines/[id]/fee-items - Reorder fee items
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: disciplineId } = await params;

    try {
        const body = await request.json();
        const { itemIds } = body;

        if (!Array.isArray(itemIds)) {
            return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 });
        }

        // Update sort orders based on array position
        for (let i = 0; i < itemIds.length; i++) {
            await db.update(disciplineFeeItems)
                .set({
                    sortOrder: i,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(disciplineFeeItems.id, itemIds[i]));
        }

        // Return updated items
        const items = await db.query.disciplineFeeItems.findMany({
            where: eq(disciplineFeeItems.disciplineId, disciplineId),
            orderBy: [asc(disciplineFeeItems.sortOrder)],
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error('Error reordering fee items:', error);
        return NextResponse.json({ error: 'Failed to reorder fee items' }, { status: 500 });
    }
}
