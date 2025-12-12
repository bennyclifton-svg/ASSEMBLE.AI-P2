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
import { reportTemplates, reportSections, type GenerationMode, type ContentLength, type TableOfContents as RagTableOfContents } from '@/lib/db/rag-schema';
import { eq, and } from 'drizzle-orm';
import { validateToc } from '@/lib/langgraph/nodes/await-toc-approval';
import type { TableOfContents, ReportStateType, GeneratedSection } from '@/lib/langgraph/state';
import { v4 as uuidv4 } from 'uuid';
import { setProgressEmitter, generateSectionNode, generateDataOnlySection } from '@/lib/langgraph/nodes/generate-section';
import { createProgressEmitter, emitReportEvent } from '../stream/route';
import { fetchPlanningContext, fetchTransmittalForDiscipline, formatTransmittalAsMarkdown } from '@/lib/services/planning-context';
import { retrieveContextNode } from '@/lib/langgraph/nodes/retrieve-context';
import { captureReportMemory } from '@/lib/rag/memory';

interface RouteParams {
    params: Promise<{ id: string }>;
}

interface ApproveTocRequest {
    tableOfContents: TableOfContents;
    generationMode?: GenerationMode;
    contentLength?: ContentLength; // T099l: Content length for Long RFT
    disciplineId?: string; // Optional: for updating legacy reports missing disciplineId
    tradeId?: string; // Optional: for updating legacy reports missing tradeId
}

/**
 * T099f: Generate all sections directly (bypassing LangGraph's broken checkpoint resume)
 * Routes to data-only or AI-assisted generation based on generationMode
 *
 * T099k FIX: For AI-assisted mode (Long RFT), the correct sequence is:
 * 1. FIRST call generateDataOnlySection() to get template baseline (same as Short RFT)
 * 2. THEN call retrieveContextNode() to get RAG chunks
 * 3. FINALLY call generateSectionNode() with both template baseline AND RAG chunks
 */
async function generateAllSections(
    reportId: string,
    projectId: string,
    disciplineId: string | null,
    tradeId: string | null,
    toc: TableOfContents,
    documentSetIds: string[],
    generationMode: GenerationMode,
    contentLength: ContentLength = 'concise' // T099l: Content length for Long RFT
): Promise<void> {
    console.log('[approve-toc] Starting direct section generation for report:', reportId);
    console.log('[approve-toc] Generation mode:', generationMode);
    console.log('[approve-toc] Content length:', contentLength);

    // Fetch planning context from SQLite
    const planningContext = await fetchPlanningContext(projectId);
    if (!planningContext) {
        throw new Error('Failed to fetch planning context');
    }

    // Look up discipline/trade name from ID using planning context
    let disciplineName: string | null = null;
    let tradeName: string | null = null;

    if (disciplineId) {
        const discipline = planningContext.disciplines.find(d => d.id === disciplineId);
        disciplineName = discipline?.name ?? null;
        console.log('[approve-toc] Found discipline:', disciplineName, 'for ID:', disciplineId);
    }

    if (tradeId) {
        const trade = planningContext.trades.find(t => t.id === tradeId);
        tradeName = trade?.name ?? null;
        console.log('[approve-toc] Found trade:', tradeName, 'for ID:', tradeId);
    }

    // Fetch transmittal if discipline ID specified (use ID directly, not name lookup)
    let transmittal = null;
    if (disciplineId) {
        console.log('[approve-toc] Fetching transmittal for disciplineId:', disciplineId);
        transmittal = await fetchTransmittalForDiscipline(projectId, disciplineId);
        console.log('[approve-toc] Transmittal result:', transmittal ? `Found with ${transmittal.documents.length} docs` : 'Not found');
    } else {
        console.log('[approve-toc] No disciplineId, skipping transmittal fetch');
    }

    // Build initial state
    let state: ReportStateType = {
        projectId,
        reportType: 'tender_request',
        title: '', // Will be populated from report
        discipline: disciplineName, // Discipline name looked up from ID
        trade: tradeName,
        documentSetIds,
        reportId,
        generationMode, // T099f: Pass generation mode to state
        contentLength, // T099l: Pass content length to state
        templateBaseline: null, // T099k: Will be set per-section for AI-assisted mode
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
                console.log('[approve-toc] Using data-only mode (Short RFT)');
                sectionResult = await generateDataOnlySection(state);
                state = { ...state, sections: sectionResult.sections };
            } else {
                // T099k FIX: AI-assisted mode (Long RFT) follows a SEQUENTIAL process:
                // 1. FIRST: Generate template baseline (same as Short RFT)
                // 2. THEN: RAG retrieval for additional context
                // 3. FINALLY: AI enhancement with both template + RAG context
                console.log('[approve-toc] Using AI-assisted mode (Long RFT)');

                // Step 1: Generate template baseline (same as Short RFT)
                console.log('[approve-toc] Step 1: Generating template baseline');
                const templateResult = await generateDataOnlySection(state);
                const templateBaseline = templateResult.sections[state.currentSectionIndex]?.content ?? '';
                console.log('[approve-toc] Template baseline length:', templateBaseline.length);

                // Step 2: Retrieve RAG context for this section
                console.log('[approve-toc] Step 2: Retrieving RAG context');
                const contextResult = await retrieveContextNode(state);
                state = {
                    ...state,
                    currentRetrievedChunks: contextResult.currentRetrievedChunks,
                    activeSourceIds: contextResult.activeSourceIds,
                    templateBaseline, // T099k: Pass template baseline to AI generation
                };

                // Step 3: Generate AI-enhanced section content
                console.log('[approve-toc] Step 3: Generating AI-enhanced content');
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

    // Track whether we dynamically add a transmittal section
    let finalSectionCount = toc.sections.length;
    let finalToc = toc; // Track the final TOC (may include dynamically added transmittal)

    // Generate transmittal appendix if exists
    if (transmittal && transmittal.documents.length > 0) {
        console.log('[approve-toc] Generating transmittal appendix with', transmittal.documents.length, 'documents');

        const transmittalContent = formatTransmittalAsMarkdown(transmittal);
        console.log('[approve-toc] Generated transmittal content length:', transmittalContent.length);
        console.log('[approve-toc] Transmittal content preview:', transmittalContent.substring(0, 200));

        // Find existing transmittal section in TOC
        let appendixIndex = toc.sections.findIndex(
            s => s.id === 'appendix-a-transmittal' ||
                s.id === 'transmittal' ||
                s.title.toLowerCase().includes('transmittal')
        );

        console.log('[approve-toc] Found appendix section at index:', appendixIndex);

        // FIX: If transmittal section doesn't exist in TOC but transmittal has documents,
        // dynamically add the section to ensure it appears in the report
        if (appendixIndex < 0) {
            console.log('[approve-toc] Transmittal section missing from TOC - adding dynamically');

            // The new section will be added at the end
            appendixIndex = toc.sections.length;
            finalSectionCount = toc.sections.length + 1; // Increment count for dynamically added section

            // Insert new section into database
            await ragDb.insert(reportSections).values({
                id: uuidv4(),
                reportId,
                sectionIndex: appendixIndex,
                title: 'Transmittal',
                content: transmittalContent,
                sourceChunkIds: [],
                sourceRelevance: null,
                status: 'complete',
                generatedAt: new Date(),
                regenerationCount: 0,
                createdAt: new Date(),
            });

            // Update the TOC in the report to include the new section
            finalToc = {
                ...toc,
                sections: [
                    ...toc.sections,
                    { id: 'transmittal', title: 'Transmittal', level: 1 }
                ],
            };

            await ragDb.update(reportTemplates)
                .set({
                    tableOfContents: finalToc,
                    updatedAt: new Date(),
                })
                .where(eq(reportTemplates.id, reportId));

            console.log('[approve-toc] Dynamically added Transmittal section at index:', appendixIndex);
        } else {
            // Update existing section
            console.log('[approve-toc] Updating section at index:', appendixIndex, 'for reportId:', reportId);
            await ragDb.update(reportSections)
                .set({
                    content: transmittalContent,
                    status: 'complete',
                })
                .where(and(
                    eq(reportSections.reportId, reportId),
                    eq(reportSections.sectionIndex, appendixIndex)
                ));
            console.log('[approve-toc] Transmittal section updated successfully');
        }

        // Emit completion event for appendix
        emitReportEvent(reportId, 'section_complete', {
            sectionIndex: appendixIndex,
            title: 'Transmittal',
        });
    } else {
        console.log('[approve-toc] Skipping transmittal appendix:', transmittal ? `Found but ${transmittal.documents.length} documents` : 'No transmittal');
    }

    // Mark report as complete
    await ragDb.update(reportTemplates)
        .set({
            status: 'complete',
            currentSectionIndex: finalSectionCount,
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
            discipline: disciplineName ?? tradeName, // Use discipline or trade name
            tableOfContents: finalToc as RagTableOfContents, // Use finalToc which may include dynamically added transmittal
        });
        console.log('[approve-toc] Report memory captured successfully');
    } catch (error) {
        // Log error but don't fail the report
        console.error('[approve-toc] Failed to capture report memory:', error);
    }

    // Emit completion event
    emitReportEvent(reportId, 'complete', {
        totalSections: finalSectionCount,
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

        // T099 DEBUG: Log report disciplineId to trace transmittal issue
        console.log('[approve-toc] Report fetched:', {
            id: report.id,
            projectId: report.projectId,
            disciplineId: report.disciplineId,
            tradeId: report.tradeId,
            status: report.status,
        });

        // FIX: Update report with disciplineId/tradeId if missing but provided in request
        // This handles legacy reports created before disciplineId was being saved
        const effectiveDisciplineId = report.disciplineId ?? body.disciplineId ?? null;
        const effectiveTradeId = report.tradeId ?? body.tradeId ?? null;

        if ((body.disciplineId && !report.disciplineId) || (body.tradeId && !report.tradeId)) {
            console.log('[approve-toc] Updating report with missing disciplineId/tradeId:', {
                disciplineId: effectiveDisciplineId,
                tradeId: effectiveTradeId,
            });
            await ragDb.update(reportTemplates)
                .set({
                    disciplineId: effectiveDisciplineId,
                    tradeId: effectiveTradeId,
                    updatedAt: new Date(),
                })
                .where(eq(reportTemplates.id, id));
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
                generatedAt: null, // Not generated yet
                regenerationCount: 0,
                createdAt: new Date(),
            });
        }

        // Set up progress emitter for SSE streaming
        setProgressEmitter(createProgressEmitter(id));

        // Start generation directly (bypassing broken LangGraph checkpoint resume)
        // Use request body generationMode if provided, then fall back to DB, then default
        const effectiveGenerationMode = body.generationMode ?? report.generationMode ?? 'ai_assisted';
        const effectiveContentLength = body.contentLength ?? (report.contentLength as ContentLength) ?? 'concise'; // T099l

        console.log('[approve-toc] Starting generateAllSections with:', {
            disciplineId: effectiveDisciplineId,
            tradeId: effectiveTradeId,
            generationMode: effectiveGenerationMode,
        });

        generateAllSections(
            id,
            report.projectId,
            effectiveDisciplineId,
            effectiveTradeId,
            updatedToc,
            report.documentSetIds as string[] ?? [],
            effectiveGenerationMode,
            effectiveContentLength // T099l
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
