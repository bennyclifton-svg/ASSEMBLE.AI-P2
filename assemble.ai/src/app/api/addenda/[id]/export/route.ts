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
import { getCategoryById } from '@/lib/constants/categories';

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

        // Fetch transmittal documents with category/subcategory info
        const transmittalDocs = await db
            .select({
                originalName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                categoryId: documents.categoryId,
                categoryName: categories.name,
                subcategoryId: documents.subcategoryId,
                subcategoryName: subcategories.name,
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
    categoryId: string | null;
    categoryName: string | null;
    subcategoryId: string | null;
    subcategoryName: string | null;
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

    // Generate transmittal table rows matching webpage format
    const transmittalRows = transmittalDocs.length > 0
        ? transmittalDocs.map((doc, index) => {
            // Get color from constants based on categoryId
            const category = doc.categoryId ? getCategoryById(doc.categoryId) : null;
            const categoryColor = category?.color || '#666';
            return `
            <tr>
                <td class="num-col">${index + 1}</td>
                <td>${escapeHtml(doc.originalName)}</td>
                <td class="rev-col">${String(doc.versionNumber).padStart(2, '0')}</td>
                <td style="color: ${categoryColor}">${doc.categoryName ? escapeHtml(doc.categoryName) : '-'}</td>
                <td style="color: ${categoryColor}">${doc.subcategoryName ? escapeHtml(doc.subcategoryName) : '-'}</td>
            </tr>
        `;
        }).join('')
        : '<tr><td colspan="5" style="text-align: center; color: #666;">No documents attached</td></tr>';

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
            color: #c65d00;
            border-bottom: 2px solid #c65d00;
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        .transmittal-table {
            width: 100%;
            border-collapse: collapse;
        }
        .transmittal-table th,
        .transmittal-table td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .transmittal-table th {
            background-color: #f5f5f5;
            font-weight: 600;
            color: #666;
        }
        .transmittal-table .num-col {
            width: 40px;
            color: #999;
        }
        .transmittal-table .rev-col {
            width: 60px;
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
                    <th class="num-col">#</th>
                    <th>Document</th>
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
