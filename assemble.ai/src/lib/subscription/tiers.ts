/**
 * Subscription tier helpers.
 *
 * These helpers adapt the shared public SaaS plan catalog for older feature
 * gating code. Do not add independent plan data here.
 */

import {
    PLAN_CATALOG,
    PLAN_IDS,
    type PlanId,
    type PlanFeatures as CatalogPlanFeatures,
} from './plan-catalog';

export type SubscriptionTier = PlanId;

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

function toTierLimits(features: CatalogPlanFeatures): TierLimits {
    return {
        maxProjects: features.maxProjects,
        maxDocuments: features.maxDocuments,
        maxAiQueriesPerMonth: features.aiQueriesPerMonth,
    };
}

function toTierFeatures(features: CatalogPlanFeatures): TierFeatures {
    return {
        aiDocumentProcessing: features.hasAiDocumentProcessing,
        procurementAutomation: features.hasProcurementAutomation,
        costPlanning: features.hasCostPlanning,
        trrReportGeneration: features.hasTrrReportGeneration,
        evaluationReports: features.hasTrrReportGeneration,
        customIntegrations: features.hasCustomIntegrations,
        bulkOperations: features.supportLevel !== 'community',
        advancedExports: features.supportLevel !== 'community',
    };
}

function toTierDefinition(tierId: SubscriptionTier): TierDefinition {
    const plan = PLAN_CATALOG[tierId];
    return {
        id: plan.id,
        name: plan.name,
        limits: toTierLimits(plan.features),
        features: toTierFeatures(plan.features),
    };
}

export const TIER_DEFINITIONS: Record<SubscriptionTier, TierDefinition> = {
    free: toTierDefinition('free'),
    starter: toTierDefinition('starter'),
    professional: toTierDefinition('professional'),
};

export function getTierDefinition(tierId: string): TierDefinition {
    const tier = TIER_DEFINITIONS[tierId as SubscriptionTier];
    return tier || TIER_DEFINITIONS.free;
}

export function getMinimumTierForFeature(feature: keyof TierFeatures): SubscriptionTier {
    for (const tier of PLAN_IDS) {
        if (TIER_DEFINITIONS[tier].features[feature]) {
            return tier;
        }
    }

    return 'professional';
}

export function tierHasFeature(tierId: string, feature: keyof TierFeatures): boolean {
    const tier = getTierDefinition(tierId);
    return tier.features[feature];
}

export function getTierLimit(tierId: string, limitType: keyof TierLimits): number {
    const tier = getTierDefinition(tierId);
    return tier.limits[limitType];
}

export function isLimitExceeded(
    tierId: string,
    limitType: keyof TierLimits,
    currentUsage: number
): boolean {
    const limit = getTierLimit(tierId, limitType);
    if (limit === -1) return false;
    return currentUsage >= limit;
}
