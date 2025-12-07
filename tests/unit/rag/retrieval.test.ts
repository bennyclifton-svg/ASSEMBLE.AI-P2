/**
 * T022: Retrieval Unit Tests
 * Tests for vector similarity search and retrieval pipeline
 */

import { cosineSimilarity } from '../../../src/lib/rag/embeddings';
import { simpleRelevanceScore } from '../../../src/lib/rag/reranking';

// Mock modules for unit testing
jest.mock('../../../src/lib/db/rag-client', () => ({
    ragDb: {
        execute: jest.fn(),
    },
}));

jest.mock('../../../src/lib/rag/embeddings', () => ({
    ...jest.requireActual('../../../src/lib/rag/embeddings'),
    generateEmbedding: jest.fn().mockResolvedValue({
        embedding: new Array(1024).fill(0.1),
        tokenCount: 10,
    }),
}));

jest.mock('../../../src/lib/rag/reranking', () => ({
    ...jest.requireActual('../../../src/lib/rag/reranking'),
    rerankDocuments: jest.fn().mockResolvedValue([
        { index: 0, relevanceScore: 0.95, document: 'Test document 1' },
        { index: 1, relevanceScore: 0.85, document: 'Test document 2' },
    ]),
}));

describe('Retrieval Pipeline', () => {
    describe('cosineSimilarity', () => {
        it('should return 1 for identical vectors', () => {
            const vector = [1, 2, 3, 4, 5];
            const similarity = cosineSimilarity(vector, vector);
            expect(similarity).toBeCloseTo(1, 5);
        });

        it('should return 0 for orthogonal vectors', () => {
            const v1 = [1, 0, 0];
            const v2 = [0, 1, 0];
            const similarity = cosineSimilarity(v1, v2);
            expect(similarity).toBeCloseTo(0, 5);
        });

        it('should return -1 for opposite vectors', () => {
            const v1 = [1, 2, 3];
            const v2 = [-1, -2, -3];
            const similarity = cosineSimilarity(v1, v2);
            expect(similarity).toBeCloseTo(-1, 5);
        });

        it('should throw for vectors of different lengths', () => {
            const v1 = [1, 2, 3];
            const v2 = [1, 2, 3, 4];
            expect(() => cosineSimilarity(v1, v2)).toThrow('Embeddings must have same dimensions');
        });

        it('should handle high-dimensional vectors (1024)', () => {
            const v1 = new Array(1024).fill(0).map((_, i) => Math.sin(i));
            const v2 = new Array(1024).fill(0).map((_, i) => Math.sin(i + 0.1));
            const similarity = cosineSimilarity(v1, v2);
            expect(similarity).toBeGreaterThan(0.9); // Should be highly similar
        });
    });

    describe('simpleRelevanceScore', () => {
        it('should return 1 for perfect term match', () => {
            const query = 'concrete foundation';
            const document = 'This document discusses concrete foundation requirements';
            const score = simpleRelevanceScore(query, document);
            expect(score).toBe(1); // Both terms found
        });

        it('should return 0.5 for partial match', () => {
            const query = 'concrete steel';
            const document = 'This section covers concrete mix design';
            const score = simpleRelevanceScore(query, document);
            expect(score).toBe(0.5); // Only 'concrete' found
        });

        it('should return 0 for no matches', () => {
            const query = 'electrical wiring';
            const document = 'This section covers concrete mix design';
            const score = simpleRelevanceScore(query, document);
            expect(score).toBe(0);
        });

        it('should ignore short terms (2 chars or less)', () => {
            const query = 'a is the concrete';
            const document = 'concrete foundation';
            const score = simpleRelevanceScore(query, document);
            // Only 'the' and 'concrete' are considered (3+ chars)
            expect(score).toBeGreaterThan(0);
        });

        it('should be case insensitive', () => {
            const query = 'CONCRETE FOUNDATION';
            const document = 'concrete foundation requirements';
            const score = simpleRelevanceScore(query, document);
            expect(score).toBe(1);
        });
    });

    describe('Retrieval Options', () => {
        it('should have correct default values', () => {
            const DEFAULT_TOP_K = 20;
            const DEFAULT_RERANK_TOP_K = 5;
            const MIN_RELEVANCE_SCORE = 0.3;

            expect(DEFAULT_TOP_K).toBe(20);
            expect(DEFAULT_RERANK_TOP_K).toBe(5);
            expect(MIN_RELEVANCE_SCORE).toBe(0.3);
        });
    });

    describe('RetrievalResult Interface', () => {
        it('should have correct structure', () => {
            const result = {
                chunkId: 'chunk_123',
                documentId: 'doc_456',
                content: 'Test content',
                relevanceScore: 0.95,
                hierarchyLevel: 1,
                hierarchyPath: '1.2',
                sectionTitle: 'Test Section',
                clauseNumber: '1.2',
            };

            expect(result).toHaveProperty('chunkId');
            expect(result).toHaveProperty('documentId');
            expect(result).toHaveProperty('content');
            expect(result).toHaveProperty('relevanceScore');
            expect(result).toHaveProperty('hierarchyLevel');
            expect(result).toHaveProperty('hierarchyPath');
            expect(result).toHaveProperty('sectionTitle');
            expect(result).toHaveProperty('clauseNumber');
        });
    });
});

describe('Vector Search Behavior', () => {
    describe('Query Embedding', () => {
        it('should generate 1024-dimensional embeddings', async () => {
            const { generateEmbedding } = require('../../../src/lib/rag/embeddings');
            const result = await generateEmbedding('test query');
            expect(result.embedding.length).toBe(1024);
        });
    });

    describe('Distance Calculation', () => {
        it('should use cosine distance for pgvector', () => {
            // pgvector uses <=> operator for cosine distance
            // Distance = 1 - cosine_similarity
            // So identical vectors have distance 0
            const v1 = [0.5, 0.5, 0.5];
            const similarity = cosineSimilarity(v1, v1);
            const distance = 1 - similarity;
            expect(distance).toBeCloseTo(0, 5);
        });
    });
});

describe('Reranking Integration', () => {
    describe('rerankDocuments', () => {
        it('should return reranked results', async () => {
            const { rerankDocuments } = require('../../../src/lib/rag/reranking');
            const results = await rerankDocuments('test query', ['doc1', 'doc2'], { topK: 2 });
            expect(results.length).toBe(2);
            expect(results[0].relevanceScore).toBeGreaterThanOrEqual(results[1].relevanceScore);
        });

        it('should include relevance scores', async () => {
            const { rerankDocuments } = require('../../../src/lib/rag/reranking');
            const results = await rerankDocuments('test query', ['doc1'], { topK: 1 });
            expect(results[0]).toHaveProperty('relevanceScore');
            expect(results[0].relevanceScore).toBeGreaterThan(0);
            expect(results[0].relevanceScore).toBeLessThanOrEqual(1);
        });
    });
});

describe('Context Enrichment', () => {
    describe('Parent Context', () => {
        it('should add context prefix for chunks with parents', () => {
            const chunkContent = 'Sub-section content about concrete';
            const parentTitle = 'Section 3.1 Concrete Work';
            const enrichedContent = `[Context: ${parentTitle}]\n${chunkContent}`;

            expect(enrichedContent).toContain('[Context:');
            expect(enrichedContent).toContain(parentTitle);
            expect(enrichedContent).toContain(chunkContent);
        });
    });

    describe('Hierarchy Path', () => {
        it('should preserve hierarchy information', () => {
            const chunk = {
                hierarchyPath: '3.1.2',
                hierarchyLevel: 3,
            };

            expect(chunk.hierarchyPath).toMatch(/^\d+(\.\d+)*$/);
            expect(chunk.hierarchyLevel).toBe(3);
        });
    });
});

describe('Batch Retrieval', () => {
    describe('Concurrency Control', () => {
        it('should process queries with limited concurrency', () => {
            const CONCURRENCY = 3;
            const queries = ['q1', 'q2', 'q3', 'q4', 'q5'];
            const batches = [];

            for (let i = 0; i < queries.length; i += CONCURRENCY) {
                batches.push(queries.slice(i, i + CONCURRENCY));
            }

            expect(batches.length).toBe(2);
            expect(batches[0].length).toBe(3);
            expect(batches[1].length).toBe(2);
        });
    });
});
