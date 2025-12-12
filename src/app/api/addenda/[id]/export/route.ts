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
import { addenda, addendumTransmittals, documents, versions, fileAssets, projectDetails, projects } from '@/lib/db/schema';
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
        const addendum = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, id))
            .get();

        if (!addendum) {
            return NextResponse.json(
                { error: 'Addendum not found' },
                { status: 404 }
            );
        }

        // Fetch project details
        const project = await db
            .select({
                name: projects.name,
            })
            .from(projects)
            .where(eq(projects.id, addendum.projectId))
            .get();

        const details = await db
            .select({
                projectName: projectDetails.projectName,
                address: projectDetails.address,
            })
            .from(projectDetails)
            .where(eq(projectDetails.projectId, addendum.projectId))
            .get();

        // Fetch transmittal documents
        const transmittalDocs = await db
            .select({
                originalName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                createdAt: addendumTransmittals.createdAt,
            })
            .from(addendumTransmittals)
            .innerJoin(documents, eq(addendumTransmittals.documentId, documents.id))
            .innerJoin(versions, eq(documents.latestVersionId, versions.id))
            .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .where(eq(addendumTransmittals.addendumId, id))
            .orderBy(addendumTransmittals.sortOrder);

        // Format addendum number with leading zero
        const addendumLabel = `Addendum ${String(addendum.addendumNumber).padStart(2, '0')}`;
        const projectName = details?.projectName || project?.name || 'Untitled Project';
        const address = details?.address || '';

        // Generate HTML content
        const htmlContent = generateAddendumHTML({
            projectName,
            address,
            addendumLabel,
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
    createdAt: string | null;
}

interface AddendumHTMLParams {
    projectName: string;
    address: string;
    addendumLabel: string;
    content: string;
    transmittalDocs: TransmittalDoc[];
}

function generateAddendumHTML(params: AddendumHTMLParams): string {
    const { projectName, address, addendumLabel, content, transmittalDocs } = params;

    // Generate transmittal table rows
    const transmittalRows = transmittalDocs.length > 0
        ? transmittalDocs.map(doc => `
            <tr>
                <td>${escapeHtml(doc.originalName)}</td>
                <td>${doc.versionNumber}</td>
                <td>${doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="text-align: center; color: #666;">No documents attached</td></tr>';

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
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
            border: 1px solid #ddd;
        }
        .project-info-table td:first-child {
            width: 140px;
            font-weight: bold;
            background-color: #f5f5f5;
        }
        .content-section {
            margin: 24px 0;
            padding: 16px;
            background-color: #fafafa;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        .content-section h3 {
            margin-top: 0;
            color: #444;
        }
        .transmittal-section {
            margin-top: 32px;
        }
        .transmittal-section h3 {
            color: #444;
            border-bottom: 2px solid #ddd;
            padding-bottom: 8px;
        }
        .transmittal-table {
            width: 100%;
            border-collapse: collapse;
        }
        .transmittal-table th,
        .transmittal-table td {
            padding: 10px 12px;
            text-align: left;
            border: 1px solid #ddd;
        }
        .transmittal-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .transmittal-table tr:nth-child(even) {
            background-color: #fafafa;
        }
    </style>
</head>
<body>
    <table class="project-info-table">
        <tr>
            <td>Project Name</td>
            <td>${escapeHtml(projectName)}</td>
        </tr>
        <tr>
            <td>Address</td>
            <td>${escapeHtml(address)}</td>
        </tr>
        <tr>
            <td>Document</td>
            <td><strong>${escapeHtml(addendumLabel)}</strong></td>
        </tr>
    </table>

    <div class="content-section">
        <h3>Addendum Details</h3>
        <div>${content ? escapeHtml(content).replace(/\n/g, '<br>') : '<p style="color: #666;">No content provided.</p>'}</div>
    </div>

    <div class="transmittal-section">
        <h3>Transmittal Document Schedule</h3>
        <table class="transmittal-table">
            <thead>
                <tr>
                    <th>Document</th>
                    <th>Rev</th>
                    <th>Date</th>
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
