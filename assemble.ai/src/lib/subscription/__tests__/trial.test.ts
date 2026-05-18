import {
    DEFAULT_TRIAL_PLAN_ID,
    TRIAL_STATUS,
    calculateTrialEndsAt,
    createInitialTrialState,
    getTrialPlanName,
    isActiveTrial,
    normalizeTrialPlanId,
    resolveTrialPlanIntent,
} from '../trial';
import { PUBLIC_SAAS_TRIAL } from '../plan-catalog';

describe('public SaaS trial helpers', () => {
    const now = new Date('2026-05-17T10:00:00.000Z');

    it('accepts Starter and Professional as public trial plan intent', () => {
        expect(normalizeTrialPlanId('starter')).toBe('starter');
        expect(normalizeTrialPlanId('professional')).toBe('professional');
        expect(resolveTrialPlanIntent('professional')).toMatchObject({
            planId: 'professional',
            requestedPlanId: 'professional',
            wasDefaulted: false,
            wasInvalid: false,
        });
    });

    it('defaults missing plan intent to Starter', () => {
        expect(normalizeTrialPlanId(null)).toBe(DEFAULT_TRIAL_PLAN_ID);
        expect(resolveTrialPlanIntent()).toMatchObject({
            planId: 'starter',
            requestedPlanId: null,
            wasDefaulted: true,
            wasInvalid: false,
        });
    });

    it('normalizes invalid plan intent to a documented default', () => {
        expect(resolveTrialPlanIntent('enterprise')).toMatchObject({
            planId: 'starter',
            requestedPlanId: 'enterprise',
            wasDefaulted: false,
            wasInvalid: true,
        });
        expect(getTrialPlanName('enterprise')).toBe('Starter');
    });

    it('calculates trial end from the shared catalog duration', () => {
        const expected = new Date(now.getTime() + PUBLIC_SAAS_TRIAL.days * 24 * 60 * 60 * 1000);

        expect(calculateTrialEndsAt(now)).toEqual(expected);
        expect(createInitialTrialState({ requestedPlanId: 'professional', now })).toEqual({
            trialStartedAt: now,
            trialEndsAt: expected,
            trialPlanId: 'professional',
            trialStatus: TRIAL_STATUS.ACTIVE,
        });
    });

    it('reports active trials from auth-owned trial state', () => {
        expect(isActiveTrial({
            trialStatus: TRIAL_STATUS.ACTIVE,
            trialEndsAt: new Date('2026-05-18T10:00:00.000Z'),
            now,
        })).toBe(true);

        expect(isActiveTrial({
            trialStatus: TRIAL_STATUS.ACTIVE,
            trialEndsAt: new Date('2026-05-16T10:00:00.000Z'),
            now,
        })).toBe(false);
    });
});
