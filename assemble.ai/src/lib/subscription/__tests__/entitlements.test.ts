import {
    ENTITLEMENT_ACTIONS,
    evaluateEntitlements,
    getBlockedActionMessage,
} from '../entitlement-evaluator';

describe('SaaS entitlement evaluator', () => {
    const now = new Date('2026-05-17T10:00:00.000Z');
    const activeTrialEndsAt = new Date('2026-05-20T10:00:00.000Z');
    const expiredTrialEndsAt = new Date('2026-05-16T10:00:00.000Z');

    it('allows active trial users to use the app', () => {
        const entitlement = evaluateEntitlements({
            now,
            trial: {
                trialPlanId: 'starter',
                trialStatus: 'active',
                trialStartedAt: new Date('2026-05-10T10:00:00.000Z'),
                trialEndsAt: activeTrialEndsAt,
            },
        });

        expect(entitlement.state).toBe('active_trial');
        expect(entitlement.allowances).toEqual({
            read: true,
            write: true,
            upload: true,
            aiAction: true,
            export: true,
            manageBilling: true,
        });
        expect(entitlement.banner).toMatchObject({
            tone: 'info',
            title: 'Starter trial active',
        });
    });

    it('keeps expired trial users read-only with export and billing access', () => {
        const entitlement = evaluateEntitlements({
            now,
            trial: {
                trialPlanId: 'professional',
                trialStatus: 'active',
                trialStartedAt: new Date('2026-05-01T10:00:00.000Z'),
                trialEndsAt: expiredTrialEndsAt,
            },
        });

        expect(entitlement.state).toBe('expired_trial');
        expect(entitlement.readOnly).toBe(true);
        expect(entitlement.allowances).toMatchObject({
            read: true,
            write: false,
            upload: false,
            aiAction: false,
            export: true,
            manageBilling: true,
        });
        expect(getBlockedActionMessage(ENTITLEMENT_ACTIONS.WRITE, entitlement)).toContain('trial has expired');
    });

    it('allows active paid subscriptions regardless of trial expiry', () => {
        const entitlement = evaluateEntitlements({
            now,
            trial: {
                trialPlanId: 'starter',
                trialStatus: 'active',
                trialEndsAt: expiredTrialEndsAt,
            },
            subscription: {
                status: 'active',
                productId: process.env.POLAR_PROFESSIONAL_PRODUCT_ID,
            },
        });

        expect(entitlement.state).toBe('active_subscription');
        expect(entitlement.allowances.write).toBe(true);
        expect(entitlement.allowances.upload).toBe(true);
        expect(entitlement.banner).toBeNull();
    });

    it('represents canceled subscriptions as read-only', () => {
        const entitlement = evaluateEntitlements({
            now,
            subscription: {
                status: 'canceled',
                productId: process.env.POLAR_STARTER_PRODUCT_ID,
            },
        });

        expect(entitlement.state).toBe('canceled_subscription');
        expect(entitlement.readOnly).toBe(true);
        expect(entitlement.allowances.export).toBe(true);
        expect(entitlement.allowances.write).toBe(false);
    });

    it('represents past-due subscriptions as read-only with billing access', () => {
        const entitlement = evaluateEntitlements({
            now,
            subscription: {
                status: 'past_due',
                productId: process.env.POLAR_STARTER_PRODUCT_ID,
            },
        });

        expect(entitlement.state).toBe('past_due_subscription');
        expect(entitlement.allowances.manageBilling).toBe(true);
        expect(entitlement.allowances.aiAction).toBe(false);
        expect(getBlockedActionMessage(ENTITLEMENT_ACTIONS.AI_ACTION, entitlement)).toContain('Billing needs attention');
    });

    it('represents missing subscription state as read-only', () => {
        const entitlement = evaluateEntitlements({ now });

        expect(entitlement.state).toBe('missing_subscription');
        expect(entitlement.allowances).toMatchObject({
            read: true,
            write: false,
            upload: false,
            aiAction: false,
            export: true,
            manageBilling: true,
        });
    });
});
