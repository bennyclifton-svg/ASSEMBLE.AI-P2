import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { correspondence, db } from '@/lib/db';
import {
    CORRESPONDENCE_CLASSIFICATION_STATUSES,
    CORRESPONDENCE_TYPES,
    type CorrespondenceClassificationStatus,
    type CorrespondenceType,
} from '@/types/correspondence';

export const runtime = 'nodejs';

interface RouteParams {
    params: Promise<{ projectId: string; id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId, id } = await params;
        const body = await request.json();
        const updates: {
            correspondenceType?: CorrespondenceType;
            classificationStatus?: CorrespondenceClassificationStatus;
            updatedAt: Date;
        } = { updatedAt: new Date() };

        if (body.correspondenceType !== undefined) {
            if (!CORRESPONDENCE_TYPES.includes(body.correspondenceType)) {
                return NextResponse.json({ error: 'Invalid correspondence type' }, { status: 400 });
            }
            updates.correspondenceType = body.correspondenceType;
        }

        if (body.classificationStatus !== undefined) {
            if (!CORRESPONDENCE_CLASSIFICATION_STATUSES.includes(body.classificationStatus)) {
                return NextResponse.json({ error: 'Invalid classification status' }, { status: 400 });
            }
            updates.classificationStatus = body.classificationStatus;
        }

        const [updated] = await db
            .update(correspondence)
            .set(updates)
            .where(and(eq(correspondence.id, id), eq(correspondence.projectId, projectId)))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Correspondence not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('[PATCH correspondence] Error:', error);
        return NextResponse.json({ error: 'Failed to update correspondence' }, { status: 500 });
    }
}
