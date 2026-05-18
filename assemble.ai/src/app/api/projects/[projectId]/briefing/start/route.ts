import { NextResponse } from 'next/server';
import { isBriefingEnabled } from '@/lib/briefing/feature-flag';
import { briefingApiError, requireBriefingProjectAccess } from '@/lib/briefing/api-helpers';
import { runBriefingTurn } from '@/lib/briefing/agent';
import { briefingSseResponse } from '@/lib/briefing/sse';
import { startSession } from '@/lib/briefing/session-service';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    if (!isBriefingEnabled()) {
        return NextResponse.json({ error: 'Briefing is disabled' }, { status: 404 });
    }

    const access = await requireBriefingProjectAccess(projectId);
    if (access.ok === false) return access.response;

    try {
        const session = await startSession(projectId);
        return briefingSseResponse(runBriefingTurn({ projectId, session }));
    } catch (error) {
        return briefingApiError(error);
    }
}
