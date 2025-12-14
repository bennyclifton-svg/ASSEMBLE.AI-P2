import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { addenda, addendumTransmittals, documents, versions, fileAssets, categories, subcategories } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, inArray } from 'drizzle-orm';

// GET /api/addenda/[id]/transmittal - Get transmittal documents for addendum
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        const addendum = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .get();

        if (!addendum) {
            return NextResponse.json({ error: 'Addendum not found' }, { status: 404 });
        }

        // Fetch transmittal documents with details including category/subcategory
        const transmittalDocs = await db
            .select({
                id: addendumTransmittals.id,
                documentId: addendumTransmittals.documentId,
                sortOrder: addendumTransmittals.sortOrder,
                createdAt: addendumTransmittals.createdAt,
                versionNumber: versions.versionNumber,
                originalName: fileAssets.originalName,
                sizeBytes: fileAssets.sizeBytes,
                categoryId: documents.categoryId,
                categoryName: categories.name,
                subcategoryId: documents.subcategoryId,
                subcategoryName: subcategories.name,
            })
            .from(addendumTransmittals)
            .innerJoin(documents, eq(addendumTransmittals.documentId, documents.id))
            .innerJoin(versions, eq(documents.latestVersionId, versions.id))
            .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(addendumTransmittals.addendumId, id))
            .orderBy(addendumTransmittals.sortOrder);

        return NextResponse.json({
            addendumId: id,
            documents: transmittalDocs,
            count: transmittalDocs.length,
        });
    });
}

// POST /api/addenda/[id]/transmittal - Save transmittal (replace all documents)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const body = await request.json();
        const { documentIds } = body;

        if (!documentIds || !Array.isArray(documentIds)) {
            return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 });
        }

        const addendum = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .get();

        if (!addendum) {
            return NextResponse.json({ error: 'Addendum not found' }, { status: 404 });
        }

        // Clear existing transmittal documents
        await db
            .delete(addendumTransmittals)
            .where(eq(addendumTransmittals.addendumId, id));

        // Add new documents
        if (documentIds.length > 0) {
            // Verify documents exist
            const validDocs = await db
                .select({ id: documents.id })
                .from(documents)
                .where(inArray(documents.id, documentIds));

            const validDocIds = new Set(validDocs.map(d => d.id));

            const itemsToInsert = documentIds
                .filter((docId: string) => validDocIds.has(docId))
                .map((docId: string, index: number) => ({
                    id: uuidv4(),
                    addendumId: id,
                    documentId: docId,
                    sortOrder: index,
                }));

            if (itemsToInsert.length > 0) {
                await db.insert(addendumTransmittals).values(itemsToInsert);
            }

            return NextResponse.json({
                success: true,
                addendumId: id,
                documentCount: itemsToInsert.length,
            });
        }

        return NextResponse.json({
            success: true,
            addendumId: id,
            documentCount: 0,
        });
    });
}

// DELETE /api/addenda/[id]/transmittal - Clear all transmittal documents
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        const addendum = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .get();

        if (!addendum) {
            return NextResponse.json({ error: 'Addendum not found' }, { status: 404 });
        }

        await db
            .delete(addendumTransmittals)
            .where(eq(addendumTransmittals.addendumId, id));

        return NextResponse.json({
            success: true,
            addendumId: id,
        });
    });
}
