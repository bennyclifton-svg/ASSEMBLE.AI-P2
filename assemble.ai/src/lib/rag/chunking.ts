/**
 * T015: Chunking Module
 * Construction-aware semantic splitting per spec.md and research.md
 */

export interface Chunk {
    id: string;
    content: string;
    hierarchyLevel: number; // 0=document, 1=section, 2=subsection, 3=clause
    hierarchyPath: string | null; // e.g., "1.2.3"
    sectionTitle: string | null;
    clauseNumber: string | null;
    parentId: string | null;
    tokenCount: number;
}

// Chunk size guidelines from research.md
const CHUNK_SIZES = {
    specifications: { min: 1000, max: 1500 },
    drawingSchedules: { min: 500, max: 800 },
    correspondence: { min: 500, max: 1200 },
    reports: { min: 800, max: 1200 },
    regulatory: { min: 400, max: 800 },         // Small for precision
    knowledgeGuide: { min: 600, max: 1000 },    // Medium for best-practice
    default: { min: 800, max: 1200 },
};

const DEFAULT_OVERLAP_RATIO = 0.15;
const MAX_OVERLAP_TOKENS = 128;

// Construction document patterns
const SPEC_SECTION_PATTERN = /^\s*(PART\s+\d+|SECTION\s+\d+)/gim;

// NCC (National Construction Code) patterns
const NCC_CLAUSE_PATTERN = /^\s*([A-Z]\d+(?:\.\d+)*)\s+(.+)$/gm;
const NCC_PERFORMANCE_PATTERN = /^\s*(P\d+(?:\.\d+)*)\s+(.+)$/gm;
const NCC_SPEC_PATTERN = /^\s*(Specification\s+[A-Z]\d+(?:\.\d+)*)/gim;

// Australian Standards (AS) patterns
const AS_SECTION_PATTERN = /^\s*(Section\s+\d+|Appendix\s+[A-Z])/gim;
const AS_CLAUSE_PATTERN = /^\s*(\d+(?:\.\d+)+)\s+(.+)$/gm;

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Generate unique chunk ID
 */
function generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Detect document type from content
 */
function detectDocumentType(content: string): keyof typeof CHUNK_SIZES {
    const lowerContent = content.toLowerCase();

    SPEC_SECTION_PATTERN.lastIndex = 0;
    NCC_SPEC_PATTERN.lastIndex = 0;
    if (
        SPEC_SECTION_PATTERN.test(content) ||
        NCC_SPEC_PATTERN.test(content) ||
        lowerContent.includes('specification')
    ) {
        return 'specifications';
    }

    // Regulatory documents: NCC clauses (e.g., "A1.1 General Requirements") or performance requirements (e.g., "P2.1")
    NCC_CLAUSE_PATTERN.lastIndex = 0;
    NCC_PERFORMANCE_PATTERN.lastIndex = 0;
    AS_SECTION_PATTERN.lastIndex = 0;
    AS_CLAUSE_PATTERN.lastIndex = 0;
    if (NCC_CLAUSE_PATTERN.test(content) || NCC_PERFORMANCE_PATTERN.test(content)) {
        return 'regulatory';
    }
    if (AS_SECTION_PATTERN.test(content) || AS_CLAUSE_PATTERN.test(content)) {
        return 'regulatory';
    }

    // Knowledge guide / seed content: best-practice markdown with specific markers
    if (lowerContent.includes('common pitfalls:') && lowerContent.includes('reference:')) {
        return 'knowledgeGuide';
    }

    if (lowerContent.includes('schedule') || lowerContent.includes('drawing list')) {
        return 'drawingSchedules';
    }
    if (lowerContent.includes('report') || lowerContent.includes('summary')) {
        return 'reports';
    }
    if (
        /^\s*dear\b/im.test(content) ||
        /^\s*(regards|sincerely|yours faithfully|kind regards)\b/im.test(content)
    ) {
        return 'correspondence';
    }

    return 'default';
}

/**
 * Extract clause structure from construction specifications
 */
function extractClauseStructure(content: string): Array<{
    clauseNumber: string;
    title: string;
    content: string;
    startIndex: number;
}> {
    const clauses: Array<{
        clauseNumber: string;
        title: string;
        content: string;
        startIndex: number;
    }> = [];

    const regex = /^\s*(\d+(?:\.\d+)*)\s+(.+)$/gm;
    let match;
    const matches: Array<{ clauseNumber: string; title: string; startIndex: number }> = [];

    while ((match = regex.exec(content)) !== null) {
        matches.push({
            clauseNumber: match[1],
            title: match[2].trim(),
            startIndex: match.index,
        });
    }

    // Extract content between clauses
    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        const endIndex = next ? next.startIndex : content.length;

        clauses.push({
            clauseNumber: current.clauseNumber,
            title: current.title,
            content: content.slice(current.startIndex, endIndex).trim(),
            startIndex: current.startIndex,
        });
    }

    return clauses;
}

function extractSpecificationParts(content: string): Array<{
    partNumber: string;
    title: string;
    startIndex: number;
}> {
    const parts: Array<{ partNumber: string; title: string; startIndex: number }> = [];
    const regex = /^\s*PART\s+(\d+)\s*[-:–—]?\s*(.*)$/gim;
    let match;

    while ((match = regex.exec(content)) !== null) {
        const partNumber = match[1];
        const suffix = match[2]?.trim();
        parts.push({
            partNumber,
            title: suffix ? `PART ${partNumber} - ${suffix}` : `PART ${partNumber}`,
            startIndex: match.index,
        });
    }

    return parts;
}

function findNearestPart(
    parts: Array<{ partNumber: string; title: string; startIndex: number; chunkId: string }>,
    startIndex: number
): { partNumber: string; title: string; startIndex: number; chunkId: string } | null {
    let nearest: { partNumber: string; title: string; startIndex: number; chunkId: string } | null = null;
    for (const part of parts) {
        if (part.startIndex <= startIndex) {
            nearest = part;
        } else {
            break;
        }
    }
    return nearest;
}

/**
 * Split text by semantic boundaries (paragraph breaks, headers) with overlap.
 */
function splitTextToTokenBudget(text: string, maxTokens: number): string[] {
    const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
    const chunks: string[] = [];
    let currentChunk = '';

    const units = sentences.length > 1 ? sentences : text.split(/\s+/);
    const separator = sentences.length > 1 ? ' ' : ' ';

    for (const unit of units) {
        const unitTokens = estimateTokens(unit);
        const currentTokens = estimateTokens(currentChunk);

        if (currentTokens + unitTokens > maxTokens && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = unit;
        } else {
            currentChunk += (currentChunk ? separator : '') + unit;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function getOverlapTail(text: string, overlapTokens: number): string {
    if (overlapTokens <= 0) return '';
    const maxChars = overlapTokens * 4;
    if (text.length <= maxChars) return text;

    const tail = text.slice(-maxChars);
    const sentenceBoundary = tail.search(/[.!?]\s+/);
    return sentenceBoundary > 0 ? tail.slice(sentenceBoundary + 1).trim() : tail.trim();
}

function splitBySemantic(text: string, maxTokens: number): string[] {
    if (!text.trim()) return [];

    const overlapTokens = Math.min(
        MAX_OVERLAP_TOKENS,
        Math.floor(maxTokens * DEFAULT_OVERLAP_RATIO)
    );
    const targetTokens = Math.max(100, maxTokens - overlapTokens);
    const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    const rawChunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        const paragraphParts = estimateTokens(paragraph) > targetTokens
            ? splitTextToTokenBudget(paragraph, targetTokens)
            : [paragraph];

        for (const part of paragraphParts) {
            const partTokens = estimateTokens(part);
            const currentTokens = estimateTokens(currentChunk);

            if (currentTokens + partTokens > targetTokens && currentChunk) {
                rawChunks.push(currentChunk.trim());
                currentChunk = part;
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + part;
            }
        }
    }

    if (currentChunk.trim()) rawChunks.push(currentChunk.trim());

    return rawChunks.map((chunk, index) => {
        if (index === 0) return chunk;
        const overlap = getOverlapTail(rawChunks[index - 1], overlapTokens);
        return overlap ? `${overlap}\n\n${chunk}` : chunk;
    });
}

function isLikelySectionHeading(paragraph: string): boolean {
    const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0 || lines.length > 2) return false;

    const heading = lines[0];
    if (heading.length > 80 || /[.!?]$/.test(heading)) return false;
    if (heading.split(/\s+/).length > 8) return false;

    return /^[A-Z][A-Za-z0-9 &/(),:'-]+$/.test(heading);
}

function splitReportSections(text: string, maxTokens: number): string[] {
    const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    const sections: string[] = [];
    let currentSection = '';

    for (const paragraph of paragraphs) {
        if (isLikelySectionHeading(paragraph) && currentSection.trim()) {
            sections.push(currentSection.trim());
            currentSection = paragraph;
        } else {
            currentSection += (currentSection ? '\n\n' : '') + paragraph;
        }
    }

    if (currentSection.trim()) sections.push(currentSection.trim());
    if (sections.length <= 1) return splitBySemantic(text, maxTokens);

    return sections.flatMap((section) =>
        estimateTokens(section) > maxTokens ? splitBySemantic(section, maxTokens) : [section]
    );
}

/**
 * Chunk document with construction-aware splitting
 */
export function chunkDocument(
    content: string,
    documentId: string,
    options?: {
        documentType?: keyof typeof CHUNK_SIZES;
        preserveHierarchy?: boolean;
    }
): Chunk[] {
    const documentType = options?.documentType || detectDocumentType(content);
    const chunkSizes = CHUNK_SIZES[documentType];
    const preserveHierarchy = options?.preserveHierarchy ?? true;

    const chunks: Chunk[] = [];

    // Short correspondence is best kept intact; long letters still need chunks.
    if (documentType === 'correspondence' && estimateTokens(content) <= chunkSizes.max) {
        chunks.push({
            id: generateChunkId(),
            content: content.trim(),
            hierarchyLevel: 0,
            hierarchyPath: null,
            sectionTitle: null,
            clauseNumber: null,
            parentId: null,
            tokenCount: estimateTokens(content),
        });
        return chunks;
    }

    // For specifications, use clause-aware chunking
    if (documentType === 'specifications' && preserveHierarchy) {
        const clauses = extractClauseStructure(content);

        if (clauses.length > 0) {
            const parts = extractSpecificationParts(content).map((part) => ({
                ...part,
                chunkId: generateChunkId(),
            }));

            for (const part of parts) {
                chunks.push({
                    id: part.chunkId,
                    content: part.title,
                    hierarchyLevel: 1,
                    hierarchyPath: part.partNumber,
                    sectionTitle: part.title,
                    clauseNumber: null,
                    parentId: null,
                    tokenCount: estimateTokens(part.title),
                });
            }

            for (const clause of clauses) {
                const clauseTokens = estimateTokens(clause.content);
                const nearestPart = findNearestPart(parts, clause.startIndex);

                // If clause fits within limits, keep as single chunk
                if (clauseTokens <= chunkSizes.max) {
                    chunks.push({
                        id: generateChunkId(),
                        content: clause.content,
                        hierarchyLevel: clause.clauseNumber.split('.').length,
                        hierarchyPath: clause.clauseNumber,
                        sectionTitle: clause.title,
                        clauseNumber: clause.clauseNumber,
                        parentId: nearestPart?.chunkId ?? null,
                        tokenCount: clauseTokens,
                    });
                } else {
                    // Split large clauses semantically
                    const subChunks = splitBySemantic(clause.content, chunkSizes.max);
                    const parentId = generateChunkId();

                    // Add parent chunk reference
                    chunks.push({
                        id: parentId,
                        content: `${clause.clauseNumber} ${clause.title}`,
                        hierarchyLevel: clause.clauseNumber.split('.').length,
                        hierarchyPath: clause.clauseNumber,
                        sectionTitle: clause.title,
                        clauseNumber: clause.clauseNumber,
                        parentId: nearestPart?.chunkId ?? null,
                        tokenCount: estimateTokens(`${clause.clauseNumber} ${clause.title}`),
                    });

                    // Add sub-chunks
                    for (let i = 0; i < subChunks.length; i++) {
                        chunks.push({
                            id: generateChunkId(),
                            content: subChunks[i],
                            hierarchyLevel: clause.clauseNumber.split('.').length + 1,
                            hierarchyPath: `${clause.clauseNumber}.${i + 1}`,
                            sectionTitle: null,
                            clauseNumber: null,
                            parentId,
                            tokenCount: estimateTokens(subChunks[i]),
                        });
                    }
                }
            }

            return chunks;
        }
    }

    // Default semantic splitting
    const semanticChunks = documentType === 'reports'
        ? splitReportSections(content, chunkSizes.max)
        : splitBySemantic(content, chunkSizes.max);

    for (let i = 0; i < semanticChunks.length; i++) {
        chunks.push({
            id: generateChunkId(),
            content: semanticChunks[i],
            hierarchyLevel: 1,
            hierarchyPath: `${i + 1}`,
            sectionTitle: null,
            clauseNumber: null,
            parentId: null,
            tokenCount: estimateTokens(semanticChunks[i]),
        });
    }

    return chunks;
}

/**
 * Chunk seed knowledge markdown content (best-practice guides, domain seed files).
 * Splits on ## headings, with large sections further split on ### sub-headings.
 */
export function chunkSeedContent(content: string): Chunk[] {
    const chunks: Chunk[] = [];
    const maxTokens = CHUNK_SIZES.knowledgeGuide.max;

    // Strip YAML frontmatter (---...---)
    const stripped = content.replace(/^---[\s\S]*?---\n*/, '');

    // Split on ## headings (keep the heading with its content)
    const sections = stripped.split(/(?=^## )/m).filter((s) => s.trim());

    for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx++) {
        const section = sections[sectionIdx];
        const headingMatch = section.match(/^## (.+)$/m);
        const sectionTitle = headingMatch ? headingMatch[1].trim() : null;
        const sectionTokens = estimateTokens(section);

        if (sectionTokens <= maxTokens) {
            // Section fits in one chunk
            chunks.push({
                id: generateChunkId(),
                content: section.trim(),
                hierarchyLevel: 1,
                hierarchyPath: `${sectionIdx + 1}`,
                sectionTitle,
                clauseNumber: null,
                parentId: null,
                tokenCount: sectionTokens,
            });
        } else {
            // Large section — split further on ### sub-headings
            const parentId = generateChunkId();

            // Add parent chunk with just the section heading
            chunks.push({
                id: parentId,
                content: sectionTitle ? `## ${sectionTitle}` : section.slice(0, 100).trim(),
                hierarchyLevel: 1,
                hierarchyPath: `${sectionIdx + 1}`,
                sectionTitle,
                clauseNumber: null,
                parentId: null,
                tokenCount: estimateTokens(sectionTitle || ''),
            });

            const subSections = section.split(/(?=^### )/m).filter((s) => s.trim());

            for (let subIdx = 0; subIdx < subSections.length; subIdx++) {
                const sub = subSections[subIdx];
                const subHeadingMatch = sub.match(/^### (.+)$/m);
                const subTitle = subHeadingMatch ? subHeadingMatch[1].trim() : sectionTitle;
                const subTokens = estimateTokens(sub);

                if (subTokens <= maxTokens) {
                    chunks.push({
                        id: generateChunkId(),
                        content: sub.trim(),
                        hierarchyLevel: 2,
                        hierarchyPath: `${sectionIdx + 1}.${subIdx + 1}`,
                        sectionTitle: subTitle,
                        clauseNumber: null,
                        parentId,
                        tokenCount: subTokens,
                    });
                } else {
                    // Sub-section still too large — fall back to semantic splitting
                    const semanticParts = splitBySemantic(sub, maxTokens);
                    for (let partIdx = 0; partIdx < semanticParts.length; partIdx++) {
                        chunks.push({
                            id: generateChunkId(),
                            content: semanticParts[partIdx],
                            hierarchyLevel: 2,
                            hierarchyPath: `${sectionIdx + 1}.${subIdx + 1}.${partIdx + 1}`,
                            sectionTitle: subTitle,
                            clauseNumber: null,
                            parentId,
                            tokenCount: estimateTokens(semanticParts[partIdx]),
                        });
                    }
                }
            }
        }
    }

    return chunks;
}

/**
 * Detect and preserve table boundaries during semantic chunking.
 * Prevents splitting within pipe-delimited or tab-aligned tables.
 * Returns content with tables wrapped as atomic units that won't be split.
 */
export function preserveTableBoundaries(text: string): string[] {
    const lines = text.split('\n');
    const segments: string[] = [];
    let currentSegment = '';
    let inTable = false;
    let tableContent = '';

    for (const line of lines) {
        const isPipeLine = /^\|.*\|/.test(line.trim());
        const isTabAligned = /\t.*\t/.test(line) && !line.startsWith('#');
        const isSeparatorLine = /^\|[\s\-:|]+\|$/.test(line.trim());
        const isTableRow = isPipeLine || isTabAligned || isSeparatorLine;

        if (isTableRow && !inTable) {
            // Entering a table — flush current text segment
            if (currentSegment.trim()) {
                segments.push(currentSegment.trim());
                currentSegment = '';
            }
            inTable = true;
            tableContent = line;
        } else if (isTableRow && inTable) {
            // Continue table
            tableContent += '\n' + line;
        } else if (!isTableRow && inTable) {
            // Exiting table — flush table as atomic segment
            segments.push(tableContent.trim());
            tableContent = '';
            inTable = false;
            currentSegment = line;
        } else {
            // Normal text
            currentSegment += (currentSegment ? '\n' : '') + line;
        }
    }

    // Flush remaining content
    if (inTable && tableContent.trim()) {
        segments.push(tableContent.trim());
    }
    if (currentSegment.trim()) {
        segments.push(currentSegment.trim());
    }

    return segments;
}

export { CHUNK_SIZES, estimateTokens };
