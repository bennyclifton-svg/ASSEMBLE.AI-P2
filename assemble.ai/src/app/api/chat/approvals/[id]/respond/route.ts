/**
 * /api/chat/approvals/[id]/respond
 *
 * POST - user approves or rejects a pending agent-proposed mutation.
 *
 * This route owns HTTP concerns: auth, request parsing, thread ownership,
 * and response codes. The action module owns approval state transitions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
    approveActionProposal,
    loadActionApprovalForResponse,
    rejectActionProposal,
} from '@/lib/actions/approvals';
import { handleApiError } from '@/lib/api-utils';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/lib/db';
import { chatThreads } from '@/lib/db/pg-schema';

interface RouteParams {
    params: Promise<{ id: string }>;
}

function approvalAlreadyClaimedResponse(): NextResponse {
    return NextResponse.json(
        { error: 'Approval is already being processed or resolved.' },
        { status: 409 }
    );
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return handleApiError(async () => {
        const { id: approvalId } = await params;

        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const orgId = authResult.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const decision = body?.decision;
        if (decision !== 'approve' && decision !== 'reject') {
            return NextResponse.json(
                { error: '"decision" must be "approve" or "reject"' },
                { status: 400 }
            );
        }

        const overrideInput =
            decision === 'approve' &&
            body?.overrideInput !== null &&
            typeof body?.overrideInput === 'object' &&
            !Array.isArray(body?.overrideInput)
                ? (body.overrideInput as Record<string, unknown>)
                : null;

        const loaded = await loadActionApprovalForResponse({
            approvalId,
            organizationId: orgId,
        });
        if (loaded.status === 'not_found') {
            return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
        }
        if (loaded.status === 'already_resolved') {
            return NextResponse.json(
                { error: `Approval already resolved (${loaded.approvalStatus})` },
                { status: 409 }
            );
        }

        const { approval } = loaded;
        const [thread] = await db
            .select({ userId: chatThreads.userId })
            .from(chatThreads)
            .where(eq(chatThreads.id, approval.threadId))
            .limit(1);
        if (!thread || thread.userId !== authResult.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (decision === 'reject') {
            const result = await rejectActionProposal({
                approval,
                userId: authResult.user.id,
            });
            if (result.status === 'already_claimed') return approvalAlreadyClaimedResponse();
            return NextResponse.json({ status: 'rejected' });
        }

        const result = await approveActionProposal({
            approval,
            userId: authResult.user.id,
            overrideInput,
        });

        switch (result.status) {
            case 'applied':
                return NextResponse.json({ status: 'applied', output: result.output });
            case 'blocked':
                return NextResponse.json(
                    { status: 'blocked', error: result.reason },
                    { status: 409 }
                );
            case 'already_claimed':
                return approvalAlreadyClaimedResponse();
            case 'conflict':
                return NextResponse.json(
                    { status: 'conflict', error: result.reason },
                    { status: 409 }
                );
            case 'gone':
                return NextResponse.json(
                    { status: 'gone', error: result.reason },
                    { status: 410 }
                );
        }
    });
}
