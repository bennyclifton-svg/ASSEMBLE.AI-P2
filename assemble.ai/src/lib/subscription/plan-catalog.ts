/**
 * Public SaaS plan catalog.
 *
 * This is the shared source for public pricing, trial terms, paid limits,
 * and Polar product mapping. Free remains an internal fallback state; it is
 * not part of the public pricing catalog.
 */

export const PLAN_IDS = ['free', 'starter', 'professional'] as const;
export const PUBLIC_PLAN_IDS = ['starter', 'professional'] as const;

export type PlanId = (typeof PLAN_IDS)[number];
export type PublicPlanId = (typeof PUBLIC_PLAN_IDS)[number];

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

export interface TrialLimits {
    maxProjects: number;
    maxDocuments: number;
    maxAiActions: number;
}

export interface PublicTrialTerms {
    days: number;
    requiresPaymentMethod: boolean;
    access: 'full';
    limits: TrialLimits;
    summary: string;
    detail: string;
}

export interface SubscriptionPlan {
    id: PlanId;
    slug: PlanId;
    name: string;
    description: string;
    public: boolean;
    cta: string;
    highlighted?: boolean;
    polarProductEnvVar?: 'POLAR_STARTER_PRODUCT_ID' | 'POLAR_PROFESSIONAL_PRODUCT_ID';
    polarProductId?: string;
    priceMonthly: number;
    priceAnnually: number;
    features: PlanFeatures;
    marketingFeatures: string[];
    trial?: PublicTrialTerms;
}

export const PUBLIC_SAAS_TRIAL: PublicTrialTerms = {
    days: 14,
    requiresPaymentMethod: false,
    access: 'full',
    limits: {
        maxProjects: 1,
        maxDocuments: 100,
        maxAiActions: 100,
    },
    summary: '14-day free trial. No credit card required.',
    detail: 'Full feature access during trial, capped at 1 project, 100 documents, and 100 AI actions.',
};

export const PLAN_CATALOG: Record<PlanId, SubscriptionPlan> = {
    free: {
        id: 'free',
        slug: 'free',
        name: 'Free',
        description: 'Internal fallback state for accounts without an active plan',
        public: false,
        cta: 'Included',
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
        marketingFeatures: [
            'Internal fallback only',
            'Read-only account state where applicable',
        ],
    },
    starter: {
        id: 'starter',
        slug: 'starter',
        name: 'Starter',
        description: 'For PMs and small teams proving Sitewise on active work',
        public: true,
        cta: 'Start Free Trial',
        polarProductEnvVar: 'POLAR_STARTER_PRODUCT_ID',
        priceMonthly: 49,
        priceAnnually: 39,
        trial: PUBLIC_SAAS_TRIAL,
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
        marketingFeatures: [
            '5 active projects',
            '1,000 documents',
            '100 AI actions/month',
            'AI document processing',
            'Procurement + correspondence workflows',
            'Email support',
        ],
    },
    professional: {
        id: 'professional',
        slug: 'professional',
        name: 'Professional',
        description: 'For practices and owner-side teams running multiple live projects',
        public: true,
        cta: 'Start Free Trial',
        highlighted: true,
        polarProductEnvVar: 'POLAR_PROFESSIONAL_PRODUCT_ID',
        priceMonthly: 149,
        priceAnnually: 119,
        trial: PUBLIC_SAAS_TRIAL,
        features: {
            maxProjects: -1,
            maxDocuments: -1,
            aiQueriesPerMonth: -1,
            hasAiDocumentProcessing: true,
            hasProcurementAutomation: true,
            hasCostPlanning: true,
            hasTrrReportGeneration: true,
            hasCustomIntegrations: true,
            supportLevel: 'priority',
        },
        marketingFeatures: [
            'Unlimited projects',
            'Unlimited documents',
            'Unlimited AI actions',
            'All project agents and workflows',
            'Cost planning + cashflow',
            'Priority support',
        ],
    },
};

export const PLANS = PLAN_CATALOG;

export function isPublicPlanId(planId: string): planId is PublicPlanId {
    return (PUBLIC_PLAN_IDS as readonly string[]).includes(planId);
}

export function getPolarProductIdForPlan(planId: string): string | undefined {
    const plan = PLAN_CATALOG[planId as PlanId];
    if (!plan?.polarProductEnvVar) return undefined;
    if (typeof process === 'undefined') return undefined;
    return process.env?.[plan.polarProductEnvVar];
}

function withRuntimePolarProductId(plan: SubscriptionPlan): SubscriptionPlan {
    return {
        ...plan,
        polarProductId: getPolarProductIdForPlan(plan.id),
    };
}

export function getPlanById(planId: string): SubscriptionPlan | undefined {
    const plan = PLAN_CATALOG[planId as PlanId];
    return plan ? withRuntimePolarProductId(plan) : undefined;
}

export function getAllPlans(): SubscriptionPlan[] {
    return PLAN_IDS.map((id) => withRuntimePolarProductId(PLAN_CATALOG[id]));
}

export function getPublicPlans(): SubscriptionPlan[] {
    return PUBLIC_PLAN_IDS.map((id) => withRuntimePolarProductId(PLAN_CATALOG[id]));
}

export function getPlanByPolarProductId(polarProductId: string): SubscriptionPlan | undefined {
    return getPublicPlans().find((plan) => plan.polarProductId === polarProductId);
}

export function planHasFeature(planId: string, feature: keyof PlanFeatures): boolean {
    const plan = getPlanById(planId);
    if (!plan) return false;

    const value = plan.features[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return !!value;
}

export function getPlanLimit(
    planId: string,
    feature: keyof Pick<PlanFeatures, 'maxProjects' | 'maxDocuments' | 'aiQueriesPerMonth'>
): number {
    const plan = getPlanById(planId);
    if (!plan) return 0;
    return plan.features[feature];
}
