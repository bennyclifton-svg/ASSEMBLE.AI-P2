/**
 * TRR (Tender Recommendation Report) API Route
 * Feature 012 - TRR Report
 *
 * GET /api/trr?projectId=X&stakeholderId=Y - Get all TRRs for stakeholder
 * POST /api/trr - Create new TRR
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { trr, trrTransmittals } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, max } from 'drizzle-orm';

/**
 * GET /api/trr?projectId=X&stakeholderId=Y
 *
 * Returns all TRRs for the given project+stakeholder, ordered by trrNumber.
 */
export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const stakeholderId = searchParams.get('stakeholderId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        if (!stakeholderId) {
            return NextResponse.json({ error: 'stakeholderId is required' }, { status: 400 });
        }

        const conditions = [
            eq(trr.projectId, projectId),
            eq(trr.stakeholderId, stakeholderId),
        ];

        // Fetch all TRRs for this stakeholder
        const list = await db
            .select()
            .from(trr)
            .where(and(...conditions))
            .orderBy(trr.trrNumber);

        // For each TRR, count transmittal documents
        const result = await Promise.all(
            list.map(async (item: typeof list[number]) => {
                const transmittalCount = await db
                    .select({ id: trrTransmittals.id })
                    .from(trrTransmittals)
                    .where(eq(trrTransmittals.trrId, item.id));

                return {
                    ...item,
                    transmittalCount: transmittalCount.length,
                };
            })
        );

        return NextResponse.json(result);
    });
}

/**
 * POST /api/trr - Create new TRR
 */
export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        const body = await request.json();
        const { projectId, stakeholderId } = body;

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        if (!stakeholderId) {
            return NextResponse.json({ error: 'stakeholderId is required' }, { status: 400 });
        }

        // Determine next TRR number
        const conditions = [
            eq(trr.projectId, projectId),
            eq(trr.stakeholderId, stakeholderId),
        ];

        const [existing] = await db
            .select({ maxNum: max(trr.trrNumber) })
            .from(trr)
            .where(and(...conditions))
            .limit(1);

        const nextNumber = (existing?.maxNum || 0) + 1;

        // Create new TRR
        const id = uuidv4();
        const today = new Date().toISOString().split('T')[0];

        await db.insert(trr).values({
            id,
            projectId,
            stakeholderId,
            trrNumber: nextNumber,
            reportDate: today,
        });

        const [created] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        return NextResponse.json(created);
    });
}
