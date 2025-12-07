import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variations } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { UpdateVariationInput } from '@/types/variation';

/**
 * GET /api/projects/[projectId]/variations/[id]
 * Get a single variation
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;

        const [variation] = await db
            .select()
            .from(variations)
            .where(
                and(
                    eq(variations.id, id),
                    eq(variations.projectId, projectId),
                    isNull(variations.deletedAt)
                )
            );

        if (!variation) {
            return NextResponse.json(
                { error: 'Variation not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(variation);
    } catch (error) {
        console.error('Error fetching variation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch variation' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/projects/[projectId]/variations/[id]
 * Update a variation
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;
        const body: UpdateVariationInput = await request.json();

        const [existing] = await db
            .select()
            .from(variations)
            .where(
                and(
                    eq(variations.id, id),
                    eq(variations.projectId, projectId),
                    isNull(variations.deletedAt)
                )
            );

        if (!existing) {
            return NextResponse.json(
                { error: 'Variation not found' },
                { status: 404 }
            );
        }

        const now = new Date().toISOString();

        const updateData: Record<string, unknown> = {
            updatedAt: now,
        };

        if (body.costLineId !== undefined) updateData.costLineId = body.costLineId;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.amountForecastCents !== undefined) updateData.amountForecastCents = body.amountForecastCents;
        if (body.amountApprovedCents !== undefined) updateData.amountApprovedCents = body.amountApprovedCents;
        if (body.dateSubmitted !== undefined) updateData.dateSubmitted = body.dateSubmitted;
        if (body.dateApproved !== undefined) updateData.dateApproved = body.dateApproved;
        if (body.requestedBy !== undefined) updateData.requestedBy = body.requestedBy;
        if (body.approvedBy !== undefined) updateData.approvedBy = body.approvedBy;

        await db
            .update(variations)
            .set(updateData)
            .where(eq(variations.id, id));

        const [updated] = await db
            .select()
            .from(variations)
            .where(eq(variations.id, id));

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating variation:', error);
        return NextResponse.json(
            { error: 'Failed to update variation' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/projects/[projectId]/variations/[id]
 * Soft delete a variation
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;

        const [existing] = await db
            .select()
            .from(variations)
            .where(
                and(
                    eq(variations.id, id),
                    eq(variations.projectId, projectId),
                    isNull(variations.deletedAt)
                )
            );

        if (!existing) {
            return NextResponse.json(
                { error: 'Variation not found' },
                { status: 404 }
            );
        }

        const now = new Date().toISOString();

        await db
            .update(variations)
            .set({
                deletedAt: now,
                updatedAt: now,
            })
            .where(eq(variations.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting variation:', error);
        return NextResponse.json(
            { error: 'Failed to delete variation' },
            { status: 500 }
        );
    }
}
