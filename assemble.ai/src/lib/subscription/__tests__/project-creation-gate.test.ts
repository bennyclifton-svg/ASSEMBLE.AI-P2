import {
    PROJECT_CAP_REASON,
    createProjectCapDeniedResponse,
    evaluateProjectCreationGate,
} from '../project-creation-gate';
import { evaluateEntitlements } from '../entitlement-evaluator';
import { ENTITLEMENT_REQUIRED_CODE } from '../entitlement-guards';

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

describe('project creation gate', () => {
    beforeAll(() => {
        process.env.POLAR_STARTER_PRODUCT_ID = 'polar_starter_test';
        process.env.POLAR_PROFESSIONAL_PRODUCT_ID = 'polar_professional_test';
    });

    const activeTrial = evaluateEntitlements({
        now: new Date('2026-05-17T10:00:00.000Z'),
        trial: {
            trialPlanId: 'starter',
            trialStatus: 'active',
            trialEndsAt: new Date('2026-05-20T10:00:00.000Z'),
        },
    });

    it('allows a trial user to create their first project', () => {
        const result = evaluateProjectCreationGate({
            entitlement: activeTrial,
            currentProjectCount: 0,
        });

        expect(result).toMatchObject({
            allowed: true,
            currentProjectCount: 0,
            maxProjects: 1,
        });
    });

    it('blocks a trial user from creating a second project', async () => {
        const result = evaluateProjectCreationGate({
            entitlement: activeTrial,
            currentProjectCount: 1,
        });

        expect(result).toMatchObject({
            allowed: false,
            reason: PROJECT_CAP_REASON,
            currentProjectCount: 1,
            maxProjects: 1,
        });

        if (!result.allowed) {
            const response = createProjectCapDeniedResponse(activeTrial, result);
            expect(response.status).toBe(402);
            await expect(response.json()).resolves.toMatchObject({
                code: ENTITLEMENT_REQUIRED_CODE,
                reason: PROJECT_CAP_REASON,
                limit: 1,
                currentUsage: 1,
                entitlementState: 'active_trial',
            });
        }
    });

    it('allows paid Starter users up to their paid project allowance', () => {
        const paidStarter = evaluateEntitlements({
            now: new Date('2026-05-17T10:00:00.000Z'),
            subscription: {
                status: 'active',
                productId: process.env.POLAR_STARTER_PRODUCT_ID,
            },
        });

        const result = evaluateProjectCreationGate({
            entitlement: paidStarter,
            currentProjectCount: 4,
        });

        expect(result).toMatchObject({
            allowed: true,
            currentProjectCount: 4,
            maxProjects: 5,
        });
    });

    it('allows paid Professional users unlimited projects', () => {
        const paidProfessional = evaluateEntitlements({
            now: new Date('2026-05-17T10:00:00.000Z'),
            subscription: {
                status: 'active',
                productId: process.env.POLAR_PROFESSIONAL_PRODUCT_ID,
            },
        });

        const result = evaluateProjectCreationGate({
            entitlement: paidProfessional,
            currentProjectCount: 200,
        });

        expect(result).toMatchObject({
            allowed: true,
            currentProjectCount: 200,
            maxProjects: -1,
        });
    });
});
