/**
 * Evaluation Price Export API Route
 * GET /api/evaluation/[projectId]/stakeholder/[stakeholderId]/export
 *
 * Exports evaluation price data to PDF, DOCX, or XLSX.
 * Query params: format (pdf|docx|xlsx), evaluationPriceId
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    evaluations,
    evaluationRows,
    projectStakeholders,
    consultants,
    contractors,
    projects,
    projectDetails,
} from '@/lib/db';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { exportToPDF } from '@/lib/export/pdf-enhanced';
import { exportToDOCX } from '@/lib/export/docx-enhanced';

interface RouteContext {
    params: Promise<{ projectId: string; stakeholderId: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { projectId, stakeholderId } = await context.params;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') as 'pdf' | 'docx' | 'xlsx';
        const evaluationPriceId = searchParams.get('evaluationPriceId');

        if (!format || !['pdf', 'docx', 'xlsx'].includes(format)) {
            return NextResponse.json(
                { error: 'Invalid format. Must be "pdf", "docx", or "xlsx"' },
                { status: 400 }
            );
        }

        // Fetch stakeholder
        const stakeholder = await db.query.projectStakeholders.findFirst({
            where: eq(projectStakeholders.id, stakeholderId),
        });

        if (!stakeholder) {
            return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
        }

        // Fetch project info
        const [project] = await db
            .select({ name: projects.name })
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);

        const [details] = await db
            .select({ projectName: projectDetails.projectName })
            .from(projectDetails)
            .where(eq(projectDetails.projectId, projectId))
            .limit(1);

        const projectName = details?.projectName || project?.name || 'Untitled Project';
        const contextName = stakeholder.name;
        const contextType = stakeholder.stakeholderGroup === 'consultant' ? 'consultant' : 'contractor';

        // Fetch shortlisted firms
        let shortlistedFirms: Array<{ id: string; companyName: string }> = [];

        if (contextType === 'consultant') {
            const consultantFirms = await db.query.consultants.findMany({
                where: and(
                    eq(consultants.projectId, projectId),
                    eq(consultants.discipline, stakeholder.name),
                    eq(consultants.shortlisted, true)
                ),
                orderBy: [asc(consultants.createdAt)],
            });
            shortlistedFirms = consultantFirms.map(c => ({
                id: c.id,
                companyName: c.companyName,
            }));
        } else {
            const contractorFirms = await db.query.contractors.findMany({
                where: and(
                    eq(contractors.projectId, projectId),
                    eq(contractors.trade, stakeholder.name),
                    eq(contractors.shortlisted, true)
                ),
                orderBy: [asc(contractors.createdAt)],
            });
            shortlistedFirms = contractorFirms.map(c => ({
                id: c.id,
                companyName: c.companyName,
            }));
        }

        if (shortlistedFirms.length === 0) {
            return NextResponse.json(
                { error: 'No shortlisted firms found' },
                { status: 400 }
            );
        }

        // Fetch evaluation and rows
        const evaluation = await db.query.evaluations.findFirst({
            where: and(
                eq(evaluations.projectId, projectId),
                eq(evaluations.stakeholderId, stakeholderId)
            ),
        });

        if (!evaluation) {
            return NextResponse.json(
                { error: 'Evaluation not found' },
                { status: 404 }
            );
        }

        // Fetch rows filtered by evaluationPriceId
        const rows = await db.query.evaluationRows.findMany({
            where: evaluationPriceId
                ? and(
                    eq(evaluationRows.evaluationId, evaluation.id),
                    eq(evaluationRows.evaluationPriceId, evaluationPriceId)
                )
                : and(
                    eq(evaluationRows.evaluationId, evaluation.id),
                    isNull(evaluationRows.evaluationPriceId)
                ),
            orderBy: [asc(evaluationRows.orderIndex)],
            with: { cells: true },
        });

        const evalRows = rows.map(r => ({
            id: r.id,
            description: r.description,
            tableType: r.tableType,
            orderIndex: r.orderIndex,
            cells: (r.cells || []).map((c: { firmId: string; amountCents: number }) => ({
                firmId: c.firmId,
                amountCents: c.amountCents,
            })),
        }));

        // XLSX export
        if (format === 'xlsx') {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Evaluation Price');

            const buffer = await generateXLSX(workbook, sheet, evalRows, shortlistedFirms, contextName);

            return new NextResponse(new Uint8Array(buffer), {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="Evaluation_Price_${sanitizeFilename(contextName)}.xlsx"`,
                    'Content-Length': buffer.byteLength.toString(),
                },
            });
        }

        // PDF / DOCX export
        const htmlContent = generateHTML(evalRows, shortlistedFirms, projectName, contextName);
        const title = `${projectName} - Evaluation Price, ${contextName}`;

        let responseBuffer: Buffer;
        let mimeType: string;
        let fileExtension: string;

        if (format === 'pdf') {
            const arrayBuffer = await exportToPDF(htmlContent, title);
            responseBuffer = Buffer.from(arrayBuffer);
            mimeType = 'application/pdf';
            fileExtension = 'pdf';
        } else {
            responseBuffer = await exportToDOCX(htmlContent, title);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            fileExtension = 'docx';
        }

        const filename = `Evaluation_Price_${sanitizeFilename(contextName)}.${fileExtension}`;

        return new NextResponse(new Uint8Array(responseBuffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': responseBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Evaluation export error:', error);
        return NextResponse.json(
            { error: 'Failed to export evaluation', details: (error as Error).message },
            { status: 500 }
        );
    }
}

// ════════════════════════════════════════════════════════════════════════
// HTML Generation for PDF/DOCX
// ════════════════════════════════════════════════════════════════════════

interface EvalRow {
    id: string;
    description: string;
    tableType: string;
    orderIndex: number;
    cells: Array<{ firmId: string; amountCents: number }>;
}

function generateHTML(
    evalRows: EvalRow[],
    shortlistedFirms: Array<{ id: string; companyName: string }>,
    projectName: string,
    contextName: string,
): string {
    const formatCurrency = (cents: number): string => {
        if (cents === 0) return '-';
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(cents / 100);
    };

    const getCellAmount = (rowId: string, firmId: string): number => {
        const row = evalRows.find(r => r.id === rowId);
        if (!row) return 0;
        const cell = row.cells.find(c => c.firmId === firmId);
        return cell?.amountCents || 0;
    };

    // Filter rows with data
    const filteredRows = evalRows.filter(row => {
        const hasDescription = row.description && row.description.trim() !== '';
        const hasCellValues = shortlistedFirms.some(f => getCellAmount(row.id, f.id) !== 0);
        return hasDescription || hasCellValues;
    });

    const initialRows = filteredRows
        .filter(r => r.tableType === 'initial_price')
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const addsSubsRows = filteredRows
        .filter(r => r.tableType === 'adds_subs')
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const calcSubtotal = (firmId: string, tableType: string) =>
        filteredRows
            .filter(r => r.tableType === tableType)
            .reduce((sum, row) => sum + getCellAmount(row.id, firmId), 0);

    const firmColWidth = Math.floor(400 / shortlistedFirms.length);

    // Firm column headers
    const firmHeaders = shortlistedFirms.map(f =>
        `<th style="text-align: right; width: ${firmColWidth}px; padding: 8px 12px; background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; font-size: 12px; font-weight: 600; color: #333;">${escapeHtml(f.companyName)}</th>`
    ).join('');

    // Initial price rows - check for discipline header (row with no cell values, just description)
    const initialRowsHTML = initialRows.map(row => {
        const hasValues = shortlistedFirms.some(f => getCellAmount(row.id, f.id) !== 0);
        if (!hasValues && row.description) {
            // Discipline header row
            return `<tr>
                <td style="padding: 6px 12px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;" colspan="${shortlistedFirms.length + 1}">${escapeHtml(row.description)}</td>
            </tr>`;
        }
        return `<tr>
            <td style="padding: 6px 12px; padding-left: 24px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">${escapeHtml(row.description)}</td>
            ${shortlistedFirms.map(f => `<td style="text-align: right; padding: 6px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #555;">${formatCurrency(getCellAmount(row.id, f.id))}</td>`).join('')}
        </tr>`;
    }).join('');

    // Sub-total row
    const subtotalRowHTML = `
        <tr style="border-top: 1px solid #ccc;">
            <td style="padding: 8px 12px; font-weight: 600; font-size: 13px; color: #333;">Sub-Total</td>
            ${shortlistedFirms.map(f =>
                `<td style="text-align: right; padding: 8px 12px; font-weight: 600; font-size: 13px; color: #1a6fb5;">${formatCurrency(calcSubtotal(f.id, 'initial_price'))}</td>`
            ).join('')}
        </tr>`;

    // Adds & Subs section
    let addsSubsHTML = '';
    if (addsSubsRows.length > 0) {
        const addsSubsItemsHTML = addsSubsRows.map(row =>
            `<tr>
                <td style="padding: 6px 12px; padding-left: 24px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">${escapeHtml(row.description)}</td>
                ${shortlistedFirms.map(f => `<td style="text-align: right; padding: 6px 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #555;">${formatCurrency(getCellAmount(row.id, f.id))}</td>`).join('')}
            </tr>`
        ).join('');

        const addsSubsSubtotal = `
            <tr style="border-top: 1px solid #ccc;">
                <td style="padding: 8px 12px; font-weight: 600; font-size: 13px; color: #333;">Sub-Total</td>
                ${shortlistedFirms.map(f =>
                    `<td style="text-align: right; padding: 8px 12px; font-weight: 600; font-size: 13px; color: #1a6fb5;">${formatCurrency(calcSubtotal(f.id, 'adds_subs'))}</td>`
                ).join('')}
            </tr>`;

        addsSubsHTML = `
            <tr>
                <td style="padding: 10px 12px 6px; font-weight: 600; font-size: 12px; color: #333; text-transform: uppercase; letter-spacing: 0.05em;" colspan="${shortlistedFirms.length + 1}">Adds &amp; Subs</td>
            </tr>
            ${addsSubsItemsHTML}
            ${addsSubsSubtotal}`;
    }

    // Grand total row
    const grandTotalHTML = `
        <tr style="border-top: 2px solid #333;">
            <td style="padding: 10px 12px; font-weight: 700; font-size: 14px; color: #333;">GRAND TOTAL</td>
            ${shortlistedFirms.map(f => {
                const total = calcSubtotal(f.id, 'initial_price') + calcSubtotal(f.id, 'adds_subs');
                return `<td style="text-align: right; padding: 10px 12px; font-weight: 700; font-size: 14px; color: #1a6fb5;">${formatCurrency(total)}</td>`;
            }).join('')}
        </tr>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            margin-bottom: 24px;
        }
        .header h2 {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin: 0 0 4px;
        }
        .header p {
            font-size: 12px;
            color: #666;
            margin: 0;
        }
        .eval-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>${escapeHtml(projectName)}</h2>
        <p>Evaluation Price — ${escapeHtml(contextName)}</p>
    </div>

    <table class="eval-table">
        <thead>
            <tr>
                <th style="text-align: left; width: 200px; padding: 8px 12px; background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; font-size: 12px; font-weight: 600; color: #333; text-transform: uppercase;">Price 01</th>
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
</body>
</html>
    `.trim();
}

// ════════════════════════════════════════════════════════════════════════
// XLSX Generation
// ════════════════════════════════════════════════════════════════════════

async function generateXLSX(
    workbook: import('exceljs').Workbook,
    sheet: import('exceljs').Worksheet,
    evalRows: EvalRow[],
    shortlistedFirms: Array<{ id: string; companyName: string }>,
    contextName: string,
): Promise<Buffer> {
    const getCellAmount = (rowId: string, firmId: string): number => {
        const row = evalRows.find(r => r.id === rowId);
        if (!row) return 0;
        const cell = row.cells.find(c => c.firmId === firmId);
        return cell?.amountCents || 0;
    };

    // Filter rows with data
    const filteredRows = evalRows.filter(row => {
        const hasDescription = row.description && row.description.trim() !== '';
        const hasCellValues = shortlistedFirms.some(f => getCellAmount(row.id, f.id) !== 0);
        return hasDescription || hasCellValues;
    });

    const initialRows = filteredRows
        .filter(r => r.tableType === 'initial_price')
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const addsSubsRows = filteredRows
        .filter(r => r.tableType === 'adds_subs')
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const calcSubtotal = (firmId: string, tableType: string) =>
        filteredRows
            .filter(r => r.tableType === tableType)
            .reduce((sum, row) => sum + getCellAmount(row.id, firmId), 0);

    // Column widths
    sheet.getColumn(1).width = 30;
    shortlistedFirms.forEach((_, i) => {
        sheet.getColumn(i + 2).width = 20;
    });

    const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF8F9FA' } };
    const headerFont = { bold: true, size: 11, color: { argb: 'FF333333' } };
    const currencyFormat = '$#,##0';
    const thinBorder = { style: 'thin' as const, color: { argb: 'FFDEE2E6' } };
    const accentFont = { bold: true, size: 11, color: { argb: 'FF1A6FB5' } };

    // Header row
    const headerRow = sheet.addRow(['PRICE 01', ...shortlistedFirms.map(f => f.companyName)]);
    headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.border = { bottom: { style: 'medium', color: { argb: 'FFDEE2E6' } } };
    });
    headerRow.getCell(1).alignment = { horizontal: 'left' };
    shortlistedFirms.forEach((_, i) => {
        headerRow.getCell(i + 2).alignment = { horizontal: 'right' };
    });

    // Initial price data rows
    initialRows.forEach(row => {
        const hasValues = shortlistedFirms.some(f => getCellAmount(row.id, f.id) !== 0);
        if (!hasValues && row.description) {
            // Discipline header
            const dRow = sheet.addRow([row.description]);
            dRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF333333' } };
        } else {
            const values = shortlistedFirms.map(f => {
                const amt = getCellAmount(row.id, f.id);
                return amt === 0 ? null : amt / 100;
            });
            const dRow = sheet.addRow([row.description, ...values]);
            dRow.getCell(1).alignment = { indent: 2 };
            shortlistedFirms.forEach((_, i) => {
                const cell = dRow.getCell(i + 2);
                cell.numFmt = currencyFormat;
                cell.alignment = { horizontal: 'right' };
                cell.border = { bottom: thinBorder };
            });
        }
    });

    // Sub-Total row
    const subRow = sheet.addRow([
        'Sub-Total',
        ...shortlistedFirms.map(f => calcSubtotal(f.id, 'initial_price') / 100),
    ]);
    subRow.getCell(1).font = { bold: true, size: 11 };
    shortlistedFirms.forEach((_, i) => {
        const cell = subRow.getCell(i + 2);
        cell.numFmt = currencyFormat;
        cell.font = accentFont;
        cell.alignment = { horizontal: 'right' };
        cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
    });

    // Adds & Subs section
    if (addsSubsRows.length > 0) {
        sheet.addRow([]); // Empty row separator
        const asSectionRow = sheet.addRow(['ADDS & SUBS']);
        asSectionRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF333333' } };

        addsSubsRows.forEach(row => {
            const values = shortlistedFirms.map(f => {
                const amt = getCellAmount(row.id, f.id);
                return amt === 0 ? null : amt / 100;
            });
            const dRow = sheet.addRow([row.description, ...values]);
            dRow.getCell(1).alignment = { indent: 2 };
            shortlistedFirms.forEach((_, i) => {
                const cell = dRow.getCell(i + 2);
                cell.numFmt = currencyFormat;
                cell.alignment = { horizontal: 'right' };
                cell.border = { bottom: thinBorder };
            });
        });

        // Adds & Subs Sub-Total
        const asSubRow = sheet.addRow([
            'Sub-Total',
            ...shortlistedFirms.map(f => calcSubtotal(f.id, 'adds_subs') / 100),
        ]);
        asSubRow.getCell(1).font = { bold: true, size: 11 };
        shortlistedFirms.forEach((_, i) => {
            const cell = asSubRow.getCell(i + 2);
            cell.numFmt = currencyFormat;
            cell.font = accentFont;
            cell.alignment = { horizontal: 'right' };
            cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
        });
    }

    // Grand Total row
    sheet.addRow([]); // Separator
    const grandRow = sheet.addRow([
        'GRAND TOTAL',
        ...shortlistedFirms.map(f => {
            const total = calcSubtotal(f.id, 'initial_price') + calcSubtotal(f.id, 'adds_subs');
            return total / 100;
        }),
    ]);
    grandRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF333333' } };
    shortlistedFirms.forEach((_, i) => {
        const cell = grandRow.getCell(i + 2);
        cell.numFmt = currencyFormat;
        cell.font = { bold: true, size: 12, color: { argb: 'FF1A6FB5' } };
        cell.alignment = { horizontal: 'right' };
        cell.border = { top: { style: 'medium', color: { argb: 'FF333333' } } };
    });

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
}

// ════════════════════════════════════════════════════════════════════════
// Utilities
// ════════════════════════════════════════════════════════════════════════

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeFilename(name: string): string {
    return name
        .replace(/[/\\:*?"<>|]/g, '-')
        .replace(/\s+/g, '_')
        .trim()
        .substring(0, 80) || 'Export';
}
