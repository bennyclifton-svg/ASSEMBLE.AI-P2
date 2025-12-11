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

  // Process each element
  const elements = htmlDoc.body.children;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
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
      // Table (transmittal)
      const rows: any[] = [];
      const tbody = element.querySelector('tbody');

      if (tbody) {
        const trs = tbody.querySelectorAll('tr');
        trs.forEach(tr => {
          const row: any[] = [];
          const tds = tr.querySelectorAll('td');
          tds.forEach(td => {
            row.push(td.textContent || '');
          });
          rows.push(row);
        });
      }

      // Add table using autotable
      if (rows.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Document Name', 'Version', 'Category']],
          body: rows,
          theme: 'grid',
          headStyles: {
            fillColor: [70, 70, 70],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 9,
          },
          margin: { left: margin, right: margin },
          tableWidth: contentWidth,
        });

        // Get final Y position after table
        const finalY = (doc as any).lastAutoTable?.finalY ?? yPosition + 50;
        yPosition = finalY + 10;
      }
    }
  }

  // Return as ArrayBuffer for Node.js compatibility
  return doc.output('arraybuffer');
}
