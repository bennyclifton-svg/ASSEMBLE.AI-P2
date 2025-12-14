/**
 * PATCH /api/users/me
 * Update the current user's profile (displayName, password).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/auth/password';
import { eq } from 'drizzle-orm';

interface UpdateUserRequest {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body: UpdateUserRequest = await request.json();
    const { displayName, currentPassword, newPassword } = body;

    const updates: { displayName?: string; passwordHash?: string; updatedAt: number } = {
      updatedAt: Math.floor(Date.now() / 1000),
    };

    // Update display name
    if (displayName !== undefined) {
      if (!displayName || displayName.length < 1 || displayName.length > 100) {
        return NextResponse.json(
          { error: { code: 'INVALID_NAME', message: 'Display name must be 1-100 characters', field: 'displayName' } },
          { status: 400 }
        );
      }
      updates.displayName = displayName;
    }

    // Update password
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: { code: 'MISSING_CURRENT_PASSWORD', message: 'Current password is required', field: 'currentPassword' } },
          { status: 400 }
        );
      }

      // Get user's current password hash
      const [user] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, authResult.user.id))
        .limit(1);

      if (!user) {
        return NextResponse.json(
          { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
          { status: 404 }
        );
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect', field: 'currentPassword' } },
          { status: 401 }
        );
      }

      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { error: { code: 'INVALID_NEW_PASSWORD', message: passwordValidation.error, field: 'newPassword' } },
          { status: 400 }
        );
      }

      // Hash new password
      updates.passwordHash = await hashPassword(newPassword);
    }

    // Apply updates
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, authResult.user.id));

    // Get updated user
    const [updatedUser] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        organizationId: users.organizationId,
      })
      .from(users)
      .where(eq(users.id, authResult.user.id))
      .limit(1);

    return NextResponse.json({
      user: updatedUser,
      updated: {
        displayName: displayName !== undefined,
        password: newPassword !== undefined,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to update profile' } },
      { status: 500 }
    );
  }
}
