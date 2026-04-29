/**
 * Shared "Attachments" cover sheet generator (PDF + DOCX).
 * Used by note transmittal downloads and document repository bulk downloads.
 *
 * Layout matches the standard transmittal head-up:
 *   Project Name | <code> - <name>
 *   Address      | <project address>
 *   Document     | <label, e.g. note title or "Document Selection">
 *
 *   Attachments
 *   #  DWG #  Name  Rev  Category
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    HeightRule,
    BorderStyle,
} from 'docx';

export interface CoverSheetItem {
    originalName: string | null;
    drawingNumber: string | null;
    versionNumber: number | null;
    categoryName: string | null;
    subcategoryName: string | null;
}

export interface CoverSheetData {
    projectNameLine: string;
    projectAddress: string;
    documentLabel: string;
    items: CoverSheetItem[];
}

const LABEL_BLUE: [number, number, number] = [0, 102, 204];
const TEXT_DARK: [number, number, number] = [26, 26, 26];
const BORDER_GRAY: [number, number, number] = [218, 218, 218];
const HEADER_FILL: [number, number, number] = [245, 245, 245];

const LABEL_BLUE_HEX = '0066CC';
const HEADER_FILL_HEX = 'F5F5F5';
const BORDER_GRAY_HEX = 'DADADA';

function buildTableRows(items: CoverSheetItem[]): string[][] {
    return items.map((item, index) => {
        const category = [item.categoryName, item.subcategoryName]
            .filter((part): part is string => !!part && part !== '-')
            .join(' / ') || 'Uncategorized';
        return [
            (index + 1).toString(),
            item.drawingNumber || '',
            item.originalName || 'Unknown',
            item.versionNumber ? `v${item.versionNumber}` : '',
            category,
        ];
    });
}

export function generateCoverSheetPdf(data: CoverSheetData): ArrayBuffer {
    const doc = new jsPDF();
    const labelX = 14;
    const valueX = 50;
    let y = 22;

    const drawHeaderRow = (label: string, value: string, valueBold = false) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(LABEL_BLUE[0], LABEL_BLUE[1], LABEL_BLUE[2]);
        doc.text(label, labelX, y);
        doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
        doc.setFont('helvetica', valueBold ? 'bold' : 'normal');
        doc.text(value, valueX, y);
    };

    doc.setFontSize(11);
    drawHeaderRow('Project Name', data.projectNameLine || '-');
    y += 7;
    drawHeaderRow('Address', data.projectAddress || '-');
    y += 7;
    drawHeaderRow('Document', data.documentLabel, true);

    y += 12;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text('Attachments', labelX, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        head: [['#', 'DWG #', 'Name', 'Rev', 'Category']],
        body: buildTableRows(data.items),
        styles: { fontSize: 9, lineColor: BORDER_GRAY, lineWidth: 0.1 },
        headStyles: { fillColor: HEADER_FILL, textColor: TEXT_DARK, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 28 },
            3: { cellWidth: 14, halign: 'center' },
            4: { cellWidth: 40 },
        },
    });

    return doc.output('arraybuffer');
}

const THIN_BORDER = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: BORDER_GRAY_HEX,
};

const ALL_BORDERS = {
    top: THIN_BORDER,
    bottom: THIN_BORDER,
    left: THIN_BORDER,
    right: THIN_BORDER,
};

function headerCell(label: string): TableCell {
    return new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        borders: ALL_BORDERS,
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: label,
                        bold: true,
                        color: LABEL_BLUE_HEX,
                        size: 22,
                    }),
                ],
            }),
        ],
    });
}

function valueCell(text: string, bold = false): TableCell {
    return new TableCell({
        width: { size: 72, type: WidthType.PERCENTAGE },
        borders: ALL_BORDERS,
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: text || '-',
                        bold,
                        size: 22,
                    }),
                ],
            }),
        ],
    });
}

function attachmentHeaderCell(label: string, widthPct: number): TableCell {
    return new TableCell({
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        shading: { fill: HEADER_FILL_HEX },
        borders: ALL_BORDERS,
        children: [
            new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 20 })],
            }),
        ],
    });
}

function attachmentBodyCell(text: string, widthPct: number, alignCenter = false): TableCell {
    return new TableCell({
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        borders: ALL_BORDERS,
        children: [
            new Paragraph({
                alignment: alignCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: [new TextRun({ text: text || '', size: 20 })],
            }),
        ],
    });
}

export async function generateCoverSheetDocx(data: CoverSheetData): Promise<Buffer> {
    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [headerCell('Project Name'), valueCell(data.projectNameLine || '-')],
            }),
            new TableRow({
                children: [headerCell('Address'), valueCell(data.projectAddress || '-')],
            }),
            new TableRow({
                children: [headerCell('Document'), valueCell(data.documentLabel, true)],
            }),
        ],
    });

    const COL_WIDTHS = { num: 6, dwg: 18, name: 44, rev: 8, cat: 24 };

    const attachmentsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                tableHeader: true,
                children: [
                    attachmentHeaderCell('#', COL_WIDTHS.num),
                    attachmentHeaderCell('DWG #', COL_WIDTHS.dwg),
                    attachmentHeaderCell('Name', COL_WIDTHS.name),
                    attachmentHeaderCell('Rev', COL_WIDTHS.rev),
                    attachmentHeaderCell('Category', COL_WIDTHS.cat),
                ],
            }),
            ...buildTableRows(data.items).map(
                (row) =>
                    new TableRow({
                        height: { value: 280, rule: HeightRule.ATLEAST },
                        children: [
                            attachmentBodyCell(row[0], COL_WIDTHS.num, true),
                            attachmentBodyCell(row[1], COL_WIDTHS.dwg),
                            attachmentBodyCell(row[2], COL_WIDTHS.name),
                            attachmentBodyCell(row[3], COL_WIDTHS.rev, true),
                            attachmentBodyCell(row[4], COL_WIDTHS.cat),
                        ],
                    })
            ),
        ],
    });

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: 'Calibri', size: 22 },
                },
            },
        },
        sections: [
            {
                properties: {},
                children: [
                    headerTable,
                    new Paragraph({ children: [new TextRun({ text: '' })] }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Attachments', bold: true, size: 26 }),
                        ],
                    }),
                    attachmentsTable,
                ],
            },
        ],
    });

    return Packer.toBuffer(doc);
}
