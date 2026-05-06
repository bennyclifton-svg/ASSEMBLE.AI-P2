import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, inArray } from 'drizzle-orm';
import {
    correspondence,
    correspondenceAttachments,
    correspondenceThreads,
    db,
} from '@/lib/db';
import { ensureProjectInbox } from '@/lib/correspondence/ingest';
import type { CorrespondenceView } from '@/types/correspondence';

export const runtime = 'nodejs';

interface RouteParams {
    params: Promise<{ projectId: string }>;
}

function toIso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    return value;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId } = await params;
        const inbox = await ensureProjectInbox(projectId);

        const rows = await db
            .select({
                id: correspondence.id,
                threadId: correspondence.threadId,
                subject: correspondence.subject,
                normalizedSubject: correspondenceThreads.normalizedSubject,
                fromName: correspondence.fromName,
                fromEmail: correspondence.fromEmail,
                toEmails: correspondence.toEmails,
                ccEmails: correspondence.ccEmails,
                bodyText: correspondence.bodyText,
                correspondenceType: correspondence.correspondenceType,
                classificationStatus: correspondence.classificationStatus,
                receivedAt: correspondence.receivedAt,
                sentAt: correspondence.sentAt,
            })
            .from(correspondence)
            .innerJoin(correspondenceThreads, eq(correspondence.threadId, correspondenceThreads.id))
            .where(eq(correspondence.projectId, projectId))
            .orderBy(desc(correspondence.receivedAt))
            .limit(200);

        const ids = rows.map((row) => row.id);
        const attachmentRows = ids.length
            ? await db
                .select({
                    id: correspondenceAttachments.id,
                    correspondenceId: correspondenceAttachments.correspondenceId,
                    documentId: correspondenceAttachments.documentId,
                    fileAssetId: correspondenceAttachments.fileAssetId,
                    originalName: correspondenceAttachments.originalName,
                    mimeType: correspondenceAttachments.mimeType,
                    sizeBytes: correspondenceAttachments.sizeBytes,
                })
                .from(correspondenceAttachments)
                .where(inArray(correspondenceAttachments.correspondenceId, ids))
            : [];

        const attachmentsByCorrespondence = new Map<string, typeof attachmentRows>();
        for (const attachment of attachmentRows) {
            const current = attachmentsByCorrespondence.get(attachment.correspondenceId) || [];
            current.push(attachment);
            attachmentsByCorrespondence.set(attachment.correspondenceId, current);
        }

        const items: CorrespondenceView[] = rows.map((row) => {
            const attachments = attachmentsByCorrespondence.get(row.id) || [];
            return {
                ...row,
                toEmails: row.toEmails || [],
                ccEmails: row.ccEmails || [],
                receivedAt: toIso(row.receivedAt),
                sentAt: toIso(row.sentAt),
                attachmentCount: attachments.length,
                attachments: attachments.map((attachment) => ({
                    id: attachment.id,
                    documentId: attachment.documentId,
                    fileAssetId: attachment.fileAssetId,
                    originalName: attachment.originalName,
                    mimeType: attachment.mimeType,
                    sizeBytes: attachment.sizeBytes,
                })),
            };
        });

        return NextResponse.json({ inbox, correspondence: items });
    } catch (error) {
        console.error('[GET correspondence] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch correspondence' }, { status: 500 });
    }
}
