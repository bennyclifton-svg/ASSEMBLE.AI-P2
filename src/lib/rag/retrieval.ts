/**
 * T017: Retrieval Pipeline
 * 4-stage RAG pipeline: embed → pgvector → rerank → enrich
 * Per spec.md and research.md
 */

import { ragDb } from '../db/rag-client';
import { documentChunks } from '../db/rag-schema';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import { rerankDocuments, simpleRelevanceScore } from './reranking';
import { sql, and, eq, inArray } from 'drizzle-orm';

export interface RetrievalResult {
    chunkId: string;
    documentId: string;
    content: string;
    relevanceScore: number;
    hierarchyLevel: number;
    hierarchyPath: string | null;
    sectionTitle: string | null;
    clauseNumber: string | null;
}

export interface RetrievalOptions {
    documentSetIds?: string[];
    documentIds?: string[];
    topK?: number;
    rerankTopK?: number;
    includeParentContext?: boolean;
    minRelevanceScore?: number;
}

const DEFAULT_TOP_K = 20; // Initial vector search results
const DEFAULT_RERANK_TOP_K = 5; // Final reranked results
const MIN_RELEVANCE_SCORE = 0.1; // Low threshold to allow fallback scoring to pass

/**
 * Stage 1: Generate query embedding
 */
async function embedQuery(query: string): Promise<number[]> {
    console.log('[retrieval] Stage 1: Embedding query');
    const result = await generateEmbedding(query);
    return result.embedding;
}

/**
 * Stage 2: Vector similarity search with pgvector
 */
async function vectorSearch(
    queryEmbedding: number[],
    options: RetrievalOptions
): Promise<Array<{
    id: string;
    documentId: string;
    content: string;
    hierarchyLevel: number;
    hierarchyPath: string | null;
    sectionTitle: string | null;
    clauseNumber: string | null;
    distance: number;
}>> {
    console.log('[retrieval] Stage 2: Vector search');

    const topK = options.topK || DEFAULT_TOP_K;
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build document filter clause
    // Format array as PostgreSQL array literal for ANY() operator
    const documentFilter = options.documentIds && options.documentIds.length > 0
        ? sql`AND document_id = ANY(${`{${options.documentIds.join(',')}}`}::text[])`
        : sql``;

    // Build base query with cosine distance
    // Using raw SQL for pgvector operations
    const results = await ragDb.execute(sql`
        SELECT
            id,
            document_id as "documentId",
            content,
            hierarchy_level as "hierarchyLevel",
            hierarchy_path as "hierarchyPath",
            section_title as "sectionTitle",
            clause_number as "clauseNumber",
            embedding <=> ${embeddingStr}::vector as distance
        FROM document_chunks
        WHERE embedding IS NOT NULL
        ${documentFilter}
        ORDER BY distance ASC
        LIMIT ${topK}
    `);

    return (results.rows || []) as Array<{
        id: string;
        documentId: string;
        content: string;
        hierarchyLevel: number;
        hierarchyPath: string | null;
        sectionTitle: string | null;
        clauseNumber: string | null;
        distance: number;
    }>;
}

/**
 * Stage 3: Rerank results for relevance
 */
async function rerank(
    query: string,
    candidates: Array<{
        id: string;
        documentId: string;
        content: string;
        hierarchyLevel: number;
        hierarchyPath: string | null;
        sectionTitle: string | null;
        clauseNumber: string | null;
        distance: number;
    }>,
    topK: number
): Promise<RetrievalResult[]> {
    console.log('[retrieval] Stage 3: Reranking');

    if (candidates.length === 0) {
        return [];
    }

    const documents = candidates.map(c => c.content);

    try {
        // Try external reranking services
        const reranked = await rerankDocuments(query, documents, { topK });

        return reranked.map(r => {
            const original = candidates[r.index];
            return {
                chunkId: original.id,
                documentId: original.documentId,
                content: original.content,
                relevanceScore: r.relevanceScore,
                hierarchyLevel: original.hierarchyLevel,
                hierarchyPath: original.hierarchyPath,
                sectionTitle: original.sectionTitle,
                clauseNumber: original.clauseNumber,
            };
        });
    } catch (error) {
        // Fallback to vector distance-based scoring
        // Since vector search already found relevant matches, use distance as relevance
        console.warn('[retrieval] Reranking failed, using vector distance scoring:', error);

        // Convert cosine distance to similarity score (lower distance = higher similarity)
        // Cosine distance ranges 0-2, but similar docs are typically 0-1
        // We use 1 - distance, clamped to [0, 1]
        const scored = candidates.map(c => ({
            ...c,
            relevanceScore: Math.max(0, Math.min(1, 1 - c.distance)),
        }));

        // Already sorted by distance ASC from vector search, so best matches are first
        return scored.slice(0, topK).map(c => ({
            chunkId: c.id,
            documentId: c.documentId,
            content: c.content,
            relevanceScore: c.relevanceScore,
            hierarchyLevel: c.hierarchyLevel,
            hierarchyPath: c.hierarchyPath,
            sectionTitle: c.sectionTitle,
            clauseNumber: c.clauseNumber,
        }));
    }
}

/**
 * Stage 4: Enrich with parent context
 */
async function enrichWithContext(
    results: RetrievalResult[],
    includeParentContext: boolean
): Promise<RetrievalResult[]> {
    if (!includeParentContext || results.length === 0) {
        return results;
    }

    console.log('[retrieval] Stage 4: Enriching with parent context');

    // Get unique parent chunk IDs
    const chunkIds = results.map(r => r.chunkId);

    // Fetch parent chunks for hierarchical context
    const chunkIdsArray = `{${chunkIds.join(',')}}`;
    const parentChunks = await ragDb.execute(sql`
        SELECT
            c.id,
            c.content,
            c.section_title as "sectionTitle",
            p.id as "parentId",
            p.content as "parentContent",
            p.section_title as "parentSectionTitle"
        FROM document_chunks c
        LEFT JOIN document_chunks p ON c.parent_chunk_id = p.id
        WHERE c.id = ANY(${chunkIdsArray}::text[])
    `);

    // Create lookup map
    const parentMap = new Map<string, { parentContent: string; parentTitle: string | null }>();
    for (const row of (parentChunks.rows || []) as any[]) {
        if (row.parentId && row.parentContent) {
            parentMap.set(row.id, {
                parentContent: row.parentContent,
                parentTitle: row.parentSectionTitle,
            });
        }
    }

    // Enrich results with parent context
    return results.map(result => {
        const parent = parentMap.get(result.chunkId);
        if (parent) {
            // Prepend parent context to content
            const contextPrefix = parent.parentTitle
                ? `[Context: ${parent.parentTitle}]\n`
                : '';
            return {
                ...result,
                content: `${contextPrefix}${result.content}`,
            };
        }
        return result;
    });
}

/**
 * Resolve document IDs from document set IDs (multi-repo support)
 * Fetches all synced document IDs from the specified repos
 */
async function resolveDocumentSetIds(documentSetIds: string[]): Promise<string[]> {
    if (documentSetIds.length === 0) {
        return [];
    }

    console.log(`[retrieval] Resolving document IDs from ${documentSetIds.length} repo(s)`);

    const setIdsArray = `{${documentSetIds.join(',')}}`;
    const members = await ragDb.execute(sql`
        SELECT DISTINCT document_id as "documentId"
        FROM document_set_members
        WHERE document_set_id = ANY(${setIdsArray}::uuid[])
        AND sync_status = 'synced'
    `);

    const documentIds = ((members.rows || []) as any[]).map(m => m.documentId);
    console.log(`[retrieval] Resolved ${documentIds.length} synced documents from repos`);

    return documentIds;
}

/**
 * Main retrieval function - 4-stage pipeline
 */
export async function retrieve(
    query: string,
    options?: RetrievalOptions
): Promise<RetrievalResult[]> {
    const opts = {
        topK: DEFAULT_TOP_K,
        rerankTopK: DEFAULT_RERANK_TOP_K,
        includeParentContext: true,
        minRelevanceScore: MIN_RELEVANCE_SCORE,
        ...options,
    };

    console.log(`[retrieval] Starting retrieval for query: "${query.substring(0, 50)}..."`);

    // If documentSetIds provided, resolve to document IDs first
    if (opts.documentSetIds && opts.documentSetIds.length > 0) {
        const resolvedDocIds = await resolveDocumentSetIds(opts.documentSetIds);
        if (resolvedDocIds.length === 0) {
            console.warn('[retrieval] No synced documents found in selected repos');
            return [];
        }
        // Merge with any explicitly provided documentIds
        opts.documentIds = [
            ...(opts.documentIds || []),
            ...resolvedDocIds,
        ];
        // Remove duplicates
        opts.documentIds = [...new Set(opts.documentIds)];
    }

    // Stage 1: Embed query
    const queryEmbedding = await embedQuery(query);

    // Stage 2: Vector search
    const candidates = await vectorSearch(queryEmbedding, opts);
    console.log(`[retrieval] Found ${candidates.length} candidates from vector search`);

    if (candidates.length === 0) {
        return [];
    }

    // Stage 3: Rerank
    const reranked = await rerank(query, candidates, opts.rerankTopK);
    console.log(`[retrieval] Reranked to ${reranked.length} results`);

    // Filter by minimum relevance score
    const filtered = reranked.filter(r => r.relevanceScore >= opts.minRelevanceScore);
    console.log(`[retrieval] ${filtered.length} results above relevance threshold`);

    // Stage 4: Enrich with context
    const enriched = await enrichWithContext(filtered, opts.includeParentContext);

    return enriched;
}

/**
 * Retrieve for a specific document set (single repo)
 */
export async function retrieveFromDocumentSet(
    query: string,
    documentSetId: string,
    options?: Omit<RetrievalOptions, 'documentSetIds'>
): Promise<RetrievalResult[]> {
    return retrieve(query, {
        ...options,
        documentSetIds: [documentSetId],
    });
}

/**
 * Retrieve from multiple document sets (multi-repo support)
 * Performs vector search across the union of all synced documents from selected repos
 */
export async function retrieveFromDocumentSets(
    query: string,
    documentSetIds: string[],
    options?: Omit<RetrievalOptions, 'documentSetIds'>
): Promise<RetrievalResult[]> {
    if (documentSetIds.length === 0) {
        console.warn('[retrieval] No document sets provided');
        return [];
    }

    return retrieve(query, {
        ...options,
        documentSetIds,
    });
}

/**
 * Batch retrieve for multiple queries (useful for report generation)
 */
export async function batchRetrieve(
    queries: string[],
    options?: RetrievalOptions
): Promise<Map<string, RetrievalResult[]>> {
    const results = new Map<string, RetrievalResult[]>();

    // Process queries in parallel with concurrency limit
    const CONCURRENCY = 3;

    for (let i = 0; i < queries.length; i += CONCURRENCY) {
        const batch = queries.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(
            batch.map(query => retrieve(query, options))
        );

        batch.forEach((query, idx) => {
            results.set(query, batchResults[idx]);
        });
    }

    return results;
}

/**
 * Get related chunks by document hierarchy
 */
export async function getRelatedChunks(
    chunkId: string,
    options?: { includeSiblings?: boolean; includeChildren?: boolean }
): Promise<RetrievalResult[]> {
    const opts = {
        includeSiblings: true,
        includeChildren: true,
        ...options,
    };

    // Get the chunk's hierarchy info
    const chunk = await ragDb.execute(sql`
        SELECT
            id,
            document_id as "documentId",
            parent_chunk_id as "parentChunkId",
            hierarchy_path as "hierarchyPath"
        FROM document_chunks
        WHERE id = ${chunkId}
    `);

    if (!chunk.rows || chunk.rows.length === 0) {
        return [];
    }

    const sourceChunk = chunk.rows[0] as any;
    const conditions: string[] = [];

    // Get siblings (same parent)
    if (opts.includeSiblings && sourceChunk.parentChunkId) {
        conditions.push(`parent_chunk_id = '${sourceChunk.parentChunkId}'`);
    }

    // Get children
    if (opts.includeChildren) {
        conditions.push(`parent_chunk_id = '${chunkId}'`);
    }

    if (conditions.length === 0) {
        return [];
    }

    const related = await ragDb.execute(sql`
        SELECT
            id as "chunkId",
            document_id as "documentId",
            content,
            hierarchy_level as "hierarchyLevel",
            hierarchy_path as "hierarchyPath",
            section_title as "sectionTitle",
            clause_number as "clauseNumber"
        FROM document_chunks
        WHERE (${sql.raw(conditions.join(' OR '))})
        AND id != ${chunkId}
        ORDER BY hierarchy_path ASC
    `);

    return ((related.rows || []) as any[]).map(row => ({
        chunkId: row.chunkId,
        documentId: row.documentId,
        content: row.content,
        relevanceScore: 1.0, // Related by hierarchy
        hierarchyLevel: row.hierarchyLevel,
        hierarchyPath: row.hierarchyPath,
        sectionTitle: row.sectionTitle,
        clauseNumber: row.clauseNumber,
    }));
}
