/**
 * Subscription Plan Definitions
 * Defines available subscription tiers and their features
 */

export interface PlanFeatures {
    maxProjects: number;
    maxDocuments: number;
    aiQueriesPerMonth: number;
    hasAiDocumentProcessing: boolean;
    hasProcurementAutomation: boolean;
    hasCostPlanning: boolean;
    hasTrrReportGeneration: boolean;
    hasCustomIntegrations: boolean;
    supportLevel: 'community' | 'email' | 'priority';
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    polarProductId?: string; // Polar product ID (set in dashboard)
    priceMonthly: number;
    priceAnnually: number;
    features: PlanFeatures;
}

// Plan definitions
export const PLANS: Record<string, SubscriptionPlan> = {
    free: {
        id: 'free',
        name: 'Free',
        description: 'For individuals exploring the platform',
        priceMonthly: 0,
        priceAnnually: 0,
        features: {
            maxProjects: 1,
            maxDocuments: 100,
            aiQueriesPerMonth: 0,
            hasAiDocumentProcessing: false,
            hasProcurementAutomation: false,
            hasCostPlanning: false,
            hasTrrReportGeneration: false,
            hasCustomIntegrations: false,
            supportLevel: 'community',
        },
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        description: 'For small firms getting started',
        polarProductId: process.env.POLAR_STARTER_PRODUCT_ID,
        priceMonthly: 49,
        priceAnnually: 39,
        features: {
            maxProjects: 5,
            maxDocuments: 1000,
            aiQueriesPerMonth: 100,
            hasAiDocumentProcessing: true,
            hasProcurementAutomation: true,
            hasCostPlanning: false,
            hasTrrReportGeneration: false,
            hasCustomIntegrations: false,
            supportLevel: 'email',
        },
    },
    professional: {
        id: 'professional',
        name: 'Professional',
        description: 'For growing construction firms',
        polarProductId: process.env.POLAR_PROFESSIONAL_PRODUCT_ID,
        priceMonthly: 149,
        priceAnnually: 119,
        features: {
            maxProjects: -1, // Unlimited
            maxDocuments: -1, // Unlimited
            aiQueriesPerMonth: -1, // Unlimited
            hasAiDocumentProcessing: true,
            hasProcurementAutomation: true,
            hasCostPlanning: true,
            hasTrrReportGeneration: true,
            hasCustomIntegrations: true,
            supportLevel: 'priority',
        },
    },
};

// Get plan by ID
export function getPlanById(planId: string): SubscriptionPlan | undefined {
    return PLANS[planId];
}

// Get plan by Polar product ID
export function getPlanByPolarProductId(polarProductId: string): SubscriptionPlan | undefined {
    return Object.values(PLANS).find(plan => plan.polarProductId === polarProductId);
}

// Get all plans as array
export function getAllPlans(): SubscriptionPlan[] {
    return Object.values(PLANS);
}

// Check if a plan has a specific feature
export function planHasFeature(planId: string, feature: keyof PlanFeatures): boolean {
    const plan = getPlanById(planId);
    if (!plan) return false;

    const value = plan.features[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return !!value;
}

// Get feature limit for a plan
export function getPlanLimit(planId: string, feature: keyof Pick<PlanFeatures, 'maxProjects' | 'maxDocuments' | 'aiQueriesPerMonth'>): number {
    const plan = getPlanById(planId);
    if (!plan) return 0;
    return plan.features[feature];
}
