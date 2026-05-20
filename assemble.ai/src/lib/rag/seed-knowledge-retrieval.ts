import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import type { DomainTag } from '@/lib/constants/knowledge-domains';
import { parseSeedKnowledgeMarkdown, splitSeedKnowledgeBody } from './ingestion';

interface SeedChunk {
    id: string;
    domainSlug: string;
    domainName: string;
    domainTags: string[];
    sourceVersion: string;
    applicableProjectTypes: string[];
    applicableStates: string[];
    sectionTitle: string | null;
    content: string;
}

export interface SeedKnowledgeResult {
    id: string;
    content: string;
    sectionTitle: string | null;
    domainSlug: string;
    domainName: string;
    domainTags: string[];
    sourceVersion: string;
    relevanceScore: number;
}

export interface SeedKnowledgeSectionResult {
    id: string;
    content: string;
    sectionTitle: string;
    domainSlug: string;
    domainName: string;
    domainTags: string[];
    sourceVersion: string;
}

export interface SeedKnowledgeRetrievalOptions {
    domainTags: DomainTag[];
    domainSlugs?: string[];
    projectType?: string;
    state?: string;
    section?: ObjectiveType;
    topK?: number;
}

let cachedChunks: SeedChunk[] | null = null;

function loadSeedChunks(): SeedChunk[] {
    if (cachedChunks) return cachedChunks;

    const seedDir = resolve(process.cwd(), 'src/lib/constants/knowledge-seed');
    const files = readdirSync(seedDir).filter((file) => file.endsWith('.md'));
    const chunks: SeedChunk[] = [];

    for (const file of files) {
        const raw = readFileSync(join(seedDir, file), 'utf8');
        const { frontmatter, body } = parseSeedKnowledgeMarkdown(raw);
        const bodyChunks = splitSeedKnowledgeBody(body);

        for (let idx = 0; idx < bodyChunks.length; idx++) {
            const chunk = bodyChunks[idx];
            chunks.push({
                id: `${frontmatter.domainSlug}:${idx + 1}`,
                domainSlug: frontmatter.domainSlug,
                domainName: frontmatter.name,
                domainTags: frontmatter.tags,
                sourceVersion: frontmatter.version,
                applicableProjectTypes: frontmatter.applicableProjectTypes,
                applicableStates: frontmatter.applicableStates,
                sectionTitle: chunk.title,
                content: chunk.content,
            });
        }
    }

    cachedChunks = chunks;
    return chunks;
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length >= 3);
}

function uniqueTokens(text: string): Set<string> {
    return new Set(tokenize(text));
}

function stateMatches(chunk: SeedChunk, state: string | undefined): boolean {
    if (!state || chunk.applicableStates.length === 0) return true;
    return chunk.applicableStates.includes(state) || chunk.applicableStates.includes('AU');
}

function projectTypeMatches(chunk: SeedChunk, projectType: string | undefined): boolean {
    if (!projectType || chunk.applicableProjectTypes.length === 0) return true;
    return chunk.applicableProjectTypes.includes(projectType);
}

function domainSlugMatches(chunk: SeedChunk, domainSlugs: string[] | undefined): boolean {
    if (!domainSlugs || domainSlugs.length === 0) return true;
    return domainSlugs.includes(chunk.domainSlug);
}

function tagScore(chunk: SeedChunk, domainTags: DomainTag[]): number {
    if (domainTags.length === 0) return 0;
    const tags = new Set(chunk.domainTags);
    return domainTags.filter((tag) => tags.has(tag)).length;
}

function sectionBoost(section: ObjectiveType | undefined, chunk: SeedChunk): number {
    if (!section) return 0;
    const haystack = `${chunk.sectionTitle ?? ''} ${chunk.content}`.toLowerCase();

    const terms: Record<ObjectiveType, string[]> = {
        functional: ['apartment', 'car park', 'lift', 'vertical transport', 'amenity', 'building classification'],
        quality: ['acoustic', 'waterproof', 'facade', 'durability', 'quality', 'commissioning', 'defect'],
        planning: ['approval', 'planning', 'traffic', 'stormwater', 'waste', 'overshadowing', 'authority'],
        compliance: ['ncc', 'class', 'fire', 'egress', 'accessibility', 'basix', 'nathers', 'australian standard'],
    };

    return terms[section].filter((term) => haystack.includes(term)).length;
}

function trimContent(content: string, maxChars = 1400): string {
    const compact = content.replace(/\n{3,}/g, '\n\n').trim();
    if (compact.length <= maxChars) return compact;
    return `${compact.slice(0, maxChars).trim()}...`;
}

function normalizeSectionTitle(title: string): string {
    return title
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function retrieveSeedKnowledgeSections(options: {
    domainTags: DomainTag[];
    sectionTitles: string[];
    domainSlugs?: string[];
    projectType?: string;
    state?: string;
    topK?: number;
}): SeedKnowledgeSectionResult[] {
    const sectionOrder = new Map(
        options.sectionTitles.map((title, index) => [normalizeSectionTitle(title), index])
    );
    const domainSlugOrder = new Map(
        (options.domainSlugs ?? []).map((slug, index) => [slug, index])
    );
    const topK = options.topK ?? options.sectionTitles.length;

    if (sectionOrder.size === 0) return [];

    return loadSeedChunks()
        .filter((chunk) => domainSlugOrder.size === 0 || domainSlugOrder.has(chunk.domainSlug))
        .filter((chunk) => projectTypeMatches(chunk, options.projectType))
        .filter((chunk) => stateMatches(chunk, options.state))
        .filter((chunk) => chunk.sectionTitle !== null)
        .map((chunk) => ({
            chunk,
            normalizedTitle: normalizeSectionTitle(chunk.sectionTitle ?? ''),
            score: tagScore(chunk, options.domainTags),
        }))
        .filter(({ chunk, normalizedTitle, score }) =>
            sectionOrder.has(normalizedTitle) && (score > 0 || domainSlugOrder.has(chunk.domainSlug))
        )
        .sort((a, b) => {
            const titleDelta = (sectionOrder.get(a.normalizedTitle) ?? 0) - (sectionOrder.get(b.normalizedTitle) ?? 0);
            if (titleDelta !== 0) return titleDelta;
            const slugDelta = (domainSlugOrder.get(a.chunk.domainSlug) ?? Number.MAX_SAFE_INTEGER)
                - (domainSlugOrder.get(b.chunk.domainSlug) ?? Number.MAX_SAFE_INTEGER);
            if (slugDelta !== 0) return slugDelta;
            return b.score - a.score;
        })
        .slice(0, topK)
        .map(({ chunk }) => ({
            id: chunk.id,
            content: chunk.content,
            sectionTitle: chunk.sectionTitle ?? '',
            domainSlug: chunk.domainSlug,
            domainName: chunk.domainName,
            domainTags: chunk.domainTags,
            sourceVersion: chunk.sourceVersion,
        }));
}

export function retrieveSeedKnowledgeFallback(
    query: string,
    options: SeedKnowledgeRetrievalOptions,
): SeedKnowledgeResult[] {
    const chunks = loadSeedChunks();
    const queryTokens = uniqueTokens(query);
    const topK = options.topK ?? 4;

    return chunks
        .filter((chunk) => domainSlugMatches(chunk, options.domainSlugs))
        .filter((chunk) => projectTypeMatches(chunk, options.projectType))
        .filter((chunk) => stateMatches(chunk, options.state))
        .map((chunk) => {
            const contentTokens = uniqueTokens(`${chunk.sectionTitle ?? ''} ${chunk.content}`);
            let tokenHits = 0;
            for (const token of queryTokens) {
                if (contentTokens.has(token)) tokenHits++;
            }

            const score =
                tokenHits +
                tagScore(chunk, options.domainTags) * 6 +
                sectionBoost(options.section, chunk) * 4;

            return { chunk, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(({ chunk, score }) => ({
            id: chunk.id,
            content: trimContent(chunk.content),
            sectionTitle: chunk.sectionTitle,
            domainSlug: chunk.domainSlug,
            domainName: chunk.domainName,
            domainTags: chunk.domainTags,
            sourceVersion: chunk.sourceVersion,
            relevanceScore: Math.min(1, score / 40),
        }));
}
