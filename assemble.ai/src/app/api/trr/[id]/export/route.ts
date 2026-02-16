/**
 * TRR Export API Route
 * Feature 012 - TRR Report
 *
 * POST /api/trr/[id]/export - Export TRR to PDF or Word
 * Follows the same formatting rules as the Addendum export.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    trr,
    trrTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories,
    projectDetails,
    projects,
    projectStakeholders,
    consultants,
    contractors,
    evaluations,
    evaluationRows,
    evaluationNonPriceCriteria,
    evaluationNonPriceCells,
    addenda,
} from '@/lib/db';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { exportToPDF } from '@/lib/export/pdf-enhanced';
import { exportToDOCX } from '@/lib/export/docx-enhanced';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const { format } = body;

        // Validate format
        if (!format || !['pdf', 'docx'].includes(format)) {
            return NextResponse.json(
                { error: 'Invalid format. Must be "pdf" or "docx"' },
                { status: 400 }
            );
        }

        // Fetch TRR
        const [existing] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        // Fetch project details
        const [project] = await db
            .select({ name: projects.name })
            .from(projects)
            .where(eq(projects.id, existing.projectId))
            .limit(1);

        const [details] = await db
            .select({
                projectName: projectDetails.projectName,
                address: projectDetails.address,
            })
            .from(projectDetails)
            .where(eq(projectDetails.projectId, existing.projectId))
            .limit(1);

        const projectName = details?.projectName || project?.name || 'Untitled Project';
        const address = details?.address || '';

        // Get stakeholder to determine context name and type
        let contextName = 'Unknown';
        let contextType: 'consultant' | 'contractor' = 'consultant';
        let stakeholder: { id: string; name: string; stakeholderGroup: string } | null = null;

        if (existing.stakeholderId) {
            const [sh] = await db
                .select({
                    id: projectStakeholders.id,
                    name: projectStakeholders.name,
                    stakeholderGroup: projectStakeholders.stakeholderGroup,
                })
                .from(projectStakeholders)
                .where(eq(projectStakeholders.id, existing.stakeholderId))
                .limit(1);

            if (sh) {
                stakeholder = sh;
                contextName = sh.name;
                contextType = sh.stakeholderGroup === 'consultant' ? 'consultant' : 'contractor';
            }
        }

        // TRR number from the record
        const trrNumber = existing.trrNumber || 1;

        // Format report date
        const reportDate = existing.reportDate || new Date().toISOString().split('T')[0];
        let reportDateDisplay = '';
        if (reportDate) {
            const [year, month, day] = reportDate.split('-');
            reportDateDisplay = `Report Date ${day}/${month}/${year}`;
        }

        // ── Fetch firms (tender process table) ──
        let firms: Array<{ id: string; companyName: string; contactPerson?: string | null; shortlisted: boolean }> = [];

        if (stakeholder) {
            if (contextType === 'consultant') {
                const consultantFirms = await db.query.consultants.findMany({
                    where: and(
                        eq(consultants.projectId, existing.projectId),
                        eq(consultants.discipline, stakeholder.name)
                    ),
                    orderBy: [asc(consultants.createdAt)],
                });
                firms = consultantFirms.map(c => ({
                    id: c.id,
                    companyName: c.companyName,
                    contactPerson: c.contactPerson || null,
                    shortlisted: c.shortlisted ?? false,
                }));
            } else {
                const contractorFirms = await db.query.contractors.findMany({
                    where: and(
                        eq(contractors.projectId, existing.projectId),
                        eq(contractors.trade, stakeholder.name)
                    ),
                    orderBy: [asc(contractors.createdAt)],
                });
                firms = contractorFirms.map(c => ({
                    id: c.id,
                    companyName: c.companyName,
                    contactPerson: c.contactPerson || null,
                    shortlisted: c.shortlisted ?? false,
                }));
            }
        }

        // ── Fetch addenda ──
        let addendaRows: Array<{ addendumNumber: number; summary: string; date: string | null }> = [];
        if (existing.stakeholderId) {
            const addendaList = await db
                .select()
                .from(addenda)
                .where(
                    and(
                        eq(addenda.projectId, existing.projectId),
                        eq(addenda.stakeholderId, existing.stakeholderId)
                    )
                )
                .orderBy(addenda.addendumNumber);

            addendaRows = addendaList.map(a => ({
                addendumNumber: a.addendumNumber,
                summary: a.content ? stripHtml(a.content).substring(0, 120) + (stripHtml(a.content).length > 120 ? '...' : '') : '',
                date: a.addendumDate || null,
            }));
        }

        // ── Fetch evaluation price data ──
        let evalRows: Array<{ id: string; description: string; tableType: string; orderIndex: number; cells: Array<{ firmId: string; amountCents: number }> }> = [];
        let shortlistedFirms: Array<{ id: string; companyName: string }> = [];

        if (stakeholder) {
            const evaluation = await db.query.evaluations.findFirst({
                where: and(
                    eq(evaluations.projectId, existing.projectId),
                    eq(evaluations.stakeholderId, stakeholder.id)
                ),
            });

            if (evaluation) {
                const rows = await db.query.evaluationRows.findMany({
                    where: and(
                        eq(evaluationRows.evaluationId, evaluation.id),
                        isNull(evaluationRows.evaluationPriceId)
                    ),
                    orderBy: [asc(evaluationRows.orderIndex)],
                    with: { cells: true },
                });

                evalRows = rows.map(r => ({
                    id: r.id,
                    description: r.description,
                    tableType: r.tableType,
                    orderIndex: r.orderIndex,
                    cells: (r.cells || []).map((c: { firmId: string; amountCents: number }) => ({
                        firmId: c.firmId,
                        amountCents: c.amountCents,
                    })),
                }));
            }

            shortlistedFirms = firms
                .filter(f => f.shortlisted)
                .map(f => ({ id: f.id, companyName: f.companyName }));
        }

        // ── Fetch evaluation non-price data ──
        let nonPriceCriteria: Array<{ id: string; criteriaLabel: string; orderIndex: number }> = [];
        let nonPriceCells: Array<{ criteriaId: string; firmId: string; extractedContent: string | null; qualityRating: string | null; userEditedContent: string | null; userEditedRating: string | null }> = [];

        if (stakeholder) {
            const evaluation = await db.query.evaluations.findFirst({
                where: and(
                    eq(evaluations.projectId, existing.projectId),
                    eq(evaluations.stakeholderId, stakeholder.id)
                ),
            });

            if (evaluation) {
                const criteria = await db.query.evaluationNonPriceCriteria.findMany({
                    where: eq(evaluationNonPriceCriteria.evaluationId, evaluation.id),
                    orderBy: [asc(evaluationNonPriceCriteria.orderIndex)],
                });

                nonPriceCriteria = criteria.map(c => ({
                    id: c.id,
                    criteriaLabel: c.criteriaLabel,
                    orderIndex: c.orderIndex,
                }));

                const criteriaIds = criteria.map(c => c.id);
                for (const criteriaId of criteriaIds) {
                    const cells = await db.query.evaluationNonPriceCells.findMany({
                        where: eq(evaluationNonPriceCells.criteriaId, criteriaId),
                    });
                    nonPriceCells.push(...cells.map(c => ({
                        criteriaId: c.criteriaId,
                        firmId: c.firmId,
                        extractedContent: c.extractedContent,
                        qualityRating: c.qualityRating,
                        userEditedContent: c.userEditedContent,
                        userEditedRating: c.userEditedRating,
                    })));
                }
            }
        }

        // ── Fetch transmittal documents ──
        const transmittalDocs = await db
            .select({
                originalName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                drawingNumber: fileAssets.drawingNumber,
                drawingName: fileAssets.drawingName,
                drawingRevision: fileAssets.drawingRevision,
            })
            .from(trrTransmittals)
            .innerJoin(documents, eq(trrTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(trrTransmittals.trrId, id))
            .orderBy(trrTransmittals.addedAt);

        // ── Generate HTML ──
        const documentTitle = `Tender Recommendation Report, ${contextName} ${String(trrNumber).padStart(2, '0')}`;

        const htmlContent = generateTRRHTML({
            projectName,
            address,
            documentTitle,
            reportDateDisplay,
            executiveSummary: existing.executiveSummary || '',
            firms,
            addendaRows,
            evalRows,
            shortlistedFirms,
            nonPriceCriteria,
            nonPriceCells,
            clarifications: existing.clarifications || '',
            recommendation: existing.recommendation || '',
            transmittalDocs,
        });

        // ── Generate export buffer ──
        let buffer: Buffer;
        let mimeType: string;
        let fileExtension: string;

        const title = `${projectName} - ${documentTitle}`;

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
            .substring(0, 100) || 'TRR';
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
        console.error('TRR export error:', error);
        return NextResponse.json(
            {
                error: 'Failed to export TRR',
                details: (error as Error).message,
            },
            { status: 500 }
        );
    }
}

// ════════════════════════════════════════════════════════════════════════
// HTML Generation — follows Addendum export formatting rules
// ════════════════════════════════════════════════════════════════════════

interface TransmittalDoc {
    originalName: string | null;
    versionNumber: number | null;
    categoryName: string | null;
    subcategoryName: string | null;
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
}

interface TRRHTMLParams {
    projectName: string;
    address: string;
    documentTitle: string;
    reportDateDisplay: string;
    executiveSummary: string;
    firms: Array<{ id: string; companyName: string; contactPerson?: string | null; shortlisted: boolean }>;
    addendaRows: Array<{ addendumNumber: number; summary: string; date: string | null }>;
    evalRows: Array<{ id: string; description: string; tableType: string; orderIndex: number; cells: Array<{ firmId: string; amountCents: number }> }>;
    shortlistedFirms: Array<{ id: string; companyName: string }>;
    nonPriceCriteria: Array<{ id: string; criteriaLabel: string; orderIndex: number }>;
    nonPriceCells: Array<{ criteriaId: string; firmId: string; extractedContent: string | null; qualityRating: string | null; userEditedContent: string | null; userEditedRating: string | null }>;
    clarifications: string;
    recommendation: string;
    transmittalDocs: TransmittalDoc[];
}

function generateTRRHTML(params: TRRHTMLParams): string {
    const {
        projectName, address, documentTitle, reportDateDisplay,
        executiveSummary, firms, addendaRows,
        evalRows, shortlistedFirms, nonPriceCriteria, nonPriceCells,
        clarifications, recommendation, transmittalDocs,
    } = params;

    // ── Tender Process table ──
    const tenderProcessRows = firms.length > 0
        ? firms.map((firm, i) => `
            <tr>
                <td class="num-col" style="color: #999">${i + 1}</td>
                <td>${escapeHtml(firm.companyName)}</td>
                <td>${firm.contactPerson ? escapeHtml(firm.contactPerson) : '-'}</td>
                <td style="text-align: center">${firm.shortlisted ? 'Yes' : 'No'}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="4" style="text-align: center; color: #666;">No firms</td></tr>';

    // ── Addendum table ──
    const addendumTableRows = addendaRows.length > 0
        ? addendaRows.map(a => {
            let dateDisplay = '-';
            if (a.date) {
                const [y, m, d] = a.date.split('-');
                dateDisplay = `${d}/${m}/${y}`;
            }
            return `
            <tr>
                <td class="num-col" style="color: #999">${String(a.addendumNumber).padStart(2, '0')}</td>
                <td>${escapeHtml(a.summary) || '-'}</td>
                <td style="width: 100px; text-align: right">${dateDisplay}</td>
            </tr>
            `;
        }).join('')
        : '<tr><td colspan="3" style="text-align: center; color: #666;">No addenda issued</td></tr>';

    // ── Evaluation Price table ──
    const formatCurrency = (cents: number): string => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(cents / 100);
    };

    const getCellAmount = (rowId: string, firmId: string): number => {
        for (const row of evalRows) {
            if (row.id === rowId) {
                const cell = row.cells.find(c => c.firmId === firmId);
                return cell?.amountCents || 0;
            }
        }
        return 0;
    };

    // Filter rows that have data
    const filteredEvalRows = evalRows.filter(row => {
        const hasDescription = row.description && row.description.trim() !== '';
        const hasCellValues = shortlistedFirms.some(f => getCellAmount(row.id, f.id) !== 0);
        return hasDescription || hasCellValues;
    });

    const hasEvalData = filteredEvalRows.length > 0 && shortlistedFirms.length > 0;

    let evalPriceHTML = '';
    if (hasEvalData) {
        const firmHeaders = shortlistedFirms.map(f =>
            `<th style="text-align: right; min-width: 110px">${escapeHtml(f.companyName)}</th>`
        ).join('');

        const initialRows = filteredEvalRows
            .filter(r => r.tableType === 'initial_price')
            .sort((a, b) => a.orderIndex - b.orderIndex);

        const addsSubsRows = filteredEvalRows
            .filter(r => r.tableType === 'adds_subs')
            .sort((a, b) => a.orderIndex - b.orderIndex);

        const calcSubtotal = (firmId: string, tableType: string) =>
            filteredEvalRows
                .filter(r => r.tableType === tableType)
                .reduce((sum, row) => sum + getCellAmount(row.id, firmId), 0);

        const initialRowsHTML = initialRows.map(row =>
            `<tr>
                <td>${escapeHtml(row.description)}</td>
                ${shortlistedFirms.map(f => `<td style="text-align: right">${formatCurrency(getCellAmount(row.id, f.id))}</td>`).join('')}
            </tr>`
        ).join('');

        const subtotalRowHTML = `
            <tr style="border-bottom: 1px solid #ddd">
                <td style="font-weight: 600">SUB-TOTAL</td>
                ${shortlistedFirms.map(f => `<td style="text-align: right; font-weight: 600">${formatCurrency(calcSubtotal(f.id, 'initial_price'))}</td>`).join('')}
            </tr>`;

        let addsSubsHTML = '';
        if (addsSubsRows.length > 0) {
            addsSubsHTML = `
                <tr><td colspan="${shortlistedFirms.length + 1}" style="font-weight: 500; color: #666; padding-top: 8px">Adds & Subs</td></tr>
                ${addsSubsRows.map(row =>
                    `<tr>
                        <td>${escapeHtml(row.description)}</td>
                        ${shortlistedFirms.map(f => `<td style="text-align: right">${formatCurrency(getCellAmount(row.id, f.id))}</td>`).join('')}
                    </tr>`
                ).join('')}`;
        }

        const grandTotalHTML = `
            <tr style="border-top: 1px solid #ddd">
                <td style="font-weight: 700">GRAND TOTAL</td>
                ${shortlistedFirms.map(f => {
                    const total = calcSubtotal(f.id, 'initial_price') + calcSubtotal(f.id, 'adds_subs');
                    return `<td style="text-align: right; font-weight: 700">${formatCurrency(total)}</td>`;
                }).join('')}
            </tr>`;

        evalPriceHTML = `
        <div class="content-section">
            <h3>Evaluation Price</h3>
            <table class="transmittal-table">
                <thead>
                    <tr>
                        <th style="min-width: 200px">PRICE 01</th>
                        ${firmHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${initialRowsHTML}
                    ${subtotalRowHTML}
                    ${addsSubsHTML}
                    ${grandTotalHTML}
                </tbody>
            </table>
        </div>`;
    } else {
        evalPriceHTML = `
        <div class="content-section">
            <h3>Evaluation Price</h3>
            <p style="color: #666;">No price evaluation completed</p>
        </div>`;
    }

    // ── Evaluation Non-Price table ──
    const getDisplayContent = (cell: { extractedContent: string | null; userEditedContent: string | null }) =>
        cell.userEditedContent ?? cell.extractedContent;
    const getDisplayRating = (cell: { qualityRating: string | null; userEditedRating: string | null }) =>
        cell.userEditedRating ?? cell.qualityRating;

    const hasNonPriceData = nonPriceCriteria.length > 0 && shortlistedFirms.length > 0;
    const hasAnyNonPriceEval = nonPriceCells.some(cell => getDisplayContent(cell) || getDisplayRating(cell));

    let evalNonPriceHTML = '';
    if (hasNonPriceData && hasAnyNonPriceEval) {
        const firmHeaders = shortlistedFirms.map(f =>
            `<th style="min-width: 150px">${escapeHtml(f.companyName)}</th>`
        ).join('');

        const criteriaRowsHTML = nonPriceCriteria
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(criteria => {
                const firmCells = shortlistedFirms.map(firm => {
                    const cell = nonPriceCells.find(c => c.criteriaId === criteria.id && c.firmId === firm.id);
                    const content = cell ? getDisplayContent(cell) : null;
                    const rating = cell ? getDisplayRating(cell) : null;
                    const ratingLabel = rating ? rating.charAt(0).toUpperCase() + rating.slice(1) : '';
                    const parts = [content, ratingLabel].filter(Boolean).join(' — ');
                    return `<td>${parts ? escapeHtml(parts) : '-'}</td>`;
                }).join('');
                return `<tr><td style="font-weight: 500">${escapeHtml(criteria.criteriaLabel)}</td>${firmCells}</tr>`;
            }).join('');

        evalNonPriceHTML = `
        <div class="content-section">
            <h3>Evaluation Non-Price</h3>
            <table class="transmittal-table">
                <thead>
                    <tr>
                        <th style="min-width: 140px">Criteria</th>
                        ${firmHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${criteriaRowsHTML}
                </tbody>
            </table>
        </div>`;
    } else {
        evalNonPriceHTML = `
        <div class="content-section">
            <h3>Evaluation Non-Price</h3>
            <p style="color: #666;">No non-price evaluation completed</p>
        </div>`;
    }

    // ── Transmittal table ──
    const transmittalRows = transmittalDocs.length > 0
        ? transmittalDocs.map((doc, index) => {
            const displayName = doc.drawingName || doc.originalName || 'Unknown';
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

    // ── Sanitize rich content sections ──
    const sanitizedExecSummary = executiveSummary
        ? sanitizeHtml(executiveSummary)
        : '<p style="color: #666;">No executive summary provided.</p>';

    const sanitizedClarifications = clarifications
        ? sanitizeHtml(clarifications)
        : '<p style="color: #666;">No clarifications provided.</p>';

    const sanitizedRecommendation = recommendation
        ? sanitizeHtml(recommendation)
        : '<p style="color: #666;">No recommendation provided.</p>';

    // ── Assemble full HTML ──
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
            <td><strong>${escapeHtml(documentTitle)}</strong></td>
            <td class="issued-col">${escapeHtml(reportDateDisplay)}</td>
        </tr>
    </table>

    <div class="content-section">
        <h3>Executive Summary</h3>
        <div class="content-body">${sanitizedExecSummary}</div>
    </div>

    <div class="content-section">
        <h3>Tender Process</h3>
        <table class="transmittal-table">
            <thead>
                <tr>
                    <th class="num-col">#</th>
                    <th>Company</th>
                    <th>Contact</th>
                    <th style="text-align: center; width: 80px">Shortlisted</th>
                </tr>
            </thead>
            <tbody>
                ${tenderProcessRows}
            </tbody>
        </table>
    </div>

    <div class="content-section">
        <h3>Addenda</h3>
        <table class="transmittal-table">
            <thead>
                <tr>
                    <th class="num-col">#</th>
                    <th>Summary</th>
                    <th style="width: 100px; text-align: right">Date</th>
                </tr>
            </thead>
            <tbody>
                ${addendumTableRows}
            </tbody>
        </table>
    </div>

    ${evalPriceHTML}

    ${evalNonPriceHTML}

    <div class="content-section">
        <h3>Clarifications</h3>
        <div class="content-body">${sanitizedClarifications}</div>
    </div>

    <div class="content-section">
        <h3>Recommendation</h3>
        <div class="content-body">${sanitizedRecommendation}</div>
    </div>

    <div class="transmittal-section">
        <h3>Attachments — Transmittal Document Schedule</h3>
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

// ════════════════════════════════════════════════════════════════════════
// Utility functions (same as Addendum export)
// ════════════════════════════════════════════════════════════════════════

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeHtml(html: string): string {
    let sanitized = html.replace(/<(script|iframe|object|embed|form|input|textarea|select|button)[^>]*>[\s\S]*?<\/\1>/gi, '');
    sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
    return sanitized;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}
