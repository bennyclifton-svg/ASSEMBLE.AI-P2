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

// Ingestion
export {
    RAG_SYNC_STATUS,
    DOCUMENT_CHUNK_INSERT_BATCH_SIZE,
    batchItems,
    createEmbeddedDocumentChunkRows,
    createEmbeddedProjectDocumentChunkRows,
    createEmbeddedSeedKnowledgeChunkRows,
    chunksToDocumentChunkRows,
    hasSeedKnowledgeBodyContent,
    ingestProjectDocument,
    ingestKnowledgeLibraryDocument,
    ingestRagDocument,
    ingestSeedKnowledgeDocument,
    insertDocumentChunkRows,
    parseSeedKnowledgeMarkdown,
    queueRagDocumentForIngestion,
    replaceDocumentChunkRows,
    splitSeedKnowledgeBody,
    updateDocumentSetMemberSyncStatus,
    upsertDocumentSetMemberSyncStatus,
    type DocumentChunkInsertRow,
    type EmbeddedDocumentChunkRowsResult,
    type QueueRagDocumentForIngestionResult,
    type RagDocumentIngestionArgs,
    type RagDocumentIngestionResult,
    type RagIngestionContentKind,
    type RagIngestionStage,
    type RagIngestionStageEvent,
    type RagSyncStatus,
    type SeedKnowledgeFrontmatter,
    type SeedKnowledgeSection,
} from './ingestion';
