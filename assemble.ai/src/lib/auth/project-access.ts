import { NextResponse } from 'next/server';
import { getCurrentUser, type CurrentUser } from './get-user';
import {
    getProjectForWorkspace,
    type WorkspaceProject,
} from '@/lib/projects/workspace-access';
import { ENTITLEMENT_ACTIONS } from '@/lib/subscription/entitlement-evaluator';
import { requireEntitlementActionForUser } from '@/lib/subscription/entitlement-guards';
import {
    requireDocumentExportAllowedForProject,
    requireDocumentUploadAllowedForProject,
} from '@/lib/subscription/document-gates';
import { requireAiActionAllowed } from '@/lib/subscription/ai-usage-meter';

export type AccessDenied = {
    ok: false;
    response: NextResponse;
};

export type AuthenticatedWorkspace = {
    ok: true;
    user: CurrentUser;
    organizationId: string;
};

export type ProjectAccess = AuthenticatedWorkspace & {
    project: WorkspaceProject;
};

export type ProjectAccessResult = ProjectAccess | AccessDenied;
export type WorkspaceAccessResult = AuthenticatedWorkspace | AccessDenied;

export function isAccessDenied<T extends { ok: boolean }>(result: T): result is Extract<T, { ok: false }> {
    return !result.ok;
}

export async function requireAuthenticatedWorkspace(): Promise<WorkspaceAccessResult> {
    const authResult = await getCurrentUser();

    if (!authResult.user) {
        return {
            ok: false,
            response: NextResponse.json({ error: authResult.error }, { status: authResult.status }),
        };
    }

    if (!authResult.user.organizationId) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'User has no organization' }, { status: 400 }),
        };
    }

    return {
        ok: true,
        user: authResult.user,
        organizationId: authResult.user.organizationId,
    };
}

export async function requireProjectReadAccess(projectId: string): Promise<ProjectAccessResult> {
    const workspace = await requireAuthenticatedWorkspace();
    if (isAccessDenied(workspace)) return workspace;

    const project = await getProjectForWorkspace(projectId, workspace.organizationId);
    if (!project) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
        };
    }

    return { ...workspace, project };
}

export async function requireWritableProjectAccess(projectId: string): Promise<ProjectAccessResult> {
    const access = await requireProjectReadAccess(projectId);
    if (isAccessDenied(access)) return access;

    const writeGuard = await requireEntitlementActionForUser(
        access.user.id,
        ENTITLEMENT_ACTIONS.WRITE
    );
    if (!writeGuard.allowed) {
        return { ok: false, response: writeGuard.response };
    }

    return access;
}

export async function requireUploadProjectAccess(args: {
    projectId: string;
    incomingDocumentCount?: number;
}): Promise<ProjectAccessResult> {
    const workspace = await requireAuthenticatedWorkspace();
    if (isAccessDenied(workspace)) return workspace;

    const uploadGuard = await requireDocumentUploadAllowedForProject({
        userId: workspace.user.id,
        organizationId: workspace.organizationId,
        projectId: args.projectId,
        incomingDocumentCount: args.incomingDocumentCount,
    });
    if (!uploadGuard.allowed) {
        return { ok: false, response: uploadGuard.response };
    }

    const project = await getProjectForWorkspace(args.projectId, workspace.organizationId);
    if (!project) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
        };
    }

    return { ...workspace, project };
}

export async function requireExportProjectAccess(projectId: string): Promise<ProjectAccessResult> {
    const workspace = await requireAuthenticatedWorkspace();
    if (isAccessDenied(workspace)) return workspace;

    const exportGuard = await requireDocumentExportAllowedForProject({
        userId: workspace.user.id,
        organizationId: workspace.organizationId,
        projectId,
    });
    if (!exportGuard.allowed) {
        return { ok: false, response: exportGuard.response };
    }

    const project = await getProjectForWorkspace(projectId, workspace.organizationId);
    if (!project) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
        };
    }

    return { ...workspace, project };
}

export async function requireAiProjectAccess(args: {
    projectId: string;
    action: string;
    metadata?: Record<string, unknown>;
}): Promise<ProjectAccessResult & { aiUsageEventId?: string }> {
    const workspace = await requireAuthenticatedWorkspace();
    if (isAccessDenied(workspace)) return workspace;

    const aiGuard = await requireAiActionAllowed({
        userId: workspace.user.id,
        organizationId: workspace.organizationId,
        projectId: args.projectId,
        action: args.action,
        metadata: args.metadata,
    });
    if (!aiGuard.allowed) {
        return { ok: false, response: aiGuard.response };
    }

    const project = await getProjectForWorkspace(args.projectId, workspace.organizationId);
    if (!project) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
        };
    }

    return { ...workspace, project, aiUsageEventId: aiGuard.eventId };
}
