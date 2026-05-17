import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { rfiIssuedArtefactService } from '@/lib/rfi/issued-artefacts';
import { RfiServiceError } from '@/lib/rfi/service';

interface RouteParams {
    params: Promise<{ projectId: string; rfiId: string }>;
}

function serviceErrorResponse(error: unknown): NextResponse {
    if (error instanceof RfiServiceError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[rfis/:id/exports] API error:', error);
    return NextResponse.json({ error: 'Failed to process RFI export request' }, { status: 500 });
}

async function getAuthenticatedUser() {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    if (!authResult.user.organizationId) {
        return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
    }
    return { user: authResult.user, organizationId: authResult.user.organizationId };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const auth = await getAuthenticatedUser();
    if (auth instanceof NextResponse) return auth;

    const { projectId, rfiId } = await params;

    try {
        const result = await rfiIssuedArtefactService.list({
            id: rfiId,
            projectId,
            organizationId: auth.organizationId,
        });
        return NextResponse.json(result);
    } catch (error) {
        return serviceErrorResponse(error);
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const auth = await getAuthenticatedUser();
    if (auth instanceof NextResponse) return auth;

    const { projectId, rfiId } = await params;

    try {
        const body = await request.json().catch(() => ({}));
        const issuedArtefact = await rfiIssuedArtefactService.generate({
            id: rfiId,
            projectId,
            organizationId: auth.organizationId,
            actorId: auth.user.id,
            actorName: auth.user.displayName,
            format: body?.format,
        });
        emitProjectEvent(projectId, { type: 'entity_updated', entity: 'rfi', op: 'updated', id: rfiId });
        return NextResponse.json(issuedArtefact, { status: 201 });
    } catch (error) {
        return serviceErrorResponse(error);
    }
}
