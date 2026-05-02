/**
 * Admin Users Page
 *
 * Lists all users with row actions: suspend, unsuspend, generate password-reset link.
 * Layout already enforces super-admin via requireSuperAdminPage().
 */

import { db } from '@/lib/db';
import { user, session, polarCustomer, polarSubscription } from '@/lib/db/auth-schema';
import { desc, eq, and, max } from 'drizzle-orm';
import { UsersTable } from './UsersTable';

export interface AdminUserRow {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    suspendedAt: string | null;
    isSuperAdmin: boolean;
    lastSeen: string | null;
    planProductId: string | null;
    planStatus: string | null;
}

async function getUsers(): Promise<AdminUserRow[]> {
    const lastSeenSubquery = db
        .select({ userId: session.userId, lastSeen: max(session.createdAt).as('last_seen') })
        .from(session)
        .groupBy(session.userId)
        .as('last_seen_sub');

    const planSubquery = db
        .select({
            userId: polarCustomer.userId,
            productId: polarSubscription.productId,
            status: polarSubscription.status,
        })
        .from(polarCustomer)
        .leftJoin(
            polarSubscription,
            and(
                eq(polarSubscription.customerId, polarCustomer.id),
                eq(polarSubscription.status, 'active')
            )
        )
        .as('plan_sub');

    const rows = await db
        .select({
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
            suspendedAt: user.suspendedAt,
            isSuperAdmin: user.isSuperAdmin,
            lastSeen: lastSeenSubquery.lastSeen,
            planProductId: planSubquery.productId,
            planStatus: planSubquery.status,
        })
        .from(user)
        .leftJoin(lastSeenSubquery, eq(lastSeenSubquery.userId, user.id))
        .leftJoin(planSubquery, eq(planSubquery.userId, user.id))
        .orderBy(desc(user.createdAt));

    return rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        suspendedAt: r.suspendedAt?.toISOString() ?? null,
        lastSeen: r.lastSeen ? new Date(r.lastSeen).toISOString() : null,
    }));
}

export default async function AdminUsersPage() {
    const users = await getUsers();

    return (
        <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Users</h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {users.length} total. All actions are logged to <code className="text-xs text-[var(--color-text-secondary)]">admin_audit_log</code>.
                </p>
            </div>
            <UsersTable initialUsers={users} />
        </div>
    );
}
