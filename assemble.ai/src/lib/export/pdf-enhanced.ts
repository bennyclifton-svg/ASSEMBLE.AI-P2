/**
 * T141: PDF Export with Enhanced Formatting
 *
 * Exports report HTML to PDF preserving:
 * - Heading colors (H1: #5B9BD5, H2: #70AD47, H3: #ED7D31)
 * - Transmittal table with category colors
 * - Print-safe color adjustments (darken by 15%)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JSDOM } from 'jsdom';

// Heading colors (same as editor)
const HEADING_COLORS = {
  H1: '#5B9BD5', // Professional Blue
  H2: '#70AD47', // Fresh Green
  H3: '#ED7D31', // Warm Amber
} as const;

/**
 * Convert hex color to RGB tuple for jsPDF
 */
function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex || typeof hex !== 'string') return null;

  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Handle 3-digit hex
  const fullHex = cleanHex.length === 3
    ? cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2]
    : cleanHex;

  // Validate hex format
  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) return null;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return [r, g, b];
}

/**
 * Darken color by 15% for better print contrast
 */
function darkenColor(hex: string | undefined, percent: number = 15): string {
  // Handle undefined/null or non-hex colors
  if (!hex || typeof hex !== 'string') {
    return '#000000';
  }

  // Handle rgb() format - convert to hex
  const rgbMatch = hex.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    const r = Math.max(0, Math.floor(parseInt(rgbMatch[1]) * (1 - percent / 100)));
    const g = Math.max(0, Math.floor(parseInt(rgbMatch[2]) * (1 - percent / 100)));
    const b = Math.max(0, Math.floor(parseInt(rgbMatch[3]) * (1 - percent / 100)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Not a hex color - return as-is or default
  if (!hex.match(/^#?[0-9a-fA-F]{3,6}$/)) {
    return '#000000';
  }

  // Remove # if present
  const color = hex.replace('#', '');

  // Handle 3-digit hex
  const fullColor = color.length === 3
    ? color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
    : color;

  // Parse RGB
  const r = parseInt(fullColor.substring(0, 2), 16);
  const g = parseInt(fullColor.substring(2, 4), 16);
  const b = parseInt(fullColor.substring(4, 6), 16);

  // Darken
  const darkenedR = Math.max(0, Math.floor(r * (1 - percent / 100)));
  const darkenedG = Math.max(0, Math.floor(g * (1 - percent / 100)));
  const darkenedB = Math.max(0, Math.floor(b * (1 - percent / 100)));

  // Convert back to hex
  return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
}

/**
 * Export report HTML to PDF
 * Returns ArrayBuffer for Node.js compatibility
 */
export async function exportToPDF(
  htmlContent: string,
  reportTitle: string
): Promise<ArrayBuffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Parse HTML content using jsdom (works on server)
  const dom = new JSDOM(htmlContent);
  const htmlDoc = dom.window.document;

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Helper function to process elements recursively
  function processElement(element: Element) {
    const tagName = element.tagName.toLowerCase();

    // Check for page break
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      // Extract color from style or use default
      const style = element.getAttribute('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const color = colorMatch ? colorMatch[1].trim() : HEADING_COLORS[tagName.toUpperCase() as keyof typeof HEADING_COLORS];

      // Darken for print
      const printColor = darkenColor(color);

      // Set font based on heading level
      const fontSize = tagName === 'h1' ? 20 : tagName === 'h2' ? 16 : 14;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(printColor);

      // Add heading text
      const text = element.textContent || '';
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * (fontSize / 2) + 5;

    } else if (tagName === 'p') {
      // Paragraph
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#000000');

      const text = element.textContent || '';
      if (text.trim()) {
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * 5 + 3;
      }

    } else if (tagName === 'table') {
      // Check if this is a project-info-table or transmittal-table
      const className = element.getAttribute('class') || '';
      const isProjectInfo = className.includes('project-info');
      const isTransmittal = className.includes('transmittal');
      const isDetailsTable = className.includes('details');

      const rows: string[][] = [];
      const headerRow: string[] = [];
      // Store cell styles (colors) for transmittal tables
      const cellStyles: Array<{ row: number; col: number; textColor: [number, number, number]; fillColor?: [number, number, number] }> = [];

      // Extract header if present
      const thead = element.querySelector('thead');
      if (thead) {
        const ths = thead.querySelectorAll('th');
        ths.forEach(th => {
          headerRow.push(th.textContent || '');
        });
      }

      // Extract body rows
      const tbody = element.querySelector('tbody') || element;
      const trs = tbody.querySelectorAll('tr');
      trs.forEach((tr, rowIndex) => {
        const row: string[] = [];
        const cells = tr.querySelectorAll('td, th');
        cells.forEach((cell, colIndex) => {
          row.push(cell.textContent || '');

          // Extract cell color from inline style (for category colors)
          if (isTransmittal) {
            const style = cell.getAttribute('style') || '';
            const colorMatch = style.match(/color:\s*([^;]+)/);
            const bgColorMatch = style.match(/background-color:\s*([^;]+)/);

            if (colorMatch) {
              const hexColor = colorMatch[1].trim();
              const rgb = hexToRgb(hexColor);
              if (rgb) {
                cellStyles.push({
                  row: rowIndex,
                  col: colIndex,
                  textColor: rgb,
                  fillColor: bgColorMatch ? hexToRgb(bgColorMatch[1].trim()) || undefined : undefined,
                });
              }
            }
          }
        });
        if (row.length > 0) {
          rows.push(row);
        }
      });

      // Add table using autotable - now with consistent light styling for all tables
      if (rows.length > 0) {
        // Build cell-specific styles for transmittal tables
        const bodyCellStyles: { [key: string]: { textColor?: [number, number, number]; fillColor?: [number, number, number] } } = {};
        cellStyles.forEach(({ row, col, textColor, fillColor }) => {
          bodyCellStyles[`${row}-${col}`] = { textColor, fillColor };
        });

        autoTable(doc, {
          startY: yPosition,
          head: headerRow.length > 0 ? [headerRow] : undefined,
          body: rows,
          theme: 'grid',
          headStyles: {
            // Use consistent light gray header for all tables (matching Addendum style)
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontSize: 10,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: isProjectInfo ? 10 : 9,
          },
          columnStyles: isProjectInfo ? {
            0: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
          } : undefined,
          // Apply cell-specific colors for transmittal category columns
          didParseCell: isTransmittal ? (data) => {
            if (data.section === 'body') {
              const key = `${data.row.index}-${data.column.index}`;
              const style = bodyCellStyles[key];
              if (style) {
                if (style.textColor) {
                  data.cell.styles.textColor = style.textColor;
                }
                if (style.fillColor) {
                  data.cell.styles.fillColor = style.fillColor;
                }
              }
            }
          } : undefined,
          margin: { left: margin, right: margin },
          tableWidth: contentWidth,
        });

        // Get final Y position after table
        const finalY = (doc as any).lastAutoTable?.finalY ?? yPosition + 50;
        yPosition = finalY + 10;
      }

    } else if (tagName === 'div') {
      // Process div contents - handle text with <br> tags
      const innerHTML = element.innerHTML;

      // Check if it contains line breaks (from addendum content)
      if (innerHTML.includes('<br>')) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#000000');

        // Split by <br> tags and render each line
        const textLines = innerHTML
          .split(/<br\s*\/?>/i)
          .map(line => line.replace(/<[^>]+>/g, '').trim());

        textLines.forEach(line => {
          if (line) {
            // Check for page break
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }
            const wrapped = doc.splitTextToSize(line, contentWidth);
            doc.text(wrapped, margin, yPosition);
            yPosition += wrapped.length * 5 + 2;
          }
        });
        yPosition += 5;
      } else {
        // Process child elements
        const children = element.children;
        for (let j = 0; j < children.length; j++) {
          processElement(children[j]);
        }
      }
    }
  }

  // Process each top-level element
  const elements = htmlDoc.body.children;
  for (let i = 0; i < elements.length; i++) {
    processElement(elements[i]);
  }

  // Return as ArrayBuffer for Node.js compatibility
  return doc.output('arraybuffer');
}
