/**
 * RAG Module Exports
 * Central export file for all RAG functionality
 */

// Embeddings (T013)
export {
    generateEmbedding,
    generateEmbeddings,
    cosineSimilarity,
    EMBEDDING_DIMENSIONS,
    VOYAGE_MODEL,
    type EmbeddingResult,
    type BatchEmbeddingResult,
} from './embeddings';

// Parsing (T014)
export {
    parseDocument,
    type ParsedDocument,
} from './parsing';

// Chunking (T015)
export {
    chunkDocument,
    CHUNK_SIZES,
    estimateTokens,
    type Chunk,
} from './chunking';

// Reranking (T016)
export {
    rerankDocuments,
    simpleRelevanceScore,
    type RerankResult,
    type RerankOptions,
} from './reranking';

// Retrieval (T017)
export {
    retrieve,
    retrieveFromDocumentSet,
    batchRetrieve,
    getRelatedChunks,
    type RetrievalResult,
    type RetrievalOptions,
} from './retrieval';
