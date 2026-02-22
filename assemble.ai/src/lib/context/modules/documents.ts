// src/lib/context/modules/documents.ts
// RAG documents module fetcher - wraps retrieve() from src/lib/rag/retrieval.ts

import { retrieve } from '@/lib/rag/retrieval';
import type { RetrievalResult } from '@/lib/rag/retrieval';
import type { ModuleResult } from '../types';

export interface RagDocumentsData {
  chunks: RagChunkData[];
  totalChunks: number;
}

export interface RagChunkData {
  chunkId: string;
  documentId: string;
  content: string;
  relevanceScore: number;
  sectionTitle: string | null;
  clauseNumber: string | null;
  hierarchyPath: string | null;
}

export interface RagDocumentsFetchParams {
  documentIds?: string[];
  documentSetIds?: string[];
  query?: string;
}

export async function fetchRagDocuments(
  projectId: string,
  params?: RagDocumentsFetchParams
): Promise<ModuleResult<RagDocumentsData>> {
  try {
    const query = params?.query || 'project context';

    const results: RetrievalResult[] = await retrieve(query, {
      documentIds: params?.documentIds,
      documentSetIds: params?.documentSetIds,
      topK: 20,
      rerankTopK: 5,
    });

    const chunks: RagChunkData[] = results.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      content: r.content,
      relevanceScore: r.relevanceScore,
      sectionTitle: r.sectionTitle ?? null,
      clauseNumber: r.clauseNumber ?? null,
      hierarchyPath: r.hierarchyPath ?? null,
    }));

    const data: RagDocumentsData = {
      chunks,
      totalChunks: chunks.length,
    };

    // Token estimate: ~20 base + ~50 per chunk
    const estimatedTokens = 20 + chunks.length * 50;

    return {
      moduleName: 'ragDocuments',
      success: true,
      data,
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'ragDocuments',
      success: false,
      data: {} as RagDocumentsData,
      error: `RAG documents fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
