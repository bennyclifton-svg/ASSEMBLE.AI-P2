/**
 * T039: LangGraph ReportState Definition
 * Defines the state annotation for report generation workflow
 *
 * Per spec.md, the state includes:
 * - planningContext: Exact Planning Card data (not RAG-retrieved)
 * - transmittal: Optional transmittal for document schedule
 * - toc: Table of contents with sections
 * - sections: Generated section content with source attribution
 */

import { Annotation } from '@langchain/langgraph';
import type { PlanningContext, TransmittalContext } from '../services/planning-context';
import type { GenerationMode, ContentLength } from '../db/rag-schema';

// ============================================
// Type Definitions
// ============================================

export interface TocSection {
    id: string;
    title: string;
    level: number; // 1=section, 2=subsection
    description?: string;
    estimatedTokens?: number;
}

export interface TableOfContents {
    version: number;
    source: 'memory' | 'generated' | 'fixed';
    sections: TocSection[];
    /** Times this TOC pattern has been used (only for source='memory') - T077 */
    timesUsed?: number;
}

export interface SmartContextSource {
    chunkId: string;
    documentId: string;
    documentTitle: string;
    sectionTitle?: string;
    relevanceScore: number; // 0-100
    excerpt: string;
    isActive: boolean;
}

export interface GeneratedSection {
    id: string;
    title: string;
    content: string;
    sourceChunkIds: string[];
    sourceRelevance: Record<string, number>; // chunkId -> 0-1 score
    sources: SmartContextSource[];
    status: 'pending' | 'generating' | 'complete' | 'regenerating';
    generatedAt?: string;
    regenerationCount: number;
    isAppendix?: boolean;
}

export interface RetrievedChunk {
    chunkId: string;
    documentId: string;
    content: string;
    relevanceScore: number;
    sectionTitle?: string;
    hierarchyPath?: string;
}

export type ReportStatus = 'draft' | 'toc_pending' | 'generating' | 'complete' | 'failed';

export type FeedbackAction = 'approve' | 'regenerate' | 'skip';

export interface UserFeedback {
    action: FeedbackAction;
    sectionIndex: number;
    instructions?: string;
    excludedSourceIds?: string[];
}

// ============================================
// LangGraph State Annotation
// ============================================

/**
 * ReportState defines the complete state for report generation workflow
 *
 * State flows through these phases:
 * 1. Initialization (projectId, title, documentSetIds)
 * 2. fetch_planning_context populates planningContext and transmittal
 * 3. generate_toc creates initial TOC
 * 4. await_toc_approval waits for user to edit/approve TOC
 * 5. For each section:
 *    - retrieve_context fetches RAG chunks
 *    - generate_section creates content with streaming
 *    - await_section_feedback waits for user approval/regeneration
 * 6. finalize marks report complete
 * 7. If transmittal exists: generate_transmittal_section adds appendix
 */
export const ReportState = Annotation.Root({
    // ---- Input/Configuration ----
    /** Project ID for context fetching */
    projectId: Annotation<string>,

    /** Report type (V1 only supports tender_request) */
    reportType: Annotation<'tender_request'>,

    /** Report title */
    title: Annotation<string>,

    /** Target discipline (e.g., "Fire Services") - for consultant tender */
    discipline: Annotation<string | null>,

    /** Target trade (e.g., "Electrical") - for contractor tender */
    trade: Annotation<string | null>,

    /** Document set IDs for RAG context */
    documentSetIds: Annotation<string[]>,

    /** Report ID in database */
    reportId: Annotation<string | null>,

    /** T099: Report generation mode */
    generationMode: Annotation<GenerationMode>,

    /** T099l: Content length for Long RFT AI generation */
    contentLength: Annotation<ContentLength | null>,

    /** T099k: Template baseline content from Short RFT (used as base for Long RFT) */
    templateBaseline: Annotation<string | null>,

    // ---- Hybrid Context ----
    /** EXACT Planning Card data (fetched once at start) */
    planningContext: Annotation<PlanningContext | null>,

    /** Optional transmittal for discipline (fetched at start) */
    transmittal: Annotation<TransmittalContext | null>,

    // ---- TOC ----
    /** Table of contents (generated or from memory) */
    toc: Annotation<TableOfContents | null>,

    // ---- Section Generation ----
    /** Current section index being processed */
    currentSectionIndex: Annotation<number>,

    /** Generated sections with content and sources */
    sections: Annotation<GeneratedSection[]>,

    /** Retrieved RAG chunks for current section */
    currentRetrievedChunks: Annotation<RetrievedChunk[]>,

    /** Active source IDs (user can toggle off) */
    activeSourceIds: Annotation<string[]>,

    // ---- User Interaction ----
    /** User feedback for current section */
    userFeedback: Annotation<UserFeedback | null>,

    // ---- Status ----
    /** Current workflow status */
    status: Annotation<ReportStatus>,

    /** Error message if failed */
    errorMessage: Annotation<string | null>,

    // ---- Locking ----
    /** User ID who owns the lock */
    lockedBy: Annotation<string | null>,

    /** Display name of lock owner */
    lockedByName: Annotation<string | null>,

    /** When lock was acquired */
    lockedAt: Annotation<string | null>,
});

// Type alias for the state type
export type ReportStateType = typeof ReportState.State;

// ============================================
// Initial State Factory
// ============================================

/**
 * Create initial state for a new report generation
 */
export function createInitialReportState(input: {
    projectId: string;
    reportType: 'tender_request';
    title: string;
    discipline?: string;
    trade?: string;
    documentSetIds: string[];
    reportId?: string;
    generationMode?: GenerationMode;
    contentLength?: ContentLength; // T099l
    lockedBy?: string;
    lockedByName?: string;
}): ReportStateType {
    return {
        projectId: input.projectId,
        reportType: input.reportType,
        title: input.title,
        discipline: input.discipline ?? null,
        trade: input.trade ?? null,
        documentSetIds: input.documentSetIds,
        reportId: input.reportId ?? null,
        generationMode: input.generationMode ?? 'ai_assisted',
        contentLength: input.contentLength ?? null, // T099l
        templateBaseline: null, // T099k: Set during generation
        planningContext: null,
        transmittal: null,
        toc: null,
        currentSectionIndex: 0,
        sections: [],
        currentRetrievedChunks: [],
        activeSourceIds: [],
        userFeedback: null,
        status: 'draft',
        errorMessage: null,
        lockedBy: input.lockedBy ?? null,
        lockedByName: input.lockedByName ?? null,
        lockedAt: input.lockedBy ? new Date().toISOString() : null,
    };
}

// ============================================
// State Update Helpers
// ============================================

/**
 * Check if report generation is complete
 */
export function isReportComplete(state: ReportStateType): boolean {
    if (!state.toc) return false;
    return state.currentSectionIndex >= state.toc.sections.length;
}

/**
 * Get current section being processed
 */
export function getCurrentSection(state: ReportStateType): TocSection | null {
    if (!state.toc) return null;
    if (state.currentSectionIndex >= state.toc.sections.length) return null;
    return state.toc.sections[state.currentSectionIndex];
}

/**
 * Check if transmittal appendix should be generated
 */
export function shouldGenerateTransmittalAppendix(state: ReportStateType): boolean {
    return state.transmittal !== null && state.transmittal.documents.length > 0;
}

/**
 * Get progress percentage
 */
export function getProgressPercentage(state: ReportStateType): number {
    if (!state.toc || state.toc.sections.length === 0) return 0;
    return Math.round((state.currentSectionIndex / state.toc.sections.length) * 100);
}

// ============================================
// Interrupt Data Types
// ============================================

/**
 * Data passed to user during TOC approval interrupt
 */
export interface TocApprovalInterrupt {
    type: 'toc_approval';
    toc: TableOfContents;
    message: string;
}

/**
 * Data passed to user during section feedback interrupt
 */
export interface SectionFeedbackInterrupt {
    type: 'section_feedback';
    section: GeneratedSection;
    sources: SmartContextSource[];
    message: string;
}

export type InterruptData = TocApprovalInterrupt | SectionFeedbackInterrupt;
