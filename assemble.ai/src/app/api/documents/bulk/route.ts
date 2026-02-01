import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { documents } from '@/lib/db';
import { inArray } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
    return handleApiError(async () => {
        const body = await request.json();
        const { documentIds, updates, projectId } = body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json({ error: 'Invalid documentIds' }, { status: 400 });
        }

        if (!projectId) {
            return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
        }

        if (!updates || (updates.categoryId === undefined && updates.subcategoryId === undefined)) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        const { eq, and } = await import('drizzle-orm');

        // Perform bulk update (only for documents in this project)
        await db.update(documents)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(and(
                inArray(documents.id, documentIds),
                eq(documents.projectId, projectId)
            ));

        return NextResponse.json({ success: true, count: documentIds.length });
    });
}

export async function DELETE(request: NextRequest) {
    return handleApiError(async () => {
        const body = await request.json();
        const { documentIds, projectId } = body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json({ error: 'Invalid documentIds' }, { status: 400 });
        }

        if (!projectId) {
            return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
        }

        // Cascade delete: we need to delete in this order:
        // 1. Get all version IDs for these documents
        // 2. Delete transmittal items that reference these versions
        // 3. Delete addendum/RFT/TRR/note/meeting/report transmittals that reference these documents
        // 4. Delete versions
        // 5. Delete file assets (if not referenced elsewhere)
        // 6. Delete documents

        const { versions, fileAssets, transmittalItems, addendumTransmittals, rftNewTransmittals, trrTransmittals, noteTransmittals, meetingTransmittals, reportTransmittals } = await import('@/lib/db/schema');
        const { eq, inArray, and } = await import('drizzle-orm');

        // First, verify all documents belong to the specified project
        const docsToDelete = await db.select({ id: documents.id })
            .from(documents)
            .where(and(
                inArray(documents.id, documentIds),
                eq(documents.projectId, projectId)
            ));

        const validDocIds = docsToDelete.map(d => d.id);

        if (validDocIds.length === 0) {
            return NextResponse.json({ error: 'No valid documents found in this project' }, { status: 404 });
        }

        // Get all versions for these documents
        const documentVersions = await db.select({ id: versions.id, fileAssetId: versions.fileAssetId })
            .from(versions)
            .where(inArray(versions.documentId, validDocIds));

        const versionIds = documentVersions.map(v => v.id);
        const fileAssetIds = documentVersions.map(v => v.fileAssetId);

        if (versionIds.length > 0) {
            // Delete transmittal items first
            await db.delete(transmittalItems).where(inArray(transmittalItems.versionId, versionIds));

            // Delete versions
            await db.delete(versions).where(inArray(versions.id, versionIds));
        }

        // Delete addendum/RFT/TRR/note/meeting/report transmittals that reference these documents
        await db.delete(addendumTransmittals).where(inArray(addendumTransmittals.documentId, validDocIds));
        await db.delete(rftNewTransmittals).where(inArray(rftNewTransmittals.documentId, validDocIds));
        await db.delete(trrTransmittals).where(inArray(trrTransmittals.documentId, validDocIds));
        await db.delete(noteTransmittals).where(inArray(noteTransmittals.documentId, validDocIds));
        await db.delete(meetingTransmittals).where(inArray(meetingTransmittals.documentId, validDocIds));
        await db.delete(reportTransmittals).where(inArray(reportTransmittals.documentId, validDocIds));

        // Delete file assets (we could check if they're referenced elsewhere, but for now just delete)
        if (fileAssetIds.length > 0) {
            await db.delete(fileAssets).where(inArray(fileAssets.id, fileAssetIds));
        }

        // Finally delete documents
        await db.delete(documents).where(inArray(documents.id, validDocIds));

        return NextResponse.json({ success: true, count: documentIds.length });
    });
}
