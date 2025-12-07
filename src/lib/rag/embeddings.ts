/**
 * T013: Embeddings Module
 * Voyage voyage-large-2-instruct integration for document embeddings
 */

import Anthropic from '@anthropic-ai/sdk';

// Voyage AI client (uses similar API pattern)
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-large-2-instruct';
const EMBEDDING_DIMENSIONS = 1024;
const BATCH_SIZE = 128; // Max items per batch for efficiency

export interface EmbeddingResult {
    embedding: number[];
    tokenCount: number;
}

export interface BatchEmbeddingResult {
    embeddings: number[][];
    totalTokens: number;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
        throw new Error('VOYAGE_API_KEY environment variable is required');
    }

    const response = await fetch(VOYAGE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            input: text,
            model: VOYAGE_MODEL,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Voyage API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
        embedding: data.data[0].embedding,
        tokenCount: data.usage?.total_tokens || 0,
    };
}

/**
 * Generate embeddings for multiple texts in batches
 * Batches in groups of 128 for efficiency per research.md
 */
export async function generateEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
        throw new Error('VOYAGE_API_KEY environment variable is required');
    }

    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    // Process in batches
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);

        const response = await fetch(VOYAGE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                input: batch,
                model: VOYAGE_MODEL,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Voyage API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        // Extract embeddings in order
        for (const item of data.data) {
            allEmbeddings.push(item.embedding);
        }

        totalTokens += data.usage?.total_tokens || 0;
    }

    return {
        embeddings: allEmbeddings,
        totalTokens,
    };
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { EMBEDDING_DIMENSIONS, VOYAGE_MODEL };
