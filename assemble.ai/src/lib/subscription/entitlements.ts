import { headers } from 'next/headers';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/lib/better-auth';
import { db } from '@/lib/db';
import {
    polarCustomer,
    polarSubscription,
    user as userTable,
} from '@/lib/db/auth-schema';
import {
    evaluateEntitlements,
    type EntitlementResult,
    type EntitlementSubscriptionInput,
} from './entitlement-evaluator';

export {
    ENTITLEMENT_ACTIONS,
    evaluateEntitlements,
    getBlockedActionMessage,
    type EntitlementAction,
    type EntitlementAllowances,
    type EntitlementInput,
    type EntitlementResult,
    type EntitlementState,
    type EntitlementSubscriptionInput,
    type EntitlementTrialInput,
} from './entitlement-evaluator';

export async function getEntitlementsForUser(userId: string): Promise<EntitlementResult | null> {
    const [userRecord] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

    if (!userRecord) return null;

    const [customer] = await db
        .select()
        .from(polarCustomer)
        .where(eq(polarCustomer.userId, userId))
        .limit(1);

    let subscription: EntitlementSubscriptionInput | null = null;
    if (customer) {
        const subscriptions = await db
            .select()
            .from(polarSubscription)
            .where(eq(polarSubscription.customerId, customer.id))
            .orderBy(desc(polarSubscription.createdAt));

        const selectedSubscription = subscriptions.find((sub) =>
            sub.status === 'active' || sub.status === 'trialing'
        ) ?? subscriptions[0];

        if (selectedSubscription) {
            subscription = {
                status: selectedSubscription.status,
                productId: selectedSubscription.productId,
                currentPeriodEnd: selectedSubscription.currentPeriodEnd,
                cancelAtPeriodEnd: selectedSubscription.cancelAtPeriodEnd,
            };
        }
    }

    return evaluateEntitlements({
        trial: {
            trialPlanId: userRecord.trialPlanId,
            trialStatus: userRecord.trialStatus,
            trialStartedAt: userRecord.trialStartedAt,
            trialEndsAt: userRecord.trialEndsAt,
        },
        subscription,
    });
}

export async function getCurrentUserEntitlements(): Promise<EntitlementResult | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) return null;
    return getEntitlementsForUser(session.user.id);
}
