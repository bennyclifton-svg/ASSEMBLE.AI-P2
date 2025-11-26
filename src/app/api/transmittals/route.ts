import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { transmittals, subcategories, documents, transmittalItems } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, inArray } from 'drizzle-orm';

export async function GET() {
    return handleApiError(async () => {
        const list = await db.select({
            id: transmittals.id,
            name: transmittals.name,
            status: transmittals.status,
            issuedAt: transmittals.issuedAt,
            createdAt: transmittals.createdAt,
            subcategoryName: subcategories.name,
        })
            .from(transmittals)
            .leftJoin(subcategories, eq(transmittals.subcategoryId, subcategories.id))
            .orderBy(desc(transmittals.createdAt));

        return NextResponse.json(list);
    });
}

export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        const body = await request.json();
        const { name, subcategoryId, documentIds } = body;

        if (!name || !subcategoryId) {
            return NextResponse.json({ error: 'Name and Subcategory are required' }, { status: 400 });
        }

        const id = uuidv4();

        // Transactional insert would be better, but for now sequential
        await db.insert(transmittals).values({
            id,
            name,
            subcategoryId,
            status: 'DRAFT',
        });

        if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
            // We need to find the LATEST version for each document to add to the transmittal
            const docs = await db.select({
                id: documents.id,
                latestVersionId: documents.latestVersionId
            })
                .from(documents)
                .where(inArray(documents.id, documentIds));

            const itemsToInsert = docs
                .filter(d => d.latestVersionId)
                .map(d => ({
                    id: uuidv4(),
                    transmittalId: id,
                    versionId: d.latestVersionId!,
                }));

            if (itemsToInsert.length > 0) {
                await db.insert(transmittalItems).values(itemsToInsert);
            }
        }

        return NextResponse.json({ success: true, id });
    });
}
