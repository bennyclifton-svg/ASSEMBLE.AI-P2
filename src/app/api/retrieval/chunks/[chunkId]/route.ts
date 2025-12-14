/**
 * T068: Chunk Detail API
 * GET /api/retrieval/chunks/[chunkId]
 *
 * Gets a single chunk by ID with full context including parent,
 * sibling, and child chunks per contracts/retrieval.yaml
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { sql } from 'drizzle-orm';

// Response types per contracts/retrieval.yaml
interface DocumentChunk {
    id: string;
    documentId: string;
    parentChunkId: string | null;
    hierarchyLevel: number;
    hierarchyPath: string | null;
    sectionTitle: string | null;
    clauseNumber: string | null;
    content: string;
    tokenCount: number | null;
    createdAt: string;
}

interface DocumentInfo {
    id: string;
    title: string;
    category: string | null;
}

interface ChunkWithContext extends DocumentChunk {
    document: DocumentInfo;
    parentChunk: DocumentChunk | null;
    siblingChunks: DocumentChunk[];
    childChunks: DocumentChunk[];
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ chunkId: string }> }
) {
    try {
        const { chunkId } = await params;

        // Parse query params
        const { searchParams } = new URL(req.url);
        const includeParent = searchParams.get('includeParent') !== 'false';
        const includeSiblings = searchParams.get('includeSiblings') === 'true';

        // Get the main chunk
        const chunkResult = await ragDb.execute(sql`
            SELECT
                id,
                document_id as "documentId",
                parent_chunk_id as "parentChunkId",
                hierarchy_level as "hierarchyLevel",
                hierarchy_path as "hierarchyPath",
                section_title as "sectionTitle",
                clause_number as "clauseNumber",
                content,
                token_count as "tokenCount",
                created_at as "createdAt"
            FROM document_chunks
            WHERE id = ${chunkId}
        `);

        if (!chunkResult.rows || chunkResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Chunk not found' },
                { status: 404 }
            );
        }

        const chunk = chunkResult.rows[0] as unknown as DocumentChunk;

        // Get document info (placeholder - in production would query SQLite)
        const document: DocumentInfo = {
            id: chunk.documentId,
            title: `Document ${chunk.documentId.slice(0, 8)}`,
            category: null,
        };

        // Get parent chunk if requested
        let parentChunk: DocumentChunk | null = null;
        if (includeParent && chunk.parentChunkId) {
            const parentResult = await ragDb.execute(sql`
                SELECT
                    id,
                    document_id as "documentId",
                    parent_chunk_id as "parentChunkId",
                    hierarchy_level as "hierarchyLevel",
                    hierarchy_path as "hierarchyPath",
                    section_title as "sectionTitle",
                    clause_number as "clauseNumber",
                    content,
                    token_count as "tokenCount",
                    created_at as "createdAt"
                FROM document_chunks
                WHERE id = ${chunk.parentChunkId}
            `);

            if (parentResult.rows && parentResult.rows.length > 0) {
                parentChunk = parentResult.rows[0] as unknown as DocumentChunk;
            }
        }

        // Get sibling chunks if requested (same parent, excluding self)
        let siblingChunks: DocumentChunk[] = [];
        if (includeSiblings && chunk.parentChunkId) {
            const siblingsResult = await ragDb.execute(sql`
                SELECT
                    id,
                    document_id as "documentId",
                    parent_chunk_id as "parentChunkId",
                    hierarchy_level as "hierarchyLevel",
                    hierarchy_path as "hierarchyPath",
                    section_title as "sectionTitle",
                    clause_number as "clauseNumber",
                    content,
                    token_count as "tokenCount",
                    created_at as "createdAt"
                FROM document_chunks
                WHERE parent_chunk_id = ${chunk.parentChunkId}
                AND id != ${chunkId}
                ORDER BY hierarchy_path ASC
                LIMIT 10
            `);

            siblingChunks = (siblingsResult.rows || []) as unknown as DocumentChunk[];
        }

        // Get child chunks
        const childrenResult = await ragDb.execute(sql`
            SELECT
                id,
                document_id as "documentId",
                parent_chunk_id as "parentChunkId",
                hierarchy_level as "hierarchyLevel",
                hierarchy_path as "hierarchyPath",
                section_title as "sectionTitle",
                clause_number as "clauseNumber",
                content,
                token_count as "tokenCount",
                created_at as "createdAt"
            FROM document_chunks
            WHERE parent_chunk_id = ${chunkId}
            ORDER BY hierarchy_path ASC
            LIMIT 20
        `);

        const childChunks = (childrenResult.rows || []) as unknown as DocumentChunk[];

        const response: ChunkWithContext = {
            ...chunk,
            document,
            parentChunk,
            siblingChunks,
            childChunks,
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('[retrieval/chunks] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
