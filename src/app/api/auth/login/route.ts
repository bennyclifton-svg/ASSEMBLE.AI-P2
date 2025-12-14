/**
 * POST /api/auth/login
 * Authenticates a user and creates a session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, sessions, organizations } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { generateSessionToken, hashToken, setSessionCookie, getSessionExpiry } from '@/lib/auth/session';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/auth/rate-limit';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Check rate limit
    const rateLimitResult = await checkRateLimit(normalizedEmail);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: `Too many failed attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`,
            retryAfter: rateLimitResult.retryAfter,
          },
        },
        { status: 429 }
      );
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      await recordFailedAttempt(normalizedEmail);
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      await recordFailedAttempt(normalizedEmail);
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Clear rate limit attempts on successful login
    await clearAttempts(normalizedEmail);

    // Create session
    const now = Math.floor(Date.now() / 1000);
    const sessionToken = generateSessionToken();
    const sessionId = randomUUID();

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(sessionToken),
      expiresAt: getSessionExpiry(),
      createdAt: now,
    });

    // Set session cookie
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        organizationId: user.organizationId,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'An error occurred during login' } },
      { status: 500 }
    );
  }
}
