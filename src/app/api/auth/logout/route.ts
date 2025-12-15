/**
 * POST /api/auth/logout
 * Terminates the current session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db';
import { getSessionToken, hashToken, clearSessionCookie } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = await getSessionToken();

    if (sessionToken) {
      // Delete session from database
      await db
        .delete(sessions)
        .where(eq(sessions.tokenHash, hashToken(sessionToken)));
    }

    // Clear session cookie
    await clearSessionCookie();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookie even if there's an error
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
