
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    rftNew,
    projects,
    projectDetails,
    projectObjectives,
    projectStages,
    risks,
    consultantDisciplines,
    contractorTrades,
    costLines,
    rftNewTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories
} from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
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

        // 1. Fetch RFT NEW record
        const report = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .get();

        if (!report) {
            return NextResponse.json({ error: 'RFT NEW not found' }, { status: 404 });
        }

        const projectId = report.projectId;

        // 2. Fetch Project & Details
        const project = await db
            .select({ name: projects.name })
            .from(projects)
            .where(eq(projects.id, projectId))
            .get();

        const details = await db
            .select({
                projectName: projectDetails.projectName,
                address: projectDetails.address,
            })
            .from(projectDetails)
            .where(eq(projectDetails.projectId, projectId))
            .get();

        // 3. Fetch Planning Data (Objectives, Stages, Risks)
        const objectives = await db
            .select()
            .from(projectObjectives)
            .where(eq(projectObjectives.projectId, projectId))
            .get();

        const stages = await db
            .select()
            .from(projectStages)
            .where(eq(projectStages.projectId, projectId))
            .orderBy(asc(projectStages.stageNumber))
            .all();

        const projectRisks = await db
            .select()
            .from(risks)
            .where(eq(risks.projectId, projectId))
            .orderBy(asc(risks.order))
            .all();

        // 4. Fetch Brief Data & Cost Lines
        let briefData = { service: '', deliverables: '', contextName: '' };
        let feeItems: any[] = [];
        let contextType = 'Unknown';

        if (report.disciplineId) {
            contextType = 'Discipline';
            const discipline = await db
                .select()
                .from(consultantDisciplines)
                .where(eq(consultantDisciplines.id, report.disciplineId))
                .get();

            if (discipline) {
                briefData = {
                    service: discipline.briefServices || '',
                    deliverables: discipline.briefDeliverables || '',
                    contextName: discipline.disciplineName,
                };
            }

            // Fetch Cost Lines for Discipline
            feeItems = await db
                .select({
                    id: costLines.id,
                    activity: costLines.activity,
                })
                .from(costLines)
                .where(eq(costLines.disciplineId, report.disciplineId))
                .orderBy(asc(costLines.sortOrder))
                .all();

        } else if (report.tradeId) {
            contextType = 'Trade';
            const trade = await db
                .select()
                .from(contractorTrades)
                .where(eq(contractorTrades.id, report.tradeId))
                .get();

            if (trade) {
                briefData = {
                    service: trade.scopeWorks || '',
                    deliverables: trade.scopeDeliverables || '',
                    contextName: trade.tradeName,
                };
            }

            // Fetch Cost Lines for Trade
            feeItems = await db
                .select({
                    id: costLines.id,
                    activity: costLines.activity,
                })
                .from(costLines)
                .where(eq(costLines.tradeId, report.tradeId))
                .orderBy(asc(costLines.sortOrder))
                .all();
        }

        // 5. Fetch Transmittal Documents
        const transmittalDocs = await db
            .select({
                originalName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                addedAt: rftNewTransmittals.addedAt,
            })
            .from(rftNewTransmittals)
            .innerJoin(documents, eq(rftNewTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id)) // Use leftJoin in case version is missing
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(rftNewTransmittals.rftNewId, id))
            .orderBy(asc(rftNewTransmittals.addedAt))
            .all();

        // 6. Generate HTML
        const projectName = details?.projectName || project?.name || 'Untitled Project';
        const address = details?.address || '';
        const title = `RFT NEW - ${briefData.contextName}`;

        const htmlContent = generateRFTNewHTML({
            projectName,
            address,
            title,
            objectives,
            stages,
            risks: projectRisks,
            brief: briefData,
            feeItems,
            transmittalDocs,
        });

        // 7. Generate PDF/DOCX
        let buffer: Buffer;
        let mimeType: string;
        let fileExtension: string;
        const exportTitle = `${projectName} - ${title}`;

        if (format === 'pdf') {
            const arrayBuffer = await exportToPDF(htmlContent, exportTitle);
            buffer = Buffer.from(arrayBuffer);
            mimeType = 'application/pdf';
            fileExtension = 'pdf';
        } else {
            buffer = await exportToDOCX(htmlContent, exportTitle);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            fileExtension = 'docx';
        }

        // Create filename
        const sanitizedTitle = exportTitle
            .replace(/[/\\:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100) || 'RFT_NEW';
        const filename = `${sanitizedTitle}.${fileExtension}`;

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('RFT NEW export error:', error);
        return NextResponse.json(
            {
                error: 'Failed to export RFT NEW',
                details: (error as Error).message,
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// HTML GENERATOR
// ============================================================================

interface HTMLParams {
    projectName: string;
    address: string;
    title: string;
    objectives: any;
    stages: any[];
    risks: any[];
    brief: { service: string; deliverables: string; contextName: string };
    feeItems: any[];
    transmittalDocs: any[];
}

function generateRFTNewHTML(params: HTMLParams): string {
    const { projectName, address, title, objectives, stages, risks, brief, feeItems, transmittalDocs } = params;

    const logoHtml = `<div style="margin-bottom: 20px; font-size: 24px; font-weight: bold; color: #333;">ASSEMBLE.AI</div>`;

    // 1. Objectives Rows
    const objectiveRows = `
        <tr><td class="label">Functional</td><td>${escapeHtml(objectives?.functional || '-')}</td></tr>
        <tr><td class="label">Quality</td><td>${escapeHtml(objectives?.quality || '-')}</td></tr>
        <tr><td class="label">Budget</td><td>${escapeHtml(objectives?.budget || '-')}</td></tr>
        <tr><td class="label">Program</td><td>${escapeHtml(objectives?.program || '-')}</td></tr>
    `;

    // 2. Stages Rows
    const stageRows = stages.length > 0
        ? stages.map(s => `
            <tr>
                <td>${escapeHtml(s.stageName)}</td>
                <td>${escapeHtml(s.startDate || '-')}</td>
                <td>${escapeHtml(s.endDate || '-')}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="text-align: center; color: #666;">No staging information available.</td></tr>';

    // 3. Risks Rows
    const riskRows = risks.length > 0
        ? risks.map(r => `
            <tr>
                <td style="font-weight: 500;">${escapeHtml(r.title)}</td>
                <td>
                    <div style="font-size: 11px;">L: ${r.likelihood || '-'}</div>
                    <div style="font-size: 11px;">I: ${r.impact || '-'}</div>
                </td>
                <td>${escapeHtml(r.mitigation || '-')}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="text-align: center; color: #666;">No risks identified.</td></tr>';

    // 4. Fee Rows
    const feeRows = feeItems.length > 0
        ? feeItems.map(item => `
            <tr>
                <td>${escapeHtml(item.activity)}</td>
                <td style="background-color: #fcfcfc;"></td> <!-- Empty for nomination -->
            </tr>
        `).join('')
        : '<tr><td colspan="2" style="text-align: center; color: #666;">No cost plan items found.</td></tr>';

    // 5. Transmittal Rows
    const transmittalRows = transmittalDocs.length > 0
        ? transmittalDocs.map((doc, index) => `
            <tr>
                <td style="text-align: center; color: #666;">${index + 1}</td>
                <td>${escapeHtml(doc.originalName || 'Unknown')}</td>
                <td style="text-align: center;">${String(doc.versionNumber || 0).padStart(2, '0')}</td>
                <td>${escapeHtml(doc.categoryName || '-')}</td>
                <td>${escapeHtml(doc.subcategoryName || '-')}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="5" style="text-align: center; color: #666;">No documents attached.</td></tr>';

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h3 { color: #444; border-bottom: 2px solid #ddd; padding-bottom: 8px; margin-top: 30px; text-transform: uppercase; font-size: 14px; letter-spacing: 0.5px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
        th, td { padding: 8px 10px; border: 1px solid #ddd; text-align: left; vertical-align: top; }
        th { background-color: #f5f5f5; font-weight: bold; color: #555; }
        
        .project-table td.label { width: 140px; background-color: #f5f5f5; font-weight: bold; color: #555; }
        .project-table td.value { font-size: 14px; }
        
        .section-table td.label { width: 140px; background-color: #f5f5f5; font-weight: bold; color: #555; }
        
        .fee-table th:last-child { width: 30%; }
        
        .brief-content { background-color: #fafafa; padding: 10px; border: 1px solid #eee; min-height: 40px; white-space: pre-wrap; font-size: 12px; }
    </style>
</head>
<body>
    ${logoHtml}
    
    <!-- Project Info -->
    <table class="project-table">
        <tr><td class="label">Project Name</td><td class="value">${escapeHtml(projectName)}</td></tr>
        <tr><td class="label">Address</td><td class="value">${escapeHtml(address)}</td></tr>
        <tr><td class="label">Document</td><td class="value" style="font-weight: bold;">${escapeHtml(title)}</td></tr>
    </table>

    <!-- Objectives -->
    <h3>Objectives</h3>
    <table class="section-table">
        ${objectiveRows}
    </table>

    <!-- Staging -->
    <h3>Staging</h3>
    <table>
        <thead>
            <tr>
                <th>Stage</th>
                <th>Start Date</th>
                <th>End Date</th>
            </tr>
        </thead>
        <tbody>
            ${stageRows}
        </tbody>
    </table>

    <!-- Risk -->
    <h3>Risk</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 25%;">Risk</th>
                <th style="width: 15%;">Rating</th>
                <th>Mitigation</th>
            </tr>
        </thead>
        <tbody>
            ${riskRows}
        </tbody>
    </table>

    <!-- Brief -->
    <h3>Brief</h3>
    <table class="section-table">
        <tr>
            <td class="label">Service</td>
            <td><div class="brief-content">${escapeHtml(brief.service || '-')}</div></td>
        </tr>
        <tr>
            <td class="label">Deliverables</td>
            <td><div class="brief-content">${escapeHtml(brief.deliverables || '-')}</div></td>
        </tr>
    </table>

    <!-- Fee -->
    <h3>Fee Structure</h3>
    <table class="fee-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Amount (Excl. GST)</th>
            </tr>
        </thead>
        <tbody>
            ${feeRows}
        </tbody>
    </table>

    <!-- Transmittal -->
    <h3>Transmittal Document Schedule</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th>Document</th>
                <th style="width: 8%; text-align: center;">Rev</th>
                <th style="width: 20%;">Category</th>
                <th style="width: 20%;">Subcategory</th>
            </tr>
        </thead>
        <tbody>
            ${transmittalRows}
        </tbody>
    </table>
</body>
</html>
    `.trim();
}

function escapeHtml(text: string): string {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
