/**
 * TRR (Tender Recommendation Report) API Route
 * Feature 012 - TRR Report
 *
 * GET /api/trr?projectId=X&stakeholderId=Y
 * Get-or-create pattern: Returns the TRR for the given project+stakeholder.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { trr, trrTransmittals } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';

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

        // Build query conditions
        const conditions = [
            eq(trr.projectId, projectId),
            eq(trr.stakeholderId, stakeholderId),
        ];

        // Try to find existing TRR
        let [existing] = await db
            .select()
            .from(trr)
            .where(and(...conditions))
            .limit(1);

        // If doesn't exist, create it with today's date as default
        if (!existing) {
            const id = uuidv4();
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

            await db.insert(trr).values({
                id,
                projectId,
                stakeholderId,
                reportDate: today,
            });

            [existing] = await db
                .select()
                .from(trr)
                .where(eq(trr.id, id))
                .limit(1);
        }

        // Count transmittal documents
        const transmittalCount = await db
            .select({ id: trrTransmittals.id })
            .from(trrTransmittals)
            .where(eq(trrTransmittals.trrId, existing!.id));

        const result = {
            ...existing,
            transmittalCount: transmittalCount.length,
        };

        return NextResponse.json(result);
    });
}
