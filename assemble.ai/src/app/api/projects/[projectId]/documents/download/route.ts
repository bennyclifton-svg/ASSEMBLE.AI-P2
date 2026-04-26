/**
 * POST /api/projects/[projectId]/documents/download
 * Body: { documentIds: string[] }
 * Returns: application/zip blob
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { documents, versions, fileAssets } from '@/lib/db';
import { eq, inArray, and } from 'drizzle-orm';
import JSZip from 'jszip';
import { getFileFromStorage } from '@/lib/storage';

interface RouteContext {
    params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    return handleApiError(async () => {
        const { projectId } = await context.params;
        const { documentIds } = await request.json() as { documentIds: string[] };

        if (!documentIds || documentIds.length === 0) {
            return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 });
        }

        // Fetch document file assets via: documents → versions → fileAssets
        const items = await db
            .select({
                originalName: fileAssets.originalName,
                storagePath: fileAssets.storagePath,
            })
            .from(documents)
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .where(and(
                inArray(documents.id, documentIds),
                eq(documents.projectId, projectId)
            ));

        if (items.length === 0) {
            return NextResponse.json({ error: 'No documents found' }, { status: 404 });
        }

        // Build ZIP
        const zip = new JSZip();
        let addedCount = 0;

        for (const item of items) {
            try {
                if (item.storagePath) {
                    const fileData = await getFileFromStorage(item.storagePath);
                    if (fileData) {
                        zip.file(item.originalName || 'unknown_file', fileData);
                        addedCount++;
                    } else {
                        zip.file(`${item.originalName || 'unknown'}.txt`, `Error: File not found on server.`);
                    }
                } else {
                    zip.file(`${item.originalName || 'unknown'}.txt`, `Error: No storage path.`);
                }
            } catch (e) {
                console.error(`Failed to add file ${item.originalName} to zip`, e);
            }
        }

        if (addedCount === 0) {
            return NextResponse.json({ error: 'None of the selected files could be retrieved.' }, { status: 422 });
        }

        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        const filename = `Documents_${new Date().toISOString().split('T')[0]}.zip`;

        return new NextResponse(zipContent as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    });
}
