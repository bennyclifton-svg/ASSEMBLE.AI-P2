jest.mock('next/server', () => {
    class MockNextResponse {
        status: number;
        private readonly body: unknown;

        constructor(body: unknown, init?: { status?: number }) {
            this.body = body;
            this.status = init?.status ?? 200;
        }

        static json(body: unknown, init?: { status?: number }) {
            return new MockNextResponse(body, init);
        }

        async json() {
            return this.body;
        }
    }

    return { NextResponse: MockNextResponse };
});

import {
    AI_ACTION_CAP_REASON,
    createAiActionCapDeniedResponse,
    evaluateAiActionGate,
    getAiActionLimitForEntitlement,
    isBillableAiUsageStatus,
} from '../ai-usage-meter';
import {
    ENTITLEMENT_ACTIONS,
    evaluateEntitlements,
} from '../entitlement-evaluator';
import {
    ENTITLEMENT_REQUIRED_CODE,
    createEntitlementDeniedResponse,
    isEntitlementActionAllowed,
} from '../entitlement-guards';

describe('AI usage meter', () => {
    beforeAll(() => {
        process.env.POLAR_STARTER_PRODUCT_ID = 'polar_starter_test';
        process.env.POLAR_PROFESSIONAL_PRODUCT_ID = 'polar_professional_test';
    });

    const now = new Date('2026-05-17T10:00:00.000Z');
    const activeTrial = evaluateEntitlements({
        now,
        trial: {
            trialPlanId: 'starter',
            trialStatus: 'active',
            trialStartedAt: new Date('2026-05-10T10:00:00.000Z'),
            trialEndsAt: new Date('2026-05-20T10:00:00.000Z'),
        },
    });
    const expiredTrial = evaluateEntitlements({
        now,
        trial: {
            trialPlanId: 'starter',
            trialStatus: 'active',
            trialEndsAt: new Date('2026-05-16T10:00:00.000Z'),
        },
    });

    it('allows an active trial AI action below cap', () => {
        expect(evaluateAiActionGate({
            entitlement: activeTrial,
            currentUsage: 99,
        })).toMatchObject({
            allowed: true,
            limit: 100,
        });
    });

    it('blocks an active trial AI action at cap', async () => {
        const result = evaluateAiActionGate({
            entitlement: activeTrial,
            currentUsage: 100,
        });

        expect(result).toMatchObject({
            allowed: false,
            reason: AI_ACTION_CAP_REASON,
            currentUsage: 100,
            limit: 100,
        });

        if (!result.allowed) {
            const response = createAiActionCapDeniedResponse(activeTrial, result);
            expect(response.status).toBe(402);
            await expect(response.json()).resolves.toMatchObject({
                code: ENTITLEMENT_REQUIRED_CODE,
                reason: AI_ACTION_CAP_REASON,
                action: 'aiAction',
                currentUsage: 100,
                limit: 100,
            });
        }
    });

    it('blocks expired users before AI cost is incurred', async () => {
        expect(isEntitlementActionAllowed(expiredTrial, ENTITLEMENT_ACTIONS.AI_ACTION)).toBe(false);

        const response = createEntitlementDeniedResponse(expiredTrial, ENTITLEMENT_ACTIONS.AI_ACTION);
        expect(response.status).toBe(402);
        await expect(response.json()).resolves.toMatchObject({
            code: ENTITLEMENT_REQUIRED_CODE,
            action: 'aiAction',
            entitlementState: 'expired_trial',
        });
    });

    it('uses the paid-plan AI allowance', () => {
        const paidStarter = evaluateEntitlements({
            now,
            subscription: {
                status: 'active',
                productId: process.env.POLAR_STARTER_PRODUCT_ID,
            },
        });
        const paidProfessional = evaluateEntitlements({
            now,
            subscription: {
                status: 'active',
                productId: process.env.POLAR_PROFESSIONAL_PRODUCT_ID,
            },
        });

        expect(getAiActionLimitForEntitlement(paidStarter)).toBe(100);
        expect(getAiActionLimitForEntitlement(paidProfessional)).toBe(-1);
        expect(evaluateAiActionGate({
            entitlement: paidProfessional,
            currentUsage: 9999,
        })).toMatchObject({ allowed: true, limit: -1 });
    });

    it('does not count failed AI actions against usage', () => {
        expect(isBillableAiUsageStatus('reserved')).toBe(true);
        expect(isBillableAiUsageStatus('succeeded')).toBe(true);
        expect(isBillableAiUsageStatus('failed')).toBe(false);
    });
});
