import {
    syncPolarWebhookPayload,
    type LocalPolarCustomer,
    type LocalPolarSubscription,
    type PolarSubscriptionValues,
    type PolarWebhookSyncStore,
} from '../polar-webhook-sync';

function createStore() {
    const customer: LocalPolarCustomer = {
        id: 'local-customer-1',
        userId: 'user-1',
        polarCustomerId: 'polar-customer-1',
        email: 'person@example.com',
        name: 'Person Example',
    };
    const subscriptions = new Map<string, LocalPolarSubscription>();

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

const subscriptionPayload = {
    type: 'subscription.created',
    data: {
        id: 'sub-1',
        customerId: 'polar-customer-1',
        productId: 'prod-starter',
        status: 'active',
        currentPeriodStart: '2026-05-17T10:00:00.000Z',
        currentPeriodEnd: '2026-06-17T10:00:00.000Z',
        cancelAtPeriodEnd: false,
    },
};

describe('Polar webhook subscription sync', () => {
    const now = new Date('2026-05-17T10:00:00.000Z');

    it('rejects invalid signatures before changing local state', async () => {
        const { store } = createStore();

        const result = await syncPolarWebhookPayload({
            payload: subscriptionPayload,
            store,
            signatureVerified: false,
            now,
        });

        expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
        expect(store.upsertSubscription).not.toHaveBeenCalled();
    });

    it('creates a local subscription from a valid webhook', async () => {
        const { store, subscriptions } = createStore();

        const result = await syncPolarWebhookPayload({
            payload: subscriptionPayload,
            store,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-1',
        });

        expect(result).toMatchObject({
            ok: true,
            action: 'created',
            subscriptionId: 'sub-1',
            billingEmailEvent: {
                type: 'subscription_activated',
                to: 'person@example.com',
                productId: 'prod-starter',
            },
        });
        expect(subscriptions.get('sub-1')).toMatchObject({
            id: 'local-sub-1',
            customerId: 'local-customer-1',
            polarSubscriptionId: 'sub-1',
            productId: 'prod-starter',
            status: 'active',
        });
    });

    it('handles duplicate webhook events idempotently', async () => {
        const { store, subscriptions } = createStore();

        await syncPolarWebhookPayload({
            payload: subscriptionPayload,
            store,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-1',
        });
        const duplicate = await syncPolarWebhookPayload({
            payload: subscriptionPayload,
            store,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-2',
        });

        expect(duplicate).toEqual({ ok: true, action: 'ignored', subscriptionId: 'sub-1' });
        expect(subscriptions.size).toBe(1);
        expect(subscriptions.get('sub-1')?.id).toBe('local-sub-1');
        expect(store.upsertSubscription).toHaveBeenCalledTimes(1);
    });

    it('updates subscription status from subscription.updated events', async () => {
        const { store, subscriptions } = createStore();

        await syncPolarWebhookPayload({
            payload: subscriptionPayload,
            store,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-1',
        });
        await syncPolarWebhookPayload({
            payload: {
                ...subscriptionPayload,
                type: 'subscription.updated',
                data: {
                    ...subscriptionPayload.data,
                    status: 'past_due',
                },
            },
            store,
            signatureVerified: true,
            now: new Date('2026-05-18T10:00:00.000Z'),
        });

        expect(subscriptions.get('sub-1')?.status).toBe('past_due');
    });

    it('marks canceled subscriptions from cancellation webhooks', async () => {
        const { store, subscriptions } = createStore();

        await syncPolarWebhookPayload({
            payload: {
                ...subscriptionPayload,
                type: 'subscription.canceled',
                data: {
                    ...subscriptionPayload.data,
                    status: 'active',
                    canceledAt: '2026-05-19T10:00:00.000Z',
                },
            },
            store,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-1',
        });

        expect(subscriptions.get('sub-1')).toMatchObject({
            status: 'canceled',
            canceledAt: new Date('2026-05-19T10:00:00.000Z'),
        });
    });

    it('marks payment failures as past due', async () => {
        const { store, subscriptions } = createStore();

        await syncPolarWebhookPayload({
            payload: {
                ...subscriptionPayload,
                type: 'subscription.past_due',
                data: {
                    ...subscriptionPayload.data,
                    status: 'active',
                },
            },
            store,
            signatureVerified: true,
            now,
            idFactory: () => 'local-sub-1',
        });

        expect(subscriptions.get('sub-1')?.status).toBe('past_due');
    });
});
