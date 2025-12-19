import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { versions, fileAssets } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id } = await params;
        const documentId = id;

        const history = await db.select({
            id: versions.id,
            versionNumber: versions.versionNumber,
            createdAt: versions.createdAt,
            uploadedBy: versions.uploadedBy,
            originalName: fileAssets.originalName,
            sizeBytes: fileAssets.sizeBytes,
        })
            .from(versions)
            .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .where(eq(versions.documentId, documentId))
            .orderBy(desc(versions.versionNumber));

        return NextResponse.json(history);
    });
}
