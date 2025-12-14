/**
 * Billing Page
 * Subscription management for authenticated users
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users, sessions, subscriptions } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import { SubscriptionCard } from '@/components/billing/SubscriptionCard';
import { PricingCard } from '@/components/billing/PricingCard';
import { getAllPlans } from '@/lib/polar/plans';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
        return null;
    }

    try {
        const [session] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.tokenHash, sessionToken))
            .limit(1);

        if (!session || session.expiresAt < Date.now() / 1000) {
            return null;
        }

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);

        return user || null;
    } catch {
        return null;
    }
}

async function getUserSubscription(userId: string) {
    try {
        const [subscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .limit(1);

        return subscription || null;
    } catch {
        return null;
    }
}

export default async function BillingPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login?redirect=/billing');
    }

    const subscription = await getUserSubscription(user.id);
    const plans = getAllPlans();
    const currentPlanId = user.subscriptionPlanId || 'free';

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-white">
            {/* Header */}
            <div className="border-b border-gray-800 bg-[#252526]">
                <div className="mx-auto max-w-5xl px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-gray-400 hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </div>
                    <h1 className="mt-4 text-2xl font-bold">Billing & Subscription</h1>
                    <p className="mt-1 text-gray-400">
                        Manage your subscription and billing information
                    </p>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-6 py-8">
                {/* Current Subscription */}
                <section className="mb-12">
                    <h2 className="mb-4 text-lg font-semibold">Current Plan</h2>
                    <SubscriptionCard
                        planId={currentPlanId}
                        status={user.subscriptionStatus || 'free'}
                        currentPeriodEnd={subscription?.currentPeriodEnd}
                        cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd || false}
                    />
                </section>

                {/* Available Plans */}
                <section>
                    <h2 className="mb-4 text-lg font-semibold">Available Plans</h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        {plans.map((plan) => (
                            <PricingCard
                                key={plan.id}
                                plan={plan}
                                isCurrentPlan={plan.id === currentPlanId}
                            />
                        ))}
                    </div>
                </section>

                {/* Manage Subscription Link */}
                {subscription && subscription.status !== 'free' && (
                    <section className="mt-12 rounded-lg border border-gray-800 bg-[#252526] p-6">
                        <h2 className="mb-2 text-lg font-semibold">Need to make changes?</h2>
                        <p className="mb-4 text-gray-400">
                            Update your payment method, cancel your subscription, or view invoices through the customer portal.
                        </p>
                        <a
                            href="https://polar.sh/purchases/subscriptions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 font-medium text-white hover:bg-gray-600"
                        >
                            Manage Subscription
                        </a>
                    </section>
                )}

                {/* Help text */}
                <p className="mt-8 text-center text-sm text-gray-500">
                    Questions about billing?{' '}
                    <a href="mailto:support@assemble.ai" className="text-blue-400 hover:text-blue-300">
                        Contact support
                    </a>
                </p>
            </div>
        </div>
    );
}
