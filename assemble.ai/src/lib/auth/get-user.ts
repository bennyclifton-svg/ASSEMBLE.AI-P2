/**
 * Get Current User Helper
 * Server-side utility to get the current authenticated user using Better Auth.
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth';
import { db } from '@/lib/db';
import { user as userTable } from '@/lib/db/auth-schema';
import { organizations } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';

export interface CurrentUser {
    id: string;
    email: string;
    displayName: string | null;
    organizationId: string | null;
    organization?: {
        id: string;
        name: string;
    } | null;
}

export interface AuthError {
    message: string;
    code: string;
}

export interface AuthResult {
    user: CurrentUser | null;
    error?: AuthError;
    status: number;
}

/**
 * Get the currently authenticated user from the session.
 * Returns an AuthResult object with user, error, and status.
 */
export async function getCurrentUser(): Promise<AuthResult> {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return {
                user: null,
                error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
                status: 401,
            };
        }

        const betterAuthUser = session.user;

        // Get the full user record with organization info
        const [userRecord] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, betterAuthUser.id))
            .limit(1);

        if (!userRecord) {
            return {
                user: null,
                error: { message: 'User not found', code: 'USER_NOT_FOUND' },
                status: 404,
            };
        }

        // Get organization if user has one
        let organization = null;
        if (userRecord.organizationId) {
            const [org] = await db
                .select()
                .from(organizations)
                .where(eq(organizations.id, userRecord.organizationId))
                .limit(1);

            if (org) {
                organization = {
                    id: org.id,
                    name: org.name,
                };
            }
        }

        return {
            user: {
                id: userRecord.id,
                email: userRecord.email,
                displayName: userRecord.name || null,
                organizationId: userRecord.organizationId || null,
                organization,
            },
            status: 200,
        };
    } catch (error) {
        console.error('Error getting current user:', error);
        return {
            user: null,
            error: { message: 'Authentication error', code: 'AUTH_ERROR' },
            status: 500,
        };
    }
}

/**
 * Require authentication - throws if not authenticated.
 * Use in API routes that require auth.
 */
export async function requireAuth(): Promise<CurrentUser> {
    const result = await getCurrentUser();
    if (!result.user) {
        throw new Error(result.error?.message || 'Unauthorized');
    }
    return result.user;
}
