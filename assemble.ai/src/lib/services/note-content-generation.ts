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

import Anthropic from '@anthropic-ai/sdk';
import {
    db,
    notes,
    noteTransmittals,
    documents,
    versions,
    fileAssets,
    projectDetails,
    projectObjectives,
} from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';
import { retrieve, type RetrievalResult } from '@/lib/rag/retrieval';
import type {
    GenerateNoteContentRequest,
    GenerateNoteContentResponse,
} from '@/types/notes-meetings-reports';
import { buildSystemPrompt } from '@/lib/prompts/system-prompts';

// ============================================================================
// TYPES
// ============================================================================

interface AttachedDocument {
    id: string;
    documentId: string;
    documentName: string;
    categoryName: string | null;
}

interface ProjectContext {
    projectName: string | null;
    address: string | null;
    functional: string | null;
    quality: string | null;
    budget: string | null;
    program: string | null;
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch attached documents for a note via transmittals
 */
async function fetchAttachedDocuments(noteId: string): Promise<AttachedDocument[]> {
    try {
        const transmittals = await db
            .select({
                id: noteTransmittals.id,
                documentId: noteTransmittals.documentId,
            })
            .from(noteTransmittals)
            .where(eq(noteTransmittals.noteId, noteId));

        if (transmittals.length === 0) {
            return [];
        }

        const documentIds = transmittals.map(t => t.documentId);

        // Fetch document details
        const docs = await db
            .select({
                id: documents.id,
                categoryId: documents.categoryId,
            })
            .from(documents)
            .where(inArray(documents.id, documentIds));

        // Fetch latest versions for document names
        const docVersions = await db
            .select({
                documentId: versions.documentId,
                fileAssetId: versions.fileAssetId,
            })
            .from(versions)
            .where(inArray(versions.documentId, documentIds));

        // Fetch file assets for names
        const fileAssetIds = docVersions.map(v => v.fileAssetId).filter(Boolean) as string[];
        const assets = fileAssetIds.length > 0
            ? await db
                .select({
                    id: fileAssets.id,
                    originalName: fileAssets.originalName,
                })
                .from(fileAssets)
                .where(inArray(fileAssets.id, fileAssetIds))
            : [];

        // Build lookup maps
        const assetMap = new Map(assets.map(a => [a.id, a.originalName]));
        const versionMap = new Map(docVersions.map(v => [v.documentId, v.fileAssetId]));

        return docs.map(doc => ({
            id: doc.id,
            documentId: doc.id,
            documentName: assetMap.get(versionMap.get(doc.id) || '') || 'Unknown Document',
            categoryName: doc.categoryId || null,
        }));
    } catch (error) {
        console.error('[note-content-generation] Error fetching attached documents:', error);
        return [];
    }
}

/**
 * Fetch project context (details and objectives)
 */
async function fetchProjectContext(projectId: string): Promise<ProjectContext> {
    try {
        const [details] = await db
            .select({
                projectName: projectDetails.projectName,
                address: projectDetails.address,
            })
            .from(projectDetails)
            .where(eq(projectDetails.projectId, projectId));

        const [objectives] = await db
            .select({
                functional: projectObjectives.functional,
                quality: projectObjectives.quality,
                budget: projectObjectives.budget,
                program: projectObjectives.program,
            })
            .from(projectObjectives)
            .where(eq(projectObjectives.projectId, projectId));

        return {
            projectName: details?.projectName || null,
            address: details?.address || null,
            functional: objectives?.functional || null,
            quality: objectives?.quality || null,
            budget: objectives?.budget || null,
            program: objectives?.program || null,
        };
    } catch (error) {
        console.error('[note-content-generation] Error fetching project context:', error);
        return {
            projectName: null,
            address: null,
            functional: null,
            quality: null,
            budget: null,
            program: null,
        };
    }
}

// ============================================================================
// FORMATTING CLEANUP
// ============================================================================

/**
 * Clean up AI-generated content by removing blank lines
 * - Removes empty bullet points (lines that are just •, -, or *)
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
// CONTEXT BUILDING
// ============================================================================

/**
 * Build context string from attached documents and RAG results
 */
function buildContextString(
    attachedDocs: AttachedDocument[],
    ragResults: RetrievalResult[],
    projectContext: ProjectContext
): string {
    const sections: string[] = [];

    // Project context
    const projectLines: string[] = [];
    if (projectContext.projectName) projectLines.push(`Project: ${projectContext.projectName}`);
    if (projectContext.address) projectLines.push(`Address: ${projectContext.address}`);
    if (projectContext.functional) projectLines.push(`Functional Objectives: ${projectContext.functional}`);
    if (projectContext.quality) projectLines.push(`Quality Objectives: ${projectContext.quality}`);
    if (projectContext.budget) projectLines.push(`Budget: ${projectContext.budget}`);
    if (projectContext.program) projectLines.push(`Program: ${projectContext.program}`);

    if (projectLines.length > 0) {
        sections.push(`## Project Information\n${projectLines.join('\n')}`);
    }

    // Attached documents list
    if (attachedDocs.length > 0) {
        const docsList = attachedDocs
            .map(d => `- ${d.documentName}${d.categoryName ? ` (${d.categoryName})` : ''}`)
            .join('\n');
        sections.push(`## Attached Documents (${attachedDocs.length})\n${docsList}`);
    }

    // RAG-retrieved content
    if (ragResults.length > 0) {
        const ragContent = ragResults
            .map((r, i) => {
                const header = r.sectionTitle
                    ? `### Source ${i + 1}: ${r.sectionTitle}`
                    : `### Source ${i + 1}`;
                return `${header}\n${r.content}`;
            })
            .join('\n\n');
        sections.push(`## Retrieved Project Context (${ragResults.length} sources)\n${ragContent}`);
    }

    return sections.join('\n\n---\n\n');
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate content for a note using AI
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

    // Fetch context data in parallel
    const [attachedDocs, projectContext] = await Promise.all([
        fetchAttachedDocuments(noteId),
        fetchProjectContext(projectId),
    ]);

    // Build query for RAG from note content or title
    // Strip HTML tags for better embedding quality
    const rawQueryText = existingContent?.trim() || existingTitle || '';
    const queryText = rawQueryText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Get document IDs from attachments for RAG retrieval
    const attachedDocumentIds = attachedDocs.map(d => d.documentId);

    // Fetch RAG results if we have attached documents and a query
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

    // Build context string
    const contextString = buildContextString(attachedDocs, ragResults, projectContext);

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

    // Call Claude API with system prompt separation
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
            role: 'user',
            content: userMessage,
        }],
    });

    // Extract text response
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from AI');
    }

    console.log(`[note-content-generation] Generated content successfully`);

    // Clean up formatting (remove excessive blank lines)
    const cleanedContent = cleanupFormatting(textContent.text);

    return {
        content: cleanedContent,
        sourcesUsed: {
            attachedDocs: attachedDocs.length,
            ragChunks: ragResults.length,
        },
    };
}
