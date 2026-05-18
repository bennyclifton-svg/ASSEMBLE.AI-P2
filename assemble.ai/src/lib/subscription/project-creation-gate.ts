import { NextResponse } from 'next/server';
import { getPlanById } from './plan-catalog';
import {
    ENTITLEMENT_ACTIONS,
    type EntitlementResult,
} from './entitlement-evaluator';
import {
    ENTITLEMENT_REQUIRED_CODE,
    createEntitlementDeniedBody,
    createEntitlementDeniedResponse,
} from './entitlement-guards';

export const PROJECT_CAP_REASON = 'project_cap' as const;

export interface ProjectCreationGateInput {
    entitlement: EntitlementResult;
    currentProjectCount: number;
}

export type ProjectCreationGateResult =
    | {
        allowed: true;
        currentProjectCount: number;
        maxProjects: number;
    }
    | {
        allowed: false;
        reason: typeof PROJECT_CAP_REASON;
        currentProjectCount: number;
        maxProjects: number;
        message: string;
    };

export type ProjectCreationGuardResult =
    | {
        allowed: true;
        entitlement: EntitlementResult;
        currentProjectCount: number;
        maxProjects: number;
    }
    | {
        allowed: false;
        entitlement: EntitlementResult | null;
        response: NextResponse;
    };

export function getProjectLimitForEntitlement(entitlement: EntitlementResult): number {
    const plan = getPlanById(entitlement.planId);

    if (entitlement.state === 'active_trial') {
        return plan?.trial?.limits.maxProjects ?? 0;
    }

    if (entitlement.state === 'active_subscription') {
        return plan?.features.maxProjects ?? 0;
    }

    return 0;
}

export function evaluateProjectCreationGate(
    input: ProjectCreationGateInput
): ProjectCreationGateResult {
    const maxProjects = getProjectLimitForEntitlement(input.entitlement);

    if (maxProjects === -1 || input.currentProjectCount < maxProjects) {
        return {
            allowed: true,
            currentProjectCount: input.currentProjectCount,
            maxProjects,
        };
    }

    const planName = input.entitlement.planName;
    const projectLabel = maxProjects === 1 ? 'project' : 'projects';

    return {
        allowed: false,
        reason: PROJECT_CAP_REASON,
        currentProjectCount: input.currentProjectCount,
        maxProjects,
        message: `${planName} includes ${maxProjects} active ${projectLabel}. Upgrade to add another project.`,
    };
}

export function createProjectCapDeniedResponse(
    entitlement: EntitlementResult,
    gate: Extract<ProjectCreationGateResult, { allowed: false }>
): NextResponse {
    return NextResponse.json(
        {
            ...createEntitlementDeniedBody(entitlement, ENTITLEMENT_ACTIONS.WRITE),
            code: ENTITLEMENT_REQUIRED_CODE,
            reason: gate.reason,
            currentUsage: gate.currentProjectCount,
            limit: gate.maxProjects,
            message: gate.message,
        },
        { status: 402 }
    );
}

export async function countWorkspaceProjects(organizationId: string): Promise<number> {
    const [{ db, projects }, { and, count, eq, ne }] = await Promise.all([
        import('@/lib/db'),
        import('drizzle-orm'),
    ]);

    const [result] = await db
        .select({ value: count() })
        .from(projects)
        .where(and(
            eq(projects.organizationId, organizationId),
            ne(projects.status, 'archived')
        ));

    return Number(result?.value ?? 0);
}

export async function requireProjectCreationAllowedForWorkspace(args: {
    userId: string;
    organizationId: string;
}): Promise<ProjectCreationGuardResult> {
    const { getEntitlementsForUser } = await import('./entitlements');
    const entitlement = await getEntitlementsForUser(args.userId);

    if (!entitlement) {
        return {
            allowed: false,
            entitlement: null,
            response: NextResponse.json(
                {
                    error: 'Entitlement unavailable',
                    code: 'ENTITLEMENT_UNAVAILABLE',
                    message: 'We could not confirm billing access for this account.',
                },
                { status: 403 }
            ),
        };
    }

    if (!entitlement.allowances.write) {
        return {
            allowed: false,
            entitlement,
            response: createEntitlementDeniedResponse(entitlement, ENTITLEMENT_ACTIONS.WRITE),
        };
    }

    const currentProjectCount = await countWorkspaceProjects(args.organizationId);
    const gate = evaluateProjectCreationGate({ entitlement, currentProjectCount });

    if (!gate.allowed) {
        return {
            allowed: false,
            entitlement,
            response: createProjectCapDeniedResponse(entitlement, gate),
        };
    }

    return {
        allowed: true,
        entitlement,
        currentProjectCount,
        maxProjects: gate.maxProjects,
    };
}
