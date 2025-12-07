/**
 * T051: POST /api/reports/[id]/section-feedback
 * Handle user feedback on a generated section
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq, and } from 'drizzle-orm';
import type { TableOfContents } from '@/lib/langgraph/state';

interface RouteParams {
    params: Promise<{ id: string }>;
}

interface SectionFeedbackRequest {
    sectionIndex: number;
    action: 'approve' | 'regenerate' | 'skip';
    feedback?: string;
    excludeSourceIds?: string[];
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body: SectionFeedbackRequest = await request.json();

        // Validate request
        if (typeof body.sectionIndex !== 'number') {
            return NextResponse.json(
                { error: 'sectionIndex is required' },
                { status: 400 }
            );
        }

        if (!['approve', 'regenerate', 'skip'].includes(body.action)) {
            return NextResponse.json(
                { error: 'action must be approve, regenerate, or skip' },
                { status: 400 }
            );
        }

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

        // Check lock
        if (report.lockedBy && report.lockedBy !== 'user-placeholder') {
            return NextResponse.json(
                {
                    error: 'Report is locked by another user',
                    lockedBy: report.lockedBy,
                    lockedByName: report.lockedByName,
                },
                { status: 409 }
            );
        }

        // Get total sections
        const toc = report.tableOfContents as TableOfContents;
        const totalSections = toc?.sections?.length ?? 0;

        if (body.action === 'regenerate') {
            // Mark section for regeneration
            await ragDb.update(reportSections)
                .set({
                    status: 'regenerating',
                })
                .where(
                    and(
                        eq(reportSections.reportId, id),
                        eq(reportSections.sectionIndex, body.sectionIndex)
                    )
                );

            // TODO: Trigger regeneration via LangGraph
            // For now, just return status

            return NextResponse.json({
                status: 'generating',
                nextSection: body.sectionIndex,
                isComplete: false,
            });
        }

        // Approve or skip - move to next section
        const nextIndex = body.sectionIndex + 1;
        const isComplete = nextIndex >= totalSections;

        // Update report
        await ragDb.update(reportTemplates)
            .set({
                currentSectionIndex: nextIndex,
                status: isComplete ? 'complete' : 'generating',
                updatedAt: new Date(),
            })
            .where(eq(reportTemplates.id, id));

        // If skipping, mark section as complete with placeholder
        if (body.action === 'skip') {
            await ragDb.update(reportSections)
                .set({
                    status: 'complete',
                    content: '*Section skipped by user*',
                })
                .where(
                    and(
                        eq(reportSections.reportId, id),
                        eq(reportSections.sectionIndex, body.sectionIndex)
                    )
                );
        }

        // If complete, release lock
        if (isComplete) {
            await ragDb.update(reportTemplates)
                .set({
                    lockedBy: null,
                    lockedByName: null,
                    lockedAt: null,
                })
                .where(eq(reportTemplates.id, id));
        }

        return NextResponse.json({
            status: isComplete ? 'complete' : 'generating',
            nextSection: isComplete ? null : nextIndex,
            isComplete,
        });
    } catch (error) {
        console.error('[api/reports/[id]/section-feedback] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process feedback' },
            { status: 500 }
        );
    }
}
