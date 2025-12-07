/**
 * T046: LangGraph Report Generation Graph
 * Assembles all nodes with edges per spec.md
 *
 * Graph Flow:
 * __start__ → fetch_planning_context → generate_toc → await_toc_approval
 *     → retrieve_context → generate_section → await_section_feedback
 *     → (loop or finalize) → generate_transmittal_section (if transmittal) → __end__
 */

import { StateGraph, END, START, MemorySaver } from '@langchain/langgraph';
import { ReportState, type ReportStateType } from './state';

// Memory checkpointer for state persistence
const checkpointer = new MemorySaver();
import { fetchPlanningContextNode } from './nodes/fetch-planning-context';
import { generateTocNode } from './nodes/generate-toc';
import { awaitTocApprovalNode, processTocApproval } from './nodes/await-toc-approval';
import { retrieveContextNode } from './nodes/retrieve-context';
import { generateSectionNode } from './nodes/generate-section';
import { awaitSectionFeedbackNode, processSectionFeedback, routeAfterSectionFeedback } from './nodes/await-section-feedback';
import { finalizeNode, routeAfterFinalize } from './nodes/finalize';
import { generateTransmittalSectionNode } from './nodes/generate-transmittal-section';

// ============================================
// Node Wrappers (Return Partial State Updates)
// ============================================

/**
 * Wrapper for fetch_planning_context node
 */
async function fetchPlanningContext(state: ReportStateType): Promise<Partial<ReportStateType>> {
    const result = await fetchPlanningContextNode(state);
    return {
        planningContext: result.planningContext,
        transmittal: result.transmittal,
        status: result.status,
        errorMessage: result.errorMessage,
    };
}

/**
 * Wrapper for generate_toc node
 */
async function generateToc(state: ReportStateType): Promise<Partial<ReportStateType>> {
    const result = await generateTocNode(state);
    return {
        toc: result.toc,
        status: result.status,
    };
}

/**
 * Wrapper for await_toc_approval node
 */
async function awaitTocApproval(state: ReportStateType): Promise<Partial<ReportStateType>> {
    const result = await awaitTocApprovalNode(state);
    return {
        toc: result.toc,
        status: result.status,
        currentSectionIndex: result.currentSectionIndex,
    };
}

/**
 * Wrapper for retrieve_context node
 */
async function retrieveContext(state: ReportStateType): Promise<Partial<ReportStateType>> {
    const result = await retrieveContextNode(state);
    return {
        currentRetrievedChunks: result.currentRetrievedChunks,
        activeSourceIds: result.activeSourceIds,
    };
}

/**
 * Wrapper for generate_section node
 */
async function generateSection(state: ReportStateType): Promise<Partial<ReportStateType>> {
    const result = await generateSectionNode(state);
    return {
        sections: result.sections,
    };
}

/**
 * Wrapper for await_section_feedback node
 */
async function awaitSectionFeedback(state: ReportStateType): Promise<Partial<ReportStateType>> {
    const result = await awaitSectionFeedbackNode(state);
    return {
        userFeedback: result.userFeedback,
        currentSectionIndex: result.currentSectionIndex,
        activeSourceIds: result.activeSourceIds,
        status: result.status,
    };
}

/**
 * Wrapper for finalize node
 */
async function finalize(state: ReportStateType): Promise<Partial<ReportStateType>> {
    const result = await finalizeNode(state);
    return {
        status: result.status,
    };
}

/**
 * Wrapper for generate_transmittal_section node
 */
async function generateTransmittalSection(state: ReportStateType): Promise<Partial<ReportStateType>> {
    const result = await generateTransmittalSectionNode(state);
    return {
        sections: result.sections,
    };
}

// ============================================
// Conditional Edge Functions
// ============================================

/**
 * Route after TOC approval
 * Always goes to retrieve_context to start section generation
 */
function routeAfterTocApproval(state: ReportStateType): string {
    if (state.status === 'failed') {
        return END;
    }
    return 'retrieve_context';
}

/**
 * Route after section feedback
 * Goes to retrieve_context (regenerate/next) or finalize
 */
function routeAfterFeedback(state: ReportStateType): string {
    return routeAfterSectionFeedback(state);
}

/**
 * Route after finalize
 * Goes to transmittal section if exists, otherwise ends
 */
function routeAfterFinalizeEdge(state: ReportStateType): string {
    const route = routeAfterFinalize(state);
    return route === '__end__' ? END : route;
}

// ============================================
// Graph Builder
// ============================================

/**
 * Create the report generation graph
 */
export function createReportGraph() {
    const graph = new StateGraph(ReportState)
        // Add all nodes
        .addNode('fetch_planning_context', fetchPlanningContext)
        .addNode('generate_toc', generateToc)
        .addNode('await_toc_approval', awaitTocApproval)
        .addNode('retrieve_context', retrieveContext)
        .addNode('generate_section', generateSection)
        .addNode('await_section_feedback', awaitSectionFeedback)
        .addNode('finalize', finalize)
        .addNode('generate_transmittal_section', generateTransmittalSection)

        // Add edges
        .addEdge(START, 'fetch_planning_context')
        .addEdge('fetch_planning_context', 'generate_toc')
        .addEdge('generate_toc', 'await_toc_approval')
        .addConditionalEdges('await_toc_approval', routeAfterTocApproval)
        .addEdge('retrieve_context', 'generate_section')
        .addEdge('generate_section', 'await_section_feedback')
        .addConditionalEdges('await_section_feedback', routeAfterFeedback, {
            retrieve_context: 'retrieve_context',
            finalize: 'finalize',
        })
        .addConditionalEdges('finalize', routeAfterFinalizeEdge, {
            generate_transmittal_section: 'generate_transmittal_section',
            [END]: END,
        })
        .addEdge('generate_transmittal_section', END);

    return graph.compile({ checkpointer });
}

// ============================================
// Compiled Graph Export
// ============================================

/**
 * Compiled report generation graph
 * Use this for running workflows
 */
export const reportGraph = createReportGraph();

// ============================================
// Workflow Execution Helpers
// ============================================

/**
 * Start a new report generation workflow
 */
export async function startReportGeneration(input: {
    projectId: string;
    reportType: 'tender_request';
    title: string;
    discipline?: string;
    trade?: string;
    documentSetIds: string[];
    reportId?: string;
    generationMode?: 'data_only' | 'ai_assisted'; // T099: Generation mode for Short/Long RFT
    lockedBy?: string;
    lockedByName?: string;
}): Promise<{ threadId: string; state: ReportStateType }> {
    const { createInitialReportState } = await import('./state');

    const initialState = createInitialReportState({
        ...input,
        generationMode: input.generationMode ?? 'ai_assisted',
    });

    console.log('[graph] Starting report generation for:', input.title);

    // Run the graph until first interrupt (TOC approval)
    const config = { configurable: { thread_id: input.reportId ?? `report-${Date.now()}` } };
    const result = await reportGraph.invoke(initialState, config);

    return {
        threadId: config.configurable.thread_id,
        state: result as ReportStateType,
    };
}

/**
 * Resume workflow after TOC approval
 */
export async function resumeAfterTocApproval(
    threadId: string,
    approvedToc: any
): Promise<ReportStateType> {
    console.log('[graph] Resuming after TOC approval');

    const config = { configurable: { thread_id: threadId } };

    // Resume with the approved TOC
    const result = await reportGraph.invoke(
        { approvedToc },
        { ...config, interrupt_before: ['await_section_feedback'] }
    );

    return result as ReportStateType;
}

/**
 * Resume workflow after section feedback
 */
export async function resumeAfterSectionFeedback(
    threadId: string,
    feedback: {
        action: 'approve' | 'regenerate' | 'skip';
        instructions?: string;
        remainingSources?: string[];
    }
): Promise<ReportStateType> {
    console.log('[graph] Resuming after section feedback:', feedback.action);

    const config = { configurable: { thread_id: threadId } };

    // Resume with the feedback
    const result = await reportGraph.invoke(feedback, config);

    return result as ReportStateType;
}

// ============================================
// Graph Visualization (for debugging)
// ============================================

/**
 * Get graph structure for visualization
 */
export function getGraphStructure(): {
    nodes: string[];
    edges: Array<{ from: string; to: string; condition?: string }>;
} {
    return {
        nodes: [
            'fetch_planning_context',
            'generate_toc',
            'await_toc_approval',
            'retrieve_context',
            'generate_section',
            'await_section_feedback',
            'finalize',
            'generate_transmittal_section',
        ],
        edges: [
            { from: '__start__', to: 'fetch_planning_context' },
            { from: 'fetch_planning_context', to: 'generate_toc' },
            { from: 'generate_toc', to: 'await_toc_approval' },
            { from: 'await_toc_approval', to: 'retrieve_context', condition: 'success' },
            { from: 'await_toc_approval', to: '__end__', condition: 'failed' },
            { from: 'retrieve_context', to: 'generate_section' },
            { from: 'generate_section', to: 'await_section_feedback' },
            { from: 'await_section_feedback', to: 'retrieve_context', condition: 'regenerate or next' },
            { from: 'await_section_feedback', to: 'finalize', condition: 'complete' },
            { from: 'finalize', to: 'generate_transmittal_section', condition: 'has transmittal' },
            { from: 'finalize', to: '__end__', condition: 'no transmittal' },
            { from: 'generate_transmittal_section', to: '__end__' },
        ],
    };
}
