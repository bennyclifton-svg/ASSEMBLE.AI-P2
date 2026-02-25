/**
 * AI Content Generation Service
 * Feature 021 - Notes, Meetings & Reports - Phase 6 (User Story 4)
 *
 * Provides AI-powered content generation and polishing for meeting agendas
 * and report sections. Uses starred notes and procurement documents as context.
 */

import Anthropic from '@anthropic-ai/sdk';
import { assembleContext } from '@/lib/context/orchestrator';
import type {
    GenerateContentRequest,
    GenerateContentResponse,
    PolishContentRequest,
    PolishContentResponse,
    AITone,
} from '@/types/notes-meetings-reports';
import { getSectionLabel } from '@/lib/constants/sections';
import {
    BASE_SYSTEM_PROMPT,
    buildSystemPrompt,
    getSectionPrompt as getEnrichedSectionPrompt,
    type ContentFeature,
} from '@/lib/prompts/system-prompts';

// ============================================================================
// FORMATTING CLEANUP
// ============================================================================

/**
 * Clean up AI-generated content by removing excessive blank lines and empty bullets
 */
function cleanupFormatting(content: string): string {
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
            if (line === '') return true;
            if (/^[•\-\*]\s*$/.test(line)) return false;
            return true;
        })
        .join('\n')
        .replace(/\n{2,}/g, '\n\n')
        .trim();
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

    // Assemble context via the unified orchestrator
    const assembled = await assembleContext({
        projectId,
        contextType: contextType === 'meeting' ? 'meeting-section' : 'report-section',
        sectionKey,
        task: `Generate ${sectionLabel} section content`,
        reportingPeriod: reportingPeriodStart && reportingPeriodEnd
            ? { start: reportingPeriodStart, end: reportingPeriodEnd }
            : undefined,
        stakeholderId,
    });

    // Build context string from assembled parts
    const contextParts = [
        assembled.projectSummary,
        assembled.moduleContext,
        assembled.knowledgeContext,
        assembled.ragContext,
        assembled.crossModuleInsights,
    ].filter(Boolean);

    // Append existing content if provided (for enhancement use-case)
    if (existingContent?.trim()) {
        contextParts.push(`## Existing Content (to enhance)\n${existingContent}`);
    }

    const contextString = contextParts.join('\n\n---\n\n');

    // Get enriched section-specific prompt
    const sectionPrompt = getEnrichedSectionPrompt(sectionKey);

    // Determine feature type for system prompt
    const feature: ContentFeature = contextType === 'meeting' ? 'meeting' : 'report';
    const systemPrompt = buildSystemPrompt(feature);

    // Build the user message (context + section instructions)
    const userMessage = `## Section: ${sectionLabel}

${sectionPrompt}

## Available Project Context

${contextString || 'No specific project data available. Generate content based on professional best practices for this section type, and clearly indicate where project-specific data should be inserted.'}

Generate only the section content. Do not include headers, titles, or meta-commentary.`;

    // Call Claude API with system prompt separation
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
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

    return {
        content: cleanupFormatting(textContent.text),
        sourcesUsed: {
            notes: assembled.metadata.modulesFetched.includes('starredNotes') ? 1 : 0,
            procurementDocs: assembled.metadata.modulesFetched.includes('procurementDocs') ? 1 : 0,
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

    const systemPrompt = `${BASE_SYSTEM_PROMPT}

You are polishing existing project documentation content. Your job is to improve the writing quality without changing the meaning or adding new information. ${toneInstructions[tone]}`;

    const userMessage = `## Section: ${sectionLabel}

## Content to Polish
${content}

## Instructions
1. Improve clarity and readability — make every sentence count
2. Fix grammar, spelling, and punctuation
3. Make sentences more direct and impactful — remove filler words
4. Ensure consistent formatting (bullet style, bold usage)
5. Remove redundancy while preserving all key information
6. Maintain the original meaning and intent exactly

Return only the polished content. Do not include commentary or explanations.`;

    // Call Claude API with system prompt separation
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
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

    return {
        content: cleanupFormatting(textContent.text),
    };
}
