import { NextRequest, NextResponse } from 'next/server';
import { ingestInboundCorrespondence } from '@/lib/correspondence/ingest';
import type { InboundCorrespondenceInput } from '@/types/correspondence';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RouteParams {
    params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId } = await params;
        const payload = await request.json() as InboundCorrespondenceInput;
        const result = await ingestInboundCorrespondence(payload, projectId);

        return NextResponse.json(
            { success: true, ...result },
            { status: result.idempotent ? 200 : 201 }
        );
    } catch (error) {
        console.error('[POST project correspondence inbound] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to ingest correspondence' },
            { status: 400 }
        );
    }
}
