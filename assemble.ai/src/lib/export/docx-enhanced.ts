/**
 * T142: DOCX Export with Enhanced Formatting
 *
 * Exports report HTML to DOCX preserving:
 * - Heading colors (H1: #5B9BD5, H2: #70AD47, H3: #ED7D31)
 * - Transmittal table with formatting
 * - Paragraph styles
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
} from 'docx';

// Heading colors (same as editor)
const HEADING_COLORS = {
  H1: '5B9BD5', // Professional Blue (without #)
  H2: '70AD47', // Fresh Green
  H3: 'ED7D31', // Warm Amber
} as const;

/**
 * Parse HTML color to RGB
 */
function hexToRgb(hex: string): string {
  // Remove # if present
  const color = hex.replace('#', '');
  return color;
}

/**
 * Export report HTML to DOCX
 */
export async function exportToDOCX(
  htmlContent: string,
  reportTitle: string
): Promise<Blob> {
  // Parse HTML content
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(htmlContent, 'text/html');

  const children: (Paragraph | Table)[] = [];

  // Process each element
  const elements = htmlDoc.body.children;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'h1') {
      // H1 Heading
      const text = element.textContent || '';
      const style = element.getAttribute('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? hexToRgb(colorMatch[1].trim()) : HEADING_COLORS.H1;

      children.push(
        new Paragraph({
          text: text,
          heading: HeadingLevel.HEADING_1,
          spacing: {
            before: 400,
            after: 200,
          },
          run: {
            color: color,
            bold: true,
            size: 32, // 16pt
          },
        })
      );

    } else if (tagName === 'h2') {
      // H2 Heading
      const text = element.textContent || '';
      const style = element.getAttribute('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? hexToRgb(colorMatch[1].trim()) : HEADING_COLORS.H2;

      children.push(
        new Paragraph({
          text: text,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 300,
            after: 150,
          },
          run: {
            color: color,
            bold: true,
            size: 28, // 14pt
          },
        })
      );

    } else if (tagName === 'h3') {
      // H3 Heading
      const text = element.textContent || '';
      const style = element.getAttribute('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? hexToRgb(colorMatch[1].trim()) : HEADING_COLORS.H3;

      children.push(
        new Paragraph({
          text: text,
          heading: HeadingLevel.HEADING_3,
          spacing: {
            before: 200,
            after: 100,
          },
          run: {
            color: color,
            bold: true,
            size: 24, // 12pt
          },
        })
      );

    } else if (tagName === 'p') {
      // Paragraph
      const text = element.textContent || '';
      if (text.trim()) {
        children.push(
          new Paragraph({
            text: text,
            spacing: {
              after: 120,
            },
          })
        );
      }

    } else if (tagName === 'table') {
      // Table (transmittal)
      const rows: TableRow[] = [];

      // Header row
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Document Name', run: { bold: true } })],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Version', run: { bold: true } })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Category', run: { bold: true } })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      );

      // Data rows
      const tbody = element.querySelector('tbody');
      if (tbody) {
        const trs = tbody.querySelectorAll('tr');
        trs.forEach(tr => {
          const tds = tr.querySelectorAll('td');
          const cells: TableCell[] = [];

          tds.forEach((td, index) => {
            const text = td.textContent || '';

            // Extract category color for last column
            let color = undefined;
            if (index === 2) {
              const style = td.getAttribute('style') || '';
              const colorMatch = style.match(/color:\s*([^;]+)/);
              if (colorMatch) {
                color = hexToRgb(colorMatch[1].trim());
              }
            }

            cells.push(
              new TableCell({
                children: [
                  new Paragraph({
                    text: text,
                    run: color ? { color } : undefined,
                  }),
                ],
                width: {
                  size: index === 0 ? 50 : 25,
                  type: WidthType.PERCENTAGE,
                },
              })
            );
          });

          rows.push(new TableRow({ children: cells }));
        });
      }

      children.push(
        new Table({
          rows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
          },
        })
      );
    }
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate blob
  const buffer = await Packer.toBlob(doc);
  return buffer;
}
