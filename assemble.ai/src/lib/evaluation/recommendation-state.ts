import type {
    Clarification,
    RecommendationEvent,
    RecommendationState,
} from '@/types/evaluation';

const RESOLVED_CLARIFICATION_STATUSES = new Set(['responded', 'closed']);

export function applyRecommendationEvent(
    currentState: RecommendationState = 'draft',
    event: RecommendationEvent,
    options: { hasUnresolvedHighMaterialityClarification?: boolean } = {}
): RecommendationState {
    switch (event) {
        case 'high_materiality_clarification_raised':
            return currentState === 'final' ? 'conditional' : 'conditional';
        case 'user_confirms_final':
            return options.hasUnresolvedHighMaterialityClarification ? currentState : 'final';
        case 'refresh_applied':
        case 'new_tender_file_attached':
        case 'active_price_instance_changed':
            return currentState === 'final' ? 'draft' : currentState;
        case 'high_materiality_clarification_resolved':
        default:
            return currentState;
    }
}

export function hasUnresolvedHighMaterialityClarification(
    clarifications: Array<Pick<Clarification, 'materiality' | 'status'>>
): boolean {
    return clarifications.some((item) =>
        item.materiality === 'high' && !RESOLVED_CLARIFICATION_STATUSES.has(item.status)
    );
}

export function deriveRecommendationStateFromClarifications(
    currentState: RecommendationState = 'draft',
    clarifications: Array<Pick<Clarification, 'materiality' | 'status'>>
): RecommendationState {
    if (hasUnresolvedHighMaterialityClarification(clarifications)) {
        return applyRecommendationEvent(currentState, 'high_materiality_clarification_raised');
    }

    return currentState;
}
