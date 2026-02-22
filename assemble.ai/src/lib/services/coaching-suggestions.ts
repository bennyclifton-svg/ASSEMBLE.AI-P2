/**
 * Coaching Suggestions Generator
 *
 * Generates dynamic starter questions for the Q&A panel based on
 * project state, with static fallbacks per module.
 */

import type { CoachingModule } from '@/lib/constants/coaching-checklists';

interface ProjectState {
    costLineCount?: number;
    contingencyPercent?: number;
    stakeholderCount?: number;
    hasVariations?: boolean;
    currentStage?: string;
}

const STATIC_QUESTIONS: Record<CoachingModule, string[]> = {
    cost_plan: [
        'How does my budget compare to benchmarks for this building class?',
        'Which cost lines should I be monitoring most closely?',
        'What contingency percentage is appropriate for this project?',
    ],
    procurement: [
        'How should I structure my evaluation criteria?',
        'What insurance requirements should I specify in the RFT?',
        'What are best practices for managing the tender period?',
    ],
    program: [
        'What are the typical milestones for this project type?',
        'Is my construction timeline realistic for this building class?',
        'What dependencies am I likely missing?',
    ],
    documents: [
        'What documents should I have uploaded by this stage?',
        'Are there any critical documents missing for my project type?',
        'How should I organize my document categories?',
    ],
    reports: [
        'What should I cover in my next project report?',
        'Are there any risks I should highlight in the report?',
        'How can I improve the quality of my report sections?',
    ],
    stakeholders: [
        'What consultant disciplines do I need for this building class?',
        'What authority approvals will this project require?',
        'How should I structure my stakeholder register?',
    ],
};

/**
 * Generate suggested starter questions for the Q&A panel.
 * Checks project state for dynamic suggestions, falls back to static.
 */
export function getSuggestedQuestions(
    module: CoachingModule,
    projectState?: ProjectState
): string[] {
    const dynamic: string[] = [];

    if (projectState) {
        // Cost plan-specific dynamic suggestions
        if (module === 'cost_plan') {
            if (projectState.costLineCount === 0) {
                dynamic.push('How should I structure my cost plan for this project type?');
            }
            if (projectState.contingencyPercent !== undefined && projectState.contingencyPercent < 3) {
                dynamic.push('Is my contingency adequate for this project type?');
            }
            if (projectState.hasVariations) {
                dynamic.push('How should I manage my approved variations against the forecast?');
            }
        }

        // Procurement-specific
        if (module === 'procurement' && projectState.stakeholderCount === 0) {
            dynamic.push('What consultant disciplines do I need to procure first?');
        }

        // Stage-specific
        if (projectState.currentStage === 'delivery') {
            if (module === 'cost_plan') {
                dynamic.push('What is my forecast completion cost and how does it compare to budget?');
            }
            if (module === 'program') {
                dynamic.push('Are any critical path activities at risk of delay?');
            }
        }
    }

    // Fill remaining slots with static fallbacks
    const statics = STATIC_QUESTIONS[module] || [];
    const combined = [...dynamic];
    for (const q of statics) {
        if (combined.length >= 3) break;
        if (!combined.includes(q)) combined.push(q);
    }

    return combined.slice(0, 3);
}

/**
 * After a // instruction executes successfully, check if any unchecked
 * checklist items in the current module are semantically related.
 * Uses keyword overlap — NOT an AI call (too expensive for a suggestion).
 */
export function matchInstructionToChecklists(
    instruction: string,
    output: string,
    uncheckedItems: { checklistId: string; itemId: string; label: string; description: string }[]
): { checklistId: string; itemId: string; itemLabel: string; confidence: 'high' | 'medium' }[] {
    const combined = `${instruction} ${output}`.toLowerCase();
    const matches: { checklistId: string; itemId: string; itemLabel: string; confidence: 'high' | 'medium' }[] = [];

    for (const item of uncheckedItems) {
        const keywords = extractKeywords(item.label + ' ' + item.description);
        const matchCount = keywords.filter((kw) => combined.includes(kw)).length;
        const confidence = matchCount >= 3 ? 'high' : matchCount >= 2 ? 'medium' : null;

        if (confidence) {
            matches.push({
                checklistId: item.checklistId,
                itemId: item.itemId,
                itemLabel: item.label,
                confidence,
            });
        }
    }

    return matches.slice(0, 2);
}

function extractKeywords(text: string): string[] {
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'could', 'should', 'may', 'might', 'can', 'shall',
        'for', 'and', 'but', 'or', 'not', 'no', 'all', 'each',
        'to', 'of', 'in', 'on', 'at', 'by', 'with', 'from',
        'that', 'this', 'these', 'those', 'it', 'its',
    ]);

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word));
}
