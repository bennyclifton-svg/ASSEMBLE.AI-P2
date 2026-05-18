import { isPublicPlanId, type PublicPlanId } from '@/lib/subscription/plan-catalog';

export interface PolarCheckoutRequest {
    slug: PublicPlanId;
    metadata: {
        intendedPlanId: PublicPlanId;
    };
}

export function createCheckoutRequestForPlan(planId: string): PolarCheckoutRequest {
    if (!isPublicPlanId(planId)) {
        throw new Error('Checkout is only available for Starter or Professional plans.');
    }

    return {
        slug: planId,
        metadata: {
            intendedPlanId: planId,
        },
    };
}

export function canOpenCustomerPortal(args: { hasPolarCustomer: boolean }): boolean {
    return args.hasPolarCustomer;
}
