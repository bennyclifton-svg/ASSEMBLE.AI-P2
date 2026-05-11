/**
 * Assessment Waitlist API
 *
 * POST /api/assessment-waitlist
 *   Body: { email: string, name?: string, scores?: optional result fields }
 *   Captures email signups and optional Tender Readiness Health Check results.
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

    const {
        email,
        name,
        source,
        overallScore,
        scopeScore,
        fieldScore,
        processScore,
        designScore,
        procureScore,
        deliverScore,
        weakestPillar,
        answers,
    } = (body ?? {}) as {
        email?: unknown;
        name?: unknown;
        source?: unknown;
        overallScore?: unknown;
        scopeScore?: unknown;
        fieldScore?: unknown;
        processScore?: unknown;
        designScore?: unknown;
        procureScore?: unknown;
        deliverScore?: unknown;
        weakestPillar?: unknown;
        answers?: unknown;
    };

    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
        return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;
    const cleanSource = typeof source === 'string' && source.trim().length > 0
        ? source.trim()
        : 'assessment_landing';
    const ALL_PILLAR_NAMES = ['scope', 'field', 'process', 'design', 'procure', 'deliver'];
    const resultFields = {
        overallScore: toScore(overallScore),
        scopeScore: toScore(scopeScore),
        fieldScore: toScore(fieldScore),
        processScore: toScore(processScore),
        designScore: toScore(designScore),
        procureScore: toScore(procureScore),
        deliverScore: toScore(deliverScore),
        weakestPillar:
            typeof weakestPillar === 'string' && ALL_PILLAR_NAMES.includes(weakestPillar)
                ? weakestPillar
                : null,
        answers: isAnswerMap(answers) ? answers : null,
    };

    try {
        await db
            .insert(assessmentWaitlist)
            .values({
                email: cleanEmail,
                name: cleanName,
                source: cleanSource,
                ...resultFields,
            })
            .onConflictDoUpdate({
                target: assessmentWaitlist.email,
                set: {
                    name: cleanName,
                    source: cleanSource,
                    ...resultFields,
                },
            });

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Could not save your signup. Try again in a moment.', detail: message },
            { status: 500 }
        );
    }
}

function toScore(value: unknown) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < 0 || value > 100) return null;
    return Math.round(value);
}

function isAnswerMap(value: unknown): value is Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value).every(
        (item) => typeof item === 'number' && Number.isInteger(item) && item >= 1 && item <= 5,
    );
}
