import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { transmittals, transmittalItems, versions, fileAssets, documents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const [transmittal] = await db.select().from(transmittals).where(eq(transmittals.id, id)).limit(1);

        if (!transmittal) {
            return NextResponse.json({ error: 'Transmittal not found' }, { status: 404 });
        }

        // Fetch items
        const items = await db.select({
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
            .where(eq(transmittalItems.transmittalId, id));

        return NextResponse.json({ ...transmittal, items });
    });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const body = await request.json();
        const { name, status, issuedAt } = body;

        await db.update(transmittals)
            .set({
                ...(name && { name }),
                ...(status && { status }),
                ...(issuedAt && { issuedAt }),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(transmittals.id, id));

        return NextResponse.json({ success: true });
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        // Delete items first (manual cascade)
        await db.delete(transmittalItems).where(eq(transmittalItems.transmittalId, id));
        await db.delete(transmittals).where(eq(transmittals.id, id));

        return NextResponse.json({ success: true });
    });
}
