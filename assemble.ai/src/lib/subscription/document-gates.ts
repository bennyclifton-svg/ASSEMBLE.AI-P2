import { NextResponse } from 'next/server';
import { getProjectForWorkspace } from '@/lib/projects/workspace-access';
import { getPlanById } from './plan-catalog';
import {
    ENTITLEMENT_ACTIONS,
    type EntitlementAction,
    type EntitlementResult,
} from './entitlement-evaluator';
import {
    ENTITLEMENT_REQUIRED_CODE,
    ENTITLEMENT_UNAVAILABLE_CODE,
    createEntitlementDeniedBody,
    createEntitlementDeniedResponse,
} from './entitlement-guards';

export const DOCUMENT_CAP_REASON = 'document_cap' as const;

export interface DocumentUploadGateInput {
    entitlement: EntitlementResult;
    currentDocumentCount: number;
    incomingDocumentCount?: number;
}

export type DocumentUploadGateResult =
    | {
        allowed: true;
        currentDocumentCount: number;
        incomingDocumentCount: number;
        maxDocuments: number;
    }
    | {
        allowed: false;
        reason: typeof DOCUMENT_CAP_REASON;
        currentDocumentCount: number;
        incomingDocumentCount: number;
        maxDocuments: number;
        message: string;
    };

export type ProjectDocumentGuardResult =
    | {
        allowed: true;
        entitlement: EntitlementResult;
    }
    | {
        allowed: false;
        entitlement: EntitlementResult | null;
        response: NextResponse;
    };

export function getDocumentLimitForEntitlement(entitlement: EntitlementResult): number {
    const plan = getPlanById(entitlement.planId);

    if (entitlement.state === 'active_trial') {
        return plan?.trial?.limits.maxDocuments ?? 0;
    }

    if (entitlement.state === 'active_subscription') {
        return plan?.features.maxDocuments ?? 0;
    }

    return 0;
}

export function evaluateDocumentUploadGate(
    input: DocumentUploadGateInput
): DocumentUploadGateResult {
    const incomingDocumentCount = input.incomingDocumentCount ?? 1;
    const maxDocuments = getDocumentLimitForEntitlement(input.entitlement);
    const nextDocumentCount = input.currentDocumentCount + incomingDocumentCount;

    if (maxDocuments === -1 || nextDocumentCount <= maxDocuments) {
        return {
            allowed: true,
            currentDocumentCount: input.currentDocumentCount,
            incomingDocumentCount,
            maxDocuments,
        };
    }

    const documentLabel = maxDocuments === 1 ? 'document' : 'documents';

    return {
        allowed: false,
        reason: DOCUMENT_CAP_REASON,
        currentDocumentCount: input.currentDocumentCount,
        incomingDocumentCount,
        maxDocuments,
        message: `${input.entitlement.planName} includes ${maxDocuments} ${documentLabel}. Upgrade to upload more documents.`,
    };
}

export function createDocumentCapDeniedResponse(
    entitlement: EntitlementResult,
    gate: Extract<DocumentUploadGateResult, { allowed: false }>
): NextResponse {
    return NextResponse.json(
        {
            ...createEntitlementDeniedBody(entitlement, ENTITLEMENT_ACTIONS.UPLOAD),
            code: ENTITLEMENT_REQUIRED_CODE,
            reason: gate.reason,
            currentUsage: gate.currentDocumentCount,
            attemptedUsage: gate.currentDocumentCount + gate.incomingDocumentCount,
            limit: gate.maxDocuments,
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

function projectNotFoundResponse(): NextResponse {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
}

async function getEntitlementForUser(userId: string): Promise<EntitlementResult | null> {
    const { getEntitlementsForUser } = await import('./entitlements');
    return getEntitlementsForUser(userId);
}

export async function countProjectDocuments(projectId: string): Promise<number> {
    const [{ db, documents }, { count, eq }] = await Promise.all([
        import('@/lib/db'),
        import('drizzle-orm'),
    ]);

    const [result] = await db
        .select({ value: count() })
        .from(documents)
        .where(eq(documents.projectId, projectId));

    return Number(result?.value ?? 0);
}

export async function requireProjectDocumentAction(args: {
    userId: string;
    organizationId: string;
    projectId: string;
    action: Extract<EntitlementAction, 'upload' | 'export'>;
}): Promise<ProjectDocumentGuardResult> {
    const project = await getProjectForWorkspace(args.projectId, args.organizationId);
    if (!project) {
        return { allowed: false, entitlement: null, response: projectNotFoundResponse() };
    }

    const entitlement = await getEntitlementForUser(args.userId);
    if (!entitlement) {
        return { allowed: false, entitlement: null, response: entitlementUnavailableResponse() };
    }

    if (!entitlement.allowances[args.action]) {
        return {
            allowed: false,
            entitlement,
            response: createEntitlementDeniedResponse(entitlement, args.action),
        };
    }

    return { allowed: true, entitlement };
}

export async function requireDocumentUploadAllowedForProject(args: {
    userId: string;
    organizationId: string;
    projectId: string;
    incomingDocumentCount?: number;
}): Promise<ProjectDocumentGuardResult> {
    const actionGuard = await requireProjectDocumentAction({
        userId: args.userId,
        organizationId: args.organizationId,
        projectId: args.projectId,
        action: ENTITLEMENT_ACTIONS.UPLOAD,
    });
    if (!actionGuard.allowed) return actionGuard;

    const currentDocumentCount = await countProjectDocuments(args.projectId);
    const gate = evaluateDocumentUploadGate({
        entitlement: actionGuard.entitlement,
        currentDocumentCount,
        incomingDocumentCount: args.incomingDocumentCount,
    });

    if (!gate.allowed) {
        return {
            allowed: false,
            entitlement: actionGuard.entitlement,
            response: createDocumentCapDeniedResponse(actionGuard.entitlement, gate),
        };
    }

    return actionGuard;
}

export async function requireDocumentExportAllowedForProject(args: {
    userId: string;
    organizationId: string;
    projectId: string;
}): Promise<ProjectDocumentGuardResult> {
    return requireProjectDocumentAction({
        userId: args.userId,
        organizationId: args.organizationId,
        projectId: args.projectId,
        action: ENTITLEMENT_ACTIONS.EXPORT,
    });
}
