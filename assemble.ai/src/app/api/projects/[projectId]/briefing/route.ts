import { NextResponse } from 'next/server';
import { isBriefingEnabled } from '@/lib/briefing/feature-flag';
import { briefingApiError, requireBriefingProjectAccess } from '@/lib/briefing/api-helpers';
import {
    getVisibleSession,
    listMessages,
    serializeBriefingMessage,
    serializeBriefingSession,
} from '@/lib/briefing/session-service';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    if (!isBriefingEnabled()) {
        return NextResponse.json({ enabled: false, session: null, messages: [] });
    }

    const access = await requireBriefingProjectAccess(projectId);
    if (access.ok === false) return access.response;

    try {
        const session = await getVisibleSession(projectId);
        if (!session) {
            return NextResponse.json({ enabled: true, session: null, messages: [] });
        }

        const messages = await listMessages(session.id);
        return NextResponse.json({
            enabled: true,
            session: serializeBriefingSession(session),
            messages: messages.map(serializeBriefingMessage),
        });
    } catch (error) {
        return briefingApiError(error);
    }
}
