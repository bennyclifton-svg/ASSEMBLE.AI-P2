import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { rftNew, rftNewTransmittals, documents, versions, fileAssets, categories, subcategories } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

// GET /api/rft-new/[id]/transmittal - Get all documents in the transmittal
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        // Verify RFT NEW exists
        const [report] = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .limit(1);

        if (!report) {
            return NextResponse.json({ error: 'RFT NEW not found' }, { status: 404 });
        }

        // Fetch transmittal items with document details including category/subcategory
        const transmittalItems = await db
            .select({
                id: rftNewTransmittals.id,
                documentId: rftNewTransmittals.documentId,
                categoryId: documents.categoryId,
                subcategoryId: documents.subcategoryId,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                fileName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                uploadedAt: versions.createdAt,
                addedAt: rftNewTransmittals.addedAt,
            })
            .from(rftNewTransmittals)
            .innerJoin(documents, eq(rftNewTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(rftNewTransmittals.rftNewId, id))
            .orderBy(rftNewTransmittals.addedAt);

        // Transform result to handle potential nulls from left joins
        const result = transmittalItems.map((item) => ({
            ...item,
            fileName: item.fileName || 'Unknown',
            versionNumber: item.versionNumber || 0,
            uploadedAt: item.uploadedAt || null,
        }));

        return NextResponse.json(result);
    });
}

// POST /api/rft-new/[id]/transmittal - Save documents to transmittal
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const body = await request.json();
        const { documentIds } = body;

        if (!Array.isArray(documentIds)) {
            return NextResponse.json({ error: 'documentIds must be an array' }, { status: 400 });
        }

        // Verify RFT NEW exists
        const [report2] = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .limit(1);

        if (!report2) {
            return NextResponse.json({ error: 'RFT NEW not found' }, { status: 404 });
        }

        // Delete existing transmittal items
        await db
            .delete(rftNewTransmittals)
            .where(eq(rftNewTransmittals.rftNewId, id));

        // Insert new transmittal items
        if (documentIds.length > 0) {
            const items = documentIds.map((documentId) => ({
                id: uuidv4(),
                rftNewId: id,
                documentId,
            }));

            await db.insert(rftNewTransmittals).values(items);
        }

        return NextResponse.json({
            success: true,
            count: documentIds.length,
            message: `Saved ${documentIds.length} document(s) to transmittal`,
        });
    });
}
