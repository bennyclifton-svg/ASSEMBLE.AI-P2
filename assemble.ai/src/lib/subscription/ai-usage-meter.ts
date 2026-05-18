import { NextResponse } from 'next/server';
import { getProjectForWorkspace } from '@/lib/projects/workspace-access';
import { getPlanById } from './plan-catalog';
import {
    ENTITLEMENT_ACTIONS,
    type EntitlementResult,
} from './entitlement-evaluator';
import {
    ENTITLEMENT_REQUIRED_CODE,
    ENTITLEMENT_UNAVAILABLE_CODE,
    createEntitlementDeniedBody,
    createEntitlementDeniedResponse,
} from './entitlement-guards';

export const AI_ACTION_CAP_REASON = 'ai_action_cap' as const;
export const BILLABLE_AI_USAGE_STATUSES = ['reserved', 'succeeded'] as const;

export type AiUsageStatus = 'reserved' | 'succeeded' | 'failed';

export interface AiActionGateInput {
    entitlement: EntitlementResult;
    currentUsage: number;
}

export type AiActionGateResult =
    | {
        allowed: true;
        currentUsage: number;
        limit: number;
    }
    | {
        allowed: false;
        reason: typeof AI_ACTION_CAP_REASON;
        currentUsage: number;
        limit: number;
        message: string;
    };

export type AiActionMeterResult =
    | {
        allowed: true;
        entitlement: EntitlementResult;
        eventId: string;
        periodStart: Date;
        currentUsage: number;
        limit: number;
    }
    | {
        allowed: false;
        entitlement: EntitlementResult | null;
        response: NextResponse;
    };

export function isBillableAiUsageStatus(status: AiUsageStatus): boolean {
    return (BILLABLE_AI_USAGE_STATUSES as readonly string[]).includes(status);
}

export function getAiActionLimitForEntitlement(entitlement: EntitlementResult): number {
    const plan = getPlanById(entitlement.planId);

    if (entitlement.state === 'active_trial') {
        return plan?.trial?.limits.maxAiActions ?? 0;
    }

    if (entitlement.state === 'active_subscription') {
        return plan?.features.aiQueriesPerMonth ?? 0;
    }

    return 0;
}

export function getAiUsagePeriodStart(entitlement: EntitlementResult, now = new Date()): Date {
    if (entitlement.state === 'active_trial' && entitlement.trialStartedAt) {
        return entitlement.trialStartedAt;
    }

    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function evaluateAiActionGate(input: AiActionGateInput): AiActionGateResult {
    const limit = getAiActionLimitForEntitlement(input.entitlement);

    if (limit === -1 || input.currentUsage < limit) {
        return {
            allowed: true,
            currentUsage: input.currentUsage,
            limit,
        };
    }

    const actionLabel = limit === 1 ? 'AI action' : 'AI actions';

    return {
        allowed: false,
        reason: AI_ACTION_CAP_REASON,
        currentUsage: input.currentUsage,
        limit,
        message: `${input.entitlement.planName} includes ${limit} ${actionLabel}. Upgrade to keep using AI actions.`,
    };
}

export function createAiActionCapDeniedResponse(
    entitlement: EntitlementResult,
    gate: Extract<AiActionGateResult, { allowed: false }>
): NextResponse {
    return NextResponse.json(
        {
            ...createEntitlementDeniedBody(entitlement, ENTITLEMENT_ACTIONS.AI_ACTION),
            code: ENTITLEMENT_REQUIRED_CODE,
            reason: gate.reason,
            currentUsage: gate.currentUsage,
            limit: gate.limit,
            message: gate.message,
        },
        { status: 402 }
    );
}

function entitlementUnavailableResponse(): NextResponse {
    return NextResponse.json(
        {
            error: 'Entitlement unavailable',
            code: ENTITLEMENT_UNAVAILABLE_CODE,
            message: 'We could not confirm billing access for this account.',
        },
        { status: 403 }
    );
}

async function getEntitlementForUser(userId: string): Promise<EntitlementResult | null> {
    const { getEntitlementsForUser } = await import('./entitlements');
    return getEntitlementsForUser(userId);
}

export async function countBillableAiUsage(args: {
    userId: string;
    organizationId: string;
    periodStart: Date;
}): Promise<number> {
    const [{ db, aiUsageEvents }, { and, count, eq, gte, inArray }] = await Promise.all([
        import('@/lib/db'),
        import('drizzle-orm'),
    ]);

    const [result] = await db
        .select({ value: count() })
        .from(aiUsageEvents)
        .where(and(
            eq(aiUsageEvents.userId, args.userId),
            eq(aiUsageEvents.organizationId, args.organizationId),
            gte(aiUsageEvents.createdAt, args.periodStart),
            inArray(aiUsageEvents.status, [...BILLABLE_AI_USAGE_STATUSES])
        ));

    return Number(result?.value ?? 0);
}

async function reserveAiUsageEvent(args: {
    userId: string;
    organizationId: string;
    projectId?: string | null;
    action: string;
    periodStart: Date;
    metadata?: Record<string, unknown>;
}): Promise<string> {
    const { db, aiUsageEvents } = await import('@/lib/db');
    const [event] = await db
        .insert(aiUsageEvents)
        .values({
            userId: args.userId,
            organizationId: args.organizationId,
            projectId: args.projectId ?? null,
            action: args.action,
            status: 'reserved',
            periodStart: args.periodStart,
            metadata: args.metadata ?? {},
        })
        .returning({ id: aiUsageEvents.id });

    return event.id;
}

export async function markAiActionSucceeded(eventId: string): Promise<void> {
    const [{ db, aiUsageEvents }, { eq }] = await Promise.all([
        import('@/lib/db'),
        import('drizzle-orm'),
    ]);

    await db
        .update(aiUsageEvents)
        .set({
            status: 'succeeded',
            completedAt: new Date(),
        })
        .where(eq(aiUsageEvents.id, eventId));
}

export async function markAiActionFailed(eventId: string, error: unknown): Promise<void> {
    const [{ db, aiUsageEvents }, { eq }] = await Promise.all([
        import('@/lib/db'),
        import('drizzle-orm'),
    ]);

    await db
        .update(aiUsageEvents)
        .set({
            status: 'failed',
            failedAt: new Date(),
            error: error instanceof Error ? error.message : String(error),
        })
        .where(eq(aiUsageEvents.id, eventId));
}

export async function requireAiActionAllowed(args: {
    userId: string;
    organizationId: string;
    projectId?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
    now?: Date;
}): Promise<AiActionMeterResult> {
    if (args.projectId) {
        const project = await getProjectForWorkspace(args.projectId, args.organizationId);
        if (!project) {
            return {
                allowed: false,
                entitlement: null,
                response: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
            };
        }
    }

    const entitlement = await getEntitlementForUser(args.userId);
    if (!entitlement) {
        return {
            allowed: false,
            entitlement: null,
            response: entitlementUnavailableResponse(),
        };
    }

    if (!entitlement.allowances.aiAction) {
        return {
            allowed: false,
            entitlement,
            response: createEntitlementDeniedResponse(entitlement, ENTITLEMENT_ACTIONS.AI_ACTION),
        };
    }

    const periodStart = getAiUsagePeriodStart(entitlement, args.now);
    const currentUsage = await countBillableAiUsage({
        userId: args.userId,
        organizationId: args.organizationId,
        periodStart,
    });
    const gate = evaluateAiActionGate({ entitlement, currentUsage });

    if (!gate.allowed) {
        return {
            allowed: false,
            entitlement,
            response: createAiActionCapDeniedResponse(entitlement, gate),
        };
    }

    const eventId = await reserveAiUsageEvent({
        userId: args.userId,
        organizationId: args.organizationId,
        projectId: args.projectId,
        action: args.action,
        periodStart,
        metadata: args.metadata,
    });

    return {
        allowed: true,
        entitlement,
        eventId,
        periodStart,
        currentUsage,
        limit: gate.limit,
    };
}
