import {
    DEFAULT_TRIAL_PLAN_ID,
    TRIAL_STATUS,
    isActiveTrial,
    normalizeTrialPlanId,
    type TrialStatus,
} from './trial';
import {
    getPlanById,
    getPlanByPolarProductId,
    type PublicPlanId,
} from './plan-catalog';

export const ENTITLEMENT_ACTIONS = {
    READ: 'read',
    WRITE: 'write',
    UPLOAD: 'upload',
    AI_ACTION: 'aiAction',
    EXPORT: 'export',
    MANAGE_BILLING: 'manageBilling',
} as const;

export type EntitlementAction = (typeof ENTITLEMENT_ACTIONS)[keyof typeof ENTITLEMENT_ACTIONS];

export type EntitlementState =
    | 'active_trial'
    | 'expired_trial'
    | 'active_subscription'
    | 'canceled_subscription'
    | 'past_due_subscription'
    | 'missing_subscription';

export interface EntitlementAllowances {
    read: boolean;
    write: boolean;
    upload: boolean;
    aiAction: boolean;
    export: boolean;
    manageBilling: boolean;
}

export interface EntitlementTrialInput {
    trialPlanId?: string | null;
    trialStatus?: string | null;
    trialStartedAt?: Date | string | null;
    trialEndsAt?: Date | string | null;
}

export interface EntitlementSubscriptionInput {
    status?: string | null;
    productId?: string | null;
    currentPeriodEnd?: Date | string | null;
    cancelAtPeriodEnd?: boolean | null;
}

export interface EntitlementInput {
    trial?: EntitlementTrialInput | null;
    subscription?: EntitlementSubscriptionInput | null;
    now?: Date;
}

export interface EntitlementResult {
    state: EntitlementState;
    planId: PublicPlanId;
    planName: string;
    subscriptionStatus: string | null;
    trialStatus: TrialStatus | null;
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    trialDaysRemaining: number | null;
    readOnly: boolean;
    allowances: EntitlementAllowances;
    billingUrl: string;
    banner: {
        tone: 'info' | 'warning';
        title: string;
        message: string;
        cta: string;
    } | null;
}

const WRITABLE_ALLOWANCES: EntitlementAllowances = {
    read: true,
    write: true,
    upload: true,
    aiAction: true,
    export: true,
    manageBilling: true,
};

const READ_ONLY_ALLOWANCES: EntitlementAllowances = {
    read: true,
    write: false,
    upload: false,
    aiAction: false,
    export: true,
    manageBilling: true,
};

function parseDate(value?: Date | string | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function calculateDaysRemaining(trialEndsAt: Date | null, now: Date): number | null {
    if (!trialEndsAt) return null;

    const msRemaining = trialEndsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
}

function resolveSubscriptionPlanId(subscription?: EntitlementSubscriptionInput | null): PublicPlanId | null {
    if (!subscription?.productId) return null;
    const plan = getPlanByPolarProductId(subscription.productId);
    return plan?.public ? plan.id as PublicPlanId : null;
}

function getSubscriptionState(status?: string | null): EntitlementState | null {
    if (!status) return null;
    if (status === 'active' || status === 'trialing') return 'active_subscription';
    if (status === 'canceled') return 'canceled_subscription';
    if (status === 'past_due') return 'past_due_subscription';
    return null;
}

function getBanner(args: {
    state: EntitlementState;
    planName: string;
    trialDaysRemaining: number | null;
}): EntitlementResult['banner'] {
    if (args.state === 'active_trial') {
        const days = args.trialDaysRemaining ?? 0;
        const unit = days === 1 ? 'day' : 'days';

        return {
            tone: 'info',
            title: `${args.planName} trial active`,
            message: `${days} ${unit} remaining in your no-card trial.`,
            cta: 'Manage billing',
        };
    }

    if (args.state === 'expired_trial') {
        return {
            tone: 'warning',
            title: 'Trial expired',
            message: 'Your workspace is read-only. Upgrade to create, edit, upload, and run AI actions again.',
            cta: 'Upgrade',
        };
    }

    if (args.state === 'past_due_subscription') {
        return {
            tone: 'warning',
            title: 'Payment needs attention',
            message: 'Your workspace is read-only until billing is updated.',
            cta: 'Update billing',
        };
    }

    if (args.state === 'canceled_subscription') {
        return {
            tone: 'warning',
            title: 'Subscription canceled',
            message: 'Your workspace is read-only. Reactivate billing to keep working.',
            cta: 'Manage billing',
        };
    }

    return null;
}

export function evaluateEntitlements(input: EntitlementInput): EntitlementResult {
    const now = input.now ?? new Date();
    const trialStartedAt = parseDate(input.trial?.trialStartedAt);
    const trialEndsAt = parseDate(input.trial?.trialEndsAt);
    const trialPlanId = normalizeTrialPlanId(input.trial?.trialPlanId);
    const subscriptionPlanId = resolveSubscriptionPlanId(input.subscription);
    const subscriptionState = getSubscriptionState(input.subscription?.status);

    const activeTrial = isActiveTrial({
        trialStatus: input.trial?.trialStatus,
        trialEndsAt,
        now,
    });

    const state: EntitlementState = subscriptionState === 'active_subscription'
        ? 'active_subscription'
        : subscriptionState ?? (activeTrial
            ? 'active_trial'
            : input.trial?.trialStatus === TRIAL_STATUS.ACTIVE
                ? 'expired_trial'
                : 'missing_subscription');

    const planId = subscriptionPlanId ?? trialPlanId ?? DEFAULT_TRIAL_PLAN_ID;
    const planName = getPlanById(planId)?.name ?? 'Starter';
    const allowances = state === 'active_subscription' || state === 'active_trial'
        ? WRITABLE_ALLOWANCES
        : READ_ONLY_ALLOWANCES;
    const trialDaysRemaining = calculateDaysRemaining(trialEndsAt, now);

    return {
        state,
        planId,
        planName,
        subscriptionStatus: input.subscription?.status ?? null,
        trialStatus: input.trial?.trialStatus as TrialStatus | null,
        trialStartedAt,
        trialEndsAt,
        trialDaysRemaining,
        readOnly: !allowances.write,
        allowances,
        billingUrl: `/settings/billing?plan=${planId}`,
        banner: getBanner({ state, planName, trialDaysRemaining }),
    };
}

export function getBlockedActionMessage(action: EntitlementAction, entitlement: EntitlementResult): string | null {
    if (entitlement.allowances[action]) return null;

    if (entitlement.state === 'expired_trial') {
        return 'Your trial has expired. You can still view and export your work, but you need to upgrade before creating, editing, uploading, or running AI actions.';
    }

    if (entitlement.state === 'past_due_subscription') {
        return 'Billing needs attention before this action is available again.';
    }

    if (entitlement.state === 'canceled_subscription') {
        return 'Your subscription is canceled. Manage billing to restore this action.';
    }

    return 'This action is not available until billing is active.';
}
