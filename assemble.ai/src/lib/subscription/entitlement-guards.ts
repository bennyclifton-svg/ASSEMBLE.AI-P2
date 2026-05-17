import { NextResponse } from 'next/server';
import {
    getBlockedActionMessage,
    type EntitlementAction,
    type EntitlementResult,
    type EntitlementState,
} from './entitlement-evaluator';

export const ENTITLEMENT_REQUIRED_CODE = 'ENTITLEMENT_REQUIRED' as const;
export const ENTITLEMENT_UNAVAILABLE_CODE = 'ENTITLEMENT_UNAVAILABLE' as const;

export interface EntitlementDeniedBody {
    error: 'Upgrade required';
    code: typeof ENTITLEMENT_REQUIRED_CODE;
    action: EntitlementAction;
    entitlementState: EntitlementState;
    billingUrl: string;
    message: string;
}

export type EntitlementGuardResult =
    | { allowed: true; entitlement: EntitlementResult }
    | { allowed: false; entitlement: EntitlementResult | null; response: NextResponse };

export function isEntitlementActionAllowed(
    entitlement: EntitlementResult,
    action: EntitlementAction
): boolean {
    return entitlement.allowances[action];
}

export function createEntitlementDeniedBody(
    entitlement: EntitlementResult,
    action: EntitlementAction
): EntitlementDeniedBody {
    return {
        error: 'Upgrade required',
        code: ENTITLEMENT_REQUIRED_CODE,
        action,
        entitlementState: entitlement.state,
        billingUrl: entitlement.billingUrl,
        message: getBlockedActionMessage(action, entitlement) ?? 'Upgrade to continue.',
    };
}

export function createEntitlementDeniedResponse(
    entitlement: EntitlementResult,
    action: EntitlementAction
): NextResponse {
    return NextResponse.json(createEntitlementDeniedBody(entitlement, action), { status: 402 });
}

export async function requireEntitlementActionForUser(
    userId: string,
    action: EntitlementAction
): Promise<EntitlementGuardResult> {
    const { getEntitlementsForUser } = await import('./entitlements');
    const entitlement = await getEntitlementsForUser(userId);

    if (!entitlement) {
        return {
            allowed: false,
            entitlement: null,
            response: NextResponse.json(
                {
                    error: 'Entitlement unavailable',
                    code: ENTITLEMENT_UNAVAILABLE_CODE,
                    message: 'We could not confirm billing access for this account.',
                },
                { status: 403 }
            ),
        };
    }

    if (isEntitlementActionAllowed(entitlement, action)) {
        return { allowed: true, entitlement };
    }

    return {
        allowed: false,
        entitlement,
        response: createEntitlementDeniedResponse(entitlement, action),
    };
}
