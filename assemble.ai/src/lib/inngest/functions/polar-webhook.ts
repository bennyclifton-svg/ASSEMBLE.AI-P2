/**
 * Polar Webhook Handler Functions
 *
 * These Inngest functions process Polar webhook events reliably.
 * If processing fails, Inngest will automatically retry.
 *
 * Events handled:
 * - polar/order.paid → Record transaction, log subscription
 * - polar/order.refunded → Mark transaction as refunded
 * - polar/subscription.created → Log new subscription
 * - polar/subscription.canceled → Log subscription cancellation
 */

import { inngest } from '../client';
import { db } from '@/lib/db';
import { transactions, products } from '@/lib/db/pg-schema';
import { polarCustomer } from '@/lib/db/auth-schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Process Order Paid Event
 *
 * When a Polar order is paid:
 * 1. Find the user by Polar customer ID
 * 2. Find the product by Polar product ID
 * 3. Create a transaction record
 */
export const processOrderPaid = inngest.createFunction(
    {
        id: 'polar-order-paid',
        retries: 3,
    },
    { event: 'polar/order.paid' },
    async ({ event, step }) => {
        const { orderId, customerId, productId, amount, currency, checkoutId, subscriptionId, metadata } = event.data;

        // Step 1: Find the user by Polar customer ID
        const user = await step.run('find-user', async () => {
            const customer = await db
                .select()
                .from(polarCustomer)
                .where(eq(polarCustomer.polarCustomerId, customerId))
                .limit(1);

            if (!customer.length) {
                console.error(`[Polar Webhook] No user found for Polar customer: ${customerId}`);
                return null;
            }

            return customer[0];
        });

        if (!user) {
            return { success: false, error: 'User not found for Polar customer' };
        }

        // Step 2: Find the product by Polar product ID
        const product = await step.run('find-product', async () => {
            const productRecord = await db
                .select()
                .from(products)
                .where(eq(products.polarProductId, productId))
                .limit(1);

            return productRecord[0] || null;
        });

        // Step 3: Create transaction record
        const transaction = await step.run('create-transaction', async () => {
            const now = Math.floor(Date.now() / 1000);

            // Check if transaction already exists (idempotency)
            const existing = await db
                .select()
                .from(transactions)
                .where(eq(transactions.polarOrderId, orderId))
                .limit(1);

            if (existing.length) {
                console.log(`[Polar Webhook] Transaction already exists for order: ${orderId}`);
                return existing[0];
            }

            const newTransaction = {
                id: randomUUID(),
                userId: user.userId,
                productId: product?.id || null,
                polarOrderId: orderId,
                polarCheckoutId: checkoutId || null,
                polarSubscriptionId: subscriptionId || null,
                amountCents: amount,
                currency: currency || 'usd',
                status: 'completed',
                metadata: metadata ? JSON.stringify(metadata) : null,
                createdAt: now,
            };

            await db.insert(transactions).values(newTransaction);
            return newTransaction;
        });

        console.log(`[Polar Webhook] Processed order.paid: ${orderId} for user ${user.userId}`);

        return {
            success: true,
            transactionId: transaction.id,
            userId: user.userId,
            productId: product?.id,
        };
    }
);

/**
 * Process Order Refunded Event
 *
 * When a Polar order is refunded:
 * 1. Find the transaction by Polar order ID
 * 2. Update status to 'refunded'
 */
export const processOrderRefunded = inngest.createFunction(
    {
        id: 'polar-order-refunded',
        retries: 3,
    },
    { event: 'polar/order.refunded' },
    async ({ event, step }) => {
        const { orderId, reason } = event.data;

        const result = await step.run('mark-refunded', async () => {
            // Find and update the transaction
            const existingTransactions = await db
                .select()
                .from(transactions)
                .where(eq(transactions.polarOrderId, orderId))
                .limit(1);

            if (!existingTransactions.length) {
                console.error(`[Polar Webhook] No transaction found for order: ${orderId}`);
                return { found: false };
            }

            await db
                .update(transactions)
                .set({
                    status: 'refunded',
                    metadata: JSON.stringify({ refundReason: reason, refundedAt: new Date().toISOString() }),
                })
                .where(eq(transactions.polarOrderId, orderId));

            return { found: true, transactionId: existingTransactions[0].id };
        });

        console.log(`[Polar Webhook] Processed order.refunded: ${orderId}`);

        return {
            success: result.found,
            orderId,
        };
    }
);

/**
 * Process Subscription Created Event
 *
 * Logs when a new subscription is created.
 * The actual subscription data is managed by Better Auth's Polar plugin.
 */
export const processSubscriptionCreated = inngest.createFunction(
    {
        id: 'polar-subscription-created',
        retries: 3,
    },
    { event: 'polar/subscription.created' },
    async ({ event, step }) => {
        const { subscriptionId, customerId, productId, status } = event.data;

        await step.run('log-subscription', async () => {
            console.log(`[Polar Webhook] Subscription created:`, {
                subscriptionId,
                customerId,
                productId,
                status,
            });
        });

        return {
            success: true,
            subscriptionId,
        };
    }
);

/**
 * Process Subscription Canceled Event
 *
 * Logs when a subscription is canceled.
 * The actual subscription data is managed by Better Auth's Polar plugin.
 */
export const processSubscriptionCanceled = inngest.createFunction(
    {
        id: 'polar-subscription-canceled',
        retries: 3,
    },
    { event: 'polar/subscription.canceled' },
    async ({ event, step }) => {
        const { subscriptionId, customerId, canceledAt } = event.data;

        await step.run('log-cancellation', async () => {
            console.log(`[Polar Webhook] Subscription canceled:`, {
                subscriptionId,
                customerId,
                canceledAt,
            });
        });

        return {
            success: true,
            subscriptionId,
        };
    }
);

// Export all functions for the Inngest serve handler
export const polarFunctions = [
    processOrderPaid,
    processOrderRefunded,
    processSubscriptionCreated,
    processSubscriptionCanceled,
];
