/**
 * Notes API Route - Individual Note
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/notes/[id] - Get a specific note
 * PATCH /api/notes/[id] - Update a note
 * DELETE /api/notes/[id] - Soft delete a note
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { notes, noteTransmittals } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { updateNoteSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;

        // Fetch note with organization check
        const [note] = await db
            .select()
            .from(notes)
            .where(
                and(
                    eq(notes.id, id),
                    eq(notes.organizationId, authResult.user.organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .limit(1);

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Get transmittal count
        const transmittalCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(noteTransmittals)
            .where(eq(noteTransmittals.noteId, id));

        return NextResponse.json({
            ...note,
            transmittalCount: transmittalCount[0]?.count ?? 0,
        });
    });
}

export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;
        const body = await request.json();

        // Validate request body
        const validationResult = updateNoteSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        // Verify note exists and belongs to organization
        const [existing] = await db
            .select()
            .from(notes)
            .where(
                and(
                    eq(notes.id, id),
                    eq(notes.organizationId, authResult.user.organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            updatedAt: sql`CURRENT_TIMESTAMP`,
        };

        const { title, content, isStarred, color, reportingPeriodStart, reportingPeriodEnd } = validationResult.data;

        if (title !== undefined) {
            updateData.title = title;
        }
        if (content !== undefined) {
            updateData.content = content;
        }
        if (isStarred !== undefined) {
            updateData.isStarred = isStarred;
        }
        if (color !== undefined) {
            updateData.color = color;
        }
        if (reportingPeriodStart !== undefined) {
            updateData.reportingPeriodStart = reportingPeriodStart;
        }
        if (reportingPeriodEnd !== undefined) {
            updateData.reportingPeriodEnd = reportingPeriodEnd;
        }

        // Update the note
        await db
            .update(notes)
            .set(updateData)
            .where(eq(notes.id, id));

        // Fetch and return the updated note
        const [updated] = await db
            .select()
            .from(notes)
            .where(eq(notes.id, id))
            .limit(1);

        return NextResponse.json(updated);
    });
}

export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;

        // Verify note exists and belongs to organization
        const [existing] = await db
            .select()
            .from(notes)
            .where(
                and(
                    eq(notes.id, id),
                    eq(notes.organizationId, authResult.user.organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Soft delete the note
        await db
            .update(notes)
            .set({
                deletedAt: sql`CURRENT_TIMESTAMP`,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(notes.id, id));

        return NextResponse.json({ success: true, message: 'Note deleted' });
    });
}
