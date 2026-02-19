/**
 * T142: DOCX Export with Enhanced Formatting
 *
 * Exports report HTML to DOCX preserving:
 * - Project info table
 * - Content sections
 * - Transmittal table with proper columns
 * - Heading colors
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from 'docx';
import { JSDOM } from 'jsdom';
import { EXPORT_COLORS, stripHash } from './theme-config';

// Heading colors (from shared theme config)
const HEADING_COLORS = {
  H1: stripHash(EXPORT_COLORS.headings.h1),
  H2: stripHash(EXPORT_COLORS.headings.h2),
  H3: stripHash(EXPORT_COLORS.headings.h3),
} as const;

/**
 * Parse HTML color to RGB (remove # if present)
 */
function hexToRgb(hex: string): string {
  return hex.replace('#', '');
}

/**
 * Process text content, handling <br> tags
 */
function processTextContent(element: Element): string {
  let text = '';
  element.childNodes.forEach(node => {
    if (node.nodeType === 3) { // Text node
      text += node.textContent || '';
    } else if (node.nodeType === 1) { // Element node
      const el = node as Element;
      if (el.tagName.toLowerCase() === 'br') {
        text += '\n';
      } else {
        text += el.textContent || '';
      }
    }
  });
  return text;
}

/**
 * Create a generic table that handles any structure (headers, multiple columns, etc.)
 */
function createInfoTable(element: Element): Table | null {
  const rows: TableRow[] = [];
  const isProjectInfo = (element.getAttribute('class') || '').includes('project-info');
  const isEvalPrice = (element.getAttribute('class') || '').includes('eval-price');

  // Process header row if present
  const thead = element.querySelector('thead');
  const theadCols = thead ? thead.querySelectorAll('th') : null;
  const totalCols = theadCols ? theadCols.length : 0;

  if (thead && theadCols && theadCols.length > 0) {
    const headerCells: TableCell[] = [];
    theadCols.forEach((th, index) => {
      // For eval-price: description=40%, firm cols split remaining 60% equally
      let cellWidth: { size: number; type: (typeof WidthType)[keyof typeof WidthType] } | undefined;
      if (isEvalPrice && totalCols > 1) {
        cellWidth = index === 0
          ? { size: 40, type: WidthType.PERCENTAGE }
          : { size: Math.floor(60 / (totalCols - 1)), type: WidthType.PERCENTAGE };
      }

      // Detect text-align from inline style
      const style = th.getAttribute('style') || '';
      const alignMatch = style.match(/text-align:\s*(\w+)/);
      const isRightAligned = alignMatch && alignMatch[1] === 'right';

      headerCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: th.textContent?.trim() || '',
                  bold: true,
                }),
              ],
              alignment: isRightAligned ? AlignmentType.RIGHT : AlignmentType.LEFT,
            }),
          ],
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          ...(cellWidth ? { width: cellWidth } : {}),
          shading: {
            type: ShadingType.SOLID,
            color: 'F5F5F5',
            fill: 'F5F5F5',
          },
        })
      );
    });
    rows.push(new TableRow({ children: headerCells }));
  }

  // Process body rows
  const tbody = element.querySelector('tbody') || element;
  const trs = tbody.querySelectorAll('tr');

  trs.forEach(tr => {
    // Skip rows in thead (already processed)
    if (tr.closest('thead')) return;

    const cells = tr.querySelectorAll('td, th');
    if (cells.length > 0) {
      const rowCells: TableCell[] = [];
      cells.forEach((cell, index) => {
        const isFirstCol = index === 0;
        const isHeader = cell.tagName.toLowerCase() === 'th';
        const className = cell.className || '';
        const isLabelCol = className.includes('label-col');
        const isIssuedCol = className.includes('issued-col');

        // Detect bold from <strong> tags, th, or inline font-weight
        const style = cell.getAttribute('style') || '';
        const fwMatch = style.match(/font-weight:\s*(\w+)/);
        const hasInlineBold = fwMatch && (fwMatch[1] === 'bold' || fwMatch[1] === '700' || fwMatch[1] === '600');
        const isBold = cell.querySelector('strong') !== null || isHeader || !!hasInlineBold || isLabelCol;

        // Detect background-color from inline style
        const bgMatch = style.match(/background-color:\s*([^;]+)/);
        const hasBgColor = bgMatch && bgMatch[1].trim();

        // Detect text-align right from inline style
        const alignMatch = style.match(/text-align:\s*(\w+)/);
        const isRightAligned = alignMatch && alignMatch[1] === 'right';

        // Column width for eval-price: description=40%, rest split equally
        let cellWidth: { size: number; type: (typeof WidthType)[keyof typeof WidthType] } | undefined;
        if (isEvalPrice && totalCols > 1) {
          cellWidth = isFirstCol
            ? { size: 40, type: WidthType.PERCENTAGE }
            : { size: Math.floor(60 / (totalCols - 1)), type: WidthType.PERCENTAGE };
        }

        rowCells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell.textContent?.trim() || '',
                    bold: isBold,
                    color: (isLabelCol || isIssuedCol) ? '1A6FB5' : undefined,
                  }),
                ],
                alignment: (isIssuedCol || isRightAligned) ? AlignmentType.RIGHT : AlignmentType.LEFT,
              }),
            ],
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            // For project info: label column width; for generic 2-col: gray background
            ...(isProjectInfo && isFirstCol ? {
              width: { size: 18, type: WidthType.PERCENTAGE },
            } : {}),
            ...(isProjectInfo && isIssuedCol ? {
              width: { size: 22, type: WidthType.PERCENTAGE },
            } : {}),
            ...(cellWidth ? { width: cellWidth } : {}),
            ...(!isProjectInfo && isFirstCol && cells.length === 2 ? {
              shading: {
                type: ShadingType.SOLID,
                color: 'F5F5F5',
                fill: 'F5F5F5',
              },
            } : {}),
            ...(hasBgColor ? {
              shading: {
                type: ShadingType.SOLID,
                color: hexToRgb(hasBgColor),
                fill: hexToRgb(hasBgColor),
              },
            } : {}),
          })
        );
      });
      rows.push(new TableRow({ children: rowCells }));
    }
  });

  if (rows.length === 0) {
    return null;
  }

  // Project info uses subtle bottom-only borders; generic tables use grid borders
  const borderColor = isProjectInfo ? 'DDDDDD' : 'DDDDDD';
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const subtleBorder = { style: BorderStyle.SINGLE, size: 1, color: borderColor };

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: isProjectInfo ? {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: subtleBorder,
      insideVertical: noBorder,
    } : {
      top: subtleBorder,
      bottom: subtleBorder,
      left: subtleBorder,
      right: subtleBorder,
      insideHorizontal: subtleBorder,
      insideVertical: subtleBorder,
    },
  });
}

/**
 * Create transmittal table with proper columns (6 columns matching screen)
 */
function createTransmittalTable(element: Element): Table | null {
  const rows: TableRow[] = [];

  // Get header row
  const thead = element.querySelector('thead');
  if (thead) {
    const ths = thead.querySelectorAll('th');
    const headerCells: TableCell[] = [];

    // Column widths: #=5%, DWG#=10%, Name=35%, Rev=8%, Category=21%, Subcategory=21%
    const widths = [5, 10, 35, 8, 21, 21];

    ths.forEach((th, index) => {
      const text = th.textContent?.trim() || '';
      const className = th.className || '';
      const isRevCol = className.includes('rev-col');

      headerCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: text,
                  bold: true,
                  color: '333333',
                }),
              ],
              alignment: isRevCol ? AlignmentType.CENTER : AlignmentType.LEFT,
            }),
          ],
          width: { size: widths[index] || 15, type: WidthType.PERCENTAGE },
          shading: {
            type: ShadingType.SOLID,
            color: 'F8F8F8',
            fill: 'F8F8F8',
          },
        })
      );
    });

    if (headerCells.length > 0) {
      rows.push(new TableRow({ children: headerCells }));
    }
  }

  // Get data rows
  const tbody = element.querySelector('tbody');
  if (tbody) {
    const trs = tbody.querySelectorAll('tr');
    const widths = [5, 10, 35, 8, 21, 21];

    trs.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      const cells: TableCell[] = [];

      tds.forEach((td, index) => {
        const text = td.textContent?.trim() || '';

        // Extract color from style attribute
        let color: string | undefined;
        const style = td.getAttribute('style') || '';
        const colorMatch = style.match(/color:\s*([^;]+)/);
        if (colorMatch) {
          color = hexToRgb(colorMatch[1].trim());
        }

        // Check for class-based styling
        const className = td.className || '';
        const isNumCol = className.includes('num-col');
        const isRevCol = className.includes('rev-col');

        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: text,
                    color: isNumCol ? '999999' : color,
                  }),
                ],
                alignment: isRevCol ? AlignmentType.CENTER : AlignmentType.LEFT,
              }),
            ],
            width: { size: widths[index] || 15, type: WidthType.PERCENTAGE },
          })
        );
      });

      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }));
      }
    });
  }

  if (rows.length === 0) {
    return null;
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
    },
  });
}

/**
 * Extract inline text runs from an element, preserving bold/italic formatting
 */
function extractTextRuns(element: Element): TextRun[] {
  const runs: TextRun[] = [];

  element.childNodes.forEach(node => {
    if (node.nodeType === 3) {
      // Text node
      const text = node.textContent || '';
      if (text) {
        runs.push(new TextRun({ text }));
      }
    } else if (node.nodeType === 1) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === 'br') {
        runs.push(new TextRun({ text: '', break: 1 }));
      } else if (tag === 'strong' || tag === 'b') {
        const innerText = el.textContent || '';
        if (innerText) {
          runs.push(new TextRun({ text: innerText, bold: true }));
        }
      } else if (tag === 'em' || tag === 'i') {
        const innerText = el.textContent || '';
        if (innerText) {
          runs.push(new TextRun({ text: innerText, italics: true }));
        }
      } else {
        // Recurse for other inline elements (span, etc.)
        runs.push(...extractTextRuns(el));
      }
    }
  });

  return runs;
}

/**
 * Process rich HTML content recursively into DOCX paragraphs
 */
function processRichContent(element: Element, children: (Paragraph | Table)[]): void {
  element.childNodes.forEach(node => {
    // Handle text nodes directly (content not wrapped in elements)
    if (node.nodeType === 3) {
      const text = (node.textContent || '').trim();
      if (text) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text })],
            spacing: { after: 80 },
          })
        );
      }
      return;
    }

    if (node.nodeType !== 1) return;

    const child = node as Element;
    const tagName = child.tagName.toLowerCase();

    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      const text = child.textContent?.trim() || '';
      const fontSize = tagName === 'h1' ? 28 : tagName === 'h2' ? 24 : 22;
      children.push(
        new Paragraph({
          children: [new TextRun({ text, bold: true, size: fontSize })],
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (tagName === 'p') {
      const textRuns = extractTextRuns(child);
      if (textRuns.length > 0) {
        children.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 80 },
          })
        );
      }
    } else if (tagName === 'ul') {
      const items = child.querySelectorAll(':scope > li');
      items.forEach(li => {
        const textRuns = extractTextRuns(li);
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '\u2022  ' }),
              ...textRuns,
            ],
            spacing: { after: 40 },
            indent: { left: 360 },
          })
        );
      });
    } else if (tagName === 'ol') {
      const items = child.querySelectorAll(':scope > li');
      items.forEach((li, idx) => {
        const textRuns = extractTextRuns(li);
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${idx + 1}.  ` }),
              ...textRuns,
            ],
            spacing: { after: 40 },
            indent: { left: 360 },
          })
        );
      });
    } else if (tagName === 'blockquote') {
      // Blockquote — render as indented italic text
      const text = child.textContent?.trim() || '';
      if (text) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text, italics: true, color: '555555' })],
            spacing: { after: 80 },
            indent: { left: 360 },
          })
        );
      }
    } else if (tagName === 'hr') {
      // Horizontal rule — add spacing
      children.push(
        new Paragraph({ text: '', spacing: { before: 100, after: 100 } })
      );
    } else if (tagName === 'div') {
      // Recurse into divs
      processRichContent(child, children);
    } else if (tagName === 'table') {
      const table = createTransmittalTable(child);
      if (table) {
        children.push(table);
      }
    } else {
      // Fallback: render any unhandled element's text content
      const text = child.textContent?.trim() || '';
      if (text) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text })],
            spacing: { after: 80 },
          })
        );
      }
    }
  });
}

/**
 * Process a div element and its children
 */
function processDiv(element: Element, children: (Paragraph | Table)[]): void {
  // Process each child element
  element.childNodes.forEach(node => {
    if (node.nodeType !== 1) return;

    const child = node as Element;
    const tagName = child.tagName.toLowerCase();

    if (tagName === 'h3') {
      // Section heading
      const text = child.textContent?.trim() || '';
      const style = child.getAttribute('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? hexToRgb(colorMatch[1].trim()) : HEADING_COLORS.H3;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: text,
              bold: true,
              color: color,
              size: 24, // 12pt
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: {
            before: 300,
            after: 150,
          },
        })
      );
    } else if (tagName === 'div') {
      // Rich content div — parse nested HTML (bold, italic, lists)
      const className = child.className || '';
      if (className.includes('content-body')) {
        processRichContent(child, children);
      } else {
        // Fallback: extract text
        const text = processTextContent(child);
        if (text.trim()) {
          const lines = text.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            children.push(
              new Paragraph({
                text: line.trim(),
                spacing: { after: 120 },
              })
            );
          });
        }
      }
    } else if (tagName === 'p') {
      const textRuns = extractTextRuns(child);
      if (textRuns.length > 0) {
        children.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 120 },
          })
        );
      }
    } else if (tagName === 'ul') {
      const items = child.querySelectorAll(':scope > li');
      items.forEach(li => {
        const textRuns = extractTextRuns(li);
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '\u2022  ' }), ...textRuns],
            spacing: { after: 40 },
            indent: { left: 360 },
          })
        );
      });
    } else if (tagName === 'ol') {
      const items = child.querySelectorAll(':scope > li');
      items.forEach((li, idx) => {
        const textRuns = extractTextRuns(li);
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${idx + 1}.  ` }), ...textRuns],
            spacing: { after: 40 },
            indent: { left: 360 },
          })
        );
      });
    } else if (tagName === 'table') {
      const table = createTransmittalTable(child);
      if (table) {
        children.push(table);
      }
    }
  });
}

/**
 * Export report HTML to DOCX
 * Returns Buffer for Node.js compatibility
 */
export async function exportToDOCX(
  htmlContent: string,
  reportTitle: string
): Promise<Buffer> {
  // Parse HTML content using jsdom (works on server)
  const dom = new JSDOM(htmlContent);
  const htmlDoc = dom.window.document;

  const children: (Paragraph | Table)[] = [];

  // Process each element in body
  const elements = htmlDoc.body.children;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';

    if (tagName === 'table' && className.includes('project-info-table')) {
      // Project info table
      const table = createInfoTable(element);
      if (table) {
        children.push(table);
        children.push(new Paragraph({ text: '', spacing: { after: 200 } })); // Spacer
      }

    } else if (tagName === 'div' && (className.includes('content-section') || className.includes('transmittal-section'))) {
      // Content or transmittal section
      processDiv(element, children);
      children.push(new Paragraph({ text: '', spacing: { after: 200 } })); // Spacer

    } else if (tagName === 'h1') {
      const text = element.textContent || '';
      const style = element.getAttribute('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? hexToRgb(colorMatch[1].trim()) : HEADING_COLORS.H1;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: text,
              bold: true,
              color: color,
              size: 32, // 16pt
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

    } else if (tagName === 'h2') {
      const text = element.textContent || '';
      const style = element.getAttribute('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? hexToRgb(colorMatch[1].trim()) : HEADING_COLORS.H2;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: text,
              bold: true,
              color: color,
              size: 28, // 14pt
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );

    } else if (tagName === 'h3') {
      const text = element.textContent || '';
      const style = element.getAttribute('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? hexToRgb(colorMatch[1].trim()) : HEADING_COLORS.H3;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: text,
              bold: true,
              color: color,
              size: 24, // 12pt
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

    } else if (tagName === 'p') {
      const text = element.textContent || '';
      if (text.trim()) {
        children.push(
          new Paragraph({
            text: text,
            spacing: { after: 120 },
          })
        );
      }

    } else if (tagName === 'table') {
      // Generic table - check if it's a transmittal table
      const hasTransmittalClass = className.includes('transmittal-table');
      const table = hasTransmittalClass
        ? createTransmittalTable(element)
        : createInfoTable(element);
      if (table) {
        children.push(table);
      }
    }
  }

  // Create document with Arial font
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 22, // 11pt
          },
        },
        heading1: {
          run: {
            font: 'Arial',
          },
        },
        heading2: {
          run: {
            font: 'Arial',
          },
        },
        heading3: {
          run: {
            font: 'Arial',
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate Buffer for Node.js compatibility
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// ============================================================================
// MEETING EXPORT (Feature 021 - Notes, Meetings & Reports)
// ============================================================================

interface MeetingExportData {
  id: string;
  title: string;
  meetingDate: string | null;
  agendaType: string;
  sections: Array<{
    id: string;
    sectionLabel: string;
    content: string | null;
    childSections?: Array<{
      sectionLabel: string;
      content: string | null;
    }>;
  }>;
  attendees: Array<{
    adhocName: string | null;
    adhocFirm: string | null;
    isAttending: boolean;
    isDistribution: boolean;
    stakeholder?: {
      name: string;
      organization: string | null;
    } | null;
  }>;
  project?: {
    name: string;
    address?: string | null;
  } | null;
}

/**
 * Export meeting to DOCX
 * Returns Buffer for Node.js compatibility
 */
export async function exportMeetingToDOCX(
  meeting: MeetingExportData
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Meeting Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: meeting.title,
          bold: true,
          color: HEADING_COLORS.H1,
          size: 32, // 16pt
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );

  // Meeting Info Table
  const infoRows: TableRow[] = [];

  if (meeting.project?.name) {
    infoRows.push(createInfoRow('Project', meeting.project.name));
  }
  if (meeting.project?.address) {
    infoRows.push(createInfoRow('Address', meeting.project.address));
  }
  if (meeting.meetingDate) {
    const formattedDate = new Date(meeting.meetingDate).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    infoRows.push(createInfoRow('Date', formattedDate));
  }
  infoRows.push(createInfoRow('Agenda Type', meeting.agendaType.charAt(0).toUpperCase() + meeting.agendaType.slice(1)));

  if (infoRows.length > 0) {
    children.push(
      new Table({
        rows: infoRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
        },
      })
    );
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Attendees Section
  const attendeesWithData = meeting.attendees.filter(a => a.stakeholder?.name || a.adhocName);
  if (attendeesWithData.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Attendees',
            bold: true,
            color: HEADING_COLORS.H2,
            size: 28, // 14pt
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    // Attendees table
    const attendeeRows: TableRow[] = [
      // Header row
      new TableRow({
        children: [
          createHeaderCell('Name'),
          createHeaderCell('Organization'),
          createHeaderCell('Attending'),
          createHeaderCell('Distribution'),
        ],
      }),
      // Data rows
      ...attendeesWithData.map(a =>
        new TableRow({
          children: [
            createBodyCell(a.stakeholder?.name || a.adhocName || ''),
            createBodyCell(a.stakeholder?.organization || a.adhocFirm || ''),
            createBodyCell(a.isAttending ? 'Yes' : 'No', true),
            createBodyCell(a.isDistribution ? 'Yes' : 'No', true),
          ],
        })
      ),
    ];

    children.push(
      new Table({
        rows: attendeeRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
        },
      })
    );
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Agenda Sections
  if (meeting.sections.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Agenda',
            bold: true,
            color: HEADING_COLORS.H2,
            size: 28, // 14pt
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    for (const section of meeting.sections) {
      // Section label
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.sectionLabel,
              bold: true,
              color: HEADING_COLORS.H3,
              size: 24, // 12pt
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      // Section content
      if (section.content) {
        const lines = section.content.split('\n').filter(line => line.trim());
        for (const line of lines) {
          children.push(
            new Paragraph({
              text: line.trim(),
              spacing: { after: 120 },
            })
          );
        }
      }

      // Child sections
      if (section.childSections && section.childSections.length > 0) {
        for (const child of section.childSections) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `  ${child.sectionLabel}`,
                  bold: true,
                  size: 22, // 11pt
                }),
              ],
              spacing: { before: 100, after: 60 },
            })
          );

          if (child.content) {
            const lines = child.content.split('\n').filter(line => line.trim());
            for (const line of lines) {
              children.push(
                new Paragraph({
                  text: `    ${line.trim()}`,
                  spacing: { after: 80 },
                })
              );
            }
          }
        }
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 22, // 11pt
          },
        },
        heading1: { run: { font: 'Arial' } },
        heading2: { run: { font: 'Arial' } },
        heading3: { run: { font: 'Arial' } },
      },
    },
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBuffer(doc);
}

// ============================================================================
// PROJECT REPORT EXPORT (Feature 021 - Notes, Meetings & Reports)
// ============================================================================

interface ProjectReportExportData {
  id: string;
  title: string;
  reportDate: string | null;
  preparedFor: string | null;
  preparedBy: string | null;
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
  contentsType: string;
  sections: Array<{
    id: string;
    sectionLabel: string;
    content: string | null;
    childSections?: Array<{
      sectionLabel: string;
      content: string | null;
    }>;
  }>;
  project?: {
    name: string;
    address?: string | null;
  } | null;
}

/**
 * Export project report to DOCX
 * Returns Buffer for Node.js compatibility
 */
export async function exportProjectReportToDOCX(
  report: ProjectReportExportData
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Report Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: report.title,
          bold: true,
          color: HEADING_COLORS.H1,
          size: 32, // 16pt
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );

  // Report Info Table
  const infoRows: TableRow[] = [];

  if (report.project?.name) {
    infoRows.push(createInfoRow('Project', report.project.name));
  }
  if (report.project?.address) {
    infoRows.push(createInfoRow('Address', report.project.address));
  }
  if (report.preparedFor) {
    infoRows.push(createInfoRow('Prepared For', report.preparedFor));
  }
  if (report.preparedBy) {
    infoRows.push(createInfoRow('Prepared By', report.preparedBy));
  }
  if (report.reportDate) {
    const formattedDate = new Date(report.reportDate).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    infoRows.push(createInfoRow('Report Date', formattedDate));
  }
  if (report.reportingPeriodStart || report.reportingPeriodEnd) {
    const startDate = report.reportingPeriodStart
      ? new Date(report.reportingPeriodStart).toLocaleDateString('en-AU')
      : '';
    const endDate = report.reportingPeriodEnd
      ? new Date(report.reportingPeriodEnd).toLocaleDateString('en-AU')
      : '';
    infoRows.push(createInfoRow('Reporting Period', `${startDate} - ${endDate}`));
  }

  if (infoRows.length > 0) {
    children.push(
      new Table({
        rows: infoRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
        },
      })
    );
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Report Contents
  if (report.sections.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Contents',
            bold: true,
            color: HEADING_COLORS.H2,
            size: 28, // 14pt
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    for (const section of report.sections) {
      // Section label
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.sectionLabel,
              bold: true,
              color: HEADING_COLORS.H3,
              size: 24, // 12pt
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      // Section content
      if (section.content) {
        const lines = section.content.split('\n').filter(line => line.trim());
        for (const line of lines) {
          children.push(
            new Paragraph({
              text: line.trim(),
              spacing: { after: 120 },
            })
          );
        }
      }

      // Child sections
      if (section.childSections && section.childSections.length > 0) {
        for (const child of section.childSections) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `  ${child.sectionLabel}`,
                  bold: true,
                  size: 22, // 11pt
                }),
              ],
              spacing: { before: 100, after: 60 },
            })
          );

          if (child.content) {
            const lines = child.content.split('\n').filter(line => line.trim());
            for (const line of lines) {
              children.push(
                new Paragraph({
                  text: `    ${line.trim()}`,
                  spacing: { after: 80 },
                })
              );
            }
          }
        }
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 22, // 11pt
          },
        },
        heading1: { run: { font: 'Arial' } },
        heading2: { run: { font: 'Arial' } },
        heading3: { run: { font: 'Arial' } },
      },
    },
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBuffer(doc);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createInfoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                bold: true,
              }),
            ],
          }),
        ],
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: {
          type: ShadingType.SOLID,
          color: 'F5F5F5',
          fill: 'F5F5F5',
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            text: value,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        width: { size: 75, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

function createHeaderCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
          }),
        ],
      }),
    ],
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    shading: {
      type: ShadingType.SOLID,
      color: 'F5F5F5',
      fill: 'F5F5F5',
    },
  });
}

function createBodyCell(text: string, center: boolean = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        text,
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      }),
    ],
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
  });
}

// ============================================================================
// RFT NEW EXPORT - Dedicated DOCX export matching screen layout
// ============================================================================

import {
  type RFTExportData,
  type ContentBlock,
  RFT_COLORS,
  parseHtmlContent,
  generateWeekColumns,
  groupByMonth,
  isWeekInRange,
  formatDateShort,
  buildOrderedActivities,
} from './rft-export';

/**
 * Convert content blocks into docx Paragraph array with rich formatting
 */
function blocksToDocxParagraphs(blocks: ContentBlock[]): Paragraph[] {
  const paras: Paragraph[] = [];
  let isFirstHeading = true;

  for (const block of blocks) {
    if (block.type === 'heading') {
      paras.push(new Paragraph({
        children: [new TextRun({ text: block.text, bold: true, size: 17, color: RFT_COLORS.darkHex })],
        spacing: { before: isFirstHeading ? 0 : 120, after: 40 },
      }));
      isFirstHeading = false;
    } else if (block.type === 'bullet') {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: '\u2022  ', size: 15 }),
          new TextRun({ text: block.text, size: 15, color: RFT_COLORS.bodyHex }),
        ],
        spacing: { after: 20 },
        indent: { left: 180 },
      }));
    } else {
      paras.push(new Paragraph({
        children: [new TextRun({ text: block.text, size: 15, color: RFT_COLORS.bodyHex })],
        spacing: { after: 40 },
      }));
    }
  }

  return paras;
}

/**
 * Create a standard bordered table for DOCX
 */
function rftTable(rows: TableRow[], colWidths?: number[]): Table {
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
      left: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
      right: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
    },
  });
}

function rftHeaderCell(text: string, opts?: { center?: boolean; width?: number }): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: RFT_COLORS.blueHex, size: 18 })],
      alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    })],
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    ...(opts?.width ? { width: { size: opts.width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function rftLabelCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: RFT_COLORS.blueHex, size: 18 })],
    })],
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function rftValueCell(text: string, opts?: { bold?: boolean; center?: boolean; width?: number; color?: string }): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: opts?.bold, size: 18, color: opts?.color })],
      alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    })],
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    ...(opts?.width ? { width: { size: opts.width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function rftContentCell(paragraphs: Paragraph[], width?: number): TableCell {
  return new TableCell({
    children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: '-' })],
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  });
}

/**
 * Export RFT report to DOCX matching the screen layout
 */
export async function exportRFTNewToDOCX(data: RFTExportData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // ===== 1. PROJECT INFO TABLE =====
  children.push(rftTable([
    new TableRow({ children: [
      rftLabelCell('Project Name', 15),
      rftValueCell(data.projectName, { width: 85 }),
    ]}),
    new TableRow({ children: [
      rftLabelCell('Address', 15),
      rftValueCell(data.address, { width: 85 }),
    ]}),
    new TableRow({ children: [
      rftLabelCell('Document', 15),
      new TableCell({
        children: [new Paragraph({
          children: [
            new TextRun({ text: data.documentLabel, bold: true, size: 18 }),
            new TextRun({ text: `\t\tIssued ${data.issuedDate}`, bold: true, color: RFT_COLORS.blueHex, size: 18 }),
          ],
        })],
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        width: { size: 85, type: WidthType.PERCENTAGE },
      }),
    ]}),
  ]));

  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // ===== 2. OBJECTIVES SECTION =====
  children.push(new Paragraph({
    children: [new TextRun({ text: 'OBJECTIVES', bold: true, size: 20, color: RFT_COLORS.darkHex })],
    spacing: { before: 100, after: 100 },
  }));

  const fqBlocks = parseHtmlContent(data.objectives.functionalQuality);
  const pcBlocks = parseHtmlContent(data.objectives.planningCompliance);
  const fqParas = blocksToDocxParagraphs(fqBlocks);
  const pcParas = blocksToDocxParagraphs(pcBlocks);

  children.push(rftTable([
    // Header row
    new TableRow({ children: [
      rftHeaderCell('Functional & Quality', { width: 50 }),
      rftHeaderCell('Planning & Compliance', { width: 50 }),
    ]}),
    // Content row
    new TableRow({ children: [
      rftContentCell(fqParas, 50),
      rftContentCell(pcParas, 50),
    ]}),
  ]));

  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // ===== 3. BRIEF SECTION =====
  children.push(new Paragraph({
    children: [new TextRun({ text: 'BRIEF', bold: true, size: 20, color: RFT_COLORS.darkHex })],
    spacing: { before: 100, after: 100 },
  }));

  const svcBlocks = parseHtmlContent(data.brief.service);
  const delBlocks = parseHtmlContent(data.brief.deliverables);
  const svcParas = blocksToDocxParagraphs(svcBlocks);
  const delParas = blocksToDocxParagraphs(delBlocks);

  children.push(rftTable([
    new TableRow({ children: [
      rftHeaderCell('Service', { width: 50 }),
      rftHeaderCell('Deliverables', { width: 50 }),
    ]}),
    new TableRow({ children: [
      rftContentCell(svcParas, 50),
      rftContentCell(delParas, 50),
    ]}),
  ]));

  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // ===== 4. PROGRAM SECTION =====
  children.push(new Paragraph({
    children: [new TextRun({ text: 'PROGRAM', bold: true, size: 20, color: RFT_COLORS.darkHex })],
    spacing: { before: 100, after: 100 },
  }));

  const withDates = data.activities.filter(a => a.startDate && a.endDate);
  if (withDates.length > 0) {
    const allDates = withDates.flatMap(a => [new Date(a.startDate!), new Date(a.endDate!)]);
    const minD = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxD = new Date(Math.max(...allDates.map(d => d.getTime())));
    const wCols = generateWeekColumns(minD, maxD);
    const mGroups = groupByMonth(wCols);
    const ordered = buildOrderedActivities(data.activities);

    // Calculate column widths (percentages)
    const actW = 20, startW = 8, endW = 8;
    const timeW = 100 - actW - startW - endW;
    const colW = wCols.length > 0 ? timeW / wCols.length : 0;

    // Month header row (with colspan via columnSpan)
    const monthCells: TableCell[] = [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Activity', bold: true, color: RFT_COLORS.blueHex, size: 16 })] })],
        rowSpan: 2,
        width: { size: actW, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: RFT_COLORS.headerBgHex, fill: RFT_COLORS.headerBgHex },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Start', bold: true, color: RFT_COLORS.blueHex, size: 14 })], alignment: AlignmentType.CENTER })],
        rowSpan: 2,
        width: { size: startW, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: RFT_COLORS.headerBgHex, fill: RFT_COLORS.headerBgHex },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'End', bold: true, color: RFT_COLORS.blueHex, size: 14 })], alignment: AlignmentType.CENTER })],
        rowSpan: 2,
        width: { size: endW, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: RFT_COLORS.headerBgHex, fill: RFT_COLORS.headerBgHex },
      }),
    ];

    mGroups.forEach(g => {
      monthCells.push(new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: g.label, color: RFT_COLORS.mutedHex, size: 14 })], alignment: AlignmentType.CENTER })],
        columnSpan: g.count,
        shading: { type: ShadingType.SOLID, color: RFT_COLORS.headerBgHex, fill: RFT_COLORS.headerBgHex },
      }));
    });

    // Day number header row
    const dayCells: TableCell[] = wCols.map(c => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(c.dayLabel), color: RFT_COLORS.mutedHex, size: 12 })], alignment: AlignmentType.CENTER })],
      width: { size: colW, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.SOLID, color: RFT_COLORS.headerBgHex, fill: RFT_COLORS.headerBgHex },
    }));

    // Activity rows
    const actRows = ordered.map(act => {
      const isChild = !!act.parentId;
      const aS = act.startDate ? new Date(act.startDate) : null;
      const aE = act.endDate ? new Date(act.endDate) : null;

      const nameCells: TableCell[] = [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: `${isChild ? '    ' : '\u25B8 '}${act.name}`,
              bold: !isChild,
              size: 15,
              color: isChild ? RFT_COLORS.mutedHex : RFT_COLORS.darkHex,
            })],
          })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: formatDateShort(act.startDate), size: 14, color: RFT_COLORS.mutedHex })], alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: formatDateShort(act.endDate), size: 14, color: RFT_COLORS.mutedHex })], alignment: AlignmentType.CENTER })],
        }),
      ];

      const tlCells = wCols.map(c => {
        const inR = aS && aE && isWeekInRange(c.start, aS, aE);
        return new TableCell({
          children: [new Paragraph({ text: '' })],
          ...(inR ? { shading: { type: ShadingType.SOLID, color: RFT_COLORS.barHex, fill: RFT_COLORS.barHex } } : {}),
        });
      });

      return new TableRow({ children: [...nameCells, ...tlCells] });
    });

    children.push(new Table({
      rows: [
        new TableRow({ children: monthCells }),
        new TableRow({ children: dayCells }),
        ...actRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
        left: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
        right: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: RFT_COLORS.borderHex },
      },
    }));
  } else {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'No program activities with dates.', color: RFT_COLORS.mutedHex, size: 16 })],
    }));
  }

  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // ===== 5. FEE SECTION =====
  children.push(new Paragraph({
    children: [new TextRun({ text: 'FEE', bold: true, size: 20, color: RFT_COLORS.darkHex })],
    spacing: { before: 100, after: 100 },
  }));

  if (data.feeItems.length > 0) {
    const feeRows: TableRow[] = [
      new TableRow({ children: [
        rftHeaderCell('Description', { width: 66 }),
        rftHeaderCell('Amount (Excl. GST)', { width: 34 }),
      ]}),
      ...data.feeItems.map(f => new TableRow({ children: [
        rftValueCell(f.activity, { width: 66 }),
        rftValueCell('$', { width: 34, color: RFT_COLORS.mutedHex }),
      ]})),
    ];
    children.push(rftTable(feeRows));
  } else {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'No cost plan items.', color: RFT_COLORS.mutedHex, size: 16 })],
    }));
  }

  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // ===== 6. TRANSMITTAL SECTION =====
  children.push(new Paragraph({
    children: [new TextRun({ text: 'TRANSMITTAL', bold: true, size: 20, color: RFT_COLORS.darkHex })],
    spacing: { before: 100, after: 100 },
  }));

  if (data.transmittalDocs.length > 0) {
    const tRows: TableRow[] = [
      new TableRow({ children: [
        rftHeaderCell('#', { center: true, width: 5 }),
        rftHeaderCell('DWG #', { width: 12 }),
        rftHeaderCell('Name', { width: 35 }),
        rftHeaderCell('Rev', { center: true, width: 8 }),
        rftHeaderCell('Category', { width: 20 }),
        rftHeaderCell('Subcategory', { width: 20 }),
      ]}),
      ...data.transmittalDocs.map((t, i) => new TableRow({ children: [
        rftValueCell(String(i + 1), { center: true, color: RFT_COLORS.mutedHex }),
        rftValueCell(t.drawingNumber || '-'),
        rftValueCell(t.drawingName || t.originalName),
        rftValueCell(t.drawingRevision || '-', { center: true }),
        rftValueCell(t.categoryName || '-'),
        rftValueCell(t.subcategoryName || '-'),
      ]})),
    ];
    children.push(rftTable(tRows));
  } else {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'No transmittal documents attached.', color: RFT_COLORS.mutedHex, size: 16 })],
    }));
  }

  // Build document
  const docx = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } },
        heading1: { run: { font: 'Arial' } },
        heading2: { run: { font: 'Arial' } },
        heading3: { run: { font: 'Arial' } },
      },
    },
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBuffer(docx);
}
