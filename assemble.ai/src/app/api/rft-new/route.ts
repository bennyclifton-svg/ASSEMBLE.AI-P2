import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { rftNew, rftNewTransmittals } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/rft-new?projectId=X&stakeholderId=Y
 *
 * Get-or-create pattern: Returns the RFT NEW for the given project+stakeholder.
 * If it doesn't exist, creates one automatically.
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

        // Build query conditions
        const conditions = [
            eq(rftNew.projectId, projectId),
            eq(rftNew.stakeholderId, stakeholderId),
        ];

        // Try to find existing RFT NEW
        let [existing] = await db
            .select()
            .from(rftNew)
            .where(and(...conditions))
            .limit(1);

        // If doesn't exist, create it with default date (today)
        if (!existing) {
            const id = uuidv4();
            const defaultRftDate = new Date().toISOString().split('T')[0];
            await db.insert(rftNew).values({
                id,
                projectId,
                stakeholderId,
                rftDate: defaultRftDate,
            });

            [existing] = await db
                .select()
                .from(rftNew)
                .where(eq(rftNew.id, id))
                .limit(1);
        }

        // Count transmittal documents
        const transmittalCount = await db
            .select({ id: rftNewTransmittals.id })
            .from(rftNewTransmittals)
            .where(eq(rftNewTransmittals.rftNewId, existing!.id));

        const result = {
            ...existing,
            transmittalCount: transmittalCount.length,
        };

        return NextResponse.json(result);
    });
}
