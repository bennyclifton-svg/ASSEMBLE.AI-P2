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
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        const [report] = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .limit(1);

        if (!report) {
            return NextResponse.json({ error: 'RFT NEW not found' }, { status: 404 });
        }

        return NextResponse.json(report);
    });
}

/**
 * PUT /api/rft-new/[id] - Update RFT NEW report (e.g., rftDate)
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const body = await request.json();
        const { rftDate } = body;

        const [existing] = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'RFT NEW not found' }, { status: 404 });
        }

        await db
            .update(rftNew)
            .set({
                rftDate,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(rftNew.id, id));

        const [updated] = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .limit(1);

        return NextResponse.json(updated);
    });
}
