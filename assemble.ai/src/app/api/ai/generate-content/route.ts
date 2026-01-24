/**
 * AI Content Generation API
 * POST /api/ai/generate-content
 *
 * Feature 021 - Notes, Meetings & Reports - Phase 6 (User Story 4)
 *
 * Generates AI content for meeting agenda or report sections based on:
 * - Starred notes within the reporting period
 * - Procurement documents (RFT, Addendum, TRR, Evaluation)
 * - Project context (details, objectives)
 * - Existing content (if enhancing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { generateContentSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { generateSectionContent } from '@/lib/services/ai-content-generation';
import type { GenerateContentResponse } from '@/types/notes-meetings-reports';

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse and validate request body
        const body = await req.json();
        const validationResult = generateContentSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const request = validationResult.data;

        // Generate content
        const result: GenerateContentResponse = await generateSectionContent({
            projectId: request.projectId,
            sectionKey: request.sectionKey,
            sectionLabel: request.sectionLabel,
            contextType: request.contextType,
            contextId: request.contextId,
            reportingPeriodStart: request.reportingPeriodStart,
            reportingPeriodEnd: request.reportingPeriodEnd,
            existingContent: request.existingContent,
            stakeholderId: request.stakeholderId,
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('[ai/generate-content] Error:', error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
