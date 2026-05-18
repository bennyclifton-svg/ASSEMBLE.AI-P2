import { NextResponse } from 'next/server';
import { getCurrentUser, type CurrentUser } from '@/lib/auth/get-user';
import { projectBelongsToOrganization } from './session-service';

export async function requireBriefingProjectAccess(projectId: string): Promise<
    | { ok: true; user: CurrentUser }
    | { ok: false; response: NextResponse }
> {
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
            response: NextResponse.json({ error: 'Organization is required' }, { status: 403 }),
        };
    }

    const allowed = await projectBelongsToOrganization({
        projectId,
        organizationId: authResult.user.organizationId,
    });
    if (!allowed) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
        };
    }

    return { ok: true, user: authResult.user };
}

export function briefingApiError(error: unknown): NextResponse {
    const raw = error instanceof Error ? error.message : String(error);
    const missingBriefingTable =
        /briefing_sessions|briefing_messages|brief_attachments|relation .* does not exist/i.test(raw);
    return NextResponse.json(
        {
            error: missingBriefingTable
                ? 'Briefing database tables are not ready. Apply migration 0053_briefing_sessions.sql, then retry.'
                : 'Briefing request failed.',
            ...(process.env.NODE_ENV !== 'production' ? { detail: raw } : {}),
        },
        { status: 500 }
    );
}
