/**
 * Assessment Waitlist API
 *
 * POST /api/assessment-waitlist
 *   Body: { email: string, name?: string }
 *   Captures email signups from the /assessment landing page while the
 *   Tender Readiness Health Check quiz is being built.
 *   Idempotent on email — resubmitting the same email returns success
 *   without creating a duplicate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessmentWaitlist } from '@/lib/db/pg-schema';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, name } = (body ?? {}) as { email?: unknown; name?: unknown };

    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
        return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;

    try {
        await db
            .insert(assessmentWaitlist)
            .values({ email: cleanEmail, name: cleanName })
            .onConflictDoNothing({ target: assessmentWaitlist.email });

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Could not save your signup. Try again in a moment.', detail: message },
            { status: 500 }
        );
    }
}
