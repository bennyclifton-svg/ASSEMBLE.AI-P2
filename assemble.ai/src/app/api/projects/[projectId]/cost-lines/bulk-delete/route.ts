/**
 * Bulk Delete Cost Lines API
 * POST /api/projects/[projectId]/cost-lines/bulk-delete
 *
 * Soft-deletes multiple cost line items by their IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray, isNull, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { costLines } from '@/lib/db/pg-schema';

interface BulkDeleteRequest {
    ids: string[];
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body: BulkDeleteRequest = await request.json();

        // Validate input
        if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
            return NextResponse.json(
                { error: 'ids array is required and must not be empty' },
                { status: 400 }
            );
        }

        // Limit batch size to prevent abuse
        if (body.ids.length > 100) {
            return NextResponse.json(
                { error: 'Maximum 100 items can be deleted at once' },
                { status: 400 }
            );
        }

        const result = await db.transaction(async (tx) => {
            // Verify all IDs belong to this project and are not already deleted
            const existingLines = await tx
                .select({ id: costLines.id })
                .from(costLines)
                .where(
                    and(
                        eq(costLines.projectId, projectId),
                        inArray(costLines.id, body.ids),
                        isNull(costLines.deletedAt)
                    )
                );

            const existingIds = existingLines.map(l => l.id);

            if (existingIds.length === 0) {
                return { deleted: 0 };
            }

            // Soft delete all matching lines
            const now = new Date();
            await tx
                .update(costLines)
                .set({
                    deletedAt: now,
                    updatedAt: now
                })
                .where(
                    and(
                        eq(costLines.projectId, projectId),
                        inArray(costLines.id, existingIds),
                        isNull(costLines.deletedAt)
                    )
                );

            return { deleted: existingIds.length };
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Bulk delete cost lines failed:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Bulk delete failed',
            },
            { status: 500 }
        );
    }
}
