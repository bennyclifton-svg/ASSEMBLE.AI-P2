/**
 * Addendum Export API Endpoint
 *
 * POST /api/addenda/[id]/export
 * - Accepts format parameter ('pdf' or 'docx')
 * - Generates addendum document with project info, content, and transmittal schedule
 * - Returns binary file with proper headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addenda, addendumTransmittals, documents, versions, fileAssets, projectDetails, projects, categories, subcategories } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { exportToPDF } from '@/lib/export/pdf-enhanced';
import { exportToDOCX } from '@/lib/export/docx-enhanced';

type RouteParams = {
    params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { format } = body;

        // Validate format
        if (!format || !['pdf', 'docx'].includes(format)) {
            return NextResponse.json(
                { error: 'Invalid format. Must be "pdf" or "docx"' },
                { status: 400 }
            );
        }

        // Fetch addendum
        const [addendum] = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .limit(1);

        if (!addendum) {
            return NextResponse.json(
                { error: 'Addendum not found' },
                { status: 404 }
            );
        }

        // Fetch project details
        const [project] = await db
            .select({
                name: projects.name,
            })
            .from(projects)
            .where(eq(projects.id, addendum.projectId))
            .limit(1);

        const [details] = await db
            .select({
                projectName: projectDetails.projectName,
                address: projectDetails.address,
            })
            .from(projectDetails)
            .where(eq(projectDetails.projectId, addendum.projectId))
            .limit(1);

        // Fetch transmittal documents with category/subcategory and drawing info
        const transmittalDocs = await db
            .select({
                originalName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                categoryId: documents.categoryId,
                categoryName: categories.name,
                subcategoryId: documents.subcategoryId,
                subcategoryName: subcategories.name,
                drawingNumber: fileAssets.drawingNumber,
                drawingName: fileAssets.drawingName,
                drawingRevision: fileAssets.drawingRevision,
            })
            .from(addendumTransmittals)
            .innerJoin(documents, eq(addendumTransmittals.documentId, documents.id))
            .innerJoin(versions, eq(documents.latestVersionId, versions.id))
            .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(addendumTransmittals.addendumId, id))
            .orderBy(addendumTransmittals.sortOrder);

        // Format addendum number with leading zero
        const addendumLabel = `Addendum ${String(addendum.addendumNumber).padStart(2, '0')}`;
        const projectName = details?.projectName || project?.name || 'Untitled Project';
        const address = details?.address || '';

        // Format issued date for display (fallback to today's date, matching screen component)
        const addendumDate = addendum.addendumDate || new Date().toISOString().split('T')[0];
        let issuedDateDisplay = '';
        if (addendumDate) {
            const [year, month, day] = addendumDate.split('-');
            issuedDateDisplay = `Issued ${day}/${month}/${year}`;
        }

        // Generate HTML content
        const htmlContent = generateAddendumHTML({
            projectName,
            address,
            addendumLabel,
            issuedDate: issuedDateDisplay,
            content: addendum.content || '',
            transmittalDocs,
        });

        // Generate export buffer
        let buffer: Buffer;
        let mimeType: string;
        let fileExtension: string;

        const title = `${projectName} - ${addendumLabel}`;

        if (format === 'pdf') {
            const arrayBuffer = await exportToPDF(htmlContent, title);
            buffer = Buffer.from(arrayBuffer);
            mimeType = 'application/pdf';
            fileExtension = 'pdf';
        } else {
            buffer = await exportToDOCX(htmlContent, title);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            fileExtension = 'docx';
        }

        // Create filename
        const sanitizedTitle = title
            .replace(/[/\\:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100) || 'Addendum';
        const filename = `${sanitizedTitle}.${fileExtension}`;

        // Return binary response
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Addendum export error:', error);
        return NextResponse.json(
            {
                error: 'Failed to export addendum',
                details: (error as Error).message,
            },
            { status: 500 }
        );
    }
}

interface TransmittalDoc {
    originalName: string;
    versionNumber: number;
    categoryId: string | null;
    categoryName: string | null;
    subcategoryId: string | null;
    subcategoryName: string | null;
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
}

interface AddendumHTMLParams {
    projectName: string;
    address: string;
    addendumLabel: string;
    issuedDate: string;
    content: string;
    transmittalDocs: TransmittalDoc[];
}

function generateAddendumHTML(params: AddendumHTMLParams): string {
    const { projectName, address, addendumLabel, issuedDate, content, transmittalDocs } = params;

    // Generate transmittal table rows matching screen layout (6 columns)
    const transmittalRows = transmittalDocs.length > 0
        ? transmittalDocs.map((doc, index) => {
            const displayName = doc.drawingName || doc.originalName;
            const rev = doc.drawingRevision || '-';
            const dwg = doc.drawingNumber || '-';
            return `
            <tr>
                <td class="num-col" style="color: #999">${index + 1}</td>
                <td class="dwg-col">${escapeHtml(dwg)}</td>
                <td>${escapeHtml(displayName)}</td>
                <td class="rev-col">${escapeHtml(rev)}</td>
                <td>${doc.categoryName ? escapeHtml(doc.categoryName) : '-'}</td>
                <td>${doc.subcategoryName ? escapeHtml(doc.subcategoryName) : '-'}</td>
            </tr>
        `;
        }).join('')
        : '<tr><td colspan="6" style="text-align: center; color: #666;">No documents attached</td></tr>';

    // Sanitize rich content (allow safe HTML tags from the editor)
    const sanitizedContent = content
        ? sanitizeHtml(content)
        : '<p style="color: #666;">No content provided.</p>';

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        .project-info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        .project-info-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
        }
        .project-info-table .label-col {
            width: 140px;
            font-weight: 500;
            color: #1a6fb5;
        }
        .project-info-table .issued-col {
            width: 180px;
            text-align: right;
            font-weight: 500;
            color: #1a6fb5;
        }
        .content-section {
            margin: 24px 0;
        }
        .content-section h3 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #333;
        }
        .content-section .content-body {
            font-size: 14px;
            line-height: 1.6;
        }
        .content-section .content-body h1,
        .content-section .content-body h2,
        .content-section .content-body h3 {
            text-transform: none;
            letter-spacing: normal;
        }
        .content-section .content-body h1 { font-size: 18px; margin: 16px 0 8px; }
        .content-section .content-body h2 { font-size: 16px; margin: 14px 0 6px; }
        .content-section .content-body h3 { font-size: 14px; margin: 12px 0 4px; }
        .content-section .content-body p { margin: 4px 0; }
        .content-section .content-body ul { margin: 4px 0; padding-left: 24px; }
        .content-section .content-body ol { margin: 4px 0; padding-left: 24px; }
        .content-section .content-body li { margin: 2px 0; }
        .transmittal-section {
            margin-top: 32px;
        }
        .transmittal-section h3 {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #333;
            margin-bottom: 8px;
        }
        .transmittal-table {
            width: 100%;
            border-collapse: collapse;
        }
        .transmittal-table th,
        .transmittal-table td {
            padding: 6px 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        .transmittal-table th {
            background-color: #f8f8f8;
            font-weight: 500;
            color: #333;
            font-size: 13px;
        }
        .transmittal-table .num-col {
            width: 35px;
            color: #999;
        }
        .transmittal-table .dwg-col {
            width: 90px;
        }
        .transmittal-table .rev-col {
            width: 50px;
            text-align: center;
        }
        .transmittal-table th.rev-col {
            text-align: center;
        }
    </style>
</head>
<body>
    <table class="project-info-table">
        <tr>
            <td class="label-col">Project Name</td>
            <td>${escapeHtml(projectName)}</td>
            <td></td>
        </tr>
        <tr>
            <td class="label-col">Address</td>
            <td>${escapeHtml(address)}</td>
            <td></td>
        </tr>
        <tr>
            <td class="label-col">Document</td>
            <td><strong>${escapeHtml(addendumLabel)}</strong></td>
            <td class="issued-col">${escapeHtml(issuedDate)}</td>
        </tr>
    </table>

    <div class="content-section">
        <h3>Addendum Details</h3>
        <div class="content-body">${sanitizedContent}</div>
    </div>

    <div class="transmittal-section">
        <h3>Transmittal Document Schedule</h3>
        <table class="transmittal-table">
            <thead>
                <tr>
                    <th class="num-col">#</th>
                    <th class="dwg-col">DWG #</th>
                    <th>Name</th>
                    <th class="rev-col">Rev</th>
                    <th>Category</th>
                    <th>Subcategory</th>
                </tr>
            </thead>
            <tbody>
                ${transmittalRows}
            </tbody>
        </table>
    </div>
</body>
</html>
    `.trim();
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize HTML from the rich text editor — allow safe tags only.
 * Strips dangerous tags (script, iframe, etc.) while preserving formatting.
 */
function sanitizeHtml(html: string): string {
    // Remove script/iframe/object/embed tags and their content
    let sanitized = html.replace(/<(script|iframe|object|embed|form|input|textarea|select|button)[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Remove event handlers
    sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    // Remove javascript: URLs
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
    return sanitized;
}
