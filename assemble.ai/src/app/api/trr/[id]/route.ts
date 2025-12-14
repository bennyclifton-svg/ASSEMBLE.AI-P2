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
import { trr } from '@/lib/db/schema';
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

        const existing = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .get();

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
        const existing = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .get();

        if (!existing) {
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
        const updated = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .get();

        return NextResponse.json(updated);
    });
}
