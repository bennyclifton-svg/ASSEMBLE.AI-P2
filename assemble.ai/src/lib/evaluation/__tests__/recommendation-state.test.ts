import {
    applyRecommendationEvent,
    hasUnresolvedHighMaterialityClarification,
} from '../recommendation-state';

describe('recommendation state machine', () => {
    it('moves draft to conditional when a high-materiality clarification is raised', () => {
        expect(applyRecommendationEvent('draft', 'high_materiality_clarification_raised')).toBe('conditional');
    });

    it('moves conditional to final only when no unresolved high-materiality clarification exists', () => {
        expect(applyRecommendationEvent('conditional', 'user_confirms_final', {
            hasUnresolvedHighMaterialityClarification: true,
        })).toBe('conditional');

        expect(applyRecommendationEvent('conditional', 'user_confirms_final', {
            hasUnresolvedHighMaterialityClarification: false,
        })).toBe('final');
    });

    it('drops final back when inputs change and to conditional when material clarification is raised', () => {
        expect(applyRecommendationEvent('final', 'refresh_applied')).toBe('draft');
        expect(applyRecommendationEvent('final', 'new_tender_file_attached')).toBe('draft');
        expect(applyRecommendationEvent('final', 'active_price_instance_changed')).toBe('draft');
        expect(applyRecommendationEvent('final', 'high_materiality_clarification_raised')).toBe('conditional');
    });

    it('detects unresolved high-materiality clarifications', () => {
        expect(hasUnresolvedHighMaterialityClarification([
            { materiality: 'high', status: 'issued' },
        ])).toBe(true);
        expect(hasUnresolvedHighMaterialityClarification([
            { materiality: 'high', status: 'closed' },
            { materiality: 'medium', status: 'issued' },
        ])).toBe(false);
    });
});
