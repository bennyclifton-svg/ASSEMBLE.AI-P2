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

import { NextResponse } from 'next/server';
import {
    ENTITLEMENT_REQUIRED_CODE,
    createEntitlementDeniedBody,
    createEntitlementDeniedResponse,
    isEntitlementActionAllowed,
} from '../entitlement-guards';
import { ENTITLEMENT_ACTIONS, evaluateEntitlements } from '../entitlement-evaluator';

describe('entitlement guards', () => {
    const expiredTrial = evaluateEntitlements({
        now: new Date('2026-05-17T10:00:00.000Z'),
        trial: {
            trialPlanId: 'professional',
            trialStatus: 'active',
            trialStartedAt: new Date('2026-05-01T10:00:00.000Z'),
            trialEndsAt: new Date('2026-05-16T10:00:00.000Z'),
        },
    });

    it('keeps expired trial read and export actions allowed', () => {
        expect(isEntitlementActionAllowed(expiredTrial, ENTITLEMENT_ACTIONS.READ)).toBe(true);
        expect(isEntitlementActionAllowed(expiredTrial, ENTITLEMENT_ACTIONS.EXPORT)).toBe(true);
    });

    it('blocks expired trial write actions with a stable upgrade body', () => {
        expect(isEntitlementActionAllowed(expiredTrial, ENTITLEMENT_ACTIONS.WRITE)).toBe(false);

        const body = createEntitlementDeniedBody(expiredTrial, ENTITLEMENT_ACTIONS.WRITE);

        expect(body).toMatchObject({
            error: 'Upgrade required',
            code: ENTITLEMENT_REQUIRED_CODE,
            action: 'write',
            entitlementState: 'expired_trial',
            billingUrl: '/settings/billing?plan=professional',
        });
        expect(body.message).toContain('trial has expired');
    });

    it('returns a 402 response for blocked write actions', async () => {
        const response = createEntitlementDeniedResponse(expiredTrial, ENTITLEMENT_ACTIONS.WRITE);

        expect(response).toBeInstanceOf(NextResponse);
        expect(response.status).toBe(402);
        await expect(response.json()).resolves.toMatchObject({
            code: ENTITLEMENT_REQUIRED_CODE,
            action: 'write',
            entitlementState: 'expired_trial',
        });
    });

    it('allows active trial write actions', () => {
        const activeTrial = evaluateEntitlements({
            now: new Date('2026-05-17T10:00:00.000Z'),
            trial: {
                trialPlanId: 'starter',
                trialStatus: 'active',
                trialEndsAt: new Date('2026-05-20T10:00:00.000Z'),
            },
        });

        expect(isEntitlementActionAllowed(activeTrial, ENTITLEMENT_ACTIONS.WRITE)).toBe(true);
    });
});
