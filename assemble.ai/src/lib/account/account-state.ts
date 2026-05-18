import type { EntitlementResult } from '@/lib/subscription/entitlements';
import { evaluateEntitlements } from '@/lib/subscription/entitlement-evaluator';
import { getPlanByPolarProductId } from '@/lib/polar/plans';

export interface AccountStateUser {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    organizationId: string | null;
    organizationName: string | null;
    createdAt: string;
}

export interface AccountStateTrial {
    planId: string | null;
    status: string | null;
    startedAt: string | null;
    endsAt: string | null;
    daysRemaining: number | null;
}

export interface AccountStateSubscription {
    planId: string;
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasPolarCustomer: boolean;
    billingUrl: string;
    readOnly: boolean;
}

export interface AccountState {
    user: AccountStateUser;
    trial: AccountStateTrial;
    subscription: AccountStateSubscription;
    workspace: {
        organizationId: string | null;
        organizationName: string | null;
        projectCount: number;
    };
    dataControls: {
        accountExportHref: string;
        projectExportHint: string;
        deletionRequestHref: string;
        deletionRequestCopy: string;
    };
}

export interface AccountStateInput {
    user: {
        id: string;
        email: string;
        name: string;
        emailVerified?: boolean | null;
        organizationId?: string | null;
        createdAt?: Date | string | null;
        trialPlanId?: string | null;
        trialStatus?: string | null;
        trialStartedAt?: Date | string | null;
        trialEndsAt?: Date | string | null;
    };
    organizationName?: string | null;
    projectCount?: number;
    entitlements?: EntitlementResult | null;
    subscription?: {
        status?: string | null;
        productId?: string | null;
        currentPeriodEnd?: Date | string | null;
        cancelAtPeriodEnd?: boolean | null;
        hasPolarCustomer?: boolean;
    } | null;
}

function toIso(value?: Date | string | null): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function planNameForSubscription(input: AccountStateInput, entitlements: EntitlementResult): string {
    if (input.subscription?.productId) {
        const plan = getPlanByPolarProductId(input.subscription.productId);
        if (plan) return plan.name;
    }
    return entitlements.planName;
}

export function buildAccountState(input: AccountStateInput): AccountState {
    const entitlements = input.entitlements ?? evaluateEntitlements({
        trial: {
            trialPlanId: input.user.trialPlanId,
            trialStatus: input.user.trialStatus,
            trialStartedAt: input.user.trialStartedAt,
            trialEndsAt: input.user.trialEndsAt,
        },
        subscription: input.subscription,
    });

    return {
        user: {
            id: input.user.id,
            email: input.user.email,
            name: input.user.name,
            emailVerified: Boolean(input.user.emailVerified),
            organizationId: input.user.organizationId ?? null,
            organizationName: input.organizationName ?? null,
            createdAt: toIso(input.user.createdAt) ?? new Date(0).toISOString(),
        },
        trial: {
            planId: input.user.trialPlanId ?? null,
            status: input.user.trialStatus ?? null,
            startedAt: toIso(input.user.trialStartedAt),
            endsAt: toIso(input.user.trialEndsAt),
            daysRemaining: entitlements.trialDaysRemaining,
        },
        subscription: {
            planId: entitlements.planId,
            planName: planNameForSubscription(input, entitlements),
            status: entitlements.state,
            currentPeriodEnd: toIso(input.subscription?.currentPeriodEnd),
            cancelAtPeriodEnd: Boolean(input.subscription?.cancelAtPeriodEnd),
            hasPolarCustomer: Boolean(input.subscription?.hasPolarCustomer),
            billingUrl: entitlements.billingUrl,
            readOnly: entitlements.readOnly,
        },
        workspace: {
            organizationId: input.user.organizationId ?? null,
            organizationName: input.organizationName ?? null,
            projectCount: input.projectCount ?? 0,
        },
        dataControls: {
            accountExportHref: '/api/account/state',
            projectExportHint: 'Project document and programme exports remain available from each project workspace.',
            deletionRequestHref: 'mailto:support@sitewise.au?subject=Sitewise%20data%20deletion%20request',
            deletionRequestCopy: 'Email support to request deletion. We will confirm identity, export options, and retention obligations before removing account data.',
        },
    };
}

export async function getAccountStateForUser(userId: string): Promise<AccountState | null> {
    const [{ db }, { user, polarCustomer, polarSubscription }, { organizations, projects }, drizzle] = await Promise.all([
        import('@/lib/db'),
        import('@/lib/db/auth-schema'),
        import('@/lib/db/pg-schema'),
        import('drizzle-orm'),
    ]);
    const { getEntitlementsForUser } = await import('@/lib/subscription/entitlements');

    const [userRecord] = await db
        .select()
        .from(user)
        .where(drizzle.eq(user.id, userId))
        .limit(1);

    if (!userRecord) return null;

    const [organization] = userRecord.organizationId
        ? await db
            .select({ name: organizations.name })
            .from(organizations)
            .where(drizzle.eq(organizations.id, userRecord.organizationId))
            .limit(1)
        : [];

    const projectRows = userRecord.organizationId
        ? await db
            .select({ id: projects.id })
            .from(projects)
            .where(drizzle.eq(projects.organizationId, userRecord.organizationId))
        : [];

    const [customer] = await db
        .select()
        .from(polarCustomer)
        .where(drizzle.eq(polarCustomer.userId, userId))
        .limit(1);

    const [subscription] = customer
        ? await db
            .select()
            .from(polarSubscription)
            .where(drizzle.eq(polarSubscription.customerId, customer.id))
            .orderBy(drizzle.desc(polarSubscription.createdAt))
            .limit(1)
        : [];

    const entitlements = await getEntitlementsForUser(userId);

    return buildAccountState({
        user: userRecord,
        organizationName: organization?.name ?? null,
        projectCount: projectRows.length,
        entitlements,
        subscription: subscription
            ? {
                status: subscription.status,
                productId: subscription.productId,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                hasPolarCustomer: Boolean(customer),
            }
            : { hasPolarCustomer: Boolean(customer) },
    });
}
