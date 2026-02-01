import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth';
import { db } from '@/lib/db';
import { polarCustomer, polarSubscription } from '@/lib/db/auth-schema';
import { eq, desc } from 'drizzle-orm';
import { getPlanByPolarProductId } from '@/lib/polar/plans';

export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Default values
        let currentPlanId = 'free';
        let subscriptionStatus = 'free';
        let currentPeriodEnd: number | null = null;
        let cancelAtPeriodEnd = false;

        // Get subscription info from database
        const customer = await db
            .select()
            .from(polarCustomer)
            .where(eq(polarCustomer.userId, userId))
            .limit(1);

        if (customer.length > 0) {
            const subscriptions = await db
                .select()
                .from(polarSubscription)
                .where(eq(polarSubscription.customerId, customer[0].id))
                .orderBy(desc(polarSubscription.createdAt));

            // Find active subscription
            const activeSubscription = subscriptions.find(
                (sub) => sub.status === 'active' || sub.status === 'trialing'
            ) || subscriptions[0];

            if (activeSubscription) {
                // Map Polar product ID to plan
                const matchedPlan = getPlanByPolarProductId(activeSubscription.productId);
                if (matchedPlan) {
                    currentPlanId = matchedPlan.id;
                } else {
                    // Fallback: check env vars
                    const productId = activeSubscription.productId;
                    const starterProductId = process.env.POLAR_STARTER_PRODUCT_ID;
                    const professionalProductId = process.env.POLAR_PROFESSIONAL_PRODUCT_ID;

                    if (starterProductId && productId === starterProductId) {
                        currentPlanId = 'starter';
                    } else if (professionalProductId && productId === professionalProductId) {
                        currentPlanId = 'professional';
                    } else {
                        // Last fallback
                        if (productId.toLowerCase().includes('starter')) {
                            currentPlanId = 'starter';
                        } else if (productId.toLowerCase().includes('professional') || productId.toLowerCase().includes('pro')) {
                            currentPlanId = 'professional';
                        }
                    }
                }

                subscriptionStatus = activeSubscription.status || 'active';
                currentPeriodEnd = activeSubscription.currentPeriodEnd
                    ? Math.floor(new Date(activeSubscription.currentPeriodEnd).getTime() / 1000)
                    : null;
                cancelAtPeriodEnd = activeSubscription.cancelAtPeriodEnd || false;
            }
        }

        return NextResponse.json({
            currentPlanId,
            subscriptionStatus,
            currentPeriodEnd,
            cancelAtPeriodEnd,
        });
    } catch (error) {
        console.error('[Billing API] Error fetching subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
