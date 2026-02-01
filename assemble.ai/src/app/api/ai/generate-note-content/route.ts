/**
 * AI Note Content Generation API
 * POST /api/ai/generate-note-content
 *
 * Feature 021 - Notes, Meetings & Reports
 *
 * Generates AI content for notes based on:
 * - Note's existing content (as prompt or content to enhance)
 * - Attached documents (via transmittals)
 * - RAG-retrieved project context
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { generateNoteContentSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { generateNoteContent } from '@/lib/services/note-content-generation';
import type { GenerateNoteContentResponse } from '@/types/notes-meetings-reports';

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse and validate request body
        const body = await req.json();
        const validationResult = generateNoteContentSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const request = validationResult.data;

        // Generate content
        const result: GenerateNoteContentResponse = await generateNoteContent({
            noteId: request.noteId,
            projectId: request.projectId,
            existingContent: request.existingContent,
            existingTitle: request.existingTitle,
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('[ai/generate-note-content] Error:', error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
