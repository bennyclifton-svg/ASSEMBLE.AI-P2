import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { rftNew, rftNewTransmittals } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, max } from 'drizzle-orm';

/**
 * GET /api/rft-new?projectId=X&stakeholderId=Y
 *
 * Returns all RFTs for the given project+stakeholder, ordered by rftNumber.
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
            eq(rftNew.projectId, projectId),
            eq(rftNew.stakeholderId, stakeholderId),
        ];

        // Fetch all RFTs for this stakeholder
        const list = await db
            .select()
            .from(rftNew)
            .where(and(...conditions))
            .orderBy(rftNew.rftNumber);

        // For each RFT, count transmittal documents
        const result = await Promise.all(
            list.map(async (item: typeof list[number]) => {
                const transmittalCount = await db
                    .select({ id: rftNewTransmittals.id })
                    .from(rftNewTransmittals)
                    .where(eq(rftNewTransmittals.rftNewId, item.id));

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
 * POST /api/rft-new - Create new RFT
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

        // Determine next RFT number
        const conditions = [
            eq(rftNew.projectId, projectId),
            eq(rftNew.stakeholderId, stakeholderId),
        ];

        const [existing] = await db
            .select({ maxNum: max(rftNew.rftNumber) })
            .from(rftNew)
            .where(and(...conditions))
            .limit(1);

        const nextNumber = (existing?.maxNum || 0) + 1;

        // Create new RFT
        const id = uuidv4();
        const defaultRftDate = new Date().toISOString().split('T')[0];

        await db.insert(rftNew).values({
            id,
            projectId,
            stakeholderId,
            rftNumber: nextNumber,
            rftDate: defaultRftDate,
        });

        const [created] = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .limit(1);

        return NextResponse.json(created);
    });
}
