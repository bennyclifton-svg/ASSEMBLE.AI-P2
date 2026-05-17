import '@/lib/actions';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { getAction, parseActionInput, runAction } from '@/lib/actions';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    if (!authResult.user.organizationId) {
        return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
    }

    const action = getAction('correspondence.weekly_report.create_draft');
    if (!action) {
        return NextResponse.json({ error: 'Weekly report draft action is not registered' }, { status: 500 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const input = parseActionInput(action, body);
        const result = await runAction({
            action,
            ctx: {
                userId: authResult.user.id,
                organizationId: authResult.user.organizationId,
                projectId,
                actorKind: 'user',
                actorId: authResult.user.id,
            },
            input,
        });

        return NextResponse.json(result.output, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 400 }
        );
    }
}
