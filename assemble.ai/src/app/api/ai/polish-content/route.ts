/**
 * AI Content Polish API
 * POST /api/ai/polish-content
 *
 * Feature 021 - Notes, Meetings & Reports - Phase 6 (User Story 4)
 *
 * Polishes and refines existing content using AI to improve:
 * - Clarity and readability
 * - Grammar and spelling
 * - Professional tone
 * - Formatting consistency
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { polishContentSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { polishContent } from '@/lib/services/ai-content-generation';
import type { PolishContentResponse } from '@/types/notes-meetings-reports';

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse and validate request body
        const body = await req.json();
        const validationResult = polishContentSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const request = validationResult.data;

        // Polish content
        const result: PolishContentResponse = await polishContent({
            content: request.content,
            sectionKey: request.sectionKey,
            tone: request.tone,
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('[ai/polish-content] Error:', error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
