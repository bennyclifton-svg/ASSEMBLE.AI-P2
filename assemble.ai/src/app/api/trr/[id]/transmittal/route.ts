/**
 * TRR Transmittal API Route
 * Feature 012 - TRR Report
 *
 * GET /api/trr/[id]/transmittal - Get documents attached to a TRR
 * POST /api/trr/[id]/transmittal - Add documents to a TRR transmittal
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { trr, trrTransmittals, documents, versions, fileAssets, categories, subcategories } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;

        // Verify TRR exists
        const existing = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .get();

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        // Fetch transmittal items with document details including category/subcategory
        const transmittalItems = await db
            .select({
                id: trrTransmittals.id,
                documentId: trrTransmittals.documentId,
                categoryId: documents.categoryId,
                subcategoryId: documents.subcategoryId,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                fileName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                uploadedAt: versions.createdAt,
                addedAt: trrTransmittals.addedAt,
            })
            .from(trrTransmittals)
            .innerJoin(documents, eq(trrTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(trrTransmittals.trrId, id))
            .orderBy(trrTransmittals.addedAt);

        // Transform result to handle potential nulls from left joins
        const result = transmittalItems.map((item) => ({
            ...item,
            documentName: item.fileName || 'Unknown',
            revision: item.versionNumber || 0,
        }));

        return NextResponse.json({
            trrId: id,
            documents: result,
        });
    });
}

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;
        const body = await request.json();

        // Verify TRR exists
        const existing = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .get();

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        const { documentIds } = body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 });
        }

        // Clear existing transmittal
        await db
            .delete(trrTransmittals)
            .where(eq(trrTransmittals.trrId, id));

        // Add new documents
        const transmittalRecords = documentIds.map((documentId: string) => ({
            id: uuidv4(),
            trrId: id,
            documentId,
        }));

        for (const record of transmittalRecords) {
            await db.insert(trrTransmittals).values(record);
        }

        return NextResponse.json({
            success: true,
            count: documentIds.length,
        });
    });
}
