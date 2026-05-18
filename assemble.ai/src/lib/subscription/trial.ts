import {
    PUBLIC_SAAS_TRIAL,
    getPlanById,
    isPublicPlanId,
    type PublicPlanId,
} from './plan-catalog';

export const DEFAULT_TRIAL_PLAN_ID: PublicPlanId = 'starter';

export const TRIAL_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CONVERTED: 'converted',
    CANCELED: 'canceled',
} as const;

export type TrialStatus = (typeof TRIAL_STATUS)[keyof typeof TRIAL_STATUS];

export interface TrialPlanIntent {
    planId: PublicPlanId;
    requestedPlanId: string | null;
    wasDefaulted: boolean;
    wasInvalid: boolean;
}

export interface InitialTrialState {
    trialStartedAt: Date;
    trialEndsAt: Date;
    trialPlanId: PublicPlanId;
    trialStatus: typeof TRIAL_STATUS.ACTIVE;
}

export function normalizeTrialPlanId(planId?: string | null): PublicPlanId {
    if (planId && isPublicPlanId(planId)) {
        return planId;
    }

    return DEFAULT_TRIAL_PLAN_ID;
}

export function resolveTrialPlanIntent(planId?: string | string[] | null): TrialPlanIntent {
    const requestedPlanId = Array.isArray(planId) ? planId[0] ?? null : planId ?? null;
    const normalizedPlanId = normalizeTrialPlanId(requestedPlanId);

    return {
        planId: normalizedPlanId,
        requestedPlanId,
        wasDefaulted: !requestedPlanId,
        wasInvalid: Boolean(requestedPlanId && requestedPlanId !== normalizedPlanId),
    };
}

export function calculateTrialEndsAt(startedAt: Date): Date {
    return new Date(startedAt.getTime() + PUBLIC_SAAS_TRIAL.days * 24 * 60 * 60 * 1000);
}

export function createInitialTrialState(args: {
    requestedPlanId?: string | null;
    now?: Date;
} = {}): InitialTrialState {
    const trialStartedAt = args.now ?? new Date();

    return {
        trialStartedAt,
        trialEndsAt: calculateTrialEndsAt(trialStartedAt),
        trialPlanId: normalizeTrialPlanId(args.requestedPlanId),
        trialStatus: TRIAL_STATUS.ACTIVE,
    };
}

export function isActiveTrial(args: {
    trialStatus?: string | null;
    trialEndsAt?: Date | string | null;
    now?: Date;
}): boolean {
    if (args.trialStatus !== TRIAL_STATUS.ACTIVE || !args.trialEndsAt) {
        return false;
    }

    const trialEndsAt = args.trialEndsAt instanceof Date
        ? args.trialEndsAt
        : new Date(args.trialEndsAt);

    return trialEndsAt.getTime() > (args.now ?? new Date()).getTime();
}

export function getTrialPlanName(planId?: string | null): string {
    return getPlanById(normalizeTrialPlanId(planId))?.name ?? 'Starter';
}
