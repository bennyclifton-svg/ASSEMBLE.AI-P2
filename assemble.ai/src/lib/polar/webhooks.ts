/**
 * Polar Webhook Handlers
 * Processes webhook events from Polar for subscription lifecycle
 */

import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import { getPlanByPolarProductId } from './plans';

// Webhook event types from Polar
export type PolarWebhookEvent =
    | 'subscription.created'
    | 'subscription.updated'
    | 'subscription.canceled'
    | 'subscription.active'
    | 'order.paid'
    | 'checkout.created'
    | 'checkout.updated';

export interface PolarSubscription {
    id: string;
    status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    canceled_at?: string;
    customer_id: string;
    product_id: string;
    price_id: string;
    metadata?: Record<string, string>;
}

export interface PolarCustomer {
    id: string;
    email: string;
    name?: string;
    metadata?: Record<string, string>;
}

export interface PolarWebhookPayload {
    type: PolarWebhookEvent;
    data: {
        subscription?: PolarSubscription;
        customer?: PolarCustomer;
        order?: Record<string, unknown>;
        checkout?: Record<string, unknown>;
    };
}

/**
 * Handle subscription.created event
 * Creates or updates subscription record when a new subscription is created
 */
export async function handleSubscriptionCreated(payload: PolarWebhookPayload): Promise<void> {
    const subscription = payload.data.subscription;
    if (!subscription) {
        throw new Error('Missing subscription data in webhook payload');
    }

    // Find user by Polar customer ID
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.polarCustomerId, subscription.customer_id))
        .limit(1);

    if (!user) {
        console.warn(`User not found for Polar customer: ${subscription.customer_id}`);
        // User might be created through registration flow later
        return;
    }

    // Determine plan from product ID
    const plan = getPlanByPolarProductId(subscription.product_id);
    const planId = plan?.id || 'starter';

    const now = Math.floor(Date.now() / 1000);

    // Create or update subscription record
    await db
        .insert(subscriptions)
        .values({
            id: crypto.randomUUID(),
            userId: user.id,
            polarSubscriptionId: subscription.id,
            polarCustomerId: subscription.customer_id,
            status: subscription.status,
            planId,
            currentPeriodStart: new Date(subscription.current_period_start).getTime() / 1000,
            currentPeriodEnd: new Date(subscription.current_period_end).getTime() / 1000,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: subscriptions.polarSubscriptionId,
            set: {
                status: subscription.status,
                planId,
                currentPeriodStart: new Date(subscription.current_period_start).getTime() / 1000,
                currentPeriodEnd: new Date(subscription.current_period_end).getTime() / 1000,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                updatedAt: now,
            },
        });

    // Update user's subscription status
    await db
        .update(users)
        .set({
            subscriptionStatus: subscription.status,
            subscriptionPlanId: planId,
            subscriptionEndsAt: new Date(subscription.current_period_end).getTime() / 1000,
            updatedAt: now,
        })
        .where(eq(users.id, user.id));

    console.log(`Subscription created for user ${user.id}: ${planId}`);
}

/**
 * Handle subscription.updated event
 * Updates subscription record when status or plan changes
 */
export async function handleSubscriptionUpdated(payload: PolarWebhookPayload): Promise<void> {
    const subscription = payload.data.subscription;
    if (!subscription) {
        throw new Error('Missing subscription data in webhook payload');
    }

    const now = Math.floor(Date.now() / 1000);
    const plan = getPlanByPolarProductId(subscription.product_id);
    const planId = plan?.id || 'starter';

    // Update subscription record
    await db
        .update(subscriptions)
        .set({
            status: subscription.status,
            planId,
            currentPeriodStart: new Date(subscription.current_period_start).getTime() / 1000,
            currentPeriodEnd: new Date(subscription.current_period_end).getTime() / 1000,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at).getTime() / 1000
                : null,
            updatedAt: now,
        })
        .where(eq(subscriptions.polarSubscriptionId, subscription.id));

    // Update user's subscription status
    const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.polarSubscriptionId, subscription.id))
        .limit(1);

    if (existingSub) {
        await db
            .update(users)
            .set({
                subscriptionStatus: subscription.status,
                subscriptionPlanId: planId,
                subscriptionEndsAt: new Date(subscription.current_period_end).getTime() / 1000,
                updatedAt: now,
            })
            .where(eq(users.id, existingSub.userId));
    }

    console.log(`Subscription updated: ${subscription.id} -> ${subscription.status}`);
}

/**
 * Handle subscription.canceled event
 * Updates subscription record when canceled
 */
export async function handleSubscriptionCanceled(payload: PolarWebhookPayload): Promise<void> {
    const subscription = payload.data.subscription;
    if (!subscription) {
        throw new Error('Missing subscription data in webhook payload');
    }

    const now = Math.floor(Date.now() / 1000);

    // Update subscription record
    await db
        .update(subscriptions)
        .set({
            status: 'canceled',
            canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at).getTime() / 1000
                : now,
            updatedAt: now,
        })
        .where(eq(subscriptions.polarSubscriptionId, subscription.id));

    // Update user's subscription status
    const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.polarSubscriptionId, subscription.id))
        .limit(1);

    if (existingSub) {
        await db
            .update(users)
            .set({
                subscriptionStatus: 'canceled',
                updatedAt: now,
            })
            .where(eq(users.id, existingSub.userId));
    }

    console.log(`Subscription canceled: ${subscription.id}`);
}

/**
 * Main webhook event router
 */
export async function handleWebhookEvent(payload: PolarWebhookPayload): Promise<void> {
    console.log(`Processing Polar webhook: ${payload.type}`);

    switch (payload.type) {
        case 'subscription.created':
            await handleSubscriptionCreated(payload);
            break;
        case 'subscription.updated':
        case 'subscription.active':
            await handleSubscriptionUpdated(payload);
            break;
        case 'subscription.canceled':
            await handleSubscriptionCanceled(payload);
            break;
        case 'order.paid':
            // Handle one-time purchases if needed
            console.log('Order paid event received');
            break;
        case 'checkout.created':
        case 'checkout.updated':
            // Checkout events for tracking
            console.log('Checkout event received');
            break;
        default:
            console.warn(`Unhandled webhook event type: ${payload.type}`);
    }
}
