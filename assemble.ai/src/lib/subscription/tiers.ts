/**
 * Subscription Tier Definitions
 * Defines feature limits and capabilities per subscription tier
 */

export type SubscriptionTier = 'free' | 'starter' | 'professional';

export interface TierLimits {
    maxProjects: number;
    maxDocuments: number;
    maxAiQueriesPerMonth: number;
}

export interface TierFeatures {
    aiDocumentProcessing: boolean;
    procurementAutomation: boolean;
    costPlanning: boolean;
    trrReportGeneration: boolean;
    evaluationReports: boolean;
    customIntegrations: boolean;
    bulkOperations: boolean;
    advancedExports: boolean;
}

export interface TierDefinition {
    id: SubscriptionTier;
    name: string;
    limits: TierLimits;
    features: TierFeatures;
}

// Tier definitions with exact limits
export const TIER_DEFINITIONS: Record<SubscriptionTier, TierDefinition> = {
    free: {
        id: 'free',
        name: 'Free',
        limits: {
            maxProjects: 1,
            maxDocuments: 100,
            maxAiQueriesPerMonth: 0,
        },
        features: {
            aiDocumentProcessing: false,
            procurementAutomation: false,
            costPlanning: false,
            trrReportGeneration: false,
            evaluationReports: false,
            customIntegrations: false,
            bulkOperations: false,
            advancedExports: false,
        },
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        limits: {
            maxProjects: 5,
            maxDocuments: 1000,
            maxAiQueriesPerMonth: 100,
        },
        features: {
            aiDocumentProcessing: true,
            procurementAutomation: true,
            costPlanning: false,
            trrReportGeneration: false,
            evaluationReports: false,
            customIntegrations: false,
            bulkOperations: true,
            advancedExports: true,
        },
    },
    professional: {
        id: 'professional',
        name: 'Professional',
        limits: {
            maxProjects: -1, // Unlimited
            maxDocuments: -1, // Unlimited
            maxAiQueriesPerMonth: -1, // Unlimited
        },
        features: {
            aiDocumentProcessing: true,
            procurementAutomation: true,
            costPlanning: true,
            trrReportGeneration: true,
            evaluationReports: true,
            customIntegrations: true,
            bulkOperations: true,
            advancedExports: true,
        },
    },
};

/**
 * Get tier definition by ID
 */
export function getTierDefinition(tierId: string): TierDefinition {
    const tier = TIER_DEFINITIONS[tierId as SubscriptionTier];
    return tier || TIER_DEFINITIONS.free;
}

/**
 * Get the minimum tier required for a feature
 */
export function getMinimumTierForFeature(feature: keyof TierFeatures): SubscriptionTier {
    // Check in order from lowest to highest tier
    const tiers: SubscriptionTier[] = ['free', 'starter', 'professional'];

    for (const tier of tiers) {
        if (TIER_DEFINITIONS[tier].features[feature]) {
            return tier;
        }
    }

    return 'professional'; // Default to highest tier if not found
}

/**
 * Check if a tier has access to a specific feature
 */
export function tierHasFeature(tierId: string, feature: keyof TierFeatures): boolean {
    const tier = getTierDefinition(tierId);
    return tier.features[feature];
}

/**
 * Get the limit for a specific resource
 * Returns -1 for unlimited
 */
export function getTierLimit(tierId: string, limitType: keyof TierLimits): number {
    const tier = getTierDefinition(tierId);
    return tier.limits[limitType];
}

/**
 * Check if tier has exceeded a limit
 * Returns true if limit is exceeded, false otherwise
 * Always returns false for unlimited (-1) limits
 */
export function isLimitExceeded(tierId: string, limitType: keyof TierLimits, currentUsage: number): boolean {
    const limit = getTierLimit(tierId, limitType);
    if (limit === -1) return false; // Unlimited
    return currentUsage >= limit;
}
