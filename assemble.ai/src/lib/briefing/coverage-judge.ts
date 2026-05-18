import type { BriefingCoverage } from '@/lib/db/pg-schema';
import type { ObjectiveType } from '@/lib/db/objectives-schema';

export const OBJECTIVE_CATEGORIES: ObjectiveType[] = [
    'planning',
    'functional',
    'quality',
    'compliance',
];

export const DEFAULT_BRIEFING_COVERAGE: BriefingCoverage = {
    planning: false,
    functional: false,
    quality: false,
    compliance: false,
};

export function normalizeCoverage(value: unknown): BriefingCoverage {
    const input = value && typeof value === 'object'
        ? (value as Partial<Record<ObjectiveType, unknown>>)
        : {};
    return {
        planning: input.planning === true,
        functional: input.functional === true,
        quality: input.quality === true,
        compliance: input.compliance === true,
    };
}

export function updateCoverage(
    current: unknown,
    category: ObjectiveType
): BriefingCoverage {
    return { ...normalizeCoverage(current), [category]: true };
}

export function isComplete(coverage: unknown): boolean {
    const normalized = normalizeCoverage(coverage);
    return OBJECTIVE_CATEGORIES.every((category) => normalized[category]);
}
