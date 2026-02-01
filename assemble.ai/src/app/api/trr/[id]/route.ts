/**
 * TRR (Tender Recommendation Report) API Route - Individual TRR
 * Feature 012 - TRR Report
 *
 * GET /api/trr/[id] - Get a specific TRR
 * PUT /api/trr/[id] - Update a TRR
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { trr, trrTransmittals } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;

        const [existing] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        return NextResponse.json(existing);
    });
}

export async function PUT(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;
        const body = await request.json();

        // Validate TRR exists
        const [existing2] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (!existing2) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        // Update only the fields that are provided
        const updateData: Record<string, unknown> = {
            updatedAt: sql`CURRENT_TIMESTAMP`,
        };

        if (body.executiveSummary !== undefined) {
            updateData.executiveSummary = body.executiveSummary;
        }
        if (body.clarifications !== undefined) {
            updateData.clarifications = body.clarifications;
        }
        if (body.recommendation !== undefined) {
            updateData.recommendation = body.recommendation;
        }
        if (body.reportDate !== undefined) {
            updateData.reportDate = body.reportDate;
        }

        await db
            .update(trr)
            .set(updateData)
            .where(eq(trr.id, id));

        // Fetch and return the updated TRR
        const [updated] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        return NextResponse.json(updated);
    });
}

/**
 * DELETE /api/trr/[id] - Delete TRR (cascades to transmittals)
 */
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;

        const [existing] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        // Delete transmittal links first (cascade should handle this, but be explicit)
        await db
            .delete(trrTransmittals)
            .where(eq(trrTransmittals.trrId, id));

        // Delete the TRR
        await db.delete(trr).where(eq(trr.id, id));

        return NextResponse.json({ success: true, id });
    });
}
