import {
    PUBLIC_SAAS_TRIAL,
    getAllPlans,
    getPlanById,
    getPlanByPolarProductId,
    getPolarProductIdForPlan,
    getPublicPlans,
} from '../plan-catalog';

describe('public SaaS plan catalog', () => {
    const originalStarterProductId = process.env.POLAR_STARTER_PRODUCT_ID;
    const originalProfessionalProductId = process.env.POLAR_PROFESSIONAL_PRODUCT_ID;

    afterEach(() => {
        process.env.POLAR_STARTER_PRODUCT_ID = originalStarterProductId;
        process.env.POLAR_PROFESSIONAL_PRODUCT_ID = originalProfessionalProductId;
    });

    it('exposes Starter and Professional as the only public plans', () => {
        expect(getPublicPlans().map((plan) => plan.id)).toEqual(['starter', 'professional']);
        expect(getPublicPlans().every((plan) => plan.public)).toBe(true);
        expect(getPublicPlans().some((plan) => plan.id === 'free')).toBe(false);
    });

    it('keeps Free as an internal fallback plan only', () => {
        const allPlans = getAllPlans();
        const freePlan = getPlanById('free');

        expect(allPlans.map((plan) => plan.id)).toEqual(['free', 'starter', 'professional']);
        expect(freePlan?.public).toBe(false);
        expect(freePlan?.priceMonthly).toBe(0);
    });

    it('records the public no-card trial terms and limits', () => {
        expect(PUBLIC_SAAS_TRIAL).toMatchObject({
            days: 14,
            requiresPaymentMethod: false,
            access: 'full',
            limits: {
                maxProjects: 1,
                maxDocuments: 100,
                maxAiActions: 100,
            },
        });

        expect(getPublicPlans().every((plan) => plan.trial === PUBLIC_SAAS_TRIAL)).toBe(true);
    });

    it('defines paid limits for Starter and Professional', () => {
        expect(getPlanById('starter')?.features).toMatchObject({
            maxProjects: 5,
            maxDocuments: 1000,
            aiQueriesPerMonth: 100,
        });

        expect(getPlanById('professional')?.features).toMatchObject({
            maxProjects: -1,
            maxDocuments: -1,
            aiQueriesPerMonth: -1,
        });
    });

    it('maps public plans to runtime Polar product IDs', () => {
        process.env.POLAR_STARTER_PRODUCT_ID = 'prod_starter_test';
        process.env.POLAR_PROFESSIONAL_PRODUCT_ID = 'prod_professional_test';

        expect(getPolarProductIdForPlan('starter')).toBe('prod_starter_test');
        expect(getPolarProductIdForPlan('professional')).toBe('prod_professional_test');
        expect(getPlanById('starter')?.polarProductId).toBe('prod_starter_test');
        expect(getPlanByPolarProductId('prod_professional_test')?.id).toBe('professional');
        expect(getPlanByPolarProductId('prod_free_test')).toBeUndefined();
    });
});
