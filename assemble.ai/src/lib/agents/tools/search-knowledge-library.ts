/**
 * search_knowledge_library - semantic search across the organization's curated
 * knowledge domain libraries (NCC reference, contract administration, cost
 * management, program and scheduling, MEP services, etc.).
 *
 * Wraps retrieveFromDomains() scoped to the caller's organization. Unlike
 * search_rag, which searches project-uploaded documents, this searches the
 * pre-ingested seed knowledge and any org-uploaded domain libraries.
 */

import { retrieveFromDomains, type DomainRetrievalResult } from '@/lib/rag/retrieval';
import { retrieveSeedKnowledgeFallback } from '@/lib/rag/seed-knowledge-retrieval';
import { isKnownTag, normalizeTag, type DomainTag } from '@/lib/constants/knowledge-domains';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface SearchKnowledgeLibraryInput {
    query: string;
    tags?: string[];
    domainTypes?: string[];
    maxResults?: number;
}

interface SearchKnowledgeLibraryOutput {
    query: string;
    resultCount: number;
    results: Array<{
        domainName: string;
        domainType: string;
        sectionTitle: string | null;
        clauseNumber: string | null;
        relevanceScore: number;
        excerpt: string;
    }>;
}

const DEFAULT_MAX = 5;
const HARD_MAX = 10;
const EXCERPT_CHARS = 600;
const VALID_DOMAIN_TYPES = [
    'reference',
    'regulatory',
    'best_practices',
    'templates',
    'project_history',
    'custom',
];

function normalizeDomainTags(tags: string[] | undefined): DomainTag[] {
    return (tags ?? [])
        .map((tag) => normalizeTag(tag))
        .filter(isKnownTag) as DomainTag[];
}

function fallbackSeedResults(input: SearchKnowledgeLibraryInput, maxResults: number): SearchKnowledgeLibraryOutput {
    try {
        const results = retrieveSeedKnowledgeFallback(input.query, {
            domainTags: normalizeDomainTags(input.tags),
            topK: maxResults,
        });

        return {
            query: input.query,
            resultCount: results.length,
            results: results.map((r) => ({
                domainName: r.domainName,
                domainType: 'best_practices',
                sectionTitle: r.sectionTitle,
                clauseNumber: null,
                relevanceScore: Number(r.relevanceScore.toFixed(3)),
                excerpt:
                    r.content.length > EXCERPT_CHARS
                        ? r.content.slice(0, EXCERPT_CHARS) + '...'
                        : r.content,
            })),
        };
    } catch (error) {
        console.warn('[search_knowledge_library] Local seed fallback failed:', error);
        return {
            query: input.query,
            resultCount: 0,
            results: [],
        };
    }
}

const definition: AgentToolDefinition<SearchKnowledgeLibraryInput, SearchKnowledgeLibraryOutput> = {
    spec: {
        name: 'search_knowledge_library',
        description:
            "Search the organization's curated knowledge domain libraries - NCC/AS Standards references, " +
            'contract administration guides (AS 2124, AS 4000), cost management principles, program and ' +
            'scheduling guides, MEP services, and more. Returns excerpts with domain and section references. ' +
            'Use this before citing regulatory requirements, industry benchmarks, or best-practice guidance. ' +
            'Examples: "what contingency rate is appropriate for concept stage", ' +
            '"NCC requirements for fire egress Class 5", "EOT entitlement under AS 4000".',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Natural-language search query.',
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                        'Optional domain tag filters. Examples: "cost-management", "variations", "eot", ' +
                        '"ncc", "programming", "contracts", "procurement", "milestones", "structural".',
                },
                domainTypes: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                        'Optional domain type filters: "reference", "regulatory", "best_practices", ' +
                        '"templates", "project_history". Omit to search all types.',
                },
                maxResults: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_MAX,
                    description: `Maximum result chunks to return (default ${DEFAULT_MAX}).`,
                },
            },
            required: ['query'],
        },
    },
    mutating: false,
    validate(input: unknown): SearchKnowledgeLibraryInput {
        if (!input || typeof input !== 'object') {
            throw new Error('search_knowledge_library: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        if (typeof obj.query !== 'string' || obj.query.trim().length === 0) {
            throw new Error('search_knowledge_library: "query" must be a non-empty string');
        }

        let tags: string[] | undefined;
        if (obj.tags !== undefined) {
            if (!Array.isArray(obj.tags) || !obj.tags.every((t) => typeof t === 'string')) {
                throw new Error('search_knowledge_library: "tags" must be an array of strings');
            }
            tags = obj.tags as string[];
        }

        let domainTypes: string[] | undefined;
        if (obj.domainTypes !== undefined) {
            if (!Array.isArray(obj.domainTypes) || !obj.domainTypes.every((t) => typeof t === 'string')) {
                throw new Error('search_knowledge_library: "domainTypes" must be an array of strings');
            }
            domainTypes = (obj.domainTypes as string[]).filter((t) => VALID_DOMAIN_TYPES.includes(t));
        }

        let maxResults: number | undefined;
        if (obj.maxResults !== undefined) {
            if (typeof obj.maxResults !== 'number' || !Number.isInteger(obj.maxResults)) {
                throw new Error('search_knowledge_library: "maxResults" must be an integer');
            }
            maxResults = Math.max(1, Math.min(HARD_MAX, obj.maxResults));
        }

        return { query: obj.query.trim(), tags, domainTypes, maxResults };
    },
    async execute(ctx: ToolContext, input: SearchKnowledgeLibraryInput): Promise<SearchKnowledgeLibraryOutput> {
        await assertProjectOrg(ctx);

        const topK = input.maxResults ?? DEFAULT_MAX;
        let results: DomainRetrievalResult[];
        try {
            results = await retrieveFromDomains(input.query, {
                organizationId: ctx.organizationId,
                domainTags: input.tags,
                domainTypes: input.domainTypes,
                topK: topK * 3,
                rerankTopK: topK,
                minRelevanceScore: 0.2,
                includePrebuilt: true,
                includeOrganization: true,
            });
        } catch (error) {
            console.warn('[search_knowledge_library] Domain retrieval failed, using local seed fallback:', error);
            return fallbackSeedResults(input, topK);
        }

        if (results.length === 0) {
            return fallbackSeedResults(input, topK);
        }

        return {
            query: input.query,
            resultCount: results.length,
            results: results.map((r) => ({
                domainName: r.domainName ?? 'Unknown Domain',
                domainType: r.domainType ?? 'reference',
                sectionTitle: r.sectionTitle,
                clauseNumber: r.clauseNumber,
                relevanceScore: Number(r.relevanceScore.toFixed(3)),
                excerpt:
                    r.content.length > EXCERPT_CHARS
                        ? r.content.slice(0, EXCERPT_CHARS) + '...'
                        : r.content,
            })),
        };
    },
};

registerTool(definition);

export { definition as searchKnowledgeLibraryTool };
