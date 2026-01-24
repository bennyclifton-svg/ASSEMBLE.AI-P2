/**
 * Meeting Transmittal API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/meetings/[id]/transmittal - Get attached documents
 * POST /api/meetings/[id]/transmittal - Save document attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { meetings, meetingTransmittals, documents, versions, fileAssets, categories, subcategories } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { transmittalSaveSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, sql } from 'drizzle-orm';

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

        // Verify meeting exists and belongs to organization
        const [meeting] = await db
            .select()
            .from(meetings)
            .where(
                and(
                    eq(meetings.id, id),
                    eq(meetings.organizationId, authResult.user.organizationId),
                    isNull(meetings.deletedAt)
                )
            )
            .limit(1);

        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        // Fetch transmittals with document details
        const transmittals = await db
            .select({
                transmittal: meetingTransmittals,
                document: documents,
            })
            .from(meetingTransmittals)
            .leftJoin(documents, eq(meetingTransmittals.documentId, documents.id))
            .where(eq(meetingTransmittals.meetingId, id));

        // Get full document details including file name and version
        const documentDetails = await Promise.all(
            transmittals.map(async ({ transmittal, document }) => {
                if (!document) {
                    return {
                        id: transmittal.id,
                        documentId: transmittal.documentId,
                        categoryId: null,
                        subcategoryId: null,
                        categoryName: null,
                        subcategoryName: null,
                        documentName: 'Unknown',
                        revision: 1,
                        addedAt: transmittal.addedAt,
                    };
                }

                // Get version and file info
                const [versionInfo] = document.latestVersionId
                    ? await db
                        .select({ version: versions, fileAsset: fileAssets })
                        .from(versions)
                        .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
                        .where(eq(versions.id, document.latestVersionId))
                        .limit(1)
                    : [null];

                // Get category and subcategory names
                let categoryName: string | null = null;
                let subcategoryName: string | null = null;

                if (document.categoryId) {
                    const [cat] = await db
                        .select()
                        .from(categories)
                        .where(eq(categories.id, document.categoryId))
                        .limit(1);
                    categoryName = cat?.name || null;
                }

                if (document.subcategoryId) {
                    const [subcat] = await db
                        .select()
                        .from(subcategories)
                        .where(eq(subcategories.id, document.subcategoryId))
                        .limit(1);
                    subcategoryName = subcat?.name || null;
                }

                return {
                    id: transmittal.id,
                    documentId: transmittal.documentId,
                    categoryId: document.categoryId,
                    subcategoryId: document.subcategoryId,
                    categoryName,
                    subcategoryName,
                    documentName: versionInfo?.fileAsset?.originalName || 'Unknown',
                    revision: versionInfo?.version?.versionNumber || 1,
                    addedAt: transmittal.addedAt,
                };
            })
        );

        return NextResponse.json({
            meetingId: id,
            documents: documentDetails,
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

        // Verify meeting exists and belongs to organization
        const [meeting] = await db
            .select()
            .from(meetings)
            .where(
                and(
                    eq(meetings.id, id),
                    eq(meetings.organizationId, authResult.user.organizationId),
                    isNull(meetings.deletedAt)
                )
            )
            .limit(1);

        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        const { documentIds } = validationResult.data;

        // Verify all documents exist
        const existingDocs = await db
            .select()
            .from(documents)
            .where(eq(documents.projectId, meeting.projectId));

        const existingDocIds = new Set(existingDocs.map(d => d.id));
        const invalidIds = documentIds.filter(docId => !existingDocIds.has(docId));

        if (invalidIds.length > 0) {
            return NextResponse.json(
                { error: 'Some document IDs not found', invalidIds },
                { status: 400 }
            );
        }

        // Delete existing transmittals
        await db
            .delete(meetingTransmittals)
            .where(eq(meetingTransmittals.meetingId, id));

        // Insert new transmittals
        const now = new Date().toISOString();
        const transmittalsToCreate = documentIds.map(documentId => ({
            id: uuidv4(),
            meetingId: id,
            documentId,
            addedAt: now,
        }));

        if (transmittalsToCreate.length > 0) {
            await db.insert(meetingTransmittals).values(transmittalsToCreate);
        }

        // Update meeting's updatedAt
        await db
            .update(meetings)
            .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(meetings.id, id));

        return NextResponse.json({
            success: true,
            message: 'Transmittal saved',
            documentCount: documentIds.length,
        });
    });
}
