/**
 * T048: GET /api/reports - List reports for a project
 * POST /api/reports - Create a new report
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq, and, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { fetchTransmittalForDiscipline } from '@/lib/services/planning-context';

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

/**
 * POST /api/reports - Create a new report
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, title, reportType, disciplineId, tradeId } = body;

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        if (!title) {
            return NextResponse.json(
                { error: 'title is required' },
                { status: 400 }
            );
        }

        const reportId = uuidv4();
        const now = new Date();

        // Ensure empty strings become null
        const cleanDisciplineId = disciplineId && disciplineId.trim() ? disciplineId.trim() : null;
        const cleanTradeId = tradeId && tradeId.trim() ? tradeId.trim() : null;

        // Determine section titles based on discipline vs trade
        const isContractor = cleanTradeId && !cleanDisciplineId;
        const briefTitle = isContractor ? 'Contractor Scope' : 'Consultant Brief';
        const feeTitle = isContractor ? 'Contractor Price' : 'Consultant Fee';

        // T099j: Build fixed 7-section TOC structure
        const sections = [
            { id: uuidv4(), title: 'Project Details', level: 1 },
            { id: uuidv4(), title: 'Project Objectives', level: 1 },
            { id: uuidv4(), title: 'Project Staging', level: 1 },
            { id: uuidv4(), title: 'Project Risks', level: 1 },
            { id: uuidv4(), title: briefTitle, level: 1 },
            { id: uuidv4(), title: feeTitle, level: 1 },
        ];

        // T099j: Check for transmittal and add 7th section if exists
        if (cleanDisciplineId) {
            try {
                const transmittal = await fetchTransmittalForDiscipline(projectId, cleanDisciplineId);
                if (transmittal && transmittal.documents.length > 0) {
                    sections.push({
                        id: 'transmittal',
                        title: 'Transmittal',
                        level: 1,
                    });
                    console.log(`[api/reports POST] Added Transmittal section (${transmittal.documents.length} docs)`);
                }
            } catch (err) {
                console.warn('[api/reports POST] Failed to fetch transmittal:', err);
                // Continue without transmittal section
            }
        }

        // Create report with toc_pending status
        // T099a: Use fixed 7-section TOC structure (same for Short RFT and Long RFT)
        await ragDb.insert(reportTemplates).values({
            id: reportId,
            projectId,
            title,
            reportType: reportType || 'tender_request',
            discipline: title, // Use title as discipline for now
            disciplineId: cleanDisciplineId,
            tradeId: cleanTradeId,
            documentSetIds: [], // Required field - empty array by default
            status: 'toc_pending',
            tableOfContents: {
                sections,
                source: 'fixed',
                version: 1,
            },
            createdAt: now,
            updatedAt: now,
        });

        // Fetch the created report
        const report = await ragDb.query.reportTemplates.findFirst({
            where: eq(reportTemplates.id, reportId),
        });

        return NextResponse.json({
            id: report?.id,
            title: report?.title,
            status: report?.status,
            createdAt: report?.createdAt?.toISOString(),
            updatedAt: report?.updatedAt?.toISOString(),
        });
    } catch (error) {
        console.error('[api/reports POST] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create report' },
            { status: 500 }
        );
    }
}
