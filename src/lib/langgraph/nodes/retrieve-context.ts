/**
 * T042: Retrieve Context Node
 * Combines hybrid context sources for section generation
 *
 * This node:
 * 1. Uses planningContext from state (exact Planning Card data, already fetched)
 * 2. Retrieves ragChunks via src/lib/rag/retrieval.ts (document embeddings)
 * 3. Returns { planningContext, ragChunks } for section generation
 */

import type {
    ReportStateType,
    RetrievedChunk,
    TocSection,
    SmartContextSource,
} from '../state';
import { retrieve, type RetrievalResult } from '../../rag/retrieval';
import { formatPlanningContextForPrompt } from '../../services/planning-context';

export interface RetrieveContextResult {
    currentRetrievedChunks: RetrievedChunk[];
    activeSourceIds: string[];
}

/**
 * Build retrieval query for a section
 */
function buildRetrievalQuery(section: TocSection, state: ReportStateType): string {
    const parts: string[] = [];

    // Section title and description
    parts.push(section.title);
    if (section.description) {
        parts.push(section.description);
    }

    // Add discipline context
    if (state.discipline) {
        parts.push(state.discipline);
    }

    // Add project name for context
    if (state.planningContext?.details.projectName) {
        parts.push(state.planningContext.details.projectName);
    }

    return parts.join(' ');
}

/**
 * Convert retrieval results to our chunk format
 */
function convertToRetrievedChunks(results: RetrievalResult[]): RetrievedChunk[] {
    return results.map(r => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        content: r.content,
        relevanceScore: r.relevanceScore,
        sectionTitle: r.sectionTitle ?? undefined,
        hierarchyPath: r.hierarchyPath ?? undefined,
    }));
}

/**
 * Create smart context sources from chunks
 */
function createSmartContextSources(
    chunks: RetrievedChunk[],
    excludedIds: string[] = []
): SmartContextSource[] {
    return chunks.map(chunk => ({
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        documentTitle: chunk.sectionTitle ?? 'Document',
        sectionTitle: chunk.sectionTitle,
        relevanceScore: Math.round(chunk.relevanceScore * 100),
        excerpt: chunk.content.slice(0, 150) + (chunk.content.length > 150 ? '...' : ''),
        isActive: !excludedIds.includes(chunk.chunkId),
    }));
}

/**
 * Retrieve context node
 * Fetches RAG chunks for the current section
 */
export async function retrieveContextNode(
    state: ReportStateType
): Promise<RetrieveContextResult> {
    console.log('[retrieve-context] Retrieving context for section:', state.currentSectionIndex);

    if (!state.toc) {
        throw new Error('No TOC available for retrieval');
    }

    const currentSection = state.toc.sections[state.currentSectionIndex];
    if (!currentSection) {
        throw new Error(`Section not found at index ${state.currentSectionIndex}`);
    }

    // Skip RAG retrieval for transmittal appendix
    if (currentSection.id === 'appendix-a-transmittal' ||
        currentSection.title.toLowerCase().includes('transmittal')) {
        console.log('[retrieve-context] Skipping RAG retrieval for transmittal section');
        return {
            currentRetrievedChunks: [],
            activeSourceIds: [],
        };
    }

    try {
        // Build retrieval query
        const query = buildRetrievalQuery(currentSection, state);
        console.log('[retrieve-context] Query:', query);

        // Get excluded source IDs from user feedback
        const excludedIds = state.userFeedback?.excludedSourceIds ?? [];

        // Retrieve chunks from RAG pipeline
        // Use documentSetIds to query across all selected repos (multi-repo support)
        const results = await retrieve(query, {
            documentSetIds: state.documentSetIds.length > 0 ? state.documentSetIds : undefined,
            topK: 20,
            rerankTopK: 5,
            minRelevanceScore: 0.3,
        });

        console.log('[retrieve-context] Retrieved', results.length, 'chunks');

        // Convert to our format
        const chunks = convertToRetrievedChunks(results);

        // Filter out excluded sources
        const activeChunks = chunks.filter(c => !excludedIds.includes(c.chunkId));

        return {
            currentRetrievedChunks: chunks,
            activeSourceIds: activeChunks.map(c => c.chunkId),
        };
    } catch (error) {
        console.error('[retrieve-context] Error retrieving context:', error);

        // Return empty on error - section can still be generated with planning context
        return {
            currentRetrievedChunks: [],
            activeSourceIds: [],
        };
    }
}

/**
 * Format hybrid context for section prompt
 */
export function formatHybridContext(state: ReportStateType): string {
    const sections: string[] = [];

    // Planning Context (Exact)
    if (state.planningContext) {
        sections.push('## Project Context (Exact - from Planning Card)\n');
        sections.push(formatPlanningContextForPrompt(state.planningContext));
    }

    // RAG Context (Retrieved)
    if (state.currentRetrievedChunks.length > 0) {
        sections.push('\n\n## Document Context (Retrieved)\n');

        const activeChunks = state.currentRetrievedChunks.filter(c =>
            state.activeSourceIds.includes(c.chunkId)
        );

        for (const chunk of activeChunks) {
            sections.push(`### Source: ${chunk.sectionTitle || 'Document'}`);
            sections.push(`[Relevance: ${Math.round(chunk.relevanceScore * 100)}%]`);
            sections.push(chunk.content);
            sections.push('---');
        }
    }

    return sections.join('\n');
}

/**
 * Get sources for Smart Context panel
 */
export function getSmartContextSources(state: ReportStateType): SmartContextSource[] {
    return createSmartContextSources(
        state.currentRetrievedChunks,
        state.userFeedback?.excludedSourceIds ?? []
    );
}
