/**
 * search_rag — semantic search across the project's uploaded documents.
 *
 * Read-only. Wraps lib/rag/retrieval.retrieve(), scoped to documents the
 * current project owns. The agent passes a natural-language query and an
 * optional max number of results; the tool returns top chunks with citation
 * metadata (document id, section title, clause number).
 */

import { db } from '@/lib/db';
import { documents } from '@/lib/db/pg-schema';
import { retrieve } from '@/lib/rag/retrieval';
import { eq } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface SearchRagInput {
    query: string;
    maxResults?: number;
}

interface SearchRagOutput {
    query: string;
    resultCount: number;
    results: Array<{
        documentId: string;
        sectionTitle: string | null;
        clauseNumber: string | null;
        relevanceScore: number;
        excerpt: string;
    }>;
}

const DEFAULT_MAX = 5;
const HARD_MAX = 15;
const EXCERPT_CHARS = 600;

const definition: AgentToolDefinition<SearchRagInput, SearchRagOutput> = {
    spec: {
        name: 'search_rag',
        description:
            'Search across the project\'s uploaded documents (reports, drawings, ' +
            'specifications, correspondence) using semantic search. Returns excerpts ' +
            'with document IDs and section references for citation. Use this for ' +
            'questions like "what does the geotech report say about water table" or ' +
            '"are there any planning constraints noted in the DA conditions".',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Natural-language search query.',
                },
                maxResults: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_MAX,
                    description: `Maximum number of result chunks to return (default ${DEFAULT_MAX}).`,
                },
            },
            required: ['query'],
        },
    },
    mutating: false,
    validate(input: unknown): SearchRagInput {
        if (!input || typeof input !== 'object') {
            throw new Error('search_rag: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        if (typeof obj.query !== 'string' || obj.query.trim().length === 0) {
            throw new Error('search_rag: "query" must be a non-empty string');
        }
        let maxResults: number | undefined;
        if (obj.maxResults !== undefined) {
            if (typeof obj.maxResults !== 'number' || !Number.isInteger(obj.maxResults)) {
                throw new Error('search_rag: "maxResults" must be an integer');
            }
            maxResults = Math.max(1, Math.min(HARD_MAX, obj.maxResults));
        }
        return { query: obj.query.trim(), maxResults };
    },
    async execute(ctx: ToolContext, input: SearchRagInput): Promise<SearchRagOutput> {
        await assertProjectOrg(ctx);

        // Restrict retrieval to documents owned by this project. Global/seed
        // domain repos are addressed via separate tools later — Phase 1 is
        // just project-scoped.
        const docRows = await db
            .select({ id: documents.id })
            .from(documents)
            .where(eq(documents.projectId, ctx.projectId));

        if (docRows.length === 0) {
            return { query: input.query, resultCount: 0, results: [] };
        }

        const topK = input.maxResults ?? DEFAULT_MAX;
        const results = await retrieve(input.query, {
            documentIds: docRows.map((r) => r.id),
            rerankTopK: topK,
        });

        return {
            query: input.query,
            resultCount: results.length,
            results: results.map((r) => ({
                documentId: r.documentId,
                sectionTitle: r.sectionTitle,
                clauseNumber: r.clauseNumber,
                relevanceScore: Number(r.relevanceScore.toFixed(3)),
                excerpt:
                    r.content.length > EXCERPT_CHARS
                        ? r.content.slice(0, EXCERPT_CHARS) + '…'
                        : r.content,
            })),
        };
    },
};

registerTool(definition);

export { definition as searchRagTool };
