import { NextRequest, NextResponse } from 'next/server';
import {
    collectRecipientEmails,
    ingestInboundCorrespondence,
    resolveProjectInboxByRecipients,
} from '@/lib/correspondence/ingest';
import type { InboundCorrespondenceInput } from '@/types/correspondence';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json() as InboundCorrespondenceInput;
        const inbox = await resolveProjectInboxByRecipients(collectRecipientEmails(payload));

        if (!inbox) {
            return NextResponse.json(
                { error: 'No project inbox matched the recipient address.' },
                { status: 404 }
            );
        }

        const result = await ingestInboundCorrespondence(payload, inbox.projectId);

        return NextResponse.json(
            { success: true, projectId: inbox.projectId, ...result },
            { status: result.idempotent ? 200 : 201 }
        );
    } catch (error) {
        console.error('[POST correspondence inbound] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to ingest correspondence' },
            { status: 400 }
        );
    }
}
