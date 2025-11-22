import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { versions, fileAssets } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return handleApiError(async () => {
        const documentId = params.id;

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
