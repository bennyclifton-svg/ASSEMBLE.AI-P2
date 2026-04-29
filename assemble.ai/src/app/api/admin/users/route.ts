/**
 * GET /api/admin/users
 *
 * Returns all users with admin-relevant fields. Super-admin only.
 * Includes: latest session timestamp, active Polar subscription status.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, session, polarCustomer, polarSubscription } from '@/lib/db/auth-schema';
import { desc, eq, and, max, sql } from 'drizzle-orm';
import { requireSuperAdminApi } from '@/lib/admin/guard';

export async function GET() {
    try {
        await requireSuperAdminApi();
    } catch (response) {
        return response as Response;
    }

    // Latest session timestamp per user (proxy for "last login")
    const lastSeenSubquery = db
        .select({
            userId: session.userId,
            lastSeen: max(session.createdAt).as('last_seen'),
        })
        .from(session)
        .groupBy(session.userId)
        .as('last_seen_sub');

    // Active Polar subscription product per user (if any)
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

    return NextResponse.json({ users: rows });
}
