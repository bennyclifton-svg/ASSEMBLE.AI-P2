import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { rftNew } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/rft-new/[id] - Get a single RFT NEW report
 *
 * Note: RFT NEW reports are not deletable as there is one per discipline/trade.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return handleApiError(async () => {
        const { id } = params;

        const report = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .get();

        if (!report) {
            return NextResponse.json({ error: 'RFT NEW not found' }, { status: 404 });
        }

        return NextResponse.json(report);
    });
}
