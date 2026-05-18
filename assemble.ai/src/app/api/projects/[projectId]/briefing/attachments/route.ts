import { NextResponse } from 'next/server';
import { isBriefingEnabled } from '@/lib/briefing/feature-flag';
import { briefingApiError, requireBriefingProjectAccess } from '@/lib/briefing/api-helpers';
import {
    attachBriefDocuments,
    detachBriefDocument,
    listBriefAttachments,
} from '@/lib/briefing/session-service';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    if (!isBriefingEnabled()) {
        return NextResponse.json({ enabled: false, documents: [] });
    }
    const access = await requireBriefingProjectAccess(projectId);
    if (access.ok === false) return access.response;

    try {
        const documents = await listBriefAttachments(projectId);
        return NextResponse.json({ enabled: true, documents });
    } catch (error) {
        return briefingApiError(error);
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    if (!isBriefingEnabled()) {
        return NextResponse.json({ error: 'Briefing is disabled' }, { status: 404 });
    }
    const access = await requireBriefingProjectAccess(projectId);
    if (access.ok === false) return access.response;

    try {
        const body = await request.json().catch(() => ({}));
        const documentIds = Array.isArray(body.documentIds)
            ? body.documentIds.filter((id: unknown): id is string => typeof id === 'string')
            : [];
        const documents = await attachBriefDocuments({
            projectId,
            userId: access.user.id,
            documentIds,
        });
        return NextResponse.json({ success: true, documents });
    } catch (error) {
        return briefingApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    if (!isBriefingEnabled()) {
        return NextResponse.json({ error: 'Briefing is disabled' }, { status: 404 });
    }
    const access = await requireBriefingProjectAccess(projectId);
    if (access.ok === false) return access.response;

    try {
        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId');
        if (!documentId) {
            return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
        }
        await detachBriefDocument({ projectId, documentId });
        const documents = await listBriefAttachments(projectId);
        return NextResponse.json({ success: true, documents });
    } catch (error) {
        return briefingApiError(error);
    }
}
