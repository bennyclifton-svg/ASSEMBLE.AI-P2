/**
 * T048: GET /api/reports
 * List reports for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq, and, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const status = searchParams.get('status');
        const disciplineId = searchParams.get('disciplineId');
        const tradeId = searchParams.get('tradeId');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId query parameter is required' },
                { status: 400 }
            );
        }

        // Build query conditions
        const conditions = [eq(reportTemplates.projectId, projectId)];

        if (status) {
            const validStatuses = ['draft', 'toc_pending', 'generating', 'complete', 'failed'];
            if (!validStatuses.includes(status)) {
                return NextResponse.json(
                    { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                    { status: 400 }
                );
            }
            conditions.push(eq(reportTemplates.status, status as any));
        }

        // Filter by discipline/trade ID (stored in dedicated columns)
        if (disciplineId) {
            conditions.push(eq(reportTemplates.disciplineId, disciplineId));
        }
        if (tradeId) {
            conditions.push(eq(reportTemplates.tradeId, tradeId));
        }

        // Fetch reports
        const reports = await ragDb.query.reportTemplates.findMany({
            where: and(...conditions),
            orderBy: (reports, { desc }) => [desc(reports.createdAt)],
        });

        // Get section counts for each report
        const reportsWithCounts = await Promise.all(
            reports.map(async (report) => {
                // Get completed sections count
                const completedResult = await ragDb
                    .select({ count: count() })
                    .from(reportSections)
                    .where(
                        and(
                            eq(reportSections.reportId, report.id),
                            eq(reportSections.status, 'complete')
                        )
                    );

                const completedSections = completedResult[0]?.count ?? 0;
                const totalSections = Array.isArray(report.tableOfContents)
                    ? report.tableOfContents.length
                    : (report.tableOfContents as any)?.sections?.length ?? 0;

                return {
                    id: report.id,
                    title: report.title,
                    discipline: report.discipline,
                    status: report.status,
                    completedSections,
                    totalSections,
                    lockedBy: report.lockedBy,
                    lockedByName: report.lockedByName,
                    createdAt: report.createdAt?.toISOString(),
                    updatedAt: report.updatedAt?.toISOString(),
                };
            })
        );

        return NextResponse.json({ reports: reportsWithCounts });
    } catch (error) {
        console.error('[api/reports] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list reports' },
            { status: 500 }
        );
    }
}
