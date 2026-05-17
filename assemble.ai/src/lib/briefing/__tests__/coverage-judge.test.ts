import {
    DEFAULT_BRIEFING_COVERAGE,
    isComplete,
    normalizeCoverage,
    updateCoverage,
} from '../coverage-judge';

describe('briefing coverage judge', () => {
    it('is complete only when all four objective categories are covered', () => {
        expect(isComplete(DEFAULT_BRIEFING_COVERAGE)).toBe(false);
        expect(isComplete({
            planning: true,
            functional: true,
            quality: true,
            compliance: true,
        })).toBe(true);
        expect(isComplete({
            planning: true,
            functional: true,
            quality: true,
            compliance: false,
        })).toBe(false);
    });

    it('updates coverage idempotently', () => {
        const once = updateCoverage(DEFAULT_BRIEFING_COVERAGE, 'planning');
        const twice = updateCoverage(once, 'planning');
        expect(twice).toEqual(once);
        expect(twice.planning).toBe(true);
    });

    it('normalizes missing and malformed values to false', () => {
        expect(normalizeCoverage({ planning: true, functional: 'yes' })).toEqual({
            planning: true,
            functional: false,
            quality: false,
            compliance: false,
        });
    });
});
