/**
 * T016: Reranking Module
 * BAAI/bge-reranker-v2-m3 (primary) + Cohere rerank-english-v3.0 (fallback)
 * Per research.md
 */

export interface RerankResult {
    index: number;
    relevanceScore: number;
    document: string;
}

export interface RerankOptions {
    topK?: number;
    timeout?: number;
}

const DEFAULT_TOP_K = 5;
const BAAI_TIMEOUT = 3000; // 3 seconds per research.md

/**
 * Rerank using BAAI/bge-reranker (primary)
 * Note: Requires hosted BAAI endpoint or HuggingFace Inference API
 */
async function rerankWithBAAI(
    query: string,
    documents: string[],
    topK: number
): Promise<RerankResult[]> {
    const apiUrl = process.env.BAAI_API_URL;
    const apiKey = process.env.BAAI_API_KEY;

    if (!apiUrl) {
        throw new Error('BAAI_API_URL not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BAAI_TIMEOUT);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
            },
            body: JSON.stringify({
                query,
                documents,
                top_k: topK,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`BAAI API error: ${response.status}`);
        }

        const data = await response.json();

        return data.results.map((result: any) => ({
            index: result.index,
            relevanceScore: result.score,
            document: documents[result.index],
        }));
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Rerank using Cohere (fallback)
 */
async function rerankWithCohere(
    query: string,
    documents: string[],
    topK: number
): Promise<RerankResult[]> {
    const apiKey = process.env.COHERE_API_KEY;

    if (!apiKey) {
        throw new Error('COHERE_API_KEY environment variable is required');
    }

    const response = await fetch('https://api.cohere.ai/v1/rerank', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            query,
            documents,
            top_n: topK,
            model: 'rerank-english-v3.0',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return data.results.map((result: any) => ({
        index: result.index,
        relevanceScore: result.relevance_score,
        document: documents[result.index],
    }));
}

/**
 * Rerank documents with fallback strategy
 * Tries BAAI first (if configured), falls back to Cohere
 * Per research.md: "Try BAAI first with 3-second timeout, fallback to Cohere"
 */
export async function rerankDocuments(
    query: string,
    documents: string[],
    options?: RerankOptions
): Promise<RerankResult[]> {
    const topK = options?.topK || DEFAULT_TOP_K;

    // If no documents, return empty
    if (documents.length === 0) {
        return [];
    }

    // If fewer documents than topK, adjust
    const effectiveTopK = Math.min(topK, documents.length);

    // Try BAAI first if configured
    if (process.env.BAAI_API_URL) {
        try {
            console.log('[reranking] Attempting BAAI reranker');
            const results = await rerankWithBAAI(query, documents, effectiveTopK);
            console.log('[reranking] BAAI succeeded');
            return results;
        } catch (error) {
            console.warn('[reranking] BAAI failed, falling back to Cohere:', error);
        }
    }

    // Fallback to Cohere
    try {
        console.log('[reranking] Using Cohere reranker');
        const results = await rerankWithCohere(query, documents, effectiveTopK);
        console.log('[reranking] Cohere succeeded');
        return results;
    } catch (error) {
        console.error('[reranking] Cohere failed:', error);
        throw new Error('All reranking services failed');
    }
}

/**
 * Simple relevance scoring without external API
 * Fallback for when both services are unavailable
 */
export function simpleRelevanceScore(query: string, document: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const docLower = document.toLowerCase();

    let matches = 0;
    for (const term of queryTerms) {
        if (term.length > 2 && docLower.includes(term)) {
            matches++;
        }
    }

    return matches / queryTerms.length;
}
