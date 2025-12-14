/**
 * Subscription Access Control
 * Feature gating and access control utilities
 */

export {
    TIER_DEFINITIONS,
    getTierDefinition,
    getMinimumTierForFeature,
    tierHasFeature,
    getTierLimit,
    isLimitExceeded,
} from './tiers';
export type { SubscriptionTier, TierLimits, TierFeatures, TierDefinition } from './tiers';

export {
    getUserSubscriptionInfo,
    canAccessFeature,
    getUsageRemaining,
    checkLimit,
    requireSubscription,
    SubscriptionError,
    createSubscriptionErrorResponse,
} from './check-access';
export type { UserSubscriptionInfo } from './check-access';
