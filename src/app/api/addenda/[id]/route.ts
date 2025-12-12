import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { addenda, addendumTransmittals, documents, versions, fileAssets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/addenda/[id] - Get single addendum with transmittal documents
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

        // Fetch transmittal documents with details
        const transmittalDocs = await db
            .select({
                id: addendumTransmittals.id,
                documentId: addendumTransmittals.documentId,
                sortOrder: addendumTransmittals.sortOrder,
                createdAt: addendumTransmittals.createdAt,
                versionNumber: versions.versionNumber,
                originalName: fileAssets.originalName,
                sizeBytes: fileAssets.sizeBytes,
            })
            .from(addendumTransmittals)
            .innerJoin(documents, eq(addendumTransmittals.documentId, documents.id))
            .innerJoin(versions, eq(documents.latestVersionId, versions.id))
            .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .where(eq(addendumTransmittals.addendumId, id))
            .orderBy(addendumTransmittals.sortOrder);

        return NextResponse.json({
            ...addendum,
            transmittalDocuments: transmittalDocs,
        });
    });
}

// PUT /api/addenda/[id] - Update addendum content
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const body = await request.json();
        const { content } = body;

        const existing = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .get();

        if (!existing) {
            return NextResponse.json({ error: 'Addendum not found' }, { status: 404 });
        }

        await db
            .update(addenda)
            .set({
                content,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(addenda.id, id));

        const updated = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .get();

        return NextResponse.json(updated);
    });
}

// DELETE /api/addenda/[id] - Delete addendum (cascades to transmittals)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;

        const existing = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .get();

        if (!existing) {
            return NextResponse.json({ error: 'Addendum not found' }, { status: 404 });
        }

        // Delete transmittal links first (cascade should handle this, but be explicit)
        await db
            .delete(addendumTransmittals)
            .where(eq(addendumTransmittals.addendumId, id));

        // Delete the addendum
        await db.delete(addenda).where(eq(addenda.id, id));

        return NextResponse.json({ success: true, id });
    });
}
