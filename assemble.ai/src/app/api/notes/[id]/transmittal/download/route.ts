/**
 * Notes Transmittal Download API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/notes/[id]/transmittal/download - Download note attachments as ZIP
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
    notes,
    noteTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories,
    projects,
    projectDetails,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull } from 'drizzle-orm';
import JSZip from 'jszip';
import { getFileFromStorage } from '@/lib/storage';
import {
    generateCoverSheetPdf,
    generateCoverSheetDocx,
} from '@/lib/export/attachments-cover-sheet';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;

        const [note] = await db
            .select()
            .from(notes)
            .where(
                and(
                    eq(notes.id, id),
                    eq(notes.organizationId, authResult.user.organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .limit(1);

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        const items = await db
            .select({
                originalName: fileAssets.originalName,
                storagePath: fileAssets.storagePath,
                versionNumber: versions.versionNumber,
                drawingNumber: fileAssets.drawingNumber,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
            })
            .from(noteTransmittals)
            .innerJoin(documents, eq(noteTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(noteTransmittals.noteId, id));

        if (items.length === 0) {
            return NextResponse.json({ error: 'Note has no attachments' }, { status: 400 });
        }

        let projectNameLine = '';
        let projectAddress = '';
        try {
            if (note.projectId) {
                const [project] = await db
                    .select({ name: projects.name, code: projects.code })
                    .from(projects)
                    .where(eq(projects.id, note.projectId))
                    .limit(1);

                const [details] = await db
                    .select({
                        projectName: projectDetails.projectName,
                        address: projectDetails.address,
                    })
                    .from(projectDetails)
                    .where(eq(projectDetails.projectId, note.projectId))
                    .limit(1);

                const code = project?.code?.trim() || '';
                const name = details?.projectName?.trim() || project?.name?.trim() || '';
                projectNameLine = code ? `${code} - ${name}` : name;
                projectAddress = details?.address?.trim() || '';
            }
        } catch (e) {
            console.error('[notes/transmittal/download] project lookup failed', e);
        }

        const zip = new JSZip();
        const folder = zip.folder('Note_Attachments') || zip;

        for (const item of items) {
            try {
                if (item.storagePath) {
                    const fileData = await getFileFromStorage(item.storagePath);
                    if (fileData) {
                        folder.file(item.originalName || 'unknown_file', fileData);
                    } else {
                        console.warn(`File not found: ${item.storagePath}`);
                        folder.file(`${item.originalName || 'unknown'}.txt`, `Error: File not found on server.`);
                    }
                } else {
                    folder.file(`${item.originalName || 'unknown'}.txt`, `Error: No storage path.`);
                }
            } catch (e) {
                console.error(`Failed to add file ${item.originalName} to zip`, e);
            }
        }

        // Cover sheet (best-effort; never block the ZIP)
        try {
            const coverData = {
                projectNameLine,
                projectAddress,
                documentLabel: note.title || 'Untitled Note',
                items,
            };
            folder.file('Attachments_Cover_Sheet.pdf', generateCoverSheetPdf(coverData));
            folder.file('Attachments_Cover_Sheet.docx', await generateCoverSheetDocx(coverData));
        } catch (e) {
            console.error('[notes/transmittal/download] cover sheet generation failed', e);
        }

        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

        const sanitizedTitle = (note.title || 'Note')
            .replace(/[/\\:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100) || 'Note';
        const filename = `${sanitizedTitle}_Attachments.zip`;

        return new NextResponse(zipContent as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    });
}
