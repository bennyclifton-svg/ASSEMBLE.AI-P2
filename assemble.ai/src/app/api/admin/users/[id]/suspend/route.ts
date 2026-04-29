/**
 * POST /api/admin/users/[id]/suspend
 *
 * Sets user.suspendedAt = now() and deletes all of their active sessions.
 * Audit logged. Super-admin only.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, session } from '@/lib/db/auth-schema';
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
        .select({ id: user.id, email: user.email, suspendedAt: user.suspendedAt })
        .from(user)
        .where(eq(user.id, id));

    if (!target) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (target.suspendedAt) {
        return NextResponse.json({ error: 'User already suspended' }, { status: 409 });
    }

    const now = new Date();

    await db.update(user).set({ suspendedAt: now, updatedAt: now }).where(eq(user.id, id));
    const deletedSessions = await db.delete(session).where(eq(session.userId, id)).returning({ id: session.id });

    await recordAdminAction({
        actorUserId,
        action: 'user.suspend',
        targetType: 'user',
        targetId: id,
        before: { suspendedAt: null },
        after: { suspendedAt: now.toISOString(), revokedSessions: deletedSessions.length },
    });

    return NextResponse.json({ success: true, suspendedAt: now.toISOString(), revokedSessions: deletedSessions.length });
}
