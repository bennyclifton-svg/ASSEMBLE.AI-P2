/**
 * Notes Copy API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * POST /api/notes/[id]/copy - Duplicate a note with "copy" suffix
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { notes, noteTransmittals } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(
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

        // Fetch the original note
        const [original] = await db
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

        if (!original) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Create the copy
        const copyId = uuidv4();
        const now = new Date().toISOString();

        await db.insert(notes).values({
            id: copyId,
            projectId: original.projectId,
            organizationId: original.organizationId,
            title: `${original.title} copy`,
            content: original.content,
            isStarred: false, // Don't copy starred status
            reportingPeriodStart: original.reportingPeriodStart,
            reportingPeriodEnd: original.reportingPeriodEnd,
            createdAt: now,
            updatedAt: now,
        });

        // Copy transmittal attachments
        const originalTransmittals = await db
            .select()
            .from(noteTransmittals)
            .where(eq(noteTransmittals.noteId, id));

        if (originalTransmittals.length > 0) {
            const copyTransmittals = originalTransmittals.map((t) => ({
                id: uuidv4(),
                noteId: copyId,
                documentId: t.documentId,
                addedAt: now,
            }));

            for (const transmittal of copyTransmittals) {
                await db.insert(noteTransmittals).values(transmittal);
            }
        }

        // Fetch and return the copied note
        const [copied] = await db
            .select()
            .from(notes)
            .where(eq(notes.id, copyId))
            .limit(1);

        return NextResponse.json(copied, { status: 201 });
    });
}
