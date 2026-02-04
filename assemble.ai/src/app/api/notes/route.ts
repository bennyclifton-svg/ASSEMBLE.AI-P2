/**
 * Notes API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/notes?projectId=X - List all notes for a project
 * POST /api/notes - Create a new note
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { notes, noteTransmittals } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { createNoteSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Fetch notes for the project (excluding soft-deleted)
        const notesList = await db
            .select()
            .from(notes)
            .where(
                and(
                    eq(notes.projectId, projectId),
                    eq(notes.organizationId, authResult.user.organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .orderBy(desc(notes.updatedAt));

        // Get transmittal counts for each note
        const notesWithCounts = await Promise.all(
            notesList.map(async (note) => {
                const transmittalCount = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(noteTransmittals)
                    .where(eq(noteTransmittals.noteId, note.id));

                return {
                    ...note,
                    transmittalCount: transmittalCount[0]?.count ?? 0,
                };
            })
        );

        return NextResponse.json({
            notes: notesWithCounts,
            total: notesWithCounts.length,
        });
    });
}

export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const body = await request.json();

        // Validate request body
        const validationResult = createNoteSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { projectId, title, content, color } = validationResult.data;

        // Create new note
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.insert(notes).values({
            id,
            projectId,
            organizationId: authResult.user.organizationId,
            title: title || 'New Note',
            content: content || null,
            isStarred: false,
            color: color || 'yellow',
            createdAt: now,
            updatedAt: now,
        });

        // Fetch and return the created note
        const [created] = await db
            .select()
            .from(notes)
            .where(eq(notes.id, id))
            .limit(1);

        return NextResponse.json(created, { status: 201 });
    });
}
