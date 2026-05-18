import { canOpenCustomerPortal, createCheckoutRequestForPlan } from '../polar-checkout';

describe('Polar checkout helpers', () => {
    it('creates checkout payloads for Starter and Professional plans', () => {
        expect(createCheckoutRequestForPlan('starter')).toEqual({
            slug: 'starter',
            metadata: { intendedPlanId: 'starter' },
        });

        expect(createCheckoutRequestForPlan('professional')).toEqual({
            slug: 'professional',
            metadata: { intendedPlanId: 'professional' },
        });
    });

    it('rejects non-public checkout plans', () => {
        expect(() => createCheckoutRequestForPlan('free')).toThrow('Starter or Professional');
        expect(() => createCheckoutRequestForPlan('enterprise')).toThrow('Starter or Professional');
    });

    it('allows customer portal access when the user has a Polar customer', () => {
        expect(canOpenCustomerPortal({ hasPolarCustomer: true })).toBe(true);
        expect(canOpenCustomerPortal({ hasPolarCustomer: false })).toBe(false);
    });
});
