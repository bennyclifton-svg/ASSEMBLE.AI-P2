import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { getFileFromStorage } from '@/lib/storage';
import { rfiIssuedArtefactService } from '@/lib/rfi/issued-artefacts';
import { RfiServiceError } from '@/lib/rfi/service';

interface RouteParams {
    params: Promise<{ projectId: string; rfiId: string; exportId: string }>;
}

function serviceErrorResponse(error: unknown): NextResponse {
    if (error instanceof RfiServiceError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[rfis/:id/exports/:exportId] API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve RFI export' }, { status: 500 });
}

async function getOrganizationId(): Promise<{ organizationId: string } | NextResponse> {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    if (!authResult.user.organizationId) {
        return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
    }
    return { organizationId: authResult.user.organizationId };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const auth = await getOrganizationId();
    if (auth instanceof NextResponse) return auth;

    const { projectId, rfiId, exportId } = await params;

    try {
        const { artefact, storagePath } = await rfiIssuedArtefactService.getFile({
            exportId,
            id: rfiId,
            projectId,
            organizationId: auth.organizationId,
        });
        const file = await getFileFromStorage(storagePath);
        if (!file) {
            return NextResponse.json({ error: 'RFI export file not found' }, { status: 404 });
        }

        return new NextResponse(new Uint8Array(file), {
            status: 200,
            headers: {
                'Content-Type': artefact.mimeType,
                'Content-Disposition': `attachment; filename="${artefact.filename}"`,
                'Content-Length': file.length.toString(),
            },
        });
    } catch (error) {
        return serviceErrorResponse(error);
    }
}
