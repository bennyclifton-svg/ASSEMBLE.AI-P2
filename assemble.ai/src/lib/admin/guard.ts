/**
 * Admin Route Guards
 *
 * Server-side helpers that enforce super-admin access on admin pages and APIs.
 * Use requireSuperAdminPage() in server components / layouts (redirects).
 * Use requireSuperAdminApi() in route handlers (throws Response).
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/better-auth';
import { db } from '@/lib/db';
import { user as userTable } from '@/lib/db/auth-schema';
import { eq } from 'drizzle-orm';

export interface SuperAdminContext {
    userId: string;
    email: string;
    name: string;
}

/**
 * Server-component / layout guard.
 * Redirects non-super-admins to /dashboard?error=admin-only.
 */
export async function requireSuperAdminPage(): Promise<SuperAdminContext> {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login?redirect=/admin');
    }

    const [row] = await db
        .select({ id: userTable.id, email: userTable.email, name: userTable.name, isSuperAdmin: userTable.isSuperAdmin })
        .from(userTable)
        .where(eq(userTable.id, session.user.id));

    if (!row?.isSuperAdmin) {
        redirect('/dashboard?error=admin-only');
    }

    return { userId: row.id, email: row.email, name: row.name };
}

/**
 * API route handler guard.
 * Throws a 403 Response for non-super-admins. Catch-and-rethrow at the route entry.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     const ctx = await requireSuperAdminApi();
 *     // ... ctx.userId is the calling super-admin ...
 *   }
 */
export async function requireSuperAdminApi(): Promise<SuperAdminContext> {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const [row] = await db
        .select({ id: userTable.id, email: userTable.email, name: userTable.name, isSuperAdmin: userTable.isSuperAdmin })
        .from(userTable)
        .where(eq(userTable.id, session.user.id));

    if (!row?.isSuperAdmin) {
        throw new Response(JSON.stringify({ error: 'Forbidden — super-admin only' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return { userId: row.id, email: row.email, name: row.name };
}
