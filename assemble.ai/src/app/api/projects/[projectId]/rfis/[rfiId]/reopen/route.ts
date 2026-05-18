import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { rfiService, RfiServiceError } from '@/lib/rfi/service';

interface RouteParams {
    params: Promise<{ projectId: string; rfiId: string }>;
}

function serviceErrorResponse(error: unknown): NextResponse {
    if (error instanceof RfiServiceError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[rfis/:id/reopen] API error:', error);
    return NextResponse.json({ error: 'Failed to reopen RFI' }, { status: 500 });
}

async function getActor(): Promise<{
    organizationId: string;
    actorId: string;
    actorName: string | null;
} | NextResponse> {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    if (!authResult.user.organizationId) {
        return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
    }
    return {
        organizationId: authResult.user.organizationId,
        actorId: authResult.user.id,
        actorName: authResult.user.displayName ?? authResult.user.email ?? null,
    };
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
    const auth = await getActor();
    if (auth instanceof NextResponse) return auth;

    const { projectId, rfiId } = await params;

    try {
        const rfi = await rfiService.reopen({
            id: rfiId,
            projectId,
            organizationId: auth.organizationId,
            actorId: auth.actorId,
            actorName: auth.actorName,
        });
        emitProjectEvent(projectId, { type: 'entity_updated', entity: 'rfi', op: 'updated', id: rfi.id });
        return NextResponse.json(rfi);
    } catch (error) {
        return serviceErrorResponse(error);
    }
}
