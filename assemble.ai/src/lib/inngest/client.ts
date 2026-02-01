/**
 * Inngest Client
 *
 * Handles background job processing for reliable webhook handling.
 * This ensures payment webhooks from Polar are processed even if the server
 * has temporary issues.
 *
 * @see https://www.inngest.com/docs
 */

import { Inngest } from 'inngest';

/**
 * Inngest Event Types
 * Define the events that can be sent to Inngest
 */
export type PolarEvents = {
    // Order events
    'polar/order.created': {
        data: {
            orderId: string;
            customerId: string;
            customerEmail: string;
            productId: string;
            amount: number;
            currency: string;
            checkoutId?: string;
            subscriptionId?: string;
            metadata?: Record<string, unknown>;
        };
    };
    'polar/order.paid': {
        data: {
            orderId: string;
            customerId: string;
            customerEmail: string;
            productId: string;
            amount: number;
            currency: string;
            checkoutId?: string;
            subscriptionId?: string;
            metadata?: Record<string, unknown>;
        };
    };
    'polar/order.refunded': {
        data: {
            orderId: string;
            customerId: string;
            amount: number;
            reason?: string;
        };
    };

    // Subscription events
    'polar/subscription.created': {
        data: {
            subscriptionId: string;
            customerId: string;
            productId: string;
            status: string;
            currentPeriodStart?: string;
            currentPeriodEnd?: string;
        };
    };
    'polar/subscription.updated': {
        data: {
            subscriptionId: string;
            customerId: string;
            productId: string;
            status: string;
            cancelAtPeriodEnd?: boolean;
            currentPeriodStart?: string;
            currentPeriodEnd?: string;
        };
    };
    'polar/subscription.canceled': {
        data: {
            subscriptionId: string;
            customerId: string;
            canceledAt: string;
        };
    };
};

/**
 * Inngest Client Instance
 *
 * The client is used to:
 * 1. Send events from webhook handlers
 * 2. Define background functions
 */
export const inngest = new Inngest({
    id: 'assemble-ai',
    schemas: new Map() as unknown as undefined, // Type workaround for custom events
});

// Export types for use in functions
export type InngestClient = typeof inngest;
