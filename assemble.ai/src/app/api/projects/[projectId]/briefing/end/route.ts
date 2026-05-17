import { NextResponse } from 'next/server';
import { isBriefingEnabled } from '@/lib/briefing/feature-flag';
import { briefingApiError, requireBriefingProjectAccess } from '@/lib/briefing/api-helpers';
import { endSession, serializeBriefingSession } from '@/lib/briefing/session-service';

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
        const body = await request.json().catch(() => ({}));
        const reason = body.reason === 'agent' ? 'agent' : 'user';
        const session = await endSession({ projectId, reason });
        return NextResponse.json({ success: true, session: serializeBriefingSession(session) });
    } catch (error) {
        return briefingApiError(error);
    }
}
