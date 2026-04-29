/**
 * POST /api/admin/users/[id]/unsuspend
 *
 * Clears user.suspendedAt. User can sign in again on next attempt.
 * Audit logged. Super-admin only.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/db/auth-schema';
import { eq } from 'drizzle-orm';
import { requireSuperAdminApi } from '@/lib/admin/guard';
import { recordAdminAction } from '@/lib/admin/audit';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    let actorUserId: string;
    try {
        const ctx = await requireSuperAdminApi();
        actorUserId = ctx.userId;
    } catch (response) {
        return response as Response;
    }

    const { id } = await params;

    const [target] = await db
        .select({ id: user.id, suspendedAt: user.suspendedAt })
        .from(user)
        .where(eq(user.id, id));

    if (!target) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!target.suspendedAt) {
        return NextResponse.json({ error: 'User is not suspended' }, { status: 409 });
    }

    const before = target.suspendedAt.toISOString();
    const now = new Date();

    await db.update(user).set({ suspendedAt: null, updatedAt: now }).where(eq(user.id, id));

    await recordAdminAction({
        actorUserId,
        action: 'user.unsuspend',
        targetType: 'user',
        targetId: id,
        before: { suspendedAt: before },
        after: { suspendedAt: null },
    });

    return NextResponse.json({ success: true });
}
