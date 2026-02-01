/**
 * Report Transmittal API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/project-reports/[id]/transmittal - Get attached documents
 * POST /api/project-reports/[id]/transmittal - Save document attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import {
    db,
    reports,
    reportTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { transmittalSaveSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, inArray } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id } = await params;

        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        // Check if report exists and belongs to user's org
        const [report] = await db
            .select()
            .from(reports)
            .where(
                and(
                    eq(reports.id, id),
                    eq(reports.organizationId, authResult.user.organizationId),
                    isNull(reports.deletedAt)
                )
            )
            .limit(1);

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Fetch transmittals with document info
        const transmittals = await db
            .select({
                id: reportTransmittals.id,
                documentId: reportTransmittals.documentId,
                addedAt: reportTransmittals.addedAt,
            })
            .from(reportTransmittals)
            .where(eq(reportTransmittals.reportId, id));

        if (transmittals.length === 0) {
            return NextResponse.json({
                reportId: id,
                documents: [],
            });
        }

        // Get document details
        const documentIds = transmittals.map((t) => t.documentId);
        const docsWithDetails = await db
            .select({
                id: documents.id,
                categoryId: documents.categoryId,
                subcategoryId: documents.subcategoryId,
                latestVersionId: documents.latestVersionId,
            })
            .from(documents)
            .where(inArray(documents.id, documentIds));

        // Get version details for document names
        const versionIds = docsWithDetails
            .map((d) => d.latestVersionId)
            .filter(Boolean) as string[];

        const versionDetails = versionIds.length > 0
            ? await db
                .select({
                    id: versions.id,
                    documentId: versions.documentId,
                    versionNumber: versions.versionNumber,
                    fileAssetId: versions.fileAssetId,
                })
                .from(versions)
                .where(inArray(versions.id, versionIds))
            : [];

        // Get file asset details for names
        const fileAssetIds = versionDetails
            .map((v) => v.fileAssetId)
            .filter(Boolean) as string[];

        const fileAssetDetails = fileAssetIds.length > 0
            ? await db
                .select({
                    id: fileAssets.id,
                    originalName: fileAssets.originalName,
                    // Drawing extraction fields
                    drawingNumber: fileAssets.drawingNumber,
                    drawingName: fileAssets.drawingName,
                    drawingRevision: fileAssets.drawingRevision,
                    drawingExtractionStatus: fileAssets.drawingExtractionStatus,
                })
                .from(fileAssets)
                .where(inArray(fileAssets.id, fileAssetIds))
            : [];

        // Get category names
        const categoryIds = docsWithDetails
            .map((d) => d.categoryId)
            .filter(Boolean) as string[];

        const categoryDetails = categoryIds.length > 0
            ? await db
                .select({
                    id: categories.id,
                    name: categories.name,
                })
                .from(categories)
                .where(inArray(categories.id, categoryIds))
            : [];

        // Get subcategory names
        const subcategoryIds = docsWithDetails
            .map((d) => d.subcategoryId)
            .filter(Boolean) as string[];

        const subcategoryDetails = subcategoryIds.length > 0
            ? await db
                .select({
                    id: subcategories.id,
                    name: subcategories.name,
                })
                .from(subcategories)
                .where(inArray(subcategories.id, subcategoryIds))
            : [];

        // Build response with all details
        const documentsWithInfo = transmittals.map((t) => {
            const doc = docsWithDetails.find((d) => d.id === t.documentId);
            const version = doc?.latestVersionId
                ? versionDetails.find((v) => v.id === doc.latestVersionId)
                : null;
            const fileAsset = version?.fileAssetId
                ? fileAssetDetails.find((f) => f.id === version.fileAssetId)
                : null;
            const category = doc?.categoryId
                ? categoryDetails.find((c) => c.id === doc.categoryId)
                : null;
            const subcategory = doc?.subcategoryId
                ? subcategoryDetails.find((s) => s.id === doc.subcategoryId)
                : null;

            return {
                id: t.id,
                documentId: t.documentId,
                categoryId: doc?.categoryId || null,
                subcategoryId: doc?.subcategoryId || null,
                categoryName: category?.name || null,
                subcategoryName: subcategory?.name || null,
                documentName: fileAsset?.drawingName || fileAsset?.originalName || 'Unknown',
                revision: version?.versionNumber || 1,
                addedAt: t.addedAt,
                // Drawing extraction fields
                drawingNumber: fileAsset?.drawingNumber || null,
                drawingName: fileAsset?.drawingName || null,
                drawingRevision: fileAsset?.drawingRevision || null,
                drawingExtractionStatus: fileAsset?.drawingExtractionStatus || null,
            };
        });

        return NextResponse.json({
            reportId: id,
            documents: documentsWithInfo,
        });
    });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id } = await params;

        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        // Check if report exists and belongs to user's org
        const [report] = await db
            .select()
            .from(reports)
            .where(
                and(
                    eq(reports.id, id),
                    eq(reports.organizationId, authResult.user.organizationId),
                    isNull(reports.deletedAt)
                )
            )
            .limit(1);

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const body = await request.json();

        // Validate request body
        const validationResult = transmittalSaveSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { documentIds } = validationResult.data;
        const now = new Date().toISOString();

        // Delete existing transmittals
        await db
            .delete(reportTransmittals)
            .where(eq(reportTransmittals.reportId, id));

        // Create new transmittals
        if (documentIds.length > 0) {
            const transmittalsToCreate = documentIds.map((documentId) => ({
                id: uuidv4(),
                reportId: id,
                documentId,
                addedAt: now,
            }));

            await db.insert(reportTransmittals).values(transmittalsToCreate);
        }

        // Update report's updatedAt
        await db
            .update(reports)
            .set({ updatedAt: now })
            .where(eq(reports.id, id));

        return NextResponse.json({
            success: true,
            documentCount: documentIds.length,
        });
    });
}
