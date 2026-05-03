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
import { retrieve, type RetrievalResult } from '@/lib/rag/retrieval';
import type {
    GenerateNoteContentRequest,
    GenerateNoteContentResponse,
} from '@/types/notes-meetings-reports';
import { buildSystemPrompt } from '@/lib/prompts/system-prompts';
import { assembleContext } from '@/lib/context/orchestrator';
import type { AttachedDocumentsData } from '@/lib/context/modules/attached-documents';

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

    // 1. Call assembleContext to get project context + attached documents
    const assembled = await assembleContext({
        projectId,
        contextType: 'note',
        task: existingContent?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || existingTitle || 'Generate note content',
        noteId,
    });

    // 2. Get document IDs from the attachedDocuments module for RAG scoping
    const attachedDocsModule = assembled.rawModules.get('attachedDocuments');
    const attachedDocumentIds: string[] = attachedDocsModule?.success && attachedDocsModule.data
        ? (attachedDocsModule.data as AttachedDocumentsData).documentIds
        : [];

    // 3. RAG retrieval (keep existing logic but use documentIds from orchestrator)
    const rawQueryText = existingContent?.trim() || existingTitle || '';
    const queryText = rawQueryText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
        maxTokens: 2000,
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
        },
    };
}
