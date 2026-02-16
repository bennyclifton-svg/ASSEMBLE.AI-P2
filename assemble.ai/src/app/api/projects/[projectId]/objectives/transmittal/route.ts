/**
 * Objectives Transmittal API Route
 * GET /api/projects/[projectId]/objectives/transmittal - Get attached documents
 * POST /api/projects/[projectId]/objectives/transmittal - Save document attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
    profilerObjectives,
    objectivesTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ projectId: string }>;
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

        const { projectId } = await context.params;

        // Find objectives record for this project
        const [objectives] = await db
            .select({ id: profilerObjectives.id })
            .from(profilerObjectives)
            .where(eq(profilerObjectives.projectId, projectId))
            .limit(1);

        if (!objectives) {
            return NextResponse.json({
                projectId,
                documents: [],
            });
        }

        // Fetch transmittal items with document details
        const transmittalItems = await db
            .select({
                id: objectivesTransmittals.id,
                documentId: objectivesTransmittals.documentId,
                categoryId: documents.categoryId,
                subcategoryId: documents.subcategoryId,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                fileName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                uploadedAt: versions.createdAt,
                addedAt: objectivesTransmittals.addedAt,
                drawingNumber: fileAssets.drawingNumber,
                drawingName: fileAssets.drawingName,
                drawingRevision: fileAssets.drawingRevision,
                drawingExtractionStatus: fileAssets.drawingExtractionStatus,
            })
            .from(objectivesTransmittals)
            .innerJoin(documents, eq(objectivesTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(objectivesTransmittals.objectivesId, objectives.id))
            .orderBy(objectivesTransmittals.addedAt);

        const result = transmittalItems.map((item) => ({
            ...item,
            documentName: item.drawingName || item.fileName || 'Unknown',
            revision: item.versionNumber || 0,
        }));

        return NextResponse.json({
            projectId,
            objectivesId: objectives.id,
            documents: result,
        });
    });
}

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { projectId } = await context.params;
        const body = await request.json();
        const { documentIds } = body;

        if (!Array.isArray(documentIds)) {
            return NextResponse.json(
                { error: 'documentIds must be an array' },
                { status: 400 }
            );
        }

        // Find or create objectives record
        let [objectives] = await db
            .select({ id: profilerObjectives.id })
            .from(profilerObjectives)
            .where(eq(profilerObjectives.projectId, projectId))
            .limit(1);

        if (!objectives) {
            const emptyObjective = JSON.stringify({
                content: '',
                source: 'pending',
                originalAi: null,
                editHistory: null,
            });
            const newId = uuidv4();
            await db.insert(profilerObjectives).values({
                id: newId,
                projectId,
                functionalQuality: emptyObjective,
                planningCompliance: emptyObjective,
            });
            objectives = { id: newId };
        }

        // Clear existing transmittals
        await db
            .delete(objectivesTransmittals)
            .where(eq(objectivesTransmittals.objectivesId, objectives.id));

        // Add new documents
        if (documentIds.length > 0) {
            const now = new Date().toISOString();
            for (const documentId of documentIds) {
                await db.insert(objectivesTransmittals).values({
                    id: uuidv4(),
                    objectivesId: objectives.id,
                    documentId,
                    addedAt: now,
                });
            }
        }

        return NextResponse.json({
            success: true,
            count: documentIds.length,
        });
    });
}
