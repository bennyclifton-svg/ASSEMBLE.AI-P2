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
    DOCUMENT_CAP_REASON,
    createDocumentCapDeniedResponse,
    evaluateDocumentUploadGate,
} from '../document-gates';
import {
    ENTITLEMENT_ACTIONS,
    evaluateEntitlements,
} from '../entitlement-evaluator';
import {
    ENTITLEMENT_REQUIRED_CODE,
    createEntitlementDeniedResponse,
    isEntitlementActionAllowed,
} from '../entitlement-guards';

describe('document gates', () => {
    const now = new Date('2026-05-17T10:00:00.000Z');
    const activeTrial = evaluateEntitlements({
        now,
        trial: {
            trialPlanId: 'starter',
            trialStatus: 'active',
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

    it('allows uploads inside the active trial document cap', () => {
        expect(evaluateDocumentUploadGate({
            entitlement: activeTrial,
            currentDocumentCount: 99,
            incomingDocumentCount: 1,
        })).toMatchObject({
            allowed: true,
            maxDocuments: 100,
        });
    });

    it('blocks uploads over the active trial document cap', async () => {
        const result = evaluateDocumentUploadGate({
            entitlement: activeTrial,
            currentDocumentCount: 100,
            incomingDocumentCount: 1,
        });

        expect(result).toMatchObject({
            allowed: false,
            reason: DOCUMENT_CAP_REASON,
            maxDocuments: 100,
        });

        if (!result.allowed) {
            const response = createDocumentCapDeniedResponse(activeTrial, result);
            expect(response.status).toBe(402);
            await expect(response.json()).resolves.toMatchObject({
                code: ENTITLEMENT_REQUIRED_CODE,
                reason: DOCUMENT_CAP_REASON,
                currentUsage: 100,
                attemptedUsage: 101,
                limit: 100,
            });
        }
    });

    it('allows expired users to download and export owned documents', () => {
        expect(isEntitlementActionAllowed(expiredTrial, ENTITLEMENT_ACTIONS.READ)).toBe(true);
        expect(isEntitlementActionAllowed(expiredTrial, ENTITLEMENT_ACTIONS.EXPORT)).toBe(true);
    });

    it('blocks expired users from uploading documents', async () => {
        expect(isEntitlementActionAllowed(expiredTrial, ENTITLEMENT_ACTIONS.UPLOAD)).toBe(false);

        const response = createEntitlementDeniedResponse(expiredTrial, ENTITLEMENT_ACTIONS.UPLOAD);
        expect(response.status).toBe(402);
        await expect(response.json()).resolves.toMatchObject({
            code: ENTITLEMENT_REQUIRED_CODE,
            action: 'upload',
            entitlementState: 'expired_trial',
        });
    });
});
