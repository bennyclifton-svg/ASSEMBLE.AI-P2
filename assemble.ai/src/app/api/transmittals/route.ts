import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { transmittals, subcategories, documents, transmittalItems, versions, fileAssets } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, inArray, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const stakeholderId = searchParams.get('stakeholderId');

        // If filtering by stakeholder, return single transmittal with items
        if (projectId && stakeholderId) {
            const [transmittal] = await db
                .select()
                .from(transmittals)
                .where(and(
                    eq(transmittals.projectId, projectId),
                    eq(transmittals.stakeholderId, stakeholderId)
                ))
                .limit(1);

            if (!transmittal) {
                return NextResponse.json({ error: 'Transmittal not found' }, { status: 404 });
            }

            // Fetch items with document details
            const items = await db
                .select({
                    id: transmittalItems.id,
                    versionId: transmittalItems.versionId,
                    documentId: versions.documentId,
                    versionNumber: versions.versionNumber,
                    originalName: fileAssets.originalName,
                    sizeBytes: fileAssets.sizeBytes,
                    addedAt: transmittalItems.addedAt,
                })
                .from(transmittalItems)
                .innerJoin(versions, eq(transmittalItems.versionId, versions.id))
                .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
                .where(eq(transmittalItems.transmittalId, transmittal.id));

            return NextResponse.json({ ...transmittal, items });
        }

        // Default: list all transmittals
        const list = await db.select({
            id: transmittals.id,
            name: transmittals.name,
            status: transmittals.status,
            issuedAt: transmittals.issuedAt,
            createdAt: transmittals.createdAt,
            projectId: transmittals.projectId,
            stakeholderId: transmittals.stakeholderId,
            subcategoryName: subcategories.name,
        })
            .from(transmittals)
            .leftJoin(subcategories, eq(transmittals.subcategoryId, subcategories.id))
            .orderBy(desc(transmittals.createdAt));

        return NextResponse.json(list);
    });
}

export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        const body = await request.json();
        const { name, subcategoryId, documentIds, projectId, stakeholderId } = body;

        // Determine if this is a stakeholder-based or subcategory-based transmittal
        const isStakeholderBased = projectId && stakeholderId;

        if (!isStakeholderBased && (!name || !subcategoryId)) {
            return NextResponse.json({ error: 'Name and Subcategory are required' }, { status: 400 });
        }

        if (isStakeholderBased && !name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 });
        }

        let transmittalId: string;
        let isNew = true;

        // For stakeholder-based transmittals, check if one already exists (upsert)
        if (isStakeholderBased) {
            const [existing] = await db
                .select({ id: transmittals.id })
                .from(transmittals)
                .where(and(
                    eq(transmittals.projectId, projectId),
                    eq(transmittals.stakeholderId, stakeholderId)
                ))
                .limit(1);

            if (existing) {
                // Update existing transmittal
                transmittalId = existing.id;
                isNew = false;

                await db
                    .update(transmittals)
                    .set({ name, updatedAt: new Date() })
                    .where(eq(transmittals.id, transmittalId));

                // Clear old items
                await db.delete(transmittalItems).where(eq(transmittalItems.transmittalId, transmittalId));
            } else {
                // Create new stakeholder-based transmittal
                transmittalId = uuidv4();
                await db.insert(transmittals).values({
                    id: transmittalId,
                    name,
                    projectId,
                    stakeholderId,
                    subcategoryId: null,
                    status: 'DRAFT',
                });
            }
        } else {
            // Legacy subcategory-based transmittal
            transmittalId = uuidv4();
            await db.insert(transmittals).values({
                id: transmittalId,
                name,
                subcategoryId,
                status: 'DRAFT',
            });
        }

        // Add document items
        const docs = await db.select({
            id: documents.id,
            latestVersionId: documents.latestVersionId
        })
            .from(documents)
            .where(inArray(documents.id, documentIds));

        const itemsToInsert = docs
            .filter(d => d.latestVersionId)
            .map(d => ({
                id: uuidv4(),
                transmittalId,
                versionId: d.latestVersionId!,
            }));

        if (itemsToInsert.length > 0) {
            await db.insert(transmittalItems).values(itemsToInsert);
        }

        return NextResponse.json({
            success: true,
            id: transmittalId,
            isNew,
            documentCount: itemsToInsert.length,
        });
    });
}
