/**
 * T050: POST /api/reports/[id]/approve-toc
 * Approve TOC and start section generation
 *
 * NOTE: This route directly generates sections without relying on LangGraph's
 * checkpoint-based resume functionality. This is because MemorySaver (in-memory)
 * doesn't persist across serverless function invocations.
 *
 * T072: Captures report memory when generation completes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections, type GenerationMode } from '@/lib/db/rag-schema';
import { eq, and } from 'drizzle-orm';
import { validateToc } from '@/lib/langgraph/nodes/await-toc-approval';
import type { TableOfContents, ReportStateType, GeneratedSection } from '@/lib/langgraph/state';
import { v4 as uuidv4 } from 'uuid';
import { setProgressEmitter, generateSectionNode, generateDataOnlySection } from '@/lib/langgraph/nodes/generate-section';
import { createProgressEmitter, emitReportEvent } from '../stream/route';
import { fetchPlanningContext, fetchTransmittalForDiscipline, findDisciplineByName, formatTransmittalAsMarkdown } from '@/lib/services/planning-context';
import { retrieveContextNode } from '@/lib/langgraph/nodes/retrieve-context';
import { captureReportMemory } from '@/lib/rag/memory';

interface RouteParams {
    params: Promise<{ id: string }>;
}

interface ApproveTocRequest {
    tableOfContents: TableOfContents;
}

/**
 * T099f: Generate all sections directly (bypassing LangGraph's broken checkpoint resume)
 * Routes to data-only or AI-assisted generation based on generationMode
 */
async function generateAllSections(
    reportId: string,
    projectId: string,
    discipline: string | null,
    toc: TableOfContents,
    documentSetIds: string[],
    generationMode: GenerationMode
): Promise<void> {
    console.log('[approve-toc] Starting direct section generation for report:', reportId);
    console.log('[approve-toc] Generation mode:', generationMode);

    // Fetch planning context from SQLite
    const planningContext = await fetchPlanningContext(projectId);
    if (!planningContext) {
        throw new Error('Failed to fetch planning context');
    }

    // Fetch transmittal if discipline specified
    let transmittal = null;
    if (discipline) {
        const disciplineRecord = await findDisciplineByName(projectId, discipline);
        if (disciplineRecord) {
            transmittal = await fetchTransmittalForDiscipline(projectId, disciplineRecord.id);
        }
    }

    // Build initial state
    let state: ReportStateType = {
        projectId,
        reportType: 'tender_request',
        title: '', // Will be populated from report
        discipline: discipline ?? null,
        trade: null,
        documentSetIds,
        reportId,
        generationMode, // T099f: Pass generation mode to state
        planningContext,
        transmittal,
        toc,
        currentSectionIndex: 0,
        sections: [],
        currentRetrievedChunks: [],
        activeSourceIds: [],
        userFeedback: null,
        status: 'generating',
        errorMessage: null,
        lockedBy: null,
        lockedByName: null,
        lockedAt: null,
    };

    // Generate each section
    for (let i = 0; i < toc.sections.length; i++) {
        const section = toc.sections[i];
        console.log(`[approve-toc] Generating section ${i + 1}/${toc.sections.length}: ${section.title}`);

        // Update current section index
        state = { ...state, currentSectionIndex: i };

        // Skip transmittal appendix (handled separately at end)
        if (section.id === 'appendix-a-transmittal' ||
            section.title.toLowerCase().includes('transmittal')) {
            console.log('[approve-toc] Skipping transmittal section (will be generated at end)');
            continue;
        }

        try {
            // T099f: Route by generation mode
            let sectionResult;

            if (generationMode === 'data_only') {
                // Data-only mode: template-based rendering (no RAG retrieval)
                console.log('[approve-toc] Using data-only mode');
                sectionResult = await generateDataOnlySection(state);
                state = { ...state, sections: sectionResult.sections };
            } else {
                // AI-assisted mode: full RAG retrieval and AI generation
                console.log('[approve-toc] Using AI-assisted mode');

                // Retrieve context for this section
                const contextResult = await retrieveContextNode(state);
                state = {
                    ...state,
                    currentRetrievedChunks: contextResult.currentRetrievedChunks,
                    activeSourceIds: contextResult.activeSourceIds,
                };

                // Generate section content with AI
                sectionResult = await generateSectionNode(state);
                state = { ...state, sections: sectionResult.sections };
            }

            // Update database with generated section
            await ragDb.update(reportSections)
                .set({
                    content: sectionResult.sections[i]?.content ?? '',
                    status: 'complete',
                    sourceChunkIds: sectionResult.sections[i]?.sourceChunkIds ?? [],
                    sourceRelevance: sectionResult.sections[i]?.sourceRelevance ?? {},
                })
                .where(and(
                    eq(reportSections.reportId, reportId),
                    eq(reportSections.sectionIndex, i)
                ));

            // Update report progress
            await ragDb.update(reportTemplates)
                .set({
                    currentSectionIndex: i + 1,
                    updatedAt: new Date(),
                })
                .where(eq(reportTemplates.id, reportId));

            console.log(`[approve-toc] Section ${i + 1} complete`);

        } catch (error) {
            console.error(`[approve-toc] Error generating section ${i}:`, error);

            // Mark section as failed but continue with others
            await ragDb.update(reportSections)
                .set({
                    content: `*Error generating section: ${error instanceof Error ? error.message : 'Unknown error'}*`,
                    status: 'complete',
                })
                .where(and(
                    eq(reportSections.reportId, reportId),
                    eq(reportSections.sectionIndex, i)
                ));
        }
    }

    // Generate transmittal appendix if exists
    if (transmittal && transmittal.documents.length > 0) {
        console.log('[approve-toc] Generating transmittal appendix');

        const transmittalContent = formatTransmittalAsMarkdown(transmittal);

        // Find or create appendix section
        const appendixIndex = toc.sections.findIndex(
            s => s.id === 'appendix-a-transmittal' ||
                s.title.toLowerCase().includes('transmittal')
        );

        if (appendixIndex >= 0) {
            await ragDb.update(reportSections)
                .set({
                    content: transmittalContent,
                    status: 'complete',
                })
                .where(and(
                    eq(reportSections.reportId, reportId),
                    eq(reportSections.sectionIndex, appendixIndex)
                ));
        }

        // Emit completion event for appendix
        emitReportEvent(reportId, 'section_complete', {
            sectionIndex: appendixIndex,
            title: 'Transmittal',
        });
    }

    // Mark report as complete
    await ragDb.update(reportTemplates)
        .set({
            status: 'complete',
            currentSectionIndex: toc.sections.length,
            updatedAt: new Date(),
        })
        .where(eq(reportTemplates.id, reportId));

    // T072: Capture report memory for TOC learning
    try {
        console.log('[approve-toc] Capturing report memory');
        await captureReportMemory({
            reportId,
            organizationId: 'org_default', // TODO: Get from user context
            reportType: 'tender_request',
            discipline,
            tableOfContents: toc,
        });
        console.log('[approve-toc] Report memory captured successfully');
    } catch (error) {
        // Log error but don't fail the report
        console.error('[approve-toc] Failed to capture report memory:', error);
    }

    // Emit completion event
    emitReportEvent(reportId, 'complete', {
        totalSections: toc.sections.length,
    });

    console.log('[approve-toc] Report generation complete');
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body: ApproveTocRequest = await request.json();

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
        // TODO: Get user from session and verify lock
        if (report.lockedBy && report.lockedBy !== 'user-placeholder') {
            return NextResponse.json(
                {
                    error: 'Report is locked by another user',
                    lockedBy: report.lockedBy,
                    lockedByName: report.lockedByName,
                    lockedAt: report.lockedAt?.toISOString(),
                },
                { status: 409 }
            );
        }

        // Validate TOC
        const validation = validateToc(body.tableOfContents);
        if (!validation.valid) {
            return NextResponse.json(
                { error: 'Invalid TOC', details: validation.errors },
                { status: 400 }
            );
        }

        // Update report with approved TOC
        const updatedToc: TableOfContents = {
            ...body.tableOfContents,
            version: (body.tableOfContents.version || 0) + 1,
        };

        await ragDb.update(reportTemplates)
            .set({
                tableOfContents: updatedToc,
                status: 'generating',
                currentSectionIndex: 0,
                updatedAt: new Date(),
            })
            .where(eq(reportTemplates.id, id));

        // Create pending sections in database
        for (let i = 0; i < updatedToc.sections.length; i++) {
            const section = updatedToc.sections[i];
            await ragDb.insert(reportSections).values({
                id: uuidv4(),
                reportId: id,
                sectionIndex: i,
                title: section.title,
                content: null,
                sourceChunkIds: [],
                sourceRelevance: null,
                status: 'pending',
                regenerationCount: 0,
                createdAt: new Date(),
            });
        }

        // Set up progress emitter for SSE streaming
        setProgressEmitter(createProgressEmitter(id));

        // Start generation directly (bypassing broken LangGraph checkpoint resume)
        generateAllSections(
            id,
            report.projectId,
            report.discipline,
            updatedToc,
            report.documentSetIds as string[] ?? [],
            report.generationMode ?? 'ai_assisted' // T099f: Pass generation mode
        ).catch(async (error) => {
            console.error('[approve-toc] Error in generation:', error);
            // Update status to failed
            await ragDb.update(reportTemplates)
                .set({ status: 'failed', updatedAt: new Date() })
                .where(eq(reportTemplates.id, id));

            // Emit error event
            emitReportEvent(id, 'error', {
                message: error instanceof Error ? error.message : 'Generation failed',
            });
        });

        return NextResponse.json({
            status: 'generating',
            nextSection: 0,
        });
    } catch (error) {
        console.error('[api/reports/[id]/approve-toc] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to approve TOC' },
            { status: 500 }
        );
    }
}
