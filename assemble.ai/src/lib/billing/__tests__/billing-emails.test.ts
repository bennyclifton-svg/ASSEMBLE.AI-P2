import {
    type LocalPolarCustomer,
    type LocalPolarSubscription,
    type PolarSubscriptionValues,
    type PolarWebhookSyncStore,
} from '../polar-webhook-sync';
import { processPolarWebhookWithBillingEmails } from '../polar-webhook-billing';
import type { TransactionalEmailProvider } from '@/lib/email/transactional';

const now = new Date('2026-05-17T10:00:00.000Z');

function createStore(initialSubscriptions: LocalPolarSubscription[] = []) {
    const customer: LocalPolarCustomer = {
        id: 'local-customer-1',
        userId: 'user-1',
        polarCustomerId: 'polar-customer-1',
        email: 'person@example.com',
        name: 'Person Example',
    };
    const subscriptions = new Map(initialSubscriptions.map((subscription) => [
        subscription.polarSubscriptionId,
        subscription,
    ]));

    const store: PolarWebhookSyncStore = {
        findCustomerByPolarId: jest.fn(async (polarCustomerId) =>
            polarCustomerId === customer.polarCustomerId ? customer : null
        ),
        findSubscriptionByPolarId: jest.fn(async (polarSubscriptionId) =>
            subscriptions.get(polarSubscriptionId) ?? null
        ),
        upsertSubscription: jest.fn(async (values: PolarSubscriptionValues) => {
            subscriptions.set(values.polarSubscriptionId, values);
            return values;
        }),
    };

    return { store, subscriptions };
}

function createProvider(): TransactionalEmailProvider {
    return {
        send: jest.fn(async () => ({ id: 'email-1' })),
    };
}

function payload(type: string, overrides: Record<string, unknown> = {}) {
    return {
        type,
        data: {
            id: 'sub-1',
            customerId: 'polar-customer-1',
            productId: 'prod-starter',
            status: 'active',
            currentPeriodEnd: '2026-06-17T10:00:00.000Z',
            ...overrides,
        },
    };
}

function existingSubscription(overrides: Partial<LocalPolarSubscription> = {}): LocalPolarSubscription {
    return {
        id: 'local-sub-1',
        customerId: 'local-customer-1',
        polarSubscriptionId: 'sub-1',
        productId: 'prod-starter',
        priceId: null,
        status: 'active',
        currentPeriodStart: null,
        currentPeriodEnd: new Date('2026-06-17T10:00:00.000Z'),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

describe('billing transactional emails', () => {
    const env = {
        NEXT_PUBLIC_APP_URL: 'https://app.example.com',
        POLAR_STARTER_PRODUCT_ID: 'prod-starter',
        POLAR_PROFESSIONAL_PRODUCT_ID: 'prod-professional',
    } as NodeJS.ProcessEnv;

    it('sends subscription activation email after a validated local state change', async () => {
        const { store } = createStore();
        const provider = createProvider();

        const result = await processPolarWebhookWithBillingEmails({
            payload: payload('subscription.created'),
            store,
            provider,
            env,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-1',
        });

        expect(result).toMatchObject({ ok: true, action: 'created' });
        expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
            to: 'person@example.com',
            subject: 'Your Sitewise Starter subscription is active',
            tags: { type: 'subscription_activated' },
        }));
    });

    it('sends cancellation email after a cancellation changes local state', async () => {
        const { store } = createStore([existingSubscription()]);
        const provider = createProvider();

        await processPolarWebhookWithBillingEmails({
            payload: payload('subscription.canceled', {
                status: 'active',
                canceledAt: '2026-05-18T10:00:00.000Z',
            }),
            store,
            provider,
            env,
            signatureVerified: true,
            now,
        });

        expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Your Sitewise subscription has been canceled',
            tags: { type: 'subscription_canceled' },
        }));
    });

    it('sends payment failure email when the subscription becomes past due', async () => {
        const { store } = createStore([existingSubscription()]);
        const provider = createProvider();

        await processPolarWebhookWithBillingEmails({
            payload: payload('subscription.past_due', { status: 'active' }),
            store,
            provider,
            env,
            signatureVerified: true,
            now,
        });

        expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Payment needs attention for Sitewise',
            tags: { type: 'payment_failed' },
        }));
    });

    it('sends plan changed email when the product changes on an active subscription', async () => {
        const { store } = createStore([existingSubscription()]);
        const provider = createProvider();

        await processPolarWebhookWithBillingEmails({
            payload: payload('subscription.updated', {
                productId: 'prod-professional',
                status: 'active',
            }),
            store,
            provider,
            env,
            signatureVerified: true,
            now,
        });

        expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Your Sitewise plan changed to Professional',
            tags: { type: 'plan_changed' },
        }));
    });

    it('does not send duplicate emails for replayed webhook state', async () => {
        const { store } = createStore();
        const provider = createProvider();

        await processPolarWebhookWithBillingEmails({
            payload: payload('subscription.created'),
            store,
            provider,
            env,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-1',
        });
        const duplicate = await processPolarWebhookWithBillingEmails({
            payload: payload('subscription.created'),
            store,
            provider,
            env,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-2',
        });

        expect(duplicate).toMatchObject({ ok: true, action: 'ignored', email: null });
        expect(provider.send).toHaveBeenCalledTimes(1);
    });
});
