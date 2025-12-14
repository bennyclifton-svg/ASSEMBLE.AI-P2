/**
 * Authentication helper for API routes
 * Gets the current authenticated user from session cookie.
 */

import { db } from '@/lib/db';
import { users, sessions } from '@/lib/db/schema';
import { getSessionToken, hashToken, isSessionExpired } from './session';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  organizationId: string | null;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: { code: string; message: string } | null;
  status: number;
}

/**
 * Get the current authenticated user from the session cookie.
 * Returns user data or error information.
 */
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    // Get session token from cookie
    const sessionToken = await getSessionToken();

    if (!sessionToken) {
      return {
        user: null,
        error: { code: 'UNAUTHORIZED', message: 'No valid session' },
        status: 401,
      };
    }

    // Find session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, hashToken(sessionToken)))
      .limit(1);

    if (!session) {
      return {
        user: null,
        error: { code: 'UNAUTHORIZED', message: 'Invalid session' },
        status: 401,
      };
    }

    // Check if session expired
    if (isSessionExpired(session.expiresAt)) {
      // Clean up expired session
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return {
        user: null,
        error: { code: 'UNAUTHORIZED', message: 'Session expired' },
        status: 401,
      };
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return {
        user: null,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
        status: 401,
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        organizationId: user.organizationId,
      },
      error: null,
      status: 200,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return {
      user: null,
      error: { code: 'SERVER_ERROR', message: 'Authentication error' },
      status: 500,
    };
  }
}

/**
 * Require authentication for an API route.
 * Throws if not authenticated.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const result = await getCurrentUser();
  if (!result.user) {
    throw new AuthError(result.error!.code, result.error!.message, result.status);
  }
  return result.user;
}

export class AuthError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
