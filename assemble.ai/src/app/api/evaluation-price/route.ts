import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { evaluationPrice, evaluationRows, evaluationCells } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, max } from 'drizzle-orm';

/**
 * GET /api/evaluation-price?projectId=X&stakeholderId=Y
 *
 * Returns all evaluation price instances for the given project+stakeholder, ordered by evaluationPriceNumber.
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
            eq(evaluationPrice.projectId, projectId),
            eq(evaluationPrice.stakeholderId, stakeholderId),
        ];

        // Fetch all evaluation price instances for this stakeholder
        const list = await db
            .select()
            .from(evaluationPrice)
            .where(and(...conditions))
            .orderBy(evaluationPrice.evaluationPriceNumber);

        // For each evaluation price, count rows (as a status indicator)
        const result = await Promise.all(
            list.map(async (item: typeof list[number]) => {
                const rowCount = await db
                    .select({ id: evaluationRows.id })
                    .from(evaluationRows)
                    .where(eq(evaluationRows.evaluationPriceId, item.id));

                return {
                    ...item,
                    rowCount: rowCount.length,
                };
            })
        );

        return NextResponse.json(result);
    });
}

/**
 * POST /api/evaluation-price - Create new evaluation price instance
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

        // Determine next evaluation price number
        const conditions = [
            eq(evaluationPrice.projectId, projectId),
            eq(evaluationPrice.stakeholderId, stakeholderId),
        ];

        const [existing] = await db
            .select({ maxNum: max(evaluationPrice.evaluationPriceNumber) })
            .from(evaluationPrice)
            .where(and(...conditions))
            .limit(1);

        const nextNumber = (existing?.maxNum || 0) + 1;

        // Create new evaluation price instance
        const id = uuidv4();

        await db.insert(evaluationPrice).values({
            id,
            projectId,
            stakeholderId,
            evaluationPriceNumber: nextNumber,
        });

        const [created] = await db
            .select()
            .from(evaluationPrice)
            .where(eq(evaluationPrice.id, id))
            .limit(1);

        return NextResponse.json(created);
    });
}
