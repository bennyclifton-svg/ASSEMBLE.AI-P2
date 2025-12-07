/**
 * T053: POST, DELETE /api/reports/[id]/lock
 * Acquire or release report lock
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates } from '@/lib/db/rag-schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Lock timeout in milliseconds (15 minutes)
const LOCK_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * POST - Acquire lock
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // TODO: Get user from session
        const userId = 'user-placeholder';
        const userName = 'Current User';

        // Fetch report
        const report = await ragDb.query.reportTemplates.findFirst({
            where: eq(reportTemplates.id, id),
        });

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Check existing lock
        if (report.lockedBy && report.lockedAt) {
            const lockAge = Date.now() - new Date(report.lockedAt).getTime();

            // If locked by different user and lock hasn't expired
            if (report.lockedBy !== userId && lockAge < LOCK_TIMEOUT_MS) {
                const expiresAt = new Date(
                    new Date(report.lockedAt).getTime() + LOCK_TIMEOUT_MS
                );

                return NextResponse.json(
                    {
                        error: 'Report is locked by another user',
                        lockedBy: report.lockedBy,
                        lockedByName: report.lockedByName,
                        lockedAt: report.lockedAt.toISOString(),
                        expiresAt: expiresAt.toISOString(),
                    },
                    { status: 409 }
                );
            }
        }

        // Acquire or refresh lock
        const now = new Date();
        const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_MS);

        await ragDb.update(reportTemplates)
            .set({
                lockedBy: userId,
                lockedByName: userName,
                lockedAt: now,
                updatedAt: now,
            })
            .where(eq(reportTemplates.id, id));

        return NextResponse.json({
            locked: true,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('[api/reports/[id]/lock] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to acquire lock' },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Release lock
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // TODO: Get user from session
        const userId = 'user-placeholder';

        // Fetch report
        const report = await ragDb.query.reportTemplates.findFirst({
            where: eq(reportTemplates.id, id),
        });

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Only release if current user owns the lock
        if (report.lockedBy && report.lockedBy !== userId) {
            return NextResponse.json(
                { error: 'Cannot release lock owned by another user' },
                { status: 403 }
            );
        }

        // Release lock
        await ragDb.update(reportTemplates)
            .set({
                lockedBy: null,
                lockedByName: null,
                lockedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(reportTemplates.id, id));

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('[api/reports/[id]/lock] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to release lock' },
            { status: 500 }
        );
    }
}

/**
 * Heartbeat to keep lock alive (extend expiration)
 * Client should call POST periodically
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    // PATCH acts as heartbeat - just refreshes the lock timestamp
    return POST(request, { params });
}
