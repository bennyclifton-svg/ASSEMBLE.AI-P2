import { randomUUID } from 'crypto';
import type { BillingEmailEvent, BillingEmailEventType } from '@/lib/email/billing';

export interface LocalPolarCustomer {
    id: string;
    userId: string;
    polarCustomerId: string;
    email?: string | null;
    name?: string | null;
}

export interface LocalPolarSubscription {
    id: string;
    customerId: string;
    polarSubscriptionId: string;
    productId: string;
    priceId?: string | null;
    status: string;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean | null;
    canceledAt?: Date | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}

export interface PolarSubscriptionValues extends LocalPolarSubscription {
    createdAt: Date;
    updatedAt: Date;
}

export interface PolarWebhookSyncStore {
    findCustomerByPolarId(polarCustomerId: string): Promise<LocalPolarCustomer | null>;
    findSubscriptionByPolarId(polarSubscriptionId: string): Promise<LocalPolarSubscription | null>;
    upsertSubscription(values: PolarSubscriptionValues): Promise<LocalPolarSubscription>;
}

export type PolarWebhookSyncResult =
    | {
        ok: true;
        action: 'created' | 'updated' | 'ignored';
        subscriptionId?: string;
        billingEmailEvent?: BillingEmailEvent;
    }
    | { ok: false; reason: 'invalid_signature' | 'missing_customer' | 'unsupported_event' | 'invalid_payload' };

export interface PolarWebhookPayload {
    type?: string;
    data?: Record<string, unknown>;
}

const SUBSCRIPTION_EVENT_STATUSES: Record<string, string | undefined> = {
    'subscription.created': undefined,
    'subscription.updated': undefined,
    'subscription.active': 'active',
    'subscription.uncanceled': 'active',
    'subscription.canceled': 'canceled',
    'subscription.revoked': 'canceled',
    'subscription.past_due': 'past_due',
};

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean {
    return value === true;
}

function asDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return null;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function firstPriceId(data: Record<string, unknown>): string | null {
    const directPriceId = asString(data.priceId) ?? asString(data.price_id);
    if (directPriceId) return directPriceId;

    const prices = data.prices;
    if (!Array.isArray(prices)) return null;

    const firstPrice = prices[0] as Record<string, unknown> | undefined;
    return firstPrice ? asString(firstPrice.id) : null;
}

function datesEqual(left?: Date | null, right?: Date | null): boolean {
    return (left?.getTime() ?? null) === (right?.getTime() ?? null);
}

function subscriptionsEqual(left: LocalPolarSubscription, right: PolarSubscriptionValues): boolean {
    return left.customerId === right.customerId
        && left.productId === right.productId
        && (left.priceId ?? null) === (right.priceId ?? null)
        && left.status === right.status
        && datesEqual(left.currentPeriodStart ?? null, right.currentPeriodStart ?? null)
        && datesEqual(left.currentPeriodEnd ?? null, right.currentPeriodEnd ?? null)
        && Boolean(left.cancelAtPeriodEnd) === Boolean(right.cancelAtPeriodEnd)
        && datesEqual(left.canceledAt ?? null, right.canceledAt ?? null);
}

function isActiveStatus(status?: string | null): boolean {
    return status === 'active' || status === 'trialing';
}

function billingEmailTypeForChange(args: {
    existing?: LocalPolarSubscription | null;
    next: PolarSubscriptionValues;
}): BillingEmailEventType | null {
    const previousStatus = args.existing?.status ?? null;
    const productChanged = Boolean(args.existing && args.existing.productId !== args.next.productId);

    if (args.next.status === 'past_due' && previousStatus !== 'past_due') {
        return 'payment_failed';
    }

    if (args.next.status === 'canceled' && previousStatus !== 'canceled') {
        return 'subscription_canceled';
    }

    if (productChanged && isActiveStatus(args.next.status)) {
        return 'plan_changed';
    }

    if (isActiveStatus(args.next.status) && !isActiveStatus(previousStatus)) {
        return 'subscription_activated';
    }

    return null;
}

function buildBillingEmailEvent(args: {
    customer: LocalPolarCustomer;
    existing?: LocalPolarSubscription | null;
    next: PolarSubscriptionValues;
}): BillingEmailEvent | undefined {
    if (!args.customer.email) return undefined;

    const type = billingEmailTypeForChange({
        existing: args.existing,
        next: args.next,
    });

    if (!type) return undefined;

    return {
        type,
        to: args.customer.email,
        name: args.customer.name,
        productId: args.next.productId,
        previousProductId: args.existing?.productId,
        currentPeriodEnd: args.next.currentPeriodEnd,
    };
}

export async function syncPolarWebhookPayload(args: {
    payload: PolarWebhookPayload;
    store: PolarWebhookSyncStore;
    signatureVerified: boolean;
    now?: Date;
    idFactory?: () => string;
}): Promise<PolarWebhookSyncResult> {
    if (!args.signatureVerified) {
        return { ok: false, reason: 'invalid_signature' };
    }

    const eventType = args.payload.type;
    if (!eventType || !(eventType in SUBSCRIPTION_EVENT_STATUSES)) {
        return { ok: false, reason: 'unsupported_event' };
    }

    const data = args.payload.data;
    if (!data) {
        return { ok: false, reason: 'invalid_payload' };
    }

    const polarSubscriptionId = asString(data.id);
    const polarCustomerId = asString(data.customerId) ?? asString(data.customer_id);
    const productId = asString(data.productId) ?? asString(data.product_id);
    const status = SUBSCRIPTION_EVENT_STATUSES[eventType] ?? asString(data.status);

    if (!polarSubscriptionId || !polarCustomerId || !productId || !status) {
        return { ok: false, reason: 'invalid_payload' };
    }

    const customer = await args.store.findCustomerByPolarId(polarCustomerId);
    if (!customer) {
        return { ok: false, reason: 'missing_customer' };
    }

    const now = args.now ?? new Date();
    const existing = await args.store.findSubscriptionByPolarId(polarSubscriptionId);
    const idFactory = args.idFactory ?? randomUUID;
    const values: PolarSubscriptionValues = {
        id: existing?.id ?? idFactory(),
        customerId: customer.id,
        polarSubscriptionId,
        productId,
        priceId: firstPriceId(data),
        status,
        currentPeriodStart: asDate(data.currentPeriodStart) ?? asDate(data.current_period_start),
        currentPeriodEnd: asDate(data.currentPeriodEnd) ?? asDate(data.current_period_end),
        cancelAtPeriodEnd: asBoolean(data.cancelAtPeriodEnd ?? data.cancel_at_period_end),
        canceledAt: asDate(data.canceledAt) ?? asDate(data.canceled_at),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
    };

    if (existing && subscriptionsEqual(existing, values)) {
        return {
            ok: true,
            action: 'ignored',
            subscriptionId: polarSubscriptionId,
        };
    }

    await args.store.upsertSubscription(values);

    return {
        ok: true,
        action: existing ? 'updated' : 'created',
        subscriptionId: polarSubscriptionId,
        billingEmailEvent: buildBillingEmailEvent({
            customer,
            existing,
            next: values,
        }),
    };
}
