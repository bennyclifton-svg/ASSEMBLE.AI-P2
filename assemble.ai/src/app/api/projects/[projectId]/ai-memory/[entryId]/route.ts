import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { emitProjectEvent } from '@/lib/agents/project-events';
import { aiMemoryService, AiMemoryServiceError } from '@/lib/ai-memory/service';

interface RouteParams {
    params: Promise<{ projectId: string; entryId: string }>;
}

function serviceErrorResponse(error: unknown): NextResponse {
    if (error instanceof AiMemoryServiceError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[ai-memory/:id] API error:', error);
    return NextResponse.json({ error: 'Failed to process AI memory request' }, { status: 500 });
}

async function getAuth(): Promise<{ organizationId: string; userId: string } | NextResponse> {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    if (!authResult.user.organizationId) {
        return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
    }
    return { organizationId: authResult.user.organizationId, userId: authResult.user.id };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const auth = await getAuth();
    if (auth instanceof NextResponse) return auth;

    const { projectId, entryId } = await params;

    try {
        const body = await request.json();
        const entry = await aiMemoryService.update({
            id: entryId,
            projectId,
            organizationId: auth.organizationId,
            updatedBy: auth.userId,
            ...body,
        });
        emitProjectEvent(projectId, { type: 'entity_updated', entity: 'ai_memory', op: 'updated', id: entry.id });
        return NextResponse.json(entry);
    } catch (error) {
        return serviceErrorResponse(error);
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const auth = await getAuth();
    if (auth instanceof NextResponse) return auth;

    const { projectId, entryId } = await params;

    try {
        const entry = await aiMemoryService.delete({
            id: entryId,
            projectId,
            organizationId: auth.organizationId,
            updatedBy: auth.userId,
        });
        emitProjectEvent(projectId, { type: 'entity_updated', entity: 'ai_memory', op: 'deleted', id: entry.id });
        return NextResponse.json(entry);
    } catch (error) {
        return serviceErrorResponse(error);
    }
}
