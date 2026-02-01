/**
 * Notes Transmittal API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/notes/[id]/transmittal - Get documents attached to a note
 * POST /api/notes/[id]/transmittal - Save document attachments to a note
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { notes, noteTransmittals, documents, versions, fileAssets, categories, subcategories } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { transmittalSaveSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;

        // Verify note exists and belongs to organization
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

        // Fetch transmittal items with document details
        const transmittalItems = await db
            .select({
                id: noteTransmittals.id,
                documentId: noteTransmittals.documentId,
                categoryId: documents.categoryId,
                subcategoryId: documents.subcategoryId,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                fileName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                uploadedAt: versions.createdAt,
                addedAt: noteTransmittals.addedAt,
                // Drawing extraction fields
                drawingNumber: fileAssets.drawingNumber,
                drawingName: fileAssets.drawingName,
                drawingRevision: fileAssets.drawingRevision,
                drawingExtractionStatus: fileAssets.drawingExtractionStatus,
            })
            .from(noteTransmittals)
            .innerJoin(documents, eq(noteTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(noteTransmittals.noteId, id))
            .orderBy(noteTransmittals.addedAt);

        // Transform result to handle potential nulls from left joins
        const result = transmittalItems.map((item) => ({
            ...item,
            documentName: item.drawingName || item.fileName || 'Unknown',
            revision: item.versionNumber || 0,
        }));

        return NextResponse.json({
            noteId: id,
            documents: result,
        });
    });
}

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;
        const body = await request.json();

        // Validate request body
        const validationResult = transmittalSaveSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        // Verify note exists and belongs to organization
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

        const { documentIds } = validationResult.data;

        // Clear existing transmittals
        await db
            .delete(noteTransmittals)
            .where(eq(noteTransmittals.noteId, id));

        // Add new documents
        if (documentIds.length > 0) {
            const now = new Date().toISOString();
            const transmittalRecords = documentIds.map((documentId: string) => ({
                id: uuidv4(),
                noteId: id,
                documentId,
                addedAt: now,
            }));

            for (const record of transmittalRecords) {
                await db.insert(noteTransmittals).values(record);
            }
        }

        return NextResponse.json({
            success: true,
            count: documentIds.length,
        });
    });
}
