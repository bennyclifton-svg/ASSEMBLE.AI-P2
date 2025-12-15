/**
 * POST /api/auth/register
 * Creates a new user account and organization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, organizations, sessions, knowledgeLibraries } from '@/lib/db';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { generateSessionToken, hashToken, setSessionCookie, getSessionExpiry } from '@/lib/auth/session';
import { KNOWLEDGE_LIBRARY_TYPES } from '@/lib/constants/libraries';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, displayName } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: { code: 'INVALID_EMAIL', message: 'Invalid email format', field: 'email' } },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: { code: 'INVALID_PASSWORD', message: passwordValidation.error, field: 'password' } },
        { status: 400 }
      );
    }

    // Validate display name
    if (!displayName || displayName.length < 1 || displayName.length > 100) {
      return NextResponse.json(
        { error: { code: 'INVALID_NAME', message: 'Display name must be 1-100 characters', field: 'displayName' } },
        { status: 400 }
      );
    }

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'Email already registered', field: 'email' } },
        { status: 409 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Create organization
    const organizationId = randomUUID();
    await db.insert(organizations).values({
      id: organizationId,
      name: `${displayName}'s Organization`,
      defaultSettings: '{}',
      createdAt: now,
      updatedAt: now,
    });

    // Create user
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      organizationId,
      createdAt: now,
      updatedAt: now,
    });

    // Create knowledge libraries for the organization
    for (const libraryType of KNOWLEDGE_LIBRARY_TYPES) {
      await db.insert(knowledgeLibraries).values({
        id: randomUUID(),
        organizationId,
        type: libraryType.id,
        documentCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create session
    const sessionToken = generateSessionToken();
    const sessionId = randomUUID();

    await db.insert(sessions).values({
      id: sessionId,
      userId,
      tokenHash: hashToken(sessionToken),
      expiresAt: getSessionExpiry(),
      createdAt: now,
    });

    // Set session cookie
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      user: {
        id: userId,
        email: email.toLowerCase(),
        displayName,
      },
      organization: {
        id: organizationId,
        name: `${displayName}'s Organization`,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'An error occurred during registration' } },
      { status: 500 }
    );
  }
}
