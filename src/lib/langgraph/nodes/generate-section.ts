/**
 * T043: Generate Section Node
 * Generates section content with Claude streaming
 *
 * This node:
 * 1. Uses hybrid context (planningContext + ragChunks)
 * 2. Streams tokens to UI via SSE
 * 3. Includes source citations for retrieved chunks
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
    ReportStateType,
    GeneratedSection,
    TocSection,
    SmartContextSource,
} from '../state';
import { formatHybridContext, getSmartContextSources } from './retrieve-context';
import { v4 as uuidv4 } from 'uuid';
import { ragDb } from '@/lib/db/rag-client';
import { reportSections } from '@/lib/db/rag-schema';
import { eq, and } from 'drizzle-orm';

// Initialize Anthropic client
const anthropic = new Anthropic();

export interface GenerateSectionResult {
    sections: GeneratedSection[];
}

// Event emitter type for streaming progress
export type ProgressEmitter = (event: {
    reportId: string;
    sectionIndex: number;
    event: 'section_start' | 'section_chunk' | 'sources_updated' | 'section_complete';
    data: any;
}) => void;

// Global progress emitter (set by API route)
let progressEmitter: ProgressEmitter | null = null;

export function setProgressEmitter(emitter: ProgressEmitter | null) {
    progressEmitter = emitter;
}

/**
 * Build prompt for section generation
 */
function buildSectionPrompt(
    section: TocSection,
    state: ReportStateType,
    hybridContext: string
): string {
    const sectionNumber = state.currentSectionIndex + 1;
    const totalSections = state.toc?.sections.length ?? 0;

    // Check if this is a subsection
    const isSubsection = section.level === 2;

    // Get user feedback if regenerating
    const feedbackInstructions = state.userFeedback?.action === 'regenerate'
        ? `\n## User Feedback\n${state.userFeedback.instructions || 'Please regenerate this section.'}\n`
        : '';

    return `You are a construction project management expert generating content for a Tender Request document.

${hybridContext}

## Current Section
Section ${sectionNumber} of ${totalSections}: "${section.title}"
${section.description ? `Description: ${section.description}` : ''}
Level: ${isSubsection ? 'Subsection (##)' : 'Main Section (#)'}

${feedbackInstructions}

## Instructions

Generate professional content for this section of the tender request. Your response should:

1. Be appropriate for the ${state.discipline || 'construction'} discipline
2. Reference specific details from the Project Context above
3. Address relevant objectives and stakeholder needs
4. Consider identified risks where appropriate
5. Use professional construction industry terminology
6. Be concise but comprehensive (300-800 words)

${state.currentRetrievedChunks.length > 0 ? `
## Citation Instructions

When using information from the Document Context, include citations in this format:
- After specific technical requirements: [Source: document title]
- After standards references: [Ref: standard name]

The retrieved documents contain relevant technical specifications and standards.
` : ''}

## Response Format

Start directly with the section content. Do not include the section title (it will be added automatically).
Use markdown formatting for:
- Bullet points for lists of requirements
- Numbered lists for procedures or steps
- Bold for key terms
- Tables if presenting structured data

Generate the section content now:`;
}

/**
 * Generate section node
 * Creates section content using Claude with streaming
 */
export async function generateSectionNode(
    state: ReportStateType
): Promise<GenerateSectionResult> {
    console.log('[generate-section] Generating section:', state.currentSectionIndex);

    if (!state.toc) {
        throw new Error('No TOC available for section generation');
    }

    const currentSection = state.toc.sections[state.currentSectionIndex];
    if (!currentSection) {
        throw new Error(`Section not found at index ${state.currentSectionIndex}`);
    }

    // Check if this is the transmittal appendix (handled by different node)
    if (currentSection.id === 'appendix-a-transmittal' ||
        currentSection.title.toLowerCase().includes('transmittal')) {
        console.log('[generate-section] Skipping - transmittal handled by generate-transmittal-section');
        return { sections: state.sections };
    }

    try {
        // Emit section start event
        if (progressEmitter && state.reportId) {
            progressEmitter({
                reportId: state.reportId,
                sectionIndex: state.currentSectionIndex,
                event: 'section_start',
                data: { title: currentSection.title },
            });
        }

        // Build hybrid context and prompt
        const hybridContext = formatHybridContext(state);
        const prompt = buildSectionPrompt(currentSection, state, hybridContext);

        // Generate with Claude streaming
        console.log('[generate-section] Calling Claude with streaming...');

        let content = '';
        const stream = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        // Collect streamed content
        for await (const event of stream) {
            if (event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta') {
                const chunk = event.delta.text;
                content += chunk;

                // Emit chunk event
                if (progressEmitter && state.reportId) {
                    progressEmitter({
                        reportId: state.reportId,
                        sectionIndex: state.currentSectionIndex,
                        event: 'section_chunk',
                        data: { content: chunk },
                    });
                }
            }
        }

        console.log('[generate-section] Generated', content.length, 'characters');

        // Get smart context sources
        const sources = getSmartContextSources(state);

        // Emit sources update
        if (progressEmitter && state.reportId) {
            progressEmitter({
                reportId: state.reportId,
                sectionIndex: state.currentSectionIndex,
                event: 'sources_updated',
                data: { sources },
            });
        }

        // Build source relevance map
        const sourceRelevance: Record<string, number> = {};
        for (const chunk of state.currentRetrievedChunks) {
            if (state.activeSourceIds.includes(chunk.chunkId)) {
                sourceRelevance[chunk.chunkId] = chunk.relevanceScore;
            }
        }

        // Create generated section
        const generatedSection: GeneratedSection = {
            id: uuidv4(),
            title: currentSection.title,
            content,
            sourceChunkIds: state.activeSourceIds,
            sourceRelevance,
            sources,
            status: 'complete',
            generatedAt: new Date().toISOString(),
            regenerationCount: 0,
        };

        // Emit section complete event
        if (progressEmitter && state.reportId) {
            progressEmitter({
                reportId: state.reportId,
                sectionIndex: state.currentSectionIndex,
                event: 'section_complete',
                data: { sectionId: generatedSection.id },
            });
        }

        // Persist section to database
        if (state.reportId) {
            await ragDb.update(reportSections)
                .set({
                    content: content,
                    status: 'complete',
                    sourceChunkIds: state.activeSourceIds,
                    sourceRelevance: sourceRelevance,
                })
                .where(and(
                    eq(reportSections.reportId, state.reportId),
                    eq(reportSections.sectionIndex, state.currentSectionIndex)
                ));
        }

        // Add to sections array
        const sections = [...state.sections];
        sections[state.currentSectionIndex] = generatedSection;

        return { sections };
    } catch (error) {
        console.error('[generate-section] Error generating section:', error);

        // Create failed section
        const failedSection: GeneratedSection = {
            id: uuidv4(),
            title: currentSection.title,
            content: `Error generating section: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sourceChunkIds: [],
            sourceRelevance: {},
            sources: [],
            status: 'complete', // Mark as complete to continue flow
            generatedAt: new Date().toISOString(),
            regenerationCount: 0,
        };

        const sections = [...state.sections];
        sections[state.currentSectionIndex] = failedSection;

        return { sections };
    }
}

/**
 * Regenerate a specific section
 */
export async function regenerateSection(
    state: ReportStateType,
    sectionIndex: number,
    feedback?: string,
    excludeSourceIds?: string[]
): Promise<GenerateSectionResult> {
    console.log('[generate-section] Regenerating section:', sectionIndex);

    // Create modified state for regeneration
    const modifiedState: ReportStateType = {
        ...state,
        currentSectionIndex: sectionIndex,
        userFeedback: {
            action: 'regenerate',
            sectionIndex,
            instructions: feedback,
            excludedSourceIds: excludeSourceIds,
        },
        activeSourceIds: state.activeSourceIds.filter(id =>
            !excludeSourceIds?.includes(id)
        ),
    };

    // Get existing section for regeneration count
    const existingSection = state.sections[sectionIndex];
    const result = await generateSectionNode(modifiedState);

    // Update regeneration count
    if (result.sections[sectionIndex]) {
        result.sections[sectionIndex].regenerationCount =
            (existingSection?.regenerationCount ?? 0) + 1;
    }

    return result;
}

// ============================================
// T099d & T099e: Data Only Mode Generators
// ============================================

import {
    formatFeeItemsAsMarkdown,
    formatPriceItemsAsMarkdown,
    fetchDisciplineFeeItems,
    fetchTradePriceItems,
    type DisciplineContext,
    type TradeContext,
} from '../../services/planning-context';

/**
 * T099d: Generate Data-Only Section
 * Template-based rendering using Planning Card data directly (no AI)
 */
export async function generateDataOnlySection(
    state: ReportStateType
): Promise<GenerateSectionResult> {
    console.log('[generate-section] Generating data-only section:', state.currentSectionIndex);

    if (!state.toc) {
        throw new Error('No TOC available for section generation');
    }

    const currentSection = state.toc.sections[state.currentSectionIndex];
    if (!currentSection) {
        throw new Error(`Section not found at index ${state.currentSectionIndex}`);
    }

    if (!state.planningContext) {
        throw new Error('No planning context available');
    }

    try {
        let content = '';

        // Route based on section title
        const sectionTitle = currentSection.title.toLowerCase();

        if (sectionTitle.includes('project details')) {
            content = formatProjectDetails(state.planningContext);
        } else if (sectionTitle.includes('objectives')) {
            content = formatProjectObjectives(state.planningContext);
        } else if (sectionTitle.includes('staging') || sectionTitle.includes('stages') || sectionTitle.includes('program')) {
            content = formatProjectStaging(state.planningContext);
        } else if (sectionTitle.includes('risks')) {
            content = formatProjectRisks(state.planningContext);
        } else if (sectionTitle.includes('brief')) {
            // Brief section gets light polish via generatePolishedSection
            return generatePolishedSection(state);
        } else if (sectionTitle.includes('fee')) {
            content = await formatFeeStructure(state);
        } else if (sectionTitle.includes('price')) {
            content = await formatPriceStructure(state);
        } else {
            // Default: generic template
            content = formatGenericSection(currentSection, state.planningContext);
        }

        // Create generated section
        const generatedSection: GeneratedSection = {
            id: uuidv4(),
            title: currentSection.title,
            content,
            sourceChunkIds: [],
            sourceRelevance: {},
            sources: [],
            status: 'complete',
            generatedAt: new Date().toISOString(),
            regenerationCount: 0,
        };

        // Persist section to database
        if (state.reportId) {
            await ragDb.update(reportSections)
                .set({
                    content: content,
                    status: 'complete',
                    sourceChunkIds: [],
                    sourceRelevance: {},
                })
                .where(and(
                    eq(reportSections.reportId, state.reportId),
                    eq(reportSections.sectionIndex, state.currentSectionIndex)
                ));
        }

        // Add to sections array
        const sections = [...state.sections];
        sections[state.currentSectionIndex] = generatedSection;

        return { sections };
    } catch (error) {
        console.error('[generate-section] Error generating data-only section:', error);

        // Create failed section
        const failedSection: GeneratedSection = {
            id: uuidv4(),
            title: currentSection.title,
            content: `Error generating section: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sourceChunkIds: [],
            sourceRelevance: {},
            sources: [],
            status: 'complete',
            generatedAt: new Date().toISOString(),
            regenerationCount: 0,
        };

        const sections = [...state.sections];
        sections[state.currentSectionIndex] = failedSection;

        return { sections };
    }
}

/**
 * T099e: Generate Polished Section (Brief only)
 * Light grammar/formatting polish for Brief section only
 */
export async function generatePolishedSection(
    state: ReportStateType
): Promise<GenerateSectionResult> {
    console.log('[generate-section] Generating polished section (Brief):', state.currentSectionIndex);

    if (!state.toc || !state.planningContext) {
        throw new Error('No TOC or planning context available');
    }

    const currentSection = state.toc.sections[state.currentSectionIndex];
    if (!currentSection) {
        throw new Error(`Section not found at index ${state.currentSectionIndex}`);
    }

    try {
        // Get raw brief content from planning context
        const discipline = state.planningContext.disciplines.find(
            d => d.name.toLowerCase() === state.discipline?.toLowerCase()
        );

        if (!discipline) {
            throw new Error(`Discipline not found: ${state.discipline}`);
        }

        const rawContent = buildBriefContent(discipline);

        // Light polish with Claude (grammar and formatting only)
        const prompt = `Polish the following tender request brief for grammar and formatting only. Do not add content, do not change meaning, do not expand. Only fix grammar errors and improve formatting for professional presentation.

Brief content:
${rawContent}

Return the polished version:`;

        let content = '';
        const stream = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1500,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        // Collect streamed content
        for await (const event of stream) {
            if (event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta') {
                const chunk = event.delta.text;
                content += chunk;

                // Emit chunk event
                if (progressEmitter && state.reportId) {
                    progressEmitter({
                        reportId: state.reportId,
                        sectionIndex: state.currentSectionIndex,
                        event: 'section_chunk',
                        data: { content: chunk },
                    });
                }
            }
        }

        console.log('[generate-section] Polished', content.length, 'characters');

        // Create generated section
        const generatedSection: GeneratedSection = {
            id: uuidv4(),
            title: currentSection.title,
            content,
            sourceChunkIds: [],
            sourceRelevance: {},
            sources: [],
            status: 'complete',
            generatedAt: new Date().toISOString(),
            regenerationCount: 0,
        };

        // Persist section to database
        if (state.reportId) {
            await ragDb.update(reportSections)
                .set({
                    content: content,
                    status: 'complete',
                    sourceChunkIds: [],
                    sourceRelevance: {},
                })
                .where(and(
                    eq(reportSections.reportId, state.reportId),
                    eq(reportSections.sectionIndex, state.currentSectionIndex)
                ));
        }

        // Add to sections array
        const sections = [...state.sections];
        sections[state.currentSectionIndex] = generatedSection;

        return { sections };
    } catch (error) {
        console.error('[generate-section] Error polishing section:', error);

        // Fallback to unpolished content
        const discipline = state.planningContext?.disciplines.find(
            d => d.name.toLowerCase() === state.discipline?.toLowerCase()
        );

        const content = discipline ? buildBriefContent(discipline) : 'Error: Brief content not available';

        const failedSection: GeneratedSection = {
            id: uuidv4(),
            title: currentSection.title,
            content,
            sourceChunkIds: [],
            sourceRelevance: {},
            sources: [],
            status: 'complete',
            generatedAt: new Date().toISOString(),
            regenerationCount: 0,
        };

        const sections = [...state.sections];
        sections[state.currentSectionIndex] = failedSection;

        return { sections };
    }
}

// ============================================
// Data-Only Template Functions
// ============================================

import type { PlanningContext } from '../../services/planning-context';

function formatProjectDetails(context: PlanningContext): string {
    // Build 8 rows for 2-column table (label | value)
    const rows: Array<[string, string]> = [
        ['Project Name', context.details.projectName || '-'],
        ['Address', context.details.address || '-'],
        ['Building Class', context.details.buildingClass || '-'],
        ['Number of Stories', context.details.numberOfStories?.toString() || '-'],
        ['Jurisdiction', context.details.jurisdiction || '-'],
        ['Zoning', context.details.zoning || '-'],
        ['Lot Area', context.details.lotArea ? `${context.details.lotArea} sqm` : '-'],
        ['Budget', context.details.budget || '-'],
    ];

    // Build HTML table with shaded label column (same as transmittal header)
    const tableRows = rows.map(([label, value]) =>
        `<tr><td style="background-color: #1f2937; font-weight: 600; width: 180px;">${label}</td><td>${value}</td></tr>`
    ).join('\n    ');

    return `<table class="details-table" style="width: 100%; border-collapse: collapse;">
  <tbody>
    ${tableRows}
  </tbody>
</table>`;
}

function formatProjectObjectives(context: PlanningContext): string {
    const objectives = [];

    if (context.objectives.functional) {
        objectives.push(`**Functional Objectives**\n\n${context.objectives.functional}`);
    }

    if (context.objectives.quality) {
        objectives.push(`**Quality Objectives**\n\n${context.objectives.quality}`);
    }

    if (context.objectives.budget) {
        objectives.push(`**Budget Objectives**\n\n${context.objectives.budget}`);
    }

    if (context.objectives.program) {
        objectives.push(`**Program Objectives**\n\n${context.objectives.program}`);
    }

    if (objectives.length === 0) {
        return `No objectives defined.`;
    }

    return objectives.join('\n\n');
}

function formatProjectStaging(context: PlanningContext): string {
    if (context.stages.length === 0) {
        return `No project staging defined.`;
    }

    const tableRows = context.stages.map(stage =>
        `| ${stage.stageNumber} | ${stage.stageName} | ${stage.startDate ?? 'TBD'} | ${stage.endDate ?? 'TBD'} | ${stage.duration ?? 'TBD'} days | ${stage.status} |`
    );

    return `| Stage | Name | Start Date | End Date | Duration | Status |
|-------|------|------------|----------|----------|--------|
${tableRows.join('\n')}

*Total stages: ${context.stages.length}*`;
}

function formatProjectRisks(context: PlanningContext): string {
    if (!context.risks || context.risks.length === 0) {
        return `No project risks defined.`;
    }

    const tableRows = context.risks.map(risk =>
        `| ${risk.description} | ${risk.severity ?? 'Medium'} | ${risk.mitigation ?? '-'} |`
    );

    return `| Risk Description | Severity | Mitigation Strategy |
|------------------|----------|---------------------|
${tableRows.join('\n')}

*Total identified risks: ${context.risks.length}*`;
}

async function formatFeeStructure(state: ReportStateType): Promise<string> {
    if (!state.planningContext || !state.discipline) {
        return `No fee structure available.`;
    }

    const discipline = state.planningContext.disciplines.find(
        d => d.name.toLowerCase() === state.discipline?.toLowerCase()
    );

    if (!discipline) {
        return `Discipline not found.`;
    }

    const feeItems = await fetchDisciplineFeeItems(discipline.id);
    return formatFeeItemsAsMarkdown(feeItems, discipline.name);
}

async function formatPriceStructure(state: ReportStateType): Promise<string> {
    if (!state.planningContext || !state.trade) {
        return `No price structure available.`;
    }

    const trade = state.planningContext.trades.find(
        t => t.name.toLowerCase() === state.trade?.toLowerCase()
    );

    if (!trade) {
        return `Trade not found.`;
    }

    const priceItems = await fetchTradePriceItems(trade.id);
    return formatPriceItemsAsMarkdown(priceItems, trade.name);
}

function buildBriefContent(discipline: DisciplineContext): string {
    const sections = [];

    if (discipline.briefServices) {
        sections.push(`**Services Required**\n\n${discipline.briefServices}`);
    }

    if (discipline.briefProgram) {
        sections.push(`**Program**\n\n${discipline.briefProgram}`);
    }

    if (discipline.briefFee) {
        sections.push(`**Fee Basis**\n\n${discipline.briefFee}`);
    }

    if (sections.length === 0) {
        return `No brief content defined for ${discipline.name}.`;
    }

    return sections.join('\n\n');
}

function formatGenericSection(section: TocSection, context: PlanningContext): string {
    return `## ${section.title}

${section.description || 'This section contains information from the Planning Card.'}

**Project**: ${context.details.projectName}

*Content for this section should be added manually or via AI-assisted mode.*`;
}
