/**
 * GET /api/auth/me
 * Returns the current authenticated user's information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, sessions, organizations } from '@/lib/db/schema';
import { getSessionToken, hashToken, isSessionExpired } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = await getSessionToken();

    if (!sessionToken) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      );
    }

    // Find session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, hashToken(sessionToken)))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
        { status: 401 }
      );
    }

    // Check if session expired
    if (isSessionExpired(session.expiresAt)) {
      // Clean up expired session
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Session expired' } },
        { status: 401 }
      );
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User not found' } },
        { status: 401 }
      );
    }

    // Get organization
    const [organization] = user.organizationId
      ? await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, user.organizationId))
          .limit(1)
      : [null];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            defaultSettings: JSON.parse(organization.defaultSettings || '{}'),
          }
        : null,
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
