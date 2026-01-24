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
    projectProfiles,
    profilerObjectives,
    projectStakeholders,
} from '@/lib/db';

interface GenerateFieldRequest {
    projectId: string;
    fieldType: FieldType;
    userInput: string;
    stakeholderId?: string;
    disciplineId?: string;  // deprecated - use stakeholderId
    tradeId?: string;       // deprecated - use stakeholderId
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
    metadata: {
        usedRAG: boolean;
        usedProjectContext: boolean;
        usedProfiler: boolean;
        usedObjectives: boolean;
        ragDocumentCount: number;
        ragChunkCount: number;
    };
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
        // stakeholderId can be used as an alternative to disciplineId/tradeId
        if (metadata.requiresDiscipline && !body.disciplineId && !body.stakeholderId) {
            return NextResponse.json(
                { error: `disciplineId or stakeholderId is required for field type ${body.fieldType}` },
                { status: 400 }
            );
        }

        if (metadata.requiresTrade && !body.tradeId && !body.stakeholderId) {
            return NextResponse.json(
                { error: `tradeId or stakeholderId is required for field type ${body.fieldType}` },
                { status: 400 }
            );
        }

        // Detect input interpretation mode
        const inputMode = detectInputMode(body.userInput);
        console.log(`[generate-field] Mode: ${inputMode}, Field: ${body.fieldType}`);

        // Fetch project context
        const projectContext = await fetchProjectContext(body.projectId);

        // Fetch discipline/trade name from stakeholder or legacy tables
        let contextName = '';
        let stakeholderContext = '';
        if (body.stakeholderId) {
            // New: Use projectStakeholders table
            const stakeholder = await fetchStakeholderContext(body.stakeholderId);
            if (stakeholder) {
                contextName = stakeholder.disciplineOrTrade || stakeholder.name || 'Unknown Discipline';
                stakeholderContext = stakeholder.context;
            }
        } else if (body.disciplineId) {
            // Legacy: Use consultantDisciplines table
            const discipline = await fetchDisciplineName(body.projectId, body.disciplineId);
            contextName = discipline || 'Unknown Discipline';
        } else if (body.tradeId) {
            // Legacy: Use contractorTrades table
            const trade = await fetchTradeName(body.projectId, body.tradeId);
            contextName = trade || 'Unknown Trade';
        }

        // Attempt RAG retrieval (optional - don't fail if unavailable)
        let ragResults: any[] = [];
        let ragChunksContext = '';
        let documentNames = new Map<string, string>();
        let ragAvailable = false;

        try {
            // Find the project's Knowledge document set
            const documentSetResult = await ragDb.execute(sql`
                SELECT id, name
                FROM document_sets
                WHERE project_id = ${body.projectId}
                AND name = 'Knowledge'
                LIMIT 1
            `);

            const documentSets = (documentSetResult.rows || []) as any[];

            if (documentSets.length > 0) {
                const documentSetId = documentSets[0].id;

                // Get synced documents in the set
                const memberResults = await ragDb.execute(sql`
                    SELECT DISTINCT document_id as "documentId"
                    FROM document_set_members
                    WHERE document_set_id = ${documentSetId}
                    AND sync_status = 'synced'
                `);

                const documentIds = ((memberResults.rows || []) as any[]).map(m => m.documentId);

                if (documentIds.length > 0) {
                    // Build query for RAG retrieval based on mode
                    const ragQuery = buildRagQuery(body.userInput, inputMode, body.fieldType, contextName);

                    // Retrieve relevant chunks using RAG
                    ragResults = await retrieve(ragQuery, {
                        documentIds,
                        topK: 10,
                        rerankTopK: 5,
                        includeParentContext: true,
                    });

                    if (ragResults.length > 0) {
                        ragAvailable = true;

                        // Build RAG chunks context
                        ragChunksContext = ragResults
                            .map((r, i) => `[Source ${i + 1}${r.sectionTitle ? ` - ${r.sectionTitle}` : ''}]\n${r.content}`)
                            .join('\n\n---\n\n');

                        // Get document names for sources
                        documentNames = await getDocumentNames(ragResults.map(r => r.documentId));
                    }
                }
            }
        } catch (ragError) {
            // Log but don't fail - RAG is optional
            console.log('[generate-field] RAG retrieval unavailable:', ragError);
        }

        // Log which sources are available
        console.log(`[generate-field] Sources: RAG=${ragAvailable}, ProjectContext=${!!projectContext}, StakeholderContext=${!!stakeholderContext}`);

        // Build the full prompt
        const promptTemplate = getPromptTemplate(body.fieldType, inputMode, ragAvailable);
        const fullPrompt = buildFullPrompt(
            promptTemplate,
            body.userInput,
            projectContext,
            contextName,
            ragChunksContext,
            body.additionalContext,
            stakeholderContext
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

        // Build sources array (empty if RAG not used)
        const sources = ragResults.map(r => ({
            chunkId: r.chunkId,
            documentName: documentNames.get(r.documentId) || 'Unknown Document',
            relevanceScore: Math.round(r.relevanceScore * 100),
        }));

        // Build response with metadata about sources used
        const response: GenerateFieldResponse = {
            content: textContent.text.trim(),
            sources,
            inputInterpretation: inputMode,
            metadata: {
                usedRAG: ragAvailable,
                usedProjectContext: !!projectContext && projectContext !== 'No project context available.',
                usedProfiler: projectContext.includes('## Project Profile'),
                usedObjectives: projectContext.includes('## Project Objectives'),
                ragDocumentCount: new Set(ragResults.map(r => r.documentId)).size,
                ragChunkCount: ragResults.length,
            },
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
 * Fetch project context (details, profiler data, and objectives)
 * Includes profiler selections (buildingClass, projectType, subclass, complexity, scale)
 * and profiler objectives (functional quality, planning compliance)
 */
async function fetchProjectContext(projectId: string): Promise<string> {
    try {
        // Fetch project details
        const [details] = await db
            .select()
            .from(projectDetails)
            .where(eq(projectDetails.projectId, projectId));

        // Fetch profiler data (buildingClass, projectType, subclass, complexity, scale, workScope)
        const [profile] = await db
            .select()
            .from(projectProfiles)
            .where(eq(projectProfiles.projectId, projectId));

        // Fetch profiler objectives (new 2-category structure)
        const [objectives] = await db
            .select()
            .from(profilerObjectives)
            .where(eq(profilerObjectives.projectId, projectId));

        // Fallback to legacy objectives if profilerObjectives not found
        const [legacyObjectives] = !objectives
            ? await db.select().from(projectObjectives).where(eq(projectObjectives.projectId, projectId))
            : [null];

        const lines: string[] = [];

        // Project Details
        if (details) {
            if (details.projectName) lines.push(`Project Name: ${details.projectName}`);
            if (details.address) lines.push(`Address: ${details.address}`);
            if (details.jurisdiction) lines.push(`Jurisdiction: ${details.jurisdiction}`);
            if (details.numberOfStories) lines.push(`Number of Stories: ${details.numberOfStories}`);
            if (details.buildingClass) lines.push(`Building Class: ${details.buildingClass}`);
            if (details.zoning) lines.push(`Zoning: ${details.zoning}`);
            if (details.lotArea) lines.push(`Lot Area: ${details.lotArea} sqm`);
        }

        // Profiler Data
        if (profile) {
            lines.push('');
            lines.push('## Project Profile');
            if (profile.buildingClass) lines.push(`Building Class: ${profile.buildingClass}`);
            if (profile.projectType) lines.push(`Project Type: ${profile.projectType}`);

            // Parse and add subclass
            if (profile.subclass) {
                try {
                    const subclasses = JSON.parse(profile.subclass);
                    if (Array.isArray(subclasses) && subclasses.length > 0) {
                        lines.push(`Subclass: ${subclasses.join(', ')}`);
                    }
                } catch { /* ignore parse errors */ }
            }

            // Parse and add scale data
            if (profile.scaleData) {
                try {
                    const scale = JSON.parse(profile.scaleData);
                    if (Object.keys(scale).length > 0) {
                        const scaleItems = Object.entries(scale)
                            .filter(([_, v]) => v !== null && v !== undefined)
                            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                            .join(', ');
                        if (scaleItems) lines.push(`Scale: ${scaleItems}`);
                    }
                } catch { /* ignore parse errors */ }
            }

            // Parse and add complexity
            if (profile.complexity) {
                try {
                    const complexity = JSON.parse(profile.complexity);
                    if (Object.keys(complexity).length > 0) {
                        const complexityItems = Object.entries(complexity)
                            .filter(([_, v]) => v !== null && v !== undefined && v !== '')
                            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                            .join(', ');
                        if (complexityItems) lines.push(`Complexity: ${complexityItems}`);
                    }
                } catch { /* ignore parse errors */ }
            }

            // Parse and add work scope
            if (profile.workScope) {
                try {
                    const workScope = JSON.parse(profile.workScope);
                    if (Array.isArray(workScope) && workScope.length > 0) {
                        lines.push(`Work Scope: ${workScope.join(', ')}`);
                    }
                } catch { /* ignore parse errors */ }
            }

            if (profile.complexityScore) {
                lines.push(`Complexity Score: ${profile.complexityScore}/10`);
            }
        }

        // Profiler Objectives (new structure with Functional Quality + Planning Compliance)
        if (objectives) {
            lines.push('');
            lines.push('## Project Objectives');

            // Parse functionalQuality JSON
            if (objectives.functionalQuality) {
                try {
                    const fq = JSON.parse(objectives.functionalQuality);
                    if (fq.content) lines.push(`Functional & Quality Objectives: ${fq.content}`);
                } catch { /* ignore parse errors */ }
            }

            // Parse planningCompliance JSON
            if (objectives.planningCompliance) {
                try {
                    const pc = JSON.parse(objectives.planningCompliance);
                    if (pc.content) lines.push(`Planning & Compliance Objectives: ${pc.content}`);
                } catch { /* ignore parse errors */ }
            }
        } else if (legacyObjectives) {
            // Fallback to legacy objectives
            lines.push('');
            lines.push('## Project Objectives');
            if (legacyObjectives.functional) lines.push(`Functional Objectives: ${legacyObjectives.functional}`);
            if (legacyObjectives.quality) lines.push(`Quality Objectives: ${legacyObjectives.quality}`);
            if (legacyObjectives.budget) lines.push(`Budget Objectives: ${legacyObjectives.budget}`);
            if (legacyObjectives.program) lines.push(`Program Objectives: ${legacyObjectives.program}`);
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
 * Fetch trade name by ID (legacy - use fetchStakeholderContext instead)
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
 * Fetch stakeholder context from projectStakeholders table
 * Returns the discipline/trade name and additional context for prompts
 */
async function fetchStakeholderContext(stakeholderId: string): Promise<{
    disciplineOrTrade: string | null;
    name: string | null;
    stakeholderGroup: string | null;
    context: string;
} | null> {
    try {
        const [stakeholder] = await db
            .select({
                name: projectStakeholders.name,
                disciplineOrTrade: projectStakeholders.disciplineOrTrade,
                stakeholderGroup: projectStakeholders.stakeholderGroup,
                role: projectStakeholders.role,
                organization: projectStakeholders.organization,
            })
            .from(projectStakeholders)
            .where(eq(projectStakeholders.id, stakeholderId));

        if (!stakeholder) return null;

        // Build context string for prompts
        const contextParts: string[] = [];
        if (stakeholder.disciplineOrTrade) {
            contextParts.push(`Discipline/Trade: ${stakeholder.disciplineOrTrade}`);
        }
        if (stakeholder.role) {
            contextParts.push(`Role: ${stakeholder.role}`);
        }
        if (stakeholder.organization) {
            contextParts.push(`Organization: ${stakeholder.organization}`);
        }
        if (stakeholder.stakeholderGroup) {
            contextParts.push(`Stakeholder Type: ${stakeholder.stakeholderGroup}`);
        }

        return {
            disciplineOrTrade: stakeholder.disciplineOrTrade,
            name: stakeholder.name,
            stakeholderGroup: stakeholder.stakeholderGroup,
            context: contextParts.join('\n'),
        };
    } catch (error) {
        console.error('[generate-field] Error fetching stakeholder context:', error);
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
    },
    stakeholderContext?: string
): string {
    let prompt = template
        .replace('{userInput}', userInput || '(no user input provided)')
        .replace('{projectContext}', projectContext)
        .replace('{ragChunks}', ragChunks);

    // Add context name if available
    if (contextName) {
        prompt = prompt.replace(/{disciplineName}|{tradeName}|{contextName}/g, contextName);
    }

    // Add stakeholder context if provided (discipline-specific information)
    if (stakeholderContext) {
        prompt += `\n\n## Stakeholder Context\n${stakeholderContext}`;
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

    // Add instruction to generate discipline-specific content
    prompt += `\n\nIMPORTANT: Generate content that is SPECIFIC to the discipline/trade mentioned above (${contextName}). Do not generate a generic project brief - focus only on the services and deliverables relevant to this specific discipline. Generate only the content text directly. Do not include JSON formatting, markdown code blocks, or any wrapper structure. Just provide the professional text content.`;

    return prompt;
}
