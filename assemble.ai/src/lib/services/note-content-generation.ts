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
import { ragDb } from '@/lib/db/rag-client';
import { eq, and, inArray } from 'drizzle-orm';
import { documentSets } from '@/lib/db/rag-schema';
import { retrieve, type RetrievalResult } from '@/lib/rag/retrieval';
import type {
    GenerateNoteContentRequest,
    GenerateNoteContentResponse,
} from '@/types/notes-meetings-reports';

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

/**
 * Get default document set ID for a project (for RAG queries)
 */
async function getProjectDocumentSetId(projectId: string): Promise<string | null> {
    try {
        const [docSet] = await ragDb
            .select({ id: documentSets.id })
            .from(documentSets)
            .where(and(
                eq(documentSets.projectId, projectId),
                eq(documentSets.isDefault, true)
            ));

        return docSet?.id || null;
    } catch (error) {
        console.error('[note-content-generation] Error fetching document set:', error);
        return null;
    }
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
    const [attachedDocs, projectContext, documentSetId] = await Promise.all([
        fetchAttachedDocuments(noteId),
        fetchProjectContext(projectId),
        getProjectDocumentSetId(projectId),
    ]);

    // Build query for RAG from note content or title
    const queryText = existingContent?.trim() || existingTitle || '';

    // Fetch RAG results if we have a document set and query
    let ragResults: RetrievalResult[] = [];
    if (documentSetId && queryText.length > 10) {
        try {
            ragResults = await retrieve(queryText, {
                documentSetIds: [documentSetId],
                topK: 20,
                rerankTopK: 5,
                includeParentContext: true,
                minRelevanceScore: 0.3,
            });
            console.log(`[note-content-generation] Retrieved ${ragResults.length} RAG results`);
        } catch (error) {
            console.error('[note-content-generation] RAG retrieval failed:', error);
        }
    }

    // Build context string
    const contextString = buildContextString(attachedDocs, ragResults, projectContext);

    // Build the smart detection prompt
    const fullPrompt = `You are a professional project management assistant helping with note-taking and documentation.

## Note Title
${existingTitle || '(Untitled Note)'}

## Note Content
${existingContent || '(Empty)'}

## Available Context
${contextString || 'No additional context available.'}

## Instructions

First, analyze the note content to determine the user's intent:

**PROMPT MODE** - If the note content appears to be an instruction or request (e.g., starts with words like "summarize", "review", "list", "create", "analyze", "extract", "please", or phrases like "give me", "I need", "can you"), then:
- Treat the note content as instructions to follow
- Use the attached documents and retrieved context as your source material
- Generate new content based on the instruction
- The output should be the result of following the instruction, NOT the instruction itself

**CONTENT MODE** - If the note content appears to be actual notes, observations, or content (e.g., meeting notes, project observations, bullet points, paragraphs of information), then:
- Preserve the key points and intent of the existing content
- Expand and enhance with relevant details from attached documents and context
- Improve structure, clarity, and completeness
- Maintain the user's voice and style

## Examples of Prompt Mode triggers:
- "Please summarize the attached document"
- "Review and list the key points"
- "Create a summary of the project status"
- "Summarize the specifications"
- "Extract the main requirements"

## Examples of Content Mode triggers:
- "Met with contractor today to discuss delays..."
- "Key risks identified: 1. Budget overrun..."
- "Project update: foundation works complete..."
- Bullet point lists of observations
- Paragraphs describing project activities

Generate professional, well-structured content. Use bullet points where appropriate for clarity.
Do not include headers, meta-commentary, or explanations of what you're doing.
Output only the generated content.`;

    // Call Claude API
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
            role: 'user',
            content: fullPrompt,
        }],
    });

    // Extract text response
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from AI');
    }

    console.log(`[note-content-generation] Generated content successfully`);

    return {
        content: textContent.text.trim(),
        sourcesUsed: {
            attachedDocs: attachedDocs.length,
            ragChunks: ragResults.length,
        },
    };
}
