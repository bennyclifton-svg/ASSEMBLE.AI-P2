import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { costLines, consultantDisciplines } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { UpdateCostLineInput } from '@/types/cost-plan';

/**
 * GET /api/projects/[projectId]/cost-lines/[id]
 * Get a single cost line
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;

        const [costLine] = await db
            .select()
            .from(costLines)
            .where(
                and(
                    eq(costLines.id, id),
                    eq(costLines.projectId, projectId),
                    isNull(costLines.deletedAt)
                )
            );

        if (!costLine) {
            return NextResponse.json(
                { error: 'Cost line not found' },
                { status: 404 }
            );
        }

        // Fetch discipline if present
        let discipline = null;
        if (costLine.disciplineId) {
            const [disc] = await db
                .select()
                .from(consultantDisciplines)
                .where(eq(consultantDisciplines.id, costLine.disciplineId));
            discipline = disc || null;
        }

        return NextResponse.json({ ...costLine, discipline });
    } catch (error) {
        console.error('Error fetching cost line:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cost line' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/projects/[projectId]/cost-lines/[id]
 * Update a cost line
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;
        const body: UpdateCostLineInput = await request.json();

        // Check if cost line exists
        const [existing] = await db
            .select()
            .from(costLines)
            .where(
                and(
                    eq(costLines.id, id),
                    eq(costLines.projectId, projectId),
                    isNull(costLines.deletedAt)
                )
            );

        if (!existing) {
            return NextResponse.json(
                { error: 'Cost line not found' },
                { status: 404 }
            );
        }

        const now = new Date().toISOString();

        // Build update object
        const updateData: Record<string, unknown> = {
            updatedAt: now,
        };

        if (body.disciplineId !== undefined) updateData.disciplineId = body.disciplineId;
        if (body.tradeId !== undefined) updateData.tradeId = body.tradeId;
        if (body.section !== undefined) updateData.section = body.section;
        if (body.costCode !== undefined) updateData.costCode = body.costCode;
        if (body.activity !== undefined) updateData.activity = body.activity;
        if (body.reference !== undefined) updateData.reference = body.reference;
        if (body.budgetCents !== undefined) updateData.budgetCents = body.budgetCents;
        if (body.approvedContractCents !== undefined) updateData.approvedContractCents = body.approvedContractCents;
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

        await db
            .update(costLines)
            .set(updateData)
            .where(eq(costLines.id, id));

        // Return updated cost line
        const [updated] = await db
            .select()
            .from(costLines)
            .where(eq(costLines.id, id));

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating cost line:', error);
        return NextResponse.json(
            { error: 'Failed to update cost line' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/projects/[projectId]/cost-lines/[id]
 * Soft delete a cost line
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;

        // Check if cost line exists
        const [existing] = await db
            .select()
            .from(costLines)
            .where(
                and(
                    eq(costLines.id, id),
                    eq(costLines.projectId, projectId),
                    isNull(costLines.deletedAt)
                )
            );

        if (!existing) {
            return NextResponse.json(
                { error: 'Cost line not found' },
                { status: 404 }
            );
        }

        const now = new Date().toISOString();

        // Soft delete
        await db
            .update(costLines)
            .set({
                deletedAt: now,
                updatedAt: now,
            })
            .where(eq(costLines.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting cost line:', error);
        return NextResponse.json(
            { error: 'Failed to delete cost line' },
            { status: 500 }
        );
    }
}
