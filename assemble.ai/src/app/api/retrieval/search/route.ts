/**
 * T067: Retrieval Search API
 * POST /api/retrieval/search
 *
 * Performs semantic search across document chunks with source metadata
 * for Smart Context Panel integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { retrieve, retrieveFromDocumentSet } from '@/lib/rag/retrieval';
import { ragDb } from '@/lib/db/rag-client';
import { sql } from 'drizzle-orm';

// Request body schema
interface SearchRequest {
    query: string;
    documentSetIds: string[];
    excludeChunkIds?: string[];
    topK?: number;
    includeParentContext?: boolean;
}

// Response schema per contracts/retrieval.yaml
interface RetrievalResultResponse {
    chunkId: string;
    documentId: string;
    documentTitle: string;
    sectionTitle: string | null;
    clauseNumber: string | null;
    hierarchyLevel: number;
    hierarchyPath: string | null;
    content: string;
    excerpt: string;
    relevanceScore: number; // 0-100 integer
    vectorSimilarity: number; // 0-1
    tokenCount: number | null;
    parentContext: string | null;
}

interface SearchResponse {
    results: RetrievalResultResponse[];
    query: string;
    totalCandidates: number;
    rerankerUsed: 'baai' | 'cohere' | 'fallback';
}

// Get document titles from SQLite (via API or direct)
// For now, we'll use a simple approach with the RAG db
async function getDocumentTitle(documentId: string): Promise<string> {
    // In a production app, this would query SQLite documents table
    // For now, return a placeholder based on document ID
    return `Document ${documentId.slice(0, 8)}`;
}

export async function POST(req: NextRequest) {
    try {
        const body: SearchRequest = await req.json();

        // Validate required fields
        if (!body.query || typeof body.query !== 'string') {
            return NextResponse.json(
                { error: 'query is required and must be a string' },
                { status: 400 }
            );
        }

        if (!body.documentSetIds || !Array.isArray(body.documentSetIds) || body.documentSetIds.length === 0) {
            return NextResponse.json(
                { error: 'documentSetIds is required and must be a non-empty array' },
                { status: 400 }
            );
        }

        const topK = Math.min(Math.max(body.topK || 5, 1), 20);
        const includeParentContext = body.includeParentContext ?? true;

        // Get document IDs from all document sets
        const memberResults = await ragDb.execute(sql`
            SELECT DISTINCT document_id as "documentId"
            FROM document_set_members
            WHERE document_set_id = ANY(${body.documentSetIds})
            AND sync_status = 'synced'
        `);

        const documentIds = ((memberResults.rows || []) as any[]).map(m => m.documentId);

        if (documentIds.length === 0) {
            return NextResponse.json({
                results: [],
                query: body.query,
                totalCandidates: 0,
                rerankerUsed: 'fallback',
            } as SearchResponse);
        }

        // Perform retrieval
        const results = await retrieve(body.query, {
            documentIds,
            topK: 20, // Broad initial search
            rerankTopK: topK,
            includeParentContext,
        });

        // Filter excluded chunks
        const filteredResults = body.excludeChunkIds
            ? results.filter(r => !body.excludeChunkIds!.includes(r.chunkId))
            : results;

        // Get token counts and document titles
        const chunkIds = filteredResults.map(r => r.chunkId);
        let tokenCounts: Map<string, number> = new Map();

        if (chunkIds.length > 0) {
            const tokenResults = await ragDb.execute(sql`
                SELECT id, token_count as "tokenCount"
                FROM document_chunks
                WHERE id = ANY(${chunkIds})
            `);
            tokenCounts = new Map(
                ((tokenResults.rows || []) as any[]).map(r => [r.id, r.tokenCount || 0])
            );
        }

        // Build response with source metadata
        const responseResults: RetrievalResultResponse[] = await Promise.all(
            filteredResults.map(async (result) => {
                const documentTitle = await getDocumentTitle(result.documentId);
                const tokenCount = tokenCounts.get(result.chunkId) || null;

                return {
                    chunkId: result.chunkId,
                    documentId: result.documentId,
                    documentTitle,
                    sectionTitle: result.sectionTitle,
                    clauseNumber: result.clauseNumber,
                    hierarchyLevel: result.hierarchyLevel,
                    hierarchyPath: result.hierarchyPath,
                    content: result.content,
                    excerpt: result.content.slice(0, 200),
                    relevanceScore: Math.round(result.relevanceScore * 100), // Convert to 0-100
                    vectorSimilarity: result.relevanceScore, // Original 0-1 score
                    tokenCount,
                    parentContext: includeParentContext ? extractParentContext(result.content) : null,
                };
            })
        );

        // Determine which reranker was used (in production, this would come from the retrieval function)
        const rerankerUsed = 'baai' as const; // Default, would be tracked in actual implementation

        return NextResponse.json({
            results: responseResults,
            query: body.query,
            totalCandidates: documentIds.length,
            rerankerUsed,
        } as SearchResponse);

    } catch (error) {
        console.error('[retrieval/search] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error during retrieval' },
            { status: 500 }
        );
    }
}

// Extract parent context prefix if present
function extractParentContext(content: string): string | null {
    const match = content.match(/^\[Context: ([^\]]+)\]\n/);
    return match ? match[1] : null;
}
