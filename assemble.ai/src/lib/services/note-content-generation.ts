/**
 * Note Content Generation Service
 * Feature 021 - Notes, Meetings & Reports
 *
 * AI-powered content generation for notes using:
 * - Note's existing content (as prompt or content to enhance)
 * - Attached documents (via transmittals)
 * - RAG-retrieved project context
 *
 * Supports two modes via smart detection:
 * 1. Prompt mode: Note text is an instruction (e.g., "summarize the attached")
 * 2. Content mode: Note text is content to enhance
 */

import { aiComplete } from '@/lib/ai/client';
import {
    getDocumentChunksByIds,
    retrieve,
    type DocumentChunkContent,
    type RetrievalResult,
} from '@/lib/rag/retrieval';
import type {
    GenerateNoteContentRequest,
    GenerateNoteContentResponse,
} from '@/types/notes-meetings-reports';
import { buildSystemPrompt } from '@/lib/prompts/system-prompts';
import { assembleContext } from '@/lib/context/orchestrator';
import {
    fetchAttachedDocuments,
    type AttachedDocumentEntry,
    type AttachedDocumentsData,
} from '@/lib/context/modules/attached-documents';

const DIRECT_DOCUMENT_CONTEXT_TOKEN_BUDGET = 16_000;
const DIRECT_DOCUMENT_BATCH_TOKEN_BUDGET = 5_000;
const DIRECT_DOCUMENT_SAFE_REQUEST_TOKEN_BUDGET = 24_000;
const DIRECT_DOCUMENT_PROMPT_OVERHEAD_TOKENS = 2_500;
const DIRECT_DOCUMENT_FINAL_MAX_TOKENS = 1_600;
const DIRECT_DOCUMENT_BATCH_SUMMARY_MAX_TOKENS = 700;
const DIRECT_DOCUMENT_CHUNK_SLICE_TOKEN_BUDGET = 3_500;
const LARGE_DOCUMENT_NOTICE = 'This document is large, summarising in sections before generating the refreshed content.';

// ============================================================================
// FORMATTING CLEANUP
// ============================================================================

/**
 * Clean up AI-generated content by removing blank lines
 * - Removes empty bullet points (lines that are just bullet, -, or *)
 * - Removes all blank lines (no double spacing)
 * - Trims whitespace from each line
 * - Removes leading/trailing blank lines
 */
function cleanupFormatting(content: string): string {
    return content
        // Split into lines
        .split('\n')
        // Trim whitespace from each line
        .map(line => line.trim())
        // Remove empty lines and empty bullet points
        .filter(line => {
            // Remove blank lines entirely
            if (line === '') return false;
            // Remove lines that are ONLY a bullet character
            if (/^[•\-\*]$/.test(line)) return false;
            // Remove lines that are just a bullet followed by whitespace
            if (/^[•\-\*]\s*$/.test(line)) return false;
            return true;
        })
        // Join back together with single newlines (no blank lines)
        .join('\n')
        // Final trim
        .trim();
}

function stripHtml(value: string | undefined): string {
    return value?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
}

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

function isWholeDocumentReviewIntent(queryText: string): boolean {
    const normalized = queryText.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) return false;

    return [
        /^(please\s+)?(summari[sz]e|summary|review|analyse|analyze|overview)\b/,
        /\b(summari[sz]e|review|overview of|key points|main points|what is this document)\b/,
        /\b(attached document|attachment|attached file|ingested document)\b.*\b(summari[sz]e|review|overview|key points|main points)\b/,
        /\b(summari[sz]e|review|overview|key points|main points)\b.*\b(attached document|attachment|attached file|ingested document)\b/,
    ].some((pattern) => pattern.test(normalized));
}

function referencesAttachedDocument(queryText: string): boolean {
    const normalized = queryText.toLowerCase().replace(/\s+/g, ' ').trim();
    return /\b(attached document|attached file|attachment|ingested document|enclosed document)\b/.test(normalized);
}

function referencesDocumentObject(queryText: string): boolean {
    const normalized = queryText.toLowerCase().replace(/\s+/g, ' ').trim();
    return /\b(attached document|attached file|attachment|ingested document|enclosed document|the document|this document|the file|this file)\b/.test(normalized);
}

function shouldUseDocumentOnlyMode(queryText: string): boolean {
    return queryText.length > 10 && (
        referencesAttachedDocument(queryText) ||
        (isWholeDocumentReviewIntent(queryText) && referencesDocumentObject(queryText))
    );
}

function formatDocumentLabel(documentId: string, attachedDocs: AttachedDocumentEntry[]): string {
    const doc = attachedDocs.find((entry) => entry.documentId === documentId);
    if (!doc) return documentId;
    return doc.categoryName ? `${doc.documentName} (${doc.categoryName})` : doc.documentName;
}

function formatDocumentChunks(
    chunks: DocumentChunkContent[],
    attachedDocs: AttachedDocumentEntry[]
): string {
    const lines: string[] = [];
    let currentDocumentId: string | null = null;

    for (const chunk of chunks) {
        if (chunk.documentId !== currentDocumentId) {
            currentDocumentId = chunk.documentId;
            lines.push(`\n## ${formatDocumentLabel(chunk.documentId, attachedDocs)}`);
        }

        const labelParts = [
            chunk.hierarchyPath ? `Path ${chunk.hierarchyPath}` : null,
            chunk.clauseNumber ? `Clause ${chunk.clauseNumber}` : null,
            chunk.sectionTitle ? chunk.sectionTitle : null,
        ].filter(Boolean);

        if (labelParts.length > 0) {
            lines.push(`\n### ${labelParts.join(' | ')}`);
        }
        lines.push(chunk.content);
    }

    return lines.join('\n').trim();
}

function splitChunksByTokenBudget(
    chunks: DocumentChunkContent[],
    tokenBudget: number
): DocumentChunkContent[][] {
    const batches: DocumentChunkContent[][] = [];
    let currentBatch: DocumentChunkContent[] = [];
    let currentTokens = 0;

    for (const chunk of chunks) {
        const chunkTokens = chunk.tokenCount ?? estimateTokens(chunk.content);
        if (currentBatch.length > 0 && currentTokens + chunkTokens > tokenBudget) {
            batches.push(currentBatch);
            currentBatch = [];
            currentTokens = 0;
        }

        currentBatch.push(chunk);
        currentTokens += chunkTokens;
    }

    if (currentBatch.length > 0) batches.push(currentBatch);
    return batches;
}

function splitTextByTokenBudget(text: string, tokenBudget: number): string[] {
    const maxChars = tokenBudget * 4;
    const parts: string[] = [];
    let current = '';

    const flushCurrent = () => {
        if (!current.trim()) return;
        parts.push(current.trim());
        current = '';
    };

    const pushHardSplit = (value: string) => {
        let remaining = value.trim();
        while (estimateTokens(remaining) > tokenBudget) {
            let splitAt = remaining.lastIndexOf('\n', maxChars);
            if (splitAt < Math.floor(maxChars * 0.65)) {
                splitAt = remaining.lastIndexOf(' ', maxChars);
            }
            if (splitAt < Math.floor(maxChars * 0.65)) {
                splitAt = maxChars;
            }

            parts.push(remaining.slice(0, splitAt).trim());
            remaining = remaining.slice(splitAt).trimStart();
        }

        if (remaining.trim()) {
            parts.push(remaining.trim());
        }
    };

    for (const paragraph of text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)) {
        if (estimateTokens(paragraph) > tokenBudget) {
            flushCurrent();
            pushHardSplit(paragraph);
            continue;
        }

        const next = current ? `${current}\n\n${paragraph}` : paragraph;
        if (estimateTokens(next) > tokenBudget) {
            flushCurrent();
            current = paragraph;
        } else {
            current = next;
        }
    }

    flushCurrent();
    return parts.length > 0 ? parts : [text];
}

function splitOversizedDocumentChunks(
    chunks: DocumentChunkContent[],
    tokenBudget: number
): DocumentChunkContent[] {
    return chunks.flatMap((chunk) => {
        const contentTokenEstimate = estimateTokens(chunk.content);
        const effectiveTokens = Math.max(chunk.tokenCount ?? contentTokenEstimate, contentTokenEstimate);
        if (effectiveTokens <= tokenBudget) return [chunk];

        return splitTextByTokenBudget(chunk.content, tokenBudget).map((content, index) => ({
            ...chunk,
            chunkId: `${chunk.chunkId}::part-${index + 1}`,
            content,
            tokenCount: estimateTokens(content),
            sectionTitle: chunk.sectionTitle
                ? `${chunk.sectionTitle} (part ${index + 1})`
                : `Document text part ${index + 1}`,
        }));
    });
}

function preflightAttachedDocumentRequest(params: {
    existingTitle?: string;
    existingContent?: string;
    attachedDocs: AttachedDocumentEntry[];
    attachedDocumentIds: string[];
    chunkTokens: number;
}): {
    shouldSummarizeInSections: boolean;
    estimatedDirectRequestTokens: number;
    notice?: string;
} {
    const labelTokens = estimateTokens(
        params.attachedDocumentIds
            .map((id) => formatDocumentLabel(id, params.attachedDocs))
            .join('\n')
    );
    const instructionTokens = estimateTokens(
        [
            params.existingTitle || '',
            stripHtml(params.existingContent),
        ].join('\n')
    );
    const estimatedDirectRequestTokens =
        params.chunkTokens +
        labelTokens +
        instructionTokens +
        DIRECT_DOCUMENT_PROMPT_OVERHEAD_TOKENS +
        DIRECT_DOCUMENT_FINAL_MAX_TOKENS;
    const shouldSummarizeInSections =
        params.chunkTokens > DIRECT_DOCUMENT_CONTEXT_TOKEN_BUDGET ||
        estimatedDirectRequestTokens > DIRECT_DOCUMENT_SAFE_REQUEST_TOKEN_BUDGET;

    return {
        shouldSummarizeInSections,
        estimatedDirectRequestTokens,
        notice: shouldSummarizeInSections ? LARGE_DOCUMENT_NOTICE : undefined,
    };
}

async function summarizeDocumentBatches(
    chunks: DocumentChunkContent[],
    attachedDocs: AttachedDocumentEntry[]
): Promise<string> {
    const splitChunks = splitOversizedDocumentChunks(chunks, DIRECT_DOCUMENT_CHUNK_SLICE_TOKEN_BUDGET);
    const batches = splitChunksByTokenBudget(splitChunks, DIRECT_DOCUMENT_BATCH_TOKEN_BUDGET);
    const summaries: string[] = [];

    for (let i = 0; i < batches.length; i++) {
        const batchContent = formatDocumentChunks(batches[i], attachedDocs);
        const { text } = await aiComplete({
            featureGroup: 'generation',
            maxTokens: DIRECT_DOCUMENT_BATCH_SUMMARY_MAX_TOKENS,
            system: 'You summarize construction and project documents faithfully. Use only the supplied document text.',
            messages: [{
                role: 'user',
                content: `Summarize this portion of an attached document for later synthesis. Preserve concrete facts, names, dates, obligations, risks, decisions, and notable gaps. Do not add project brief context.\n\n## Document Portion ${i + 1} of ${batches.length}\n${batchContent}`,
            }],
        });
        summaries.push(`## Portion ${i + 1}\n${cleanupFormatting(text)}`);
    }

    return summaries.join('\n\n');
}

async function generateFromAttachedDocumentText(params: {
    existingTitle?: string;
    existingContent?: string;
    attachedDocs: AttachedDocumentEntry[];
    attachedDocumentIds: string[];
    documentChunks: DocumentChunkContent[];
}): Promise<{
    text: string;
    notice?: string;
    sourceMode: 'attached-document' | 'attached-document-summary';
    estimatedDocumentTokens: number;
    estimatedDirectRequestTokens: number;
}> {
    const chunkTokens = params.documentChunks.reduce(
        (sum, chunk) => sum + (chunk.tokenCount ?? estimateTokens(chunk.content)),
        0
    );
    const preflight = preflightAttachedDocumentRequest({
        existingTitle: params.existingTitle,
        existingContent: params.existingContent,
        attachedDocs: params.attachedDocs,
        attachedDocumentIds: params.attachedDocumentIds,
        chunkTokens,
    });
    if (preflight.shouldSummarizeInSections) {
        console.log(
            `[note-content-generation] ${LARGE_DOCUMENT_NOTICE} ` +
            `(document tokens: ${chunkTokens}, direct request estimate: ${preflight.estimatedDirectRequestTokens})`
        );
    }

    const sourceLabel = preflight.shouldSummarizeInSections
        ? 'Attached Document Section Summaries'
        : 'Attached Document Text';
    const sourceMaterial = preflight.shouldSummarizeInSections
        ? await summarizeDocumentBatches(params.documentChunks, params.attachedDocs)
        : formatDocumentChunks(params.documentChunks, params.attachedDocs);
    const sourceMode = preflight.shouldSummarizeInSections
        ? 'attached-document-summary'
        : 'attached-document';

    const systemPrompt = buildSystemPrompt('note');
    const userMessage = `## Note Title
${params.existingTitle || '(Untitled Note)'}

## Note Instruction
${stripHtml(params.existingContent) || '(Empty)'}

## Attached Documents
${params.attachedDocumentIds.map((id) => `- ${formatDocumentLabel(id, params.attachedDocs)}`).join('\n')}

## ${sourceLabel}
${sourceMaterial}

## Instructions
- Treat the note instruction as the user's request.
- Use only the attached document material above.
- Do not use project profile, class, subclass, GFA, storeys, project brief data, starred notes, or other project context unless it is explicitly quoted in the attached document material.
- If the attached document material does not contain enough information to answer part of the request, say what is missing.
- Do not invent, infer, or fill gaps from general project knowledge.

Output only the generated content with no headers or meta-commentary.`;

    const { text } = await aiComplete({
        featureGroup: 'generation',
        maxTokens: DIRECT_DOCUMENT_FINAL_MAX_TOKENS,
        system: systemPrompt,
        messages: [{
            role: 'user',
            content: userMessage,
        }],
    });

    return {
        text,
        notice: preflight.notice,
        sourceMode,
        estimatedDocumentTokens: chunkTokens,
        estimatedDirectRequestTokens: preflight.estimatedDirectRequestTokens,
    };
}

function formatRagResults(ragResults: RetrievalResult[]): string {
    return ragResults
        .map((r, i) => {
            const header = r.sectionTitle ? `### Source ${i + 1}: ${r.sectionTitle}` : `### Source ${i + 1}`;
            return `${header}\n${r.content}`;
        })
        .join('\n\n');
}

async function generateFromAttachedDocumentRag(params: {
    existingTitle?: string;
    existingContent?: string;
    attachedDocs: AttachedDocumentEntry[];
    attachedDocumentIds: string[];
    ragResults: RetrievalResult[];
}): Promise<string> {
    const systemPrompt = buildSystemPrompt('note');
    const userMessage = `## Note Title
${params.existingTitle || '(Untitled Note)'}

## Note Instruction
${stripHtml(params.existingContent) || '(Empty)'}

## Attached Documents
${params.attachedDocumentIds.map((id) => `- ${formatDocumentLabel(id, params.attachedDocs)}`).join('\n')}

## Retrieved Attached Document Excerpts (${params.ragResults.length} sources)
${formatRagResults(params.ragResults)}

## Instructions
- Treat the note instruction as the user's request.
- Use only the attached document excerpts above.
- Do not use project profile, class, subclass, GFA, storeys, project brief data, starred notes, or other project context.
- If the excerpts do not contain enough information to answer part of the request, say what is missing.
- Do not invent, infer, or fill gaps from general project knowledge.

Output only the generated content with no headers or meta-commentary.`;

    const { text } = await aiComplete({
        featureGroup: 'generation',
        maxTokens: 2000,
        system: systemPrompt,
        messages: [{
            role: 'user',
            content: userMessage,
        }],
    });

    return text;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate content for a note using AI
 *
 * Uses the unified context orchestrator for project info, attached documents,
 * and profile data. RAG retrieval is still done locally because it depends on
 * the note's content as the query and the attached document IDs.
 *
 * Smart detection:
 * - If note text looks like an instruction, follow it
 * - If note text is actual content, enhance it
 */
export async function generateNoteContent(
    request: GenerateNoteContentRequest
): Promise<GenerateNoteContentResponse> {
    const {
        noteId,
        projectId,
        existingContent,
        existingTitle,
    } = request;

    console.log(`[note-content-generation] Generating content for note ${noteId}`);

    const rawQueryText = existingContent?.trim() || existingTitle || '';
    const queryText = stripHtml(rawQueryText);

    if (shouldUseDocumentOnlyMode(queryText)) {
        const attachedDocsResult = await fetchAttachedDocuments(projectId, { noteId });
        const attachedDocsData = attachedDocsResult.success
            ? attachedDocsResult.data
            : null;
        const attachedDocumentIds = attachedDocsData?.documentIds ?? [];

        if (attachedDocumentIds.length > 0) {
            if (isWholeDocumentReviewIntent(queryText)) {
                console.log(`[note-content-generation] Loading ${attachedDocumentIds.length} attached documents directly for whole-document review`);
                const documentChunks = await getDocumentChunksByIds(attachedDocumentIds);
                console.log(`[note-content-generation] Loaded ${documentChunks.length} attached document chunks without RAG`);

                if (documentChunks.length === 0) {
                    return {
                        content: 'I could not retrieve readable text from the attached document. It may still be ingesting, may not have synced to the AI knowledge base, or may not contain extractable text.',
                        sourcesUsed: {
                            attachedDocs: attachedDocumentIds.length,
                            ragChunks: 0,
                            documentChunks: 0,
                            sourceMode: 'attached-document',
                        },
                    };
                }

                const generated = await generateFromAttachedDocumentText({
                    existingTitle,
                    existingContent,
                    attachedDocs: attachedDocsData?.documents ?? [],
                    attachedDocumentIds,
                    documentChunks,
                });

                console.log(`[note-content-generation] Generated content successfully from attached document text`);

                return {
                    content: cleanupFormatting(generated.text),
                    notice: generated.notice,
                    sourcesUsed: {
                        attachedDocs: attachedDocumentIds.length,
                        ragChunks: 0,
                        documentChunks: documentChunks.length,
                        sourceMode: generated.sourceMode,
                        estimatedDocumentTokens: generated.estimatedDocumentTokens,
                        estimatedDirectRequestTokens: generated.estimatedDirectRequestTokens,
                        usedStagedSummary: generated.sourceMode === 'attached-document-summary',
                    },
                };
            }

            console.log(`[note-content-generation] Searching ${attachedDocumentIds.length} attached documents only for: "${queryText.substring(0, 50)}..."`);
            const ragResults = await retrieve(queryText, {
                documentIds: attachedDocumentIds,
                topK: 30,
                rerankTopK: 15,
                includeParentContext: true,
                minRelevanceScore: 0.2,
            });
            console.log(`[note-content-generation] Retrieved ${ragResults.length} attached-document RAG results`);

            if (ragResults.length === 0) {
                return {
                    content: 'I could not find relevant text in the attached document for that request. The document may still be ingesting, may not have synced to the AI knowledge base, or the retrieved excerpts may have fallen below the relevance threshold.',
                    sourcesUsed: {
                        attachedDocs: attachedDocumentIds.length,
                        ragChunks: 0,
                        sourceMode: 'rag',
                    },
                };
            }

            const text = await generateFromAttachedDocumentRag({
                existingTitle,
                existingContent,
                attachedDocs: attachedDocsData?.documents ?? [],
                attachedDocumentIds,
                ragResults,
            });

            console.log(`[note-content-generation] Generated content successfully from attached-document RAG`);

            return {
                content: cleanupFormatting(text),
                sourcesUsed: {
                    attachedDocs: attachedDocumentIds.length,
                    ragChunks: ragResults.length,
                    sourceMode: 'rag',
                },
            };
        }
    }

    // 1. Call assembleContext to get project context + attached documents
    const assembled = await assembleContext({
        projectId,
        contextType: 'note',
        task: queryText || existingTitle || 'Generate note content',
        noteId,
    });

    // 2. Get document IDs from the attachedDocuments module for RAG scoping
    const attachedDocsModule = assembled.rawModules.get('attachedDocuments');
    const attachedDocumentIds: string[] = attachedDocsModule?.success && attachedDocsModule.data
        ? (attachedDocsModule.data as AttachedDocumentsData).documentIds
        : [];

    // 3. RAG retrieval (keep existing logic but use documentIds from orchestrator)
    let ragResults: RetrievalResult[] = [];
    if (attachedDocumentIds.length > 0 && queryText.length > 10) {
        try {
            console.log(`[note-content-generation] Searching ${attachedDocumentIds.length} attached documents for: "${queryText.substring(0, 50)}..."`);
            ragResults = await retrieve(queryText, {
                documentIds: attachedDocumentIds,
                topK: 30,
                rerankTopK: 15,
                includeParentContext: true,
                minRelevanceScore: 0.2,
            });
            console.log(`[note-content-generation] Retrieved ${ragResults.length} RAG results`);
        } catch (error) {
            console.error('[note-content-generation] RAG retrieval failed:', error);
        }
    } else if (attachedDocumentIds.length === 0) {
        console.log('[note-content-generation] No attached documents to search');
    }

    // 4. Build context from orchestrator output + RAG
    const contextParts: string[] = [];
    if (assembled.projectSummary) contextParts.push(assembled.projectSummary);
    if (assembled.moduleContext) contextParts.push(assembled.moduleContext);
    if (assembled.crossModuleInsights) contextParts.push(assembled.crossModuleInsights);

    // Add RAG results
    if (ragResults.length > 0) {
        const ragContent = ragResults
            .map((r, i) => {
                const header = r.sectionTitle ? `### Source ${i + 1}: ${r.sectionTitle}` : `### Source ${i + 1}`;
                return `${header}\n${r.content}`;
            })
            .join('\n\n');
        contextParts.push(`## Retrieved Project Context (${ragResults.length} sources)\n${ragContent}`);
    }

    const contextString = contextParts.join('\n\n---\n\n');

    // Build system prompt with note-specific layer
    const systemPrompt = buildSystemPrompt('note');

    // Build the user message with smart detection
    const userMessage = `## Note Title
${existingTitle || '(Untitled Note)'}

## Note Content
${existingContent || '(Empty)'}

## Available Context
${contextString || 'No additional context available.'}

## Instructions

First, analyze the note content to determine the user's intent:

**PROMPT MODE** — If the note content is an instruction (starts with "summarize", "review", "list", "create", "extract", "please", "give me", "I need", "can you"):
- Treat the note content as instructions to follow
- Use the attached documents and retrieved context as source material
- Generate new content that is the result of following the instruction

**CONTENT MODE** — If the note content is actual observations or notes (meeting notes, bullet points, paragraphs of information):
- Preserve the key points and intent of the existing content
- Expand and enhance with relevant details from attached documents and context
- Improve structure, clarity, and completeness
- Maintain the user's voice and style

## Critical Rules

1. **ONLY use information explicitly stated in the Retrieved Project Context above**
2. **DO NOT invent, fabricate, or hallucinate any information**
3. If the retrieved context doesn't contain requested information, clearly state what was found and what is missing
4. Quote or paraphrase directly from source material when possible

Output only the generated content with no headers or meta-commentary.`;

    // Route through provider-agnostic client so the user's model selection
    // (Anthropic / OpenAI / OpenRouter) in /admin/models is honoured.
    const { text } = await aiComplete({
        featureGroup: 'generation',
        maxTokens: DIRECT_DOCUMENT_FINAL_MAX_TOKENS,
        system: systemPrompt,
        messages: [{
            role: 'user',
            content: userMessage,
        }],
    });

    console.log(`[note-content-generation] Generated content successfully`);

    // Clean up formatting (remove excessive blank lines)
    const cleanedContent = cleanupFormatting(text);

    return {
        content: cleanedContent,
        sourcesUsed: {
            attachedDocs: attachedDocumentIds.length,
            ragChunks: ragResults.length,
            sourceMode: 'rag',
        },
    };
}
