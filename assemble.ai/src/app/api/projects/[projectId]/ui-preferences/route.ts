import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { projects } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and } from 'drizzle-orm';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
): Record<string, unknown> {
    const out: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(source)) {
        const existing = out[key];
        if (isPlainObject(existing) && isPlainObject(value)) {
            out[key] = deepMerge(existing, value);
        } else {
            out[key] = value;
        }
    }
    return out;
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const patch = await request.json();
        if (!isPlainObject(patch)) {
            return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
        }

        const existing = await db
            .select({ uiPreferences: projects.uiPreferences })
            .from(projects)
            .where(
                and(
                    eq(projects.id, projectId),
                    eq(projects.organizationId, authResult.user.organizationId)
                )
            );

        if (existing.length === 0) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        let current: Record<string, unknown> = {};
        try {
            const parsed = JSON.parse(existing[0].uiPreferences || '{}');
            if (isPlainObject(parsed)) current = parsed;
        } catch {
            current = {};
        }

        const merged = deepMerge(current, patch);

        await db
            .update(projects)
            .set({ uiPreferences: JSON.stringify(merged), updatedAt: new Date() })
            .where(
                and(
                    eq(projects.id, projectId),
                    eq(projects.organizationId, authResult.user.organizationId)
                )
            );

        return NextResponse.json({ uiPreferences: merged });
    } catch (error) {
        console.error('Error updating ui preferences:', error);
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }
}
