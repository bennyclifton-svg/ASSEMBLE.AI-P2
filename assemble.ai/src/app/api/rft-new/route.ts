import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { rftNew, rftNewTransmittals } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * GET /api/rft-new?projectId=X&disciplineId=Y or tradeId=Z
 *
 * Get-or-create pattern: Returns the RFT NEW for the given project+discipline/trade.
 * If it doesn't exist, creates one automatically.
 */
export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const disciplineId = searchParams.get('disciplineId');
        const tradeId = searchParams.get('tradeId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        if (!disciplineId && !tradeId) {
            return NextResponse.json({ error: 'disciplineId or tradeId is required' }, { status: 400 });
        }

        // Build query conditions
        const conditions = [eq(rftNew.projectId, projectId)];

        if (disciplineId) {
            conditions.push(eq(rftNew.disciplineId, disciplineId));
            conditions.push(isNull(rftNew.tradeId));
        } else if (tradeId) {
            conditions.push(eq(rftNew.tradeId, tradeId));
            conditions.push(isNull(rftNew.disciplineId));
        }

        // Try to find existing RFT NEW
        let existing = await db
            .select()
            .from(rftNew)
            .where(and(...conditions))
            .get();

        // If doesn't exist, create it with default date (today)
        if (!existing) {
            const id = uuidv4();
            const defaultRftDate = new Date().toISOString().split('T')[0];
            await db.insert(rftNew).values({
                id,
                projectId,
                disciplineId: disciplineId || null,
                tradeId: tradeId || null,
                rftDate: defaultRftDate,
            });

            existing = await db
                .select()
                .from(rftNew)
                .where(eq(rftNew.id, id))
                .get();
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
