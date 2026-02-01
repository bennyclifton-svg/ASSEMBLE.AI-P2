/**
 * AI Content Generation Service
 * Feature 021 - Notes, Meetings & Reports - Phase 6 (User Story 4)
 *
 * Provides AI-powered content generation and polishing for meeting agendas
 * and report sections. Uses starred notes and procurement documents as context.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
    db,
    notes,
    rftNew,
    addenda,
    trr,
    evaluations,
    projectDetails,
    projectObjectives,
    projectStakeholders,
    meetingSections,
    reportSections,
} from '@/lib/db';
import { eq, and, isNull, gte, lte, or, sql } from 'drizzle-orm';
import type {
    GenerateContentRequest,
    GenerateContentResponse,
    PolishContentRequest,
    PolishContentResponse,
    AITone,
} from '@/types/notes-meetings-reports';
import { getSectionLabel } from '@/lib/constants/sections';

// ============================================================================
// TYPES
// ============================================================================

interface StarredNote {
    id: string;
    title: string;
    content: string | null;
    createdAt: string | null;
}

interface ProcurementDocument {
    id: string;
    type: 'rft' | 'addendum' | 'trr' | 'evaluation';
    stakeholderName: string | null;
    date: string | null;
    content?: string;
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
// SECTION-SPECIFIC PROMPTS
// ============================================================================

const SECTION_PROMPTS: Record<string, string> = {
    // Meeting Agenda Sections
    brief: `Write a concise meeting brief covering the project overview, current status, and key discussion points.`,

    procurement: `Summarize the procurement status including tendering progress, consultant/contractor appointments, and upcoming procurement activities.`,

    planning_authorities: `Describe the planning and regulatory status including permit applications, authority responses, conditions, and compliance matters.`,

    design: `Report on design progress including current design phase, key decisions, design coordination issues, and upcoming milestones.`,

    construction: `Summarize construction activities including site progress, contractor performance, quality issues, and program status.`,

    cost_planning: `Report on cost planning status including budget tracking, variations, contingency status, and forecast completion cost.`,

    programme: `Describe program status including milestone tracking, critical path activities, delays, and schedule recovery measures.`,

    other: `Summarize any other relevant project matters not covered in previous sections.`,

    // Report Contents Sections
    summary: `Write an executive summary covering key project highlights, achievements, risks, and upcoming priorities for the reporting period.`,

    // Cost Planning Sub-sections
    cost_planning_summary: `Provide a high-level cost summary including current estimate, budget comparison, and key variances.`,

    cost_planning_provisional_sums: `Report on provisional sums status including items expended, remaining allowances, and anticipated adjustments.`,

    cost_planning_variations: `Summarize project variations including approved changes, pending variations, and cost impact.`,
};

const DEFAULT_PROMPT = `Write professional content for this section based on the available project information and context.`;

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch starred notes for a project within a reporting period
 */
export async function fetchStarredNotes(
    projectId: string,
    periodStart?: string,
    periodEnd?: string
): Promise<StarredNote[]> {
    try {
        const conditions = [
            eq(notes.projectId, projectId),
            eq(notes.isStarred, true),
            isNull(notes.deletedAt),
        ];

        // Add date filtering if period is specified
        if (periodStart && periodEnd) {
            conditions.push(
                or(
                    // Notes created within the period
                    and(
                        gte(notes.createdAt, periodStart),
                        lte(notes.createdAt, periodEnd)
                    ),
                    // Or notes with reporting period overlapping
                    and(
                        lte(sql`COALESCE(${notes.reportingPeriodStart}, ${notes.createdAt})`, periodEnd),
                        gte(sql`COALESCE(${notes.reportingPeriodEnd}, ${notes.createdAt})`, periodStart)
                    )
                ) as any
            );
        }

        const result = await db
            .select({
                id: notes.id,
                title: notes.title,
                content: notes.content,
                createdAt: notes.createdAt,
            })
            .from(notes)
            .where(and(...conditions))
            .orderBy(notes.createdAt);

        return result;
    } catch (error) {
        console.error('[ai-content-generation] Error fetching starred notes:', error);
        return [];
    }
}

/**
 * Fetch procurement documents (RFT, Addendum, TRR, Evaluation) for a project
 */
export async function fetchProcurementDocs(
    projectId: string,
    periodStart?: string,
    periodEnd?: string
): Promise<ProcurementDocument[]> {
    const documents: ProcurementDocument[] = [];

    try {
        // Fetch RFT NEW documents
        const rftDocs = await db
            .select({
                id: rftNew.id,
                date: rftNew.rftDate,
                stakeholderId: rftNew.stakeholderId,
            })
            .from(rftNew)
            .where(eq(rftNew.projectId, projectId));

        for (const doc of rftDocs) {
            if (shouldIncludeDocument(doc.date, periodStart, periodEnd)) {
                const stakeholderName = doc.stakeholderId
                    ? await getStakeholderName(doc.stakeholderId)
                    : null;
                documents.push({
                    id: doc.id,
                    type: 'rft',
                    stakeholderName,
                    date: doc.date,
                });
            }
        }

        // Fetch Addenda
        const addendaDocs = await db
            .select({
                id: addenda.id,
                date: addenda.addendumDate,
                stakeholderId: addenda.stakeholderId,
                content: addenda.content,
            })
            .from(addenda)
            .where(eq(addenda.projectId, projectId));

        for (const doc of addendaDocs) {
            if (shouldIncludeDocument(doc.date, periodStart, periodEnd)) {
                const stakeholderName = doc.stakeholderId
                    ? await getStakeholderName(doc.stakeholderId)
                    : null;
                documents.push({
                    id: doc.id,
                    type: 'addendum',
                    stakeholderName,
                    date: doc.date,
                    content: doc.content || undefined,
                });
            }
        }

        // Fetch TRR documents
        const trrDocs = await db
            .select({
                id: trr.id,
                date: trr.reportDate,
                stakeholderId: trr.stakeholderId,
                executiveSummary: trr.executiveSummary,
                recommendation: trr.recommendation,
            })
            .from(trr)
            .where(eq(trr.projectId, projectId));

        for (const doc of trrDocs) {
            if (shouldIncludeDocument(doc.date, periodStart, periodEnd)) {
                const stakeholderName = doc.stakeholderId
                    ? await getStakeholderName(doc.stakeholderId)
                    : null;
                const content = [doc.executiveSummary, doc.recommendation]
                    .filter(Boolean)
                    .join('\n\n');
                documents.push({
                    id: doc.id,
                    type: 'trr',
                    stakeholderName,
                    date: doc.date,
                    content: content || undefined,
                });
            }
        }

        // Fetch Evaluations (no date field, include all)
        const evalDocs = await db
            .select({
                id: evaluations.id,
                stakeholderId: evaluations.stakeholderId,
                updatedAt: evaluations.updatedAt,
            })
            .from(evaluations)
            .where(eq(evaluations.projectId, projectId));

        for (const doc of evalDocs) {
            if (shouldIncludeDocument(doc.updatedAt, periodStart, periodEnd)) {
                const stakeholderName = doc.stakeholderId
                    ? await getStakeholderName(doc.stakeholderId)
                    : null;
                documents.push({
                    id: doc.id,
                    type: 'evaluation',
                    stakeholderName,
                    date: doc.updatedAt,
                });
            }
        }
    } catch (error) {
        console.error('[ai-content-generation] Error fetching procurement docs:', error);
    }

    return documents;
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
        console.error('[ai-content-generation] Error fetching project context:', error);
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
 * Get stakeholder name by ID
 */
async function getStakeholderName(stakeholderId: string): Promise<string | null> {
    try {
        const [stakeholder] = await db
            .select({ name: projectStakeholders.name })
            .from(projectStakeholders)
            .where(eq(projectStakeholders.id, stakeholderId));
        return stakeholder?.name || null;
    } catch {
        return null;
    }
}

/**
 * Check if a document should be included based on date range
 */
function shouldIncludeDocument(
    documentDate: string | null,
    periodStart?: string,
    periodEnd?: string
): boolean {
    if (!periodStart || !periodEnd) return true;
    if (!documentDate) return true; // Include docs without dates

    return documentDate >= periodStart && documentDate <= periodEnd;
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Get the prompt for a specific section key
 */
function getSectionPrompt(sectionKey: string): string {
    return SECTION_PROMPTS[sectionKey] || DEFAULT_PROMPT;
}

/**
 * Build the full context string from notes and procurement docs
 */
function buildContextString(
    notes: StarredNote[],
    procurementDocs: ProcurementDocument[],
    projectContext: ProjectContext,
    existingContent?: string
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

    // Starred notes
    if (notes.length > 0) {
        const notesContent = notes
            .map(n => `### ${n.title}\n${n.content || '(no content)'}`)
            .join('\n\n');
        sections.push(`## Starred Notes (${notes.length})\n${notesContent}`);
    }

    // Procurement documents
    if (procurementDocs.length > 0) {
        const grouped = groupProcurementDocs(procurementDocs);
        const procContent: string[] = [];

        if (grouped.rft.length > 0) {
            procContent.push(`### RFT Documents (${grouped.rft.length})\n${formatProcDocs(grouped.rft)}`);
        }
        if (grouped.addendum.length > 0) {
            procContent.push(`### Addenda (${grouped.addendum.length})\n${formatProcDocs(grouped.addendum)}`);
        }
        if (grouped.trr.length > 0) {
            procContent.push(`### Tender Recommendations (${grouped.trr.length})\n${formatProcDocs(grouped.trr)}`);
        }
        if (grouped.evaluation.length > 0) {
            procContent.push(`### Evaluations (${grouped.evaluation.length})\n${formatProcDocs(grouped.evaluation)}`);
        }

        sections.push(`## Procurement Documents\n${procContent.join('\n\n')}`);
    }

    // Existing content
    if (existingContent?.trim()) {
        sections.push(`## Existing Content (to enhance)\n${existingContent}`);
    }

    return sections.join('\n\n---\n\n');
}

function groupProcurementDocs(docs: ProcurementDocument[]): Record<string, ProcurementDocument[]> {
    return {
        rft: docs.filter(d => d.type === 'rft'),
        addendum: docs.filter(d => d.type === 'addendum'),
        trr: docs.filter(d => d.type === 'trr'),
        evaluation: docs.filter(d => d.type === 'evaluation'),
    };
}

function formatProcDocs(docs: ProcurementDocument[]): string {
    return docs
        .map(d => {
            const parts = [d.type.toUpperCase()];
            if (d.stakeholderName) parts.push(`for ${d.stakeholderName}`);
            if (d.date) parts.push(`(${d.date})`);
            if (d.content) parts.push(`\n${d.content}`);
            return `- ${parts.join(' ')}`;
        })
        .join('\n');
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate content for a section using AI
 */
export async function generateSectionContent(
    request: GenerateContentRequest
): Promise<GenerateContentResponse> {
    const {
        projectId,
        sectionKey,
        sectionLabel,
        contextType,
        reportingPeriodStart,
        reportingPeriodEnd,
        existingContent,
        stakeholderId,
    } = request;

    // Fetch context data
    const [starredNotes, procurementDocs, projectContext] = await Promise.all([
        fetchStarredNotes(projectId, reportingPeriodStart, reportingPeriodEnd),
        fetchProcurementDocs(projectId, reportingPeriodStart, reportingPeriodEnd),
        fetchProjectContext(projectId),
    ]);

    // Build context string
    const contextString = buildContextString(
        starredNotes,
        procurementDocs,
        projectContext,
        existingContent
    );

    // Get section-specific prompt
    const sectionPrompt = getSectionPrompt(sectionKey);

    // Get stakeholder name if provided
    let stakeholderContext = '';
    if (stakeholderId) {
        const stakeholderName = await getStakeholderName(stakeholderId);
        if (stakeholderName) {
            stakeholderContext = `\n\nThis content is specifically for: ${stakeholderName}`;
        }
    }

    // Build the full prompt
    const fullPrompt = `You are a professional project management assistant writing content for a ${contextType === 'meeting' ? 'meeting agenda' : 'project report'}.

## Section: ${sectionLabel}

${sectionPrompt}${stakeholderContext}

## Available Context

${contextString || 'No specific context available. Generate general content based on typical project management practices.'}

## Instructions

1. Write professional, concise content appropriate for this section
2. Use the available context to make the content specific and relevant
3. If there's existing content, enhance and improve it
4. Keep the tone professional and suitable for ${contextType === 'meeting' ? 'meeting minutes/agendas' : 'formal project reports'}
5. Focus on facts and actionable information
6. Use bullet points where appropriate for clarity
7. Keep the content to 2-4 paragraphs or equivalent bullet points

Generate only the section content. Do not include headers, titles, or meta-commentary.`;

    // Call Claude API
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
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

    return {
        content: textContent.text.trim(),
        sourcesUsed: {
            notes: starredNotes.length,
            procurementDocs: procurementDocs.length,
        },
    };
}

/**
 * Polish/refine existing content using AI
 */
export async function polishContent(
    request: PolishContentRequest
): Promise<PolishContentResponse> {
    const { content, sectionKey, tone = 'professional' } = request;

    const toneInstructions: Record<AITone, string> = {
        professional: 'Use a professional, business-appropriate tone suitable for project documentation.',
        formal: 'Use a formal tone suitable for official reports and executive communications.',
        concise: 'Be extremely concise - remove any unnecessary words while preserving meaning.',
    };

    const sectionLabel = getSectionLabel(sectionKey);

    const prompt = `You are an expert editor improving project documentation content.

## Section: ${sectionLabel}

## Original Content
${content}

## Instructions

Polish and refine this content with the following goals:

1. ${toneInstructions[tone]}
2. Improve clarity and readability
3. Fix any grammar or spelling issues
4. Ensure consistent formatting
5. Make sentences more direct and impactful
6. Remove redundancy while preserving key information
7. Maintain the original meaning and intent

Return only the polished content. Do not include commentary or explanations.`;

    // Call Claude API
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
            role: 'user',
            content: prompt,
        }],
    });

    // Extract text response
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from AI');
    }

    return {
        content: textContent.text.trim(),
    };
}
