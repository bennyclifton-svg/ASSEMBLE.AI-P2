/**
 * T047: POST /api/reports/generate
 * Start report generation - initializes LangGraph workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, type GenerationMode, type ContentLength } from '@/lib/db/rag-schema';
import { startReportGeneration } from '@/lib/langgraph/graph';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNotNull } from 'drizzle-orm';

interface GenerateRequest {
    projectId: string;
    reportType: 'tender_request';
    title: string;
    discipline?: string;
    disciplineId?: string; // Consultant discipline ID for filtering
    tradeId?: string; // Contractor trade ID for filtering
    documentSetIds: string[];
    transmittalId?: string;
    generationMode?: GenerationMode; // T099c: Report generation mode
    contentLength?: ContentLength; // T099l: Content length for Long RFT
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateRequest = await request.json();

        // Validate required fields
        if (!body.projectId || !body.reportType || !body.title || !body.documentSetIds) {
            return NextResponse.json(
                { error: 'Missing required fields: projectId, reportType, title, documentSetIds' },
                { status: 400 }
            );
        }

        // Validate report type
        if (body.reportType !== 'tender_request') {
            return NextResponse.json(
                { error: 'Invalid reportType. V1 only supports: tender_request' },
                { status: 400 }
            );
        }

        // Lock timeout in milliseconds (15 minutes)
        const LOCK_TIMEOUT_MS = 15 * 60 * 1000;

        // Build conditions for lock check - discipline/trade specific
        // Each discipline/trade can have its own independent RFT
        const lockConditions = [
            eq(reportTemplates.projectId, body.projectId),
            isNotNull(reportTemplates.lockedBy)
        ];

        // Add discipline/trade filter if provided
        if (body.disciplineId) {
            lockConditions.push(eq(reportTemplates.disciplineId, body.disciplineId));
        }
        if (body.tradeId) {
            lockConditions.push(eq(reportTemplates.tradeId, body.tradeId));
        }

        // Check for existing lock on reports for this discipline/trade
        const lockedReport = await ragDb.query.reportTemplates.findFirst({
            where: and(...lockConditions),
        });

        // Only block if lock exists and hasn't expired
        if (lockedReport && lockedReport.lockedAt) {
            const lockAge = Date.now() - new Date(lockedReport.lockedAt).getTime();

            if (lockAge < LOCK_TIMEOUT_MS) {
                return NextResponse.json(
                    {
                        error: 'Another report is being generated for this discipline/trade',
                        lockedBy: lockedReport.lockedBy,
                        lockedByName: lockedReport.lockedByName,
                    },
                    { status: 409 }
                );
            }

            // Lock has expired - clear it before proceeding
            await ragDb.update(reportTemplates)
                .set({
                    lockedBy: null,
                    lockedByName: null,
                    lockedAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(reportTemplates.id, lockedReport.id));
        }

        // Create report in database
        const reportId = uuidv4();
        const now = new Date();

        // TODO: Get user from session
        const userId = 'user-placeholder';
        const userName = 'Current User';

        await ragDb.insert(reportTemplates).values({
            id: reportId,
            projectId: body.projectId,
            documentSetIds: body.documentSetIds,
            reportType: body.reportType,
            title: body.title,
            discipline: body.discipline ?? null,
            disciplineId: body.disciplineId ?? null,
            tradeId: body.tradeId ?? null,
            tableOfContents: [],
            status: 'draft',
            generationMode: body.generationMode ?? 'ai_assisted', // T099c: Default to AI assisted
            contentLength: body.contentLength ?? 'concise', // T099l: Default to concise
            lockedBy: userId,
            lockedByName: userName,
            lockedAt: now,
            currentSectionIndex: 0,
            createdAt: now,
            updatedAt: now,
        });

        // Start LangGraph workflow
        const { threadId, state } = await startReportGeneration({
            projectId: body.projectId,
            reportType: body.reportType,
            title: body.title,
            discipline: body.discipline,
            documentSetIds: body.documentSetIds,
            reportId,
            generationMode: body.generationMode ?? 'ai_assisted', // T099c: Pass generation mode
            contentLength: body.contentLength ?? 'concise', // T099l: Pass content length
            lockedBy: userId,
            lockedByName: userName,
        });

        // Update report with generated TOC
        if (state.toc) {
            await ragDb.update(reportTemplates)
                .set({
                    tableOfContents: state.toc,
                    status: 'toc_pending',
                    graphState: {
                        threadId,
                        checkpointId: `${threadId}-1`,
                        messages: [],
                    },
                    updatedAt: new Date(),
                })
                .where(eq(reportTemplates.id, reportId));
        }

        // Return created report
        const report = await ragDb.query.reportTemplates.findFirst({
            where: eq(reportTemplates.id, reportId),
        });

        return NextResponse.json(report, { status: 201 });
    } catch (error) {
        console.error('[api/reports/generate] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to start generation' },
            { status: 500 }
        );
    }
}
