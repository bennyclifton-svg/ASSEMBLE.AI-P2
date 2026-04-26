/**
 * Notes Export API Route
 * Feature 021 - Notes, Meetings & Reports
 *
 * GET /api/notes/[id]/export?format=pdf|docx
 * Exports a note's title + content to PDF or DOCX with project header and attachment table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
    notes,
    projects,
    projectDetails,
    noteTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and, isNull } from 'drizzle-orm';
import { exportToPDF } from '@/lib/export/pdf-enhanced';
import { exportToDOCX } from '@/lib/export/docx-enhanced';

interface RouteContext {
    params: Promise<{ id: string }>;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildNoteHeaderHtml(
    projectCode: string | null,
    projectName: string,
    address: string | null,
    noteTitle: string,
    noteDate: string | null,
): string {
    const projectLabel = projectCode ? `${projectCode} — ${projectName}` : projectName;
    const issuedStr = noteDate
        ? (() => {
            const d = new Date(noteDate + 'T00:00:00');
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `Issued ${day}/${month}/${year}`;
        })()
        : '';

    return `
<table class="project-info" style="width:100%;border-collapse:collapse;margin-bottom:12px;">
  <tbody>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;width:18%;">Project Name</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(projectLabel)}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;width:22%;"></td>
    </tr>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;">Address</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(address || '')}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;"></td>
    </tr>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;">Document</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;font-weight:bold;">${escapeHtml(noteTitle)}</td>
      <td class="issued-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;text-align:right;">${escapeHtml(issuedStr)}</td>
    </tr>
  </tbody>
</table>
<br/>
`;
}

function buildTransmittalHtml(docs: {
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
    fileName: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
}[]): string {
    if (docs.length === 0) return '';

    const rows = docs.map((d, i) => `
    <tr>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${i + 1}</td>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${escapeHtml(d.drawingNumber || '')}</td>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${escapeHtml(d.drawingName || d.fileName || '')}</td>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${escapeHtml(d.drawingRevision || '')}</td>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${escapeHtml([d.categoryName, d.subcategoryName].filter(Boolean).join(' / '))}</td>
    </tr>`).join('');

    return `
<br/>
<h3>Attachments</h3>
<table class="transmittal" style="width:100%;border-collapse:collapse;">
  <thead>
    <tr>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:5%;">#</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:10%;">DWG #</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:45%;">Name</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:8%;">Rev</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:32%;">Category</th>
    </tr>
  </thead>
  <tbody>${rows}
  </tbody>
</table>
`;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const { id } = await context.params;

        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'pdf';

        if (!['pdf', 'docx'].includes(format)) {
            return NextResponse.json(
                { error: 'Invalid format. Must be "pdf" or "docx"' },
                { status: 400 }
            );
        }

        const [note] = await db
            .select()
            .from(notes)
            .where(
                and(
                    eq(notes.id, id),
                    eq(notes.organizationId, authResult.user.organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .limit(1);

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Fetch project and address for header table
        const [projectRow] = await db
            .select({
                projectCode: projects.code,
                projectName: projects.name,
                address: projectDetails.address,
            })
            .from(projects)
            .leftJoin(projectDetails, eq(projectDetails.projectId, projects.id))
            .where(eq(projects.id, note.projectId))
            .limit(1);

        // Fetch attached transmittal documents with full metadata
        const transmittalDocs = await db
            .select({
                drawingNumber: fileAssets.drawingNumber,
                drawingName: fileAssets.drawingName,
                drawingRevision: fileAssets.drawingRevision,
                fileName: fileAssets.originalName,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
            })
            .from(noteTransmittals)
            .innerJoin(documents, eq(noteTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(noteTransmittals.noteId, note.id))
            .orderBy(noteTransmittals.addedAt);

        const title = note.title || 'Untitled Note';
        const bodyHtml = note.content && note.content.trim().length > 0
            ? note.content
            : '<p><em>(This note is empty)</em></p>';

        const headerHtml = buildNoteHeaderHtml(
            projectRow?.projectCode ?? null,
            projectRow?.projectName ?? title,
            projectRow?.address ?? null,
            title,
            note.noteDate ?? null,
        );

        const attachmentHtml = buildTransmittalHtml(transmittalDocs);
        const fullHtml = headerHtml + bodyHtml + attachmentHtml;

        let buffer: ArrayBuffer | Buffer;
        let mimeType: string;
        let fileExtension: string;

        if (format === 'pdf') {
            buffer = await exportToPDF(fullHtml, title);
            mimeType = 'application/pdf';
            fileExtension = 'pdf';
        } else {
            buffer = await exportToDOCX(fullHtml, title);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            fileExtension = 'docx';
        }

        const sanitizedTitle = title
            .replace(/[/\\:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100) || 'Note';
        const filename = `${sanitizedTitle}.${fileExtension}`;

        const byteLength = buffer instanceof Buffer ? buffer.length : buffer.byteLength;

        return new NextResponse(new Uint8Array(buffer instanceof Buffer ? buffer : buffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': byteLength.toString(),
            },
        });
    });
}
