/**
 * Note Upload-Attachment API Route
 *
 * POST /api/notes/[id]/upload-attachment
 * Uploads a file, triggers drawing extraction + RAG ingestion,
 * and attaches it to the note in a single request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { notes, noteTransmittals, documents, versions, fileAssets, projects } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { storage } from '@/lib/storage';
import { versioning } from '@/lib/versioning';
import { validateExcelFile } from '@/lib/excel-validation';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, sql } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export const maxDuration = 60;

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Auth
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id: noteId } = await context.params;

        // Verify note exists and belongs to organization
        const [note] = await db
            .select()
            .from(notes)
            .where(
                and(
                    eq(notes.id, noteId),
                    eq(notes.organizationId, authResult.user.organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .limit(1);

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Parse FormData
        let formData;
        try {
            formData = await request.formData();
        } catch (err) {
            return NextResponse.json({
                error: 'Failed to parse form data',
                details: err instanceof Error ? err.message : String(err)
            }, { status: 400 });
        }

        const file = formData.get('file') as File | null;
        const projectId = formData.get('projectId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (!projectId) {
            return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
        }

        // Ensure project exists
        const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
        if (project.length === 0) {
            await db.insert(projects).values({
                id: projectId,
                name: projectId,
                status: 'active'
            });
        }

        // 1. Save file to storage
        let buffer: Buffer;
        try {
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } catch (err) {
            return NextResponse.json({
                error: 'Failed to process file',
                details: err instanceof Error ? err.message : String(err)
            }, { status: 500 });
        }

        // Validate Excel files
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const { isValid, error } = await validateExcelFile(buffer);
            if (!isValid) {
                return NextResponse.json({ error: error || 'Invalid Excel file' }, { status: 400 });
            }
        }

        const { path: storagePath, hash, size } = await storage.save(file, buffer);

        // 2. Create FileAsset record
        const fileAssetId = uuidv4();
        await db.insert(fileAssets).values({
            id: fileAssetId,
            storagePath,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: size,
            hash,
            ocrStatus: 'PENDING',
        });

        // 3. Version detection + create Document + Version
        let documentId = await versioning.findMatchingDocument(file.name, projectId);
        let versionNumber = 1;
        let isNewDocument = false;

        if (documentId) {
            versionNumber = await versioning.getNextVersionNumber(documentId);
        } else {
            documentId = uuidv4();
            isNewDocument = true;
        }

        const versionId = uuidv4();

        if (isNewDocument) {
            await db.insert(documents).values({
                id: documentId,
                projectId,
                categoryId: null,
                subcategoryId: null,
                latestVersionId: versionId,
            });
        }

        await db.insert(versions).values({
            id: versionId,
            documentId: documentId!,
            fileAssetId,
            versionNumber,
            uploadedBy: 'User',
        });

        if (!isNewDocument) {
            await db.update(documents)
                .set({ latestVersionId: versionId, updatedAt: new Date() })
                .where(eq(documents.id, documentId!));
        }

        // 4. Queue drawing extraction (non-blocking)
        let drawingExtractionQueued = false;
        try {
            const { addDrawingForExtraction } = await import('@/lib/queue/client');
            await addDrawingForExtraction(
                fileAssetId,
                storagePath,
                file.name,
                file.type || 'application/octet-stream'
            );
            drawingExtractionQueued = true;
        } catch (err) {
            console.warn('[upload-attachment] Failed to queue drawing extraction:', err);
        }

        // 5. RAG ingestion - find or create project default document set
        let ragQueued = false;
        try {
            const { ragDb } = await import('@/lib/db/rag-client');
            const { documentSets } = await import('@/lib/db/rag-schema');
            const { addDocumentForProcessing } = await import('@/lib/queue/client');

            // Find default document set for this project
            const existingSets = await ragDb.execute(sql`
                SELECT id FROM document_sets
                WHERE project_id = ${projectId} AND is_default = true
                LIMIT 1
            `);

            let documentSetId: string;

            if (existingSets.rows && existingSets.rows.length > 0) {
                documentSetId = (existingSets.rows[0] as any).id;
            } else {
                // Create default document set for the project
                documentSetId = uuidv4();
                await ragDb.insert(documentSets).values({
                    id: documentSetId,
                    projectId,
                    name: 'Project Documents',
                    isDefault: true,
                });
            }

            // Add document to set (triggers RAG processing via queue)
            const { documentSetMembers } = await import('@/lib/db/rag-schema');
            const memberId = uuidv4();
            const now = new Date();

            // Check if already a member (e.g., version update)
            const existingMember = await ragDb.execute(sql`
                SELECT id FROM document_set_members
                WHERE document_set_id = ${documentSetId} AND document_id = ${documentId}
                LIMIT 1
            `);

            if (!existingMember.rows || existingMember.rows.length === 0) {
                await ragDb.insert(documentSetMembers).values({
                    id: memberId,
                    documentSetId,
                    documentId: documentId!,
                    syncStatus: 'pending',
                    createdAt: now,
                });
            }

            await addDocumentForProcessing(
                documentId!,
                documentSetId,
                file.name,
                storagePath
            );
            ragQueued = true;
        } catch (err) {
            console.warn('[upload-attachment] Failed to queue RAG ingestion:', err);
        }

        // 6. Attach to note (append - check for duplicate first)
        const existingAttachment = await db
            .select({ id: noteTransmittals.id })
            .from(noteTransmittals)
            .where(
                and(
                    eq(noteTransmittals.noteId, noteId),
                    eq(noteTransmittals.documentId, documentId!)
                )
            )
            .limit(1);

        if (existingAttachment.length === 0) {
            await db.insert(noteTransmittals).values({
                id: uuidv4(),
                noteId,
                documentId: documentId!,
                addedAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            success: true,
            documentId,
            fileName: file.name,
            ragQueued,
            drawingExtractionQueued,
        });
    });
}
