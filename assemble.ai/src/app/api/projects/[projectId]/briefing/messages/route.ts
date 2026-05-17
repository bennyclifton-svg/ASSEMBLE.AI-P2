import { NextResponse } from 'next/server';
import { isBriefingEnabled } from '@/lib/briefing/feature-flag';
import { briefingApiError, requireBriefingProjectAccess } from '@/lib/briefing/api-helpers';
import { runBriefingTurn } from '@/lib/briefing/agent';
import { briefingSseResponse } from '@/lib/briefing/sse';
import { appendMessage, getActiveSession } from '@/lib/briefing/session-service';

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

    const body = await request.json().catch(() => ({}));
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const action = typeof body.action === 'string' ? body.action : 'edit';
    if (!content && action !== 'skip') {
        return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    try {
        const session = await getActiveSession(projectId);
        if (!session) {
            return NextResponse.json({ error: 'No active briefing session' }, { status: 404 });
        }

        const userContent =
            action === 'skip'
                ? "I don't know. Make a reasonable assumption and continue."
                : action === 'accept'
                    ? `Accepted recommended answer: ${content}`
                    : content;

        await appendMessage({
            sessionId: session.id,
            role: 'user',
            content: userContent,
        });

        return briefingSseResponse(runBriefingTurn({ projectId, session }));
    } catch (error) {
        return briefingApiError(error);
    }
}
