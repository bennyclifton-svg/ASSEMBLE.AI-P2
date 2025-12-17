/**
 * T232: Unified Field Generation API
 * POST /api/retrieval/generate-field
 *
 * Universal endpoint for AI-assisted field generation.
 * Replaces /api/retrieval/generate-brief with a flexible, multi-field system.
 *
 * Features:
 * - Input interpretation (instruction, enhance, generate, focused)
 * - Auto-fetched context (discipline name, project objectives, planning details)
 * - Knowledge Source RAG retrieval
 * - Field-type-specific prompt templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { retrieve } from '@/lib/rag/retrieval';
import { ragDb } from '@/lib/db/rag-client';
import { db } from '@/lib/db';
import { sql, eq } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentUser } from '@/lib/auth/get-user';
import {
    type FieldType,
    type InputInterpretation,
    detectInputMode,
    FIELD_METADATA,
    getPromptTemplate,
} from '@/lib/constants/field-types';
import {
    projectDetails,
    projectObjectives,
    consultantDisciplines,
    contractorTrades,
} from '@/lib/db';

interface GenerateFieldRequest {
    projectId: string;
    fieldType: FieldType;
    userInput: string;
    disciplineId?: string;
    tradeId?: string;
    additionalContext?: {
        firmName?: string;
        evaluationData?: object;
        sectionTitle?: string;
    };
}

interface GenerateFieldResponse {
    content: string;
    sources: {
        chunkId: string;
        documentName: string;
        relevanceScore: number;
    }[];
    inputInterpretation: InputInterpretation;
}

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: GenerateFieldRequest = await req.json();

        // Validate required fields
        if (!body.projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        if (!body.fieldType || !FIELD_METADATA[body.fieldType]) {
            return NextResponse.json(
                { error: 'Invalid or missing fieldType' },
                { status: 400 }
            );
        }

        const metadata = FIELD_METADATA[body.fieldType];

        // Validate context requirements
        if (metadata.requiresDiscipline && !body.disciplineId) {
            return NextResponse.json(
                { error: `disciplineId is required for field type ${body.fieldType}` },
                { status: 400 }
            );
        }

        if (metadata.requiresTrade && !body.tradeId) {
            return NextResponse.json(
                { error: `tradeId is required for field type ${body.fieldType}` },
                { status: 400 }
            );
        }

        // Detect input interpretation mode
        const inputMode = detectInputMode(body.userInput);
        console.log(`[generate-field] Mode: ${inputMode}, Field: ${body.fieldType}`);

        // Fetch project context
        const projectContext = await fetchProjectContext(body.projectId);

        // Fetch discipline/trade name if provided
        let contextName = '';
        if (body.disciplineId) {
            const discipline = await fetchDisciplineName(body.projectId, body.disciplineId);
            contextName = discipline || 'Unknown Discipline';
        } else if (body.tradeId) {
            const trade = await fetchTradeName(body.projectId, body.tradeId);
            contextName = trade || 'Unknown Trade';
        }

        // Find the project's Knowledge document set
        const documentSetResult = await ragDb.execute(sql`
            SELECT id, name
            FROM document_sets
            WHERE project_id = ${body.projectId}
            AND name = 'Knowledge'
            LIMIT 1
        `);

        const documentSets = (documentSetResult.rows || []) as any[];
        if (documentSets.length === 0) {
            return NextResponse.json(
                { error: 'No Knowledge Source configured. Add documents to the Knowledge category first.' },
                { status: 404 }
            );
        }

        const documentSetId = documentSets[0].id;

        // Get synced documents in the set
        const memberResults = await ragDb.execute(sql`
            SELECT DISTINCT document_id as "documentId"
            FROM document_set_members
            WHERE document_set_id = ${documentSetId}
            AND sync_status = 'synced'
        `);

        const documentIds = ((memberResults.rows || []) as any[]).map(m => m.documentId);

        if (documentIds.length === 0) {
            return NextResponse.json(
                { error: 'No documents synced in Knowledge Source. Wait for processing to complete.' },
                { status: 404 }
            );
        }

        // Build query for RAG retrieval based on mode
        const ragQuery = buildRagQuery(body.userInput, inputMode, body.fieldType, contextName);

        // Retrieve relevant chunks using RAG
        const results = await retrieve(ragQuery, {
            documentIds,
            topK: 10,
            rerankTopK: 5,
            includeParentContext: true,
        });

        if (results.length === 0) {
            return NextResponse.json(
                { error: 'No relevant content found in Knowledge Source. Try adding more documents.' },
                { status: 404 }
            );
        }

        // Build RAG chunks context
        const ragChunksContext = results
            .map((r, i) => `[Source ${i + 1}${r.sectionTitle ? ` - ${r.sectionTitle}` : ''}]\n${r.content}`)
            .join('\n\n---\n\n');

        // Get document names for sources
        const documentNames = await getDocumentNames(results.map(r => r.documentId));

        // Build the full prompt
        const promptTemplate = getPromptTemplate(body.fieldType, inputMode);
        const fullPrompt = buildFullPrompt(
            promptTemplate,
            body.userInput,
            projectContext,
            contextName,
            ragChunksContext,
            body.additionalContext
        );

        // Generate content using Claude
        const anthropic = new Anthropic();
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{
                role: 'user',
                content: fullPrompt,
            }],
        });

        // Extract the text response
        const textContent = message.content.find(c => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text response from Claude');
        }

        // Build sources array
        const sources = results.map(r => ({
            chunkId: r.chunkId,
            documentName: documentNames.get(r.documentId) || 'Unknown Document',
            relevanceScore: Math.round(r.relevanceScore * 100),
        }));

        const response: GenerateFieldResponse = {
            content: textContent.text.trim(),
            sources,
            inputInterpretation: inputMode,
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('[retrieval/generate-field] Error:', error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Fetch project context (details and objectives)
 */
async function fetchProjectContext(projectId: string): Promise<string> {
    try {
        const [details] = await db
            .select()
            .from(projectDetails)
            .where(eq(projectDetails.projectId, projectId));

        const [objectives] = await db
            .select()
            .from(projectObjectives)
            .where(eq(projectObjectives.projectId, projectId));

        const lines: string[] = [];

        if (details) {
            if (details.projectName) lines.push(`Project Name: ${details.projectName}`);
            if (details.address) lines.push(`Address: ${details.address}`);
            if (details.buildingClass) lines.push(`Building Class: ${details.buildingClass}`);
            if (details.numberOfStories) lines.push(`Number of Stories: ${details.numberOfStories}`);
            if (details.jurisdiction) lines.push(`Jurisdiction: ${details.jurisdiction}`);
        }

        if (objectives) {
            if (objectives.functional) lines.push(`Functional Objectives: ${objectives.functional}`);
            if (objectives.quality) lines.push(`Quality Objectives: ${objectives.quality}`);
            if (objectives.budget) lines.push(`Budget Objectives: ${objectives.budget}`);
            if (objectives.program) lines.push(`Program Objectives: ${objectives.program}`);
        }

        return lines.length > 0 ? lines.join('\n') : 'No project context available.';
    } catch (error) {
        console.error('[generate-field] Error fetching project context:', error);
        return 'Project context not available.';
    }
}

/**
 * Fetch discipline name by ID
 */
async function fetchDisciplineName(projectId: string, disciplineId: string): Promise<string | null> {
    try {
        const [discipline] = await db
            .select({ name: consultantDisciplines.disciplineName })
            .from(consultantDisciplines)
            .where(eq(consultantDisciplines.id, disciplineId));

        return discipline?.name || null;
    } catch (error) {
        console.error('[generate-field] Error fetching discipline name:', error);
        return null;
    }
}

/**
 * Fetch trade name by ID
 */
async function fetchTradeName(projectId: string, tradeId: string): Promise<string | null> {
    try {
        const [trade] = await db
            .select({ name: contractorTrades.tradeName })
            .from(contractorTrades)
            .where(eq(contractorTrades.id, tradeId));

        return trade?.name || null;
    } catch (error) {
        console.error('[generate-field] Error fetching trade name:', error);
        return null;
    }
}

/**
 * Get document names by IDs
 */
async function getDocumentNames(documentIds: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();

    if (documentIds.length === 0) return names;

    try {
        // Query documents table in app database
        const results = await db.execute(sql`
            SELECT id, name
            FROM documents
            WHERE id IN (${sql.join(documentIds.map(id => sql`${id}`), sql`, `)})
        `);

        for (const row of (results.rows || []) as any[]) {
            names.set(row.id, row.name);
        }
    } catch (error) {
        console.error('[generate-field] Error fetching document names:', error);
    }

    return names;
}

/**
 * Build RAG query based on input mode
 */
function buildRagQuery(
    userInput: string,
    mode: InputInterpretation,
    fieldType: FieldType,
    contextName: string
): string {
    const metadata = FIELD_METADATA[fieldType];
    const trimmed = userInput.trim();

    switch (mode) {
        case 'instruction':
            // Extract key terms from instruction for retrieval
            return `${contextName} ${metadata.contextLabel} ${trimmed}`;

        case 'enhance':
            // Use existing content as query
            return trimmed.substring(0, 500); // Limit query length

        case 'focused':
            // Use focus keywords for targeted retrieval
            return `${contextName} ${trimmed}`;

        case 'generate':
        default:
            // Use generic query based on field type and context
            return `${contextName} ${metadata.contextLabel} requirements scope deliverables`;
    }
}

/**
 * Build the full prompt by replacing template placeholders
 */
function buildFullPrompt(
    template: string,
    userInput: string,
    projectContext: string,
    contextName: string,
    ragChunks: string,
    additionalContext?: {
        firmName?: string;
        evaluationData?: object;
        sectionTitle?: string;
    }
): string {
    let prompt = template
        .replace('{userInput}', userInput || '(no user input provided)')
        .replace('{projectContext}', projectContext)
        .replace('{ragChunks}', ragChunks);

    // Add context name if available
    if (contextName) {
        prompt = prompt.replace(/{disciplineName}|{tradeName}|{contextName}/g, contextName);
    }

    // Add additional context if provided
    if (additionalContext) {
        const extras: string[] = [];
        if (additionalContext.firmName) {
            extras.push(`Firm/Company: ${additionalContext.firmName}`);
        }
        if (additionalContext.sectionTitle) {
            extras.push(`Section: ${additionalContext.sectionTitle}`);
        }
        if (additionalContext.evaluationData) {
            extras.push(`Evaluation Data: ${JSON.stringify(additionalContext.evaluationData)}`);
        }
        if (extras.length > 0) {
            prompt += `\n\n## Additional Context\n${extras.join('\n')}`;
        }
    }

    // Add instruction to generate plain text
    prompt += `\n\nIMPORTANT: Generate only the content text directly. Do not include JSON formatting, markdown code blocks, or any wrapper structure. Just provide the professional text content.`;

    return prompt;
}
