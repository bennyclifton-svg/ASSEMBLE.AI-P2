"use strict";
/**
 * T015: Chunking Module
 * Construction-aware semantic splitting per spec.md and research.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHUNK_SIZES = void 0;
exports.chunkDocument = chunkDocument;
exports.estimateTokens = estimateTokens;
// Chunk size guidelines from research.md
var CHUNK_SIZES = {
    specifications: { min: 1000, max: 1500 },
    drawingSchedules: { min: 500, max: 800 },
    correspondence: { min: 0, max: Infinity }, // Full document
    reports: { min: 800, max: 1200 },
    default: { min: 800, max: 1200 },
};
exports.CHUNK_SIZES = CHUNK_SIZES;
// Construction document patterns
var CLAUSE_PATTERN = /^(\d+(?:\.\d+)*)\s+(.+)$/gm; // e.g., "3.2.1 Concrete Mix"
var SECTION_PATTERN = /^#+\s+(.+)$/gm; // Markdown headers
var SPEC_SECTION_PATTERN = /^(PART\s+\d+|SECTION\s+\d+)/gim;
/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
/**
 * Generate unique chunk ID
 */
function generateChunkId() {
    return "chunk_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 9));
}
/**
 * Detect document type from content
 */
function detectDocumentType(content) {
    var lowerContent = content.toLowerCase();
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
function extractClauseStructure(content) {
    var clauses = [];
    var regex = /^(\d+(?:\.\d+)*)\s+(.+)$/gm;
    var match;
    var matches = [];
    while ((match = regex.exec(content)) !== null) {
        matches.push({
            clauseNumber: match[1],
            title: match[2].trim(),
            startIndex: match.index,
        });
    }
    // Extract content between clauses
    for (var i = 0; i < matches.length; i++) {
        var current = matches[i];
        var next = matches[i + 1];
        var endIndex = next ? next.startIndex : content.length;
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
function splitBySemantic(text, maxTokens) {
    var paragraphs = text.split(/\n\n+/);
    var chunks = [];
    var currentChunk = '';
    for (var _i = 0, paragraphs_1 = paragraphs; _i < paragraphs_1.length; _i++) {
        var paragraph = paragraphs_1[_i];
        var paragraphTokens = estimateTokens(paragraph);
        var currentTokens = estimateTokens(currentChunk);
        if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = paragraph;
        }
        else {
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
function chunkDocument(content, documentId, options) {
    var _a;
    var documentType = (options === null || options === void 0 ? void 0 : options.documentType) || detectDocumentType(content);
    var chunkSizes = CHUNK_SIZES[documentType];
    var preserveHierarchy = (_a = options === null || options === void 0 ? void 0 : options.preserveHierarchy) !== null && _a !== void 0 ? _a : true;
    var chunks = [];
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
        var clauses = extractClauseStructure(content);
        if (clauses.length > 0) {
            for (var _i = 0, clauses_1 = clauses; _i < clauses_1.length; _i++) {
                var clause = clauses_1[_i];
                var clauseTokens = estimateTokens(clause.content);
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
                }
                else {
                    // Split large clauses semantically
                    var subChunks = splitBySemantic(clause.content, chunkSizes.max);
                    var parentId = generateChunkId();
                    // Add parent chunk reference
                    chunks.push({
                        id: parentId,
                        content: "".concat(clause.clauseNumber, " ").concat(clause.title),
                        hierarchyLevel: clause.clauseNumber.split('.').length,
                        hierarchyPath: clause.clauseNumber,
                        sectionTitle: clause.title,
                        clauseNumber: clause.clauseNumber,
                        parentId: null,
                        tokenCount: estimateTokens("".concat(clause.clauseNumber, " ").concat(clause.title)),
                    });
                    // Add sub-chunks
                    for (var i = 0; i < subChunks.length; i++) {
                        chunks.push({
                            id: generateChunkId(),
                            content: subChunks[i],
                            hierarchyLevel: clause.clauseNumber.split('.').length + 1,
                            hierarchyPath: "".concat(clause.clauseNumber, ".").concat(i + 1),
                            sectionTitle: null,
                            clauseNumber: null,
                            parentId: parentId,
                            tokenCount: estimateTokens(subChunks[i]),
                        });
                    }
                }
            }
            return chunks;
        }
    }
    // Default semantic splitting
    var semanticChunks = splitBySemantic(content, chunkSizes.max);
    for (var i = 0; i < semanticChunks.length; i++) {
        chunks.push({
            id: generateChunkId(),
            content: semanticChunks[i],
            hierarchyLevel: 1,
            hierarchyPath: "".concat(i + 1),
            sectionTitle: null,
            clauseNumber: null,
            parentId: null,
            tokenCount: estimateTokens(semanticChunks[i]),
        });
    }
    return chunks;
}
