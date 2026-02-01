/**
 * PATCH /api/users/me
 * Update the current user's profile (displayName, password).
 * Uses Better Auth for authentication and account management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user as userTable, account as accountTable } from '@/lib/db/auth-schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/auth/password';
import { eq, and } from 'drizzle-orm';

interface UpdateUserRequest {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body: UpdateUserRequest = await request.json();
    const { displayName, currentPassword, newPassword } = body;

    // Update display name in user table
    if (displayName !== undefined) {
      if (!displayName || displayName.length < 1 || displayName.length > 100) {
        return NextResponse.json(
          { error: { code: 'INVALID_NAME', message: 'Display name must be 1-100 characters', field: 'displayName' } },
          { status: 400 }
        );
      }

      await db
        .update(userTable)
        .set({
          name: displayName,
          displayName: displayName,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, currentUser.id));
    }

    // Update password in account table (Better Auth stores passwords in account table)
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: { code: 'MISSING_CURRENT_PASSWORD', message: 'Current password is required', field: 'currentPassword' } },
          { status: 400 }
        );
      }

      // Get user's credential account (providerId = 'credential')
      const [credentialAccount] = await db
        .select()
        .from(accountTable)
        .where(
          and(
            eq(accountTable.userId, currentUser.id),
            eq(accountTable.providerId, 'credential')
          )
        )
        .limit(1);

      if (!credentialAccount || !credentialAccount.password) {
        return NextResponse.json(
          { error: { code: 'NO_PASSWORD_AUTH', message: 'Password authentication not available for this account' } },
          { status: 400 }
        );
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, credentialAccount.password);
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

      // Hash and update password
      const hashedPassword = await hashPassword(newPassword);
      await db
        .update(accountTable)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(accountTable.id, credentialAccount.id));
    }

    // Get updated user
    const [updatedUser] = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        displayName: userTable.name,
        organizationId: userTable.organizationId,
      })
      .from(userTable)
      .where(eq(userTable.id, currentUser.id))
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
