/**
 * Feature 013: Evaluation Non-Price
 * Fixed criteria definitions for qualitative tender evaluation
 */

import type { NonPriceCriteriaDefinition, NonPriceCriteriaKey } from '@/types/evaluation';

/**
 * The 7 fixed non-price evaluation criteria
 * Order is fixed: Methodology(0) through Departures(6)
 */
export const NON_PRICE_CRITERIA: NonPriceCriteriaDefinition[] = [
    {
        key: 'methodology',
        label: 'Methodology',
        description: 'Approach to delivering the work',
        searchQuery: 'methodology approach deliver work execution plan implementation strategy',
    },
    {
        key: 'program',
        label: 'Program',
        description: 'Schedule, timeline, milestones',
        searchQuery: 'program schedule timeline milestones key dates delivery phases duration',
    },
    {
        key: 'personnel',
        label: 'Personnel',
        description: 'Key staff, qualifications, team structure',
        searchQuery: 'personnel key staff team qualifications experience CVs project manager',
    },
    {
        key: 'experience',
        label: 'Experience',
        description: 'Relevant project history',
        searchQuery: 'experience similar projects portfolio track record references case studies',
    },
    {
        key: 'health_safety',
        label: 'Health & Safety',
        description: 'Safety policies, certifications',
        searchQuery: 'health safety WHS OH&S certification policies safe work method statement',
    },
    {
        key: 'insurance',
        label: 'Insurance',
        description: 'Coverage types, limits',
        searchQuery: 'insurance public liability professional indemnity workers compensation coverage',
    },
    {
        key: 'departures',
        label: 'Departures',
        description: 'Significant deviations from tender requirements',
        searchQuery: 'departures deviations exclusions qualifications conditions amendments variations',
    },
];

/**
 * Get criteria definition by key
 */
export function getCriteriaDefinition(key: NonPriceCriteriaKey): NonPriceCriteriaDefinition | undefined {
    return NON_PRICE_CRITERIA.find(c => c.key === key);
}

/**
 * Get criteria index by key (0-6)
 */
export function getCriteriaIndex(key: NonPriceCriteriaKey): number {
    return NON_PRICE_CRITERIA.findIndex(c => c.key === key);
}

/**
 * Criteria-specific prompts for Claude summarization
 */
export const CRITERIA_PROMPTS: Record<NonPriceCriteriaKey, string> = {
    methodology: `Analyze the tenderer's proposed methodology and approach to delivering the work.
Focus on: execution plan, implementation strategy, project management approach, quality assurance measures.
Rate as Good if comprehensive and detailed; Average if adequate but lacking depth; Poor if missing or vague.`,

    program: `Analyze the tenderer's proposed program, schedule, and timeline.
Focus on: project milestones, key dates, delivery phases, duration estimates, critical path.
Rate as Good if realistic and detailed; Average if present but lacking specifics; Poor if missing or unrealistic.`,

    personnel: `Analyze the tenderer's proposed team and personnel.
Focus on: key staff qualifications, relevant experience, team structure, project manager credentials.
Rate as Good if experienced team with relevant expertise; Average if adequate qualifications; Poor if insufficient or unclear.`,

    experience: `Analyze the tenderer's relevant project experience and track record.
Focus on: similar projects completed, portfolio, case studies, references, demonstrated capability.
Rate as Good if extensive relevant experience; Average if some relevant experience; Poor if limited or irrelevant experience.`,

    health_safety: `Analyze the tenderer's health and safety policies and certifications.
Focus on: WHS/OH&S policies, safety certifications, safe work method statements, incident history.
Rate as Good if comprehensive safety management; Average if basic compliance; Poor if inadequate or missing.`,

    insurance: `Analyze the tenderer's insurance coverage.
Focus on: public liability, professional indemnity, workers compensation, coverage limits.
Rate as Good if comprehensive coverage with adequate limits; Average if basic coverage; Poor if insufficient or unclear.`,

    departures: `Identify significant departures from the tender requirements.
Focus on: explicit exclusions ("We exclude..."), qualifications ("Subject to..."), proposed amendments, non-compliance items, alternative proposals.
List specific departures found. Rate as Good if no significant departures; Average if minor departures; Poor if major departures or exclusions.`,
};

/**
 * Quality rating colors for UI display
 */
export const QUALITY_RATING_COLORS = {
    good: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-300 dark:border-green-700',
    },
    average: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        border: 'border-yellow-300 dark:border-yellow-700',
    },
    poor: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-300 dark:border-red-700',
    },
} as const;

/**
 * Quality rating labels
 */
export const QUALITY_RATING_LABELS = {
    good: 'Good',
    average: 'Average',
    poor: 'Poor',
} as const;
