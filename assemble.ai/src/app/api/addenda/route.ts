import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { addenda, addendumTransmittals, documents, versions, fileAssets } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, max } from 'drizzle-orm';

// GET /api/addenda?projectId=X&stakeholderId=Y
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
            eq(addenda.projectId, projectId),
            eq(addenda.stakeholderId, stakeholderId),
        ];

        // Fetch all addenda for this stakeholder
        const list = await db
            .select()
            .from(addenda)
            .where(and(...conditions))
            .orderBy(addenda.addendumNumber);

        // For each addendum, count transmittal documents
        const result = await Promise.all(
            list.map(async (item: typeof list[number]) => {
                const transmittalCount = await db
                    .select({ id: addendumTransmittals.id })
                    .from(addendumTransmittals)
                    .where(eq(addendumTransmittals.addendumId, item.id));

                return {
                    ...item,
                    transmittalCount: transmittalCount.length,
                };
            })
        );

        return NextResponse.json(result);
    });
}

// POST /api/addenda - Create new addendum
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

        // Determine next addendum number
        const conditions = [
            eq(addenda.projectId, projectId),
            eq(addenda.stakeholderId, stakeholderId),
        ];

        const [existing] = await db
            .select({ maxNum: max(addenda.addendumNumber) })
            .from(addenda)
            .where(and(...conditions))
            .limit(1);

        const nextNumber = (existing?.maxNum || 0) + 1;

        // Create new addendum
        const id = uuidv4();
        await db.insert(addenda).values({
            id,
            projectId,
            stakeholderId,
            addendumNumber: nextNumber,
            content: '',
        });

        const [created] = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .limit(1);

        return NextResponse.json(created);
    });
}
