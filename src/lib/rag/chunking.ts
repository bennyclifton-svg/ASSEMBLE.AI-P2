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
    correspondence: { min: 0, max: Infinity }, // Full document
    reports: { min: 800, max: 1200 },
    default: { min: 800, max: 1200 },
};

// Construction document patterns
const CLAUSE_PATTERN = /^(\d+(?:\.\d+)*)\s+(.+)$/gm; // e.g., "3.2.1 Concrete Mix"
const SECTION_PATTERN = /^#+\s+(.+)$/gm; // Markdown headers
const SPEC_SECTION_PATTERN = /^(PART\s+\d+|SECTION\s+\d+)/gim;

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

    if (SPEC_SECTION_PATTERN.test(content) || lowerContent.includes('specification')) {
        return 'specifications';
    }
    if (lowerContent.includes('schedule') || lowerContent.includes('drawing list')) {
        return 'drawingSchedules';
    }
    if (lowerContent.includes('dear') || lowerContent.includes('regards') || lowerContent.includes('sincerely')) {
        return 'correspondence';
    }
    if (lowerContent.includes('report') || lowerContent.includes('summary')) {
        return 'reports';
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

    const regex = /^(\d+(?:\.\d+)*)\s+(.+)$/gm;
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

/**
 * Split text by semantic boundaries (paragraph breaks, headers)
 */
function splitBySemantic(text: string, maxTokens: number): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        const paragraphTokens = estimateTokens(paragraph);
        const currentTokens = estimateTokens(currentChunk);

        if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = paragraph;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
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

    // For correspondence, return as single chunk
    if (documentType === 'correspondence') {
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
            for (const clause of clauses) {
                const clauseTokens = estimateTokens(clause.content);

                // If clause fits within limits, keep as single chunk
                if (clauseTokens <= chunkSizes.max) {
                    chunks.push({
                        id: generateChunkId(),
                        content: clause.content,
                        hierarchyLevel: clause.clauseNumber.split('.').length,
                        hierarchyPath: clause.clauseNumber,
                        sectionTitle: clause.title,
                        clauseNumber: clause.clauseNumber,
                        parentId: null,
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
                        parentId: null,
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
    const semanticChunks = splitBySemantic(content, chunkSizes.max);

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

export { CHUNK_SIZES, estimateTokens };
