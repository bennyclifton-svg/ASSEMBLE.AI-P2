/**
 * POST /api/admin/users/[id]/reset-password
 *
 * Generates a one-time password-reset token (1hr expiry) and returns the reset URL.
 * Admin copies this URL and sends to the user manually (no email service wired up yet).
 *
 * Mirrors Better Auth's requestPasswordReset endpoint:
 *   - inserts into `verification` table with identifier `reset-password:{token}`
 *   - URL format: {baseURL}/reset-password/{token}?callbackURL={encoded}
 *
 * Audit logged. Super-admin only.
 */

import { NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { user, verification } from '@/lib/db/auth-schema';
import { eq } from 'drizzle-orm';
import { requireSuperAdminApi } from '@/lib/admin/guard';
import { recordAdminAction } from '@/lib/admin/audit';

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour, matches Better Auth default

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
        .select({ id: user.id, email: user.email })
        .from(user)
        .where(eq(user.id, id));

    if (!target) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const token = randomBytes(24).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_SECONDS * 1000);

    await db.insert(verification).values({
        id: randomUUID(),
        identifier: `reset-password:${token}`,
        value: target.id,
        expiresAt,
        createdAt: now,
        updatedAt: now,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackURL = '/login';
    const resetUrl = `${baseUrl}/reset-password/${token}?callbackURL=${encodeURIComponent(callbackURL)}`;

    await recordAdminAction({
        actorUserId,
        action: 'user.reset_password',
        targetType: 'user',
        targetId: id,
        after: { email: target.email, expiresAt: expiresAt.toISOString() },
    });

    return NextResponse.json({
        success: true,
        email: target.email,
        resetUrl,
        expiresAt: expiresAt.toISOString(),
    });
}
