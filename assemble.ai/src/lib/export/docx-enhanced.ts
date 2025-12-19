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

// Heading colors (same as editor)
const HEADING_COLORS = {
  H1: '5B9BD5', // Professional Blue (without #)
  H2: '70AD47', // Fresh Green
  H3: 'C65D00', // Orange (matching transmittal section)
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

  // Process header row if present
  const thead = element.querySelector('thead');
  if (thead) {
    const ths = thead.querySelectorAll('th');
    if (ths.length > 0) {
      const headerCells: TableCell[] = [];
      ths.forEach(th => {
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
              }),
            ],
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
        const isBold = cell.querySelector('strong') !== null || isHeader;

        rowCells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell.textContent?.trim() || '',
                    bold: isBold,
                  }),
                ],
              }),
            ],
            // Apply gray background to first column for label-style tables
            ...(isFirstCol && cells.length === 2 ? {
              shading: {
                type: ShadingType.SOLID,
                color: 'F5F5F5',
                fill: 'F5F5F5',
              },
            } : {}),
          })
        );
      });
      rows.push(new TableRow({ children: rowCells }));
    }
  });

  // Return null if no rows (caller should handle this)
  if (rows.length === 0) {
    return null;
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    },
  });
}

/**
 * Create transmittal table with proper columns
 */
function createTransmittalTable(element: Element): Table | null {
  const rows: TableRow[] = [];

  // Get header row
  const thead = element.querySelector('thead');
  if (thead) {
    const ths = thead.querySelectorAll('th');
    const headerCells: TableCell[] = [];

    ths.forEach((th, index) => {
      const text = th.textContent?.trim() || '';
      // Column widths: #=8%, Document=40%, Rev=10%, Category=21%, Subcategory=21%
      const widths = [8, 40, 10, 21, 21];

      headerCells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: text,
                  bold: true,
                  color: '666666',
                }),
              ],
              alignment: index === 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
            }),
          ],
          width: { size: widths[index] || 20, type: WidthType.PERCENTAGE },
          shading: {
            type: ShadingType.SOLID,
            color: 'F5F5F5',
            fill: 'F5F5F5',
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

    trs.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      const cells: TableCell[] = [];
      const widths = [8, 40, 10, 21, 21];

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
            width: { size: widths[index] || 20, type: WidthType.PERCENTAGE },
          })
        );
      });

      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }));
      }
    });
  }

  // Return null if no rows (caller should handle this)
  if (rows.length === 0) {
    return null;
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    },
  });
}

/**
 * Process a div element and its children
 */
function processDiv(element: Element, children: (Paragraph | Table)[]): void {
  const className = element.className || '';

  // Process each child element
  element.childNodes.forEach(node => {
    if (node.nodeType !== 1) return; // Skip non-element nodes

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
      // Content div - extract text
      const text = processTextContent(child);
      if (text.trim()) {
        // Split by newlines and create paragraphs
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
    } else if (tagName === 'p') {
      const text = child.textContent?.trim() || '';
      if (text) {
        children.push(
          new Paragraph({
            text: text,
            spacing: { after: 120 },
          })
        );
      }
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
