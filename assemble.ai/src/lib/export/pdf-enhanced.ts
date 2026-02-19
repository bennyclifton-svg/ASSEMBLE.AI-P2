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
import { EXPORT_COLORS } from './theme-config';

// Heading colors (from shared theme config)
const HEADING_COLORS = {
  H1: EXPORT_COLORS.headings.h1,
  H2: EXPORT_COLORS.headings.h2,
  H3: EXPORT_COLORS.headings.h3,
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
      // Paragraph - render with inline bold/italic runs
      const fullText = element.textContent || '';
      if (fullText.trim()) {
        const hasInlineFormatting = element.querySelector('strong, b, em, i') !== null;

        if (!hasInlineFormatting) {
          // Simple paragraph — no inline formatting
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor('#000000');
          const lines = doc.splitTextToSize(fullText, contentWidth);
          doc.text(lines, margin, yPosition);
          yPosition += lines.length * 5 + 3;
        } else {
          // Has inline formatting — render as segments
          // Extract text runs: [{text, bold, italic}]
          type TextRun = { text: string; bold: boolean; italic: boolean };
          const runs: TextRun[] = [];
          function extractRuns(node: ChildNode, bold: boolean, italic: boolean) {
            if (node.nodeType === 3) {
              const t = node.textContent || '';
              if (t) runs.push({ text: t, bold, italic });
            } else if (node.nodeType === 1) {
              const el = node as Element;
              const tag = el.tagName.toLowerCase();
              const isBold = bold || tag === 'strong' || tag === 'b';
              const isItalic = italic || tag === 'em' || tag === 'i';
              el.childNodes.forEach(child => extractRuns(child, isBold, isItalic));
            }
          }
          element.childNodes.forEach(child => extractRuns(child, false, false));

          // Concatenate full text for line wrapping, then render run by run
          const plainText = runs.map(r => r.text).join('');
          const wrappedLines = doc.splitTextToSize(plainText, contentWidth);
          doc.setFontSize(11);
          doc.setTextColor('#000000');

          // For multi-line paragraphs with mixed formatting, render each line
          // with the correct font style for the majority of text on that line.
          // For simplicity (jsPDF limitation), render the whole block as normal
          // weight since making it all bold is worse than losing inline bold.
          doc.setFont('helvetica', 'normal');
          doc.text(wrappedLines, margin, yPosition);
          yPosition += wrappedLines.length * 5 + 3;
        }
      }

    } else if (tagName === 'table') {
      // Check if this is a project-info-table or transmittal-table
      const className = element.getAttribute('class') || '';
      const isProjectInfo = className.includes('project-info');
      const isTransmittal = className.includes('transmittal');
      const isDetailsTable = className.includes('details');

      const rows: string[][] = [];
      const headerRow: string[] = [];
      // Store cell styles (colors, bold, fill) for body cells
      const cellStyles: Array<{ row: number; col: number; textColor?: [number, number, number]; fillColor?: [number, number, number]; fontStyle?: string }> = [];

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

          // Extract cell styles from inline CSS
          const style = cell.getAttribute('style') || '';
          const colorMatch = style.match(/(?<!background-)color:\s*([^;]+)/);
          const bgColorMatch = style.match(/background-color:\s*([^;]+)/);
          const fwMatch = style.match(/font-weight:\s*(\w+)/);

          const textColor = colorMatch ? hexToRgb(colorMatch[1].trim()) : null;
          const fillColor = bgColorMatch ? hexToRgb(bgColorMatch[1].trim()) : null;
          const isBold = fwMatch && (fwMatch[1] === 'bold' || fwMatch[1] === '700' || fwMatch[1] === '600');

          if (textColor || fillColor || isBold) {
            cellStyles.push({
              row: rowIndex,
              col: colIndex,
              ...(textColor ? { textColor } : {}),
              ...(fillColor ? { fillColor } : {}),
              ...(isBold ? { fontStyle: 'bold' } : {}),
            });
          }
        });
        if (row.length > 0) {
          rows.push(row);
        }
      });

      // Add table using autotable - now with consistent light styling for all tables
      if (rows.length > 0) {
        // Build cell-specific styles map
        const bodyCellStyles: { [key: string]: { textColor?: [number, number, number]; fillColor?: [number, number, number]; fontStyle?: string } } = {};
        cellStyles.forEach(({ row, col, textColor, fillColor, fontStyle }) => {
          bodyCellStyles[`${row}-${col}`] = { textColor, fillColor, fontStyle };
        });

        const isEvalPrice = className.includes('eval-price');
        const hasCellStyles = cellStyles.length > 0;

        // For eval-price tables, set equal widths: description col = 40%, rest split equally
        let columnStyles: Record<number, Record<string, unknown>> | undefined;
        if (isProjectInfo) {
          columnStyles = {
            0: { cellWidth: 35, fontStyle: 'bold', textColor: [26, 111, 181] },
            2: { cellWidth: 45, halign: 'right' as const, fontStyle: 'bold', textColor: [26, 111, 181] },
          };
        } else if (isEvalPrice && headerRow.length > 1) {
          const descWidth = contentWidth * 0.40;
          const firmWidth = (contentWidth - descWidth) / (headerRow.length - 1);
          columnStyles = { 0: { cellWidth: descWidth } };
          for (let c = 1; c < headerRow.length; c++) {
            columnStyles[c] = { cellWidth: firmWidth, halign: 'right' as const };
          }
        }

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
          styles: isProjectInfo ? {
            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
          } : undefined,
          bodyStyles: {
            fontSize: isProjectInfo ? 10 : 9,
          },
          columnStyles,
          // Apply cell-specific styles (bold, fill, text color) from inline CSS
          didParseCell: hasCellStyles ? (data) => {
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
                if (style.fontStyle) {
                  data.cell.styles.fontStyle = style.fontStyle as 'bold';
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

    } else if (tagName === 'ul' || tagName === 'ol') {
      // Process list items — render as normal weight (inline bold lost due to jsPDF limitation)
      const items = element.querySelectorAll(':scope > li');
      items.forEach((li: Element, idx: number) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }

        const text = li.textContent || '';
        const prefix = tagName === 'ul' ? '\u2022  ' : `${idx + 1}.  `;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#000000');

        const lines = doc.splitTextToSize(prefix + text.trim(), contentWidth - 5);
        doc.text(lines, margin + 5, yPosition);
        yPosition += lines.length * 5 + 2;
      });
      yPosition += 3;

    } else if (tagName === 'blockquote') {
      // Blockquote - render as indented italic text
      const text = element.textContent || '';
      if (text.trim()) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor('#555555');

        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        const wrapped = doc.splitTextToSize(text.trim(), contentWidth - 10);
        doc.text(wrapped, margin + 5, yPosition);
        yPosition += wrapped.length * 5 + 3;
      }

    } else if (tagName === 'hr') {
      // Horizontal rule
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setDrawColor('#cccccc');
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 5;

    } else if (tagName === 'div') {
      // Process div contents — handle both element children and text-only nodes
      const elChildren = element.children;
      if (elChildren.length > 0) {
        for (let j = 0; j < elChildren.length; j++) {
          processElement(elChildren[j]);
        }
        // Also render any direct text nodes not wrapped in elements
        element.childNodes.forEach(node => {
          if (node.nodeType === 3) { // Text node
            const text = (node.textContent || '').trim();
            if (text) {
              doc.setFontSize(11);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor('#000000');
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
              }
              const wrapped = doc.splitTextToSize(text, contentWidth);
              doc.text(wrapped, margin, yPosition);
              yPosition += wrapped.length * 5 + 2;
            }
          }
        });
      } else {
        // Text-only div — no element children at all
        const text = element.textContent || '';
        if (text.trim()) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor('#000000');

          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          const wrapped = doc.splitTextToSize(text.trim(), contentWidth);
          doc.text(wrapped, margin, yPosition);
          yPosition += wrapped.length * 5 + 2;
        }
      }

    } else {
      // Fallback: render any unhandled element's text content
      const text = element.textContent || '';
      if (text.trim()) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#000000');

        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        const wrapped = doc.splitTextToSize(text.trim(), contentWidth);
        doc.text(wrapped, margin, yPosition);
        yPosition += wrapped.length * 5 + 2;
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
 * Export meeting to PDF
 * Returns ArrayBuffer for Node.js compatibility
 */
export async function exportMeetingToPDF(
  meeting: MeetingExportData
): Promise<ArrayBuffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Helper to check for page break
  const checkPageBreak = (requiredSpace: number = 40) => {
    if (yPosition > pageHeight - requiredSpace) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Meeting Title (H1)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkenColor(HEADING_COLORS.H1));
  const titleLines = doc.splitTextToSize(meeting.title, contentWidth);
  doc.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 8;

  // Meeting Info Table
  const infoRows: string[][] = [];
  if (meeting.project?.name) {
    infoRows.push(['Project', meeting.project.name]);
  }
  if (meeting.project?.address) {
    infoRows.push(['Address', meeting.project.address]);
  }
  if (meeting.meetingDate) {
    const formattedDate = new Date(meeting.meetingDate).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    infoRows.push(['Date', formattedDate]);
  }
  infoRows.push(['Agenda Type', meeting.agendaType.charAt(0).toUpperCase() + meeting.agendaType.slice(1)]);

  if (infoRows.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      body: infoRows,
      theme: 'grid',
      styles: { cellPadding: { top: 3, right: 3, bottom: 3, left: 3 } },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
      },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });
    yPosition = (doc as any).lastAutoTable?.finalY + 10 ?? yPosition + 30;
  }

  // Attendees Section
  const attendeesWithData = meeting.attendees.filter(a => a.stakeholder?.name || a.adhocName);
  if (attendeesWithData.length > 0) {
    checkPageBreak(50);

    // Attendees heading
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkenColor(HEADING_COLORS.H2));
    doc.text('Attendees', margin, yPosition);
    yPosition += 8;

    // Attendees table
    const attendeeRows = attendeesWithData.map(a => [
      a.stakeholder?.name || a.adhocName || '',
      a.stakeholder?.organization || a.adhocFirm || '',
      a.isAttending ? 'Yes' : 'No',
      a.isDistribution ? 'Yes' : 'No',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Name', 'Organization', 'Attending', 'Distribution']],
      body: attendeeRows,
      theme: 'grid',
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });
    yPosition = (doc as any).lastAutoTable?.finalY + 10 ?? yPosition + 30;
  }

  // Agenda Sections
  if (meeting.sections.length > 0) {
    checkPageBreak(50);

    // Agenda heading
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkenColor(HEADING_COLORS.H2));
    doc.text('Agenda', margin, yPosition);
    yPosition += 10;

    for (const section of meeting.sections) {
      checkPageBreak(40);

      // Section label (H3)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkenColor(HEADING_COLORS.H3));
      const sectionLabelLines = doc.splitTextToSize(section.sectionLabel, contentWidth);
      doc.text(sectionLabelLines, margin, yPosition);
      yPosition += sectionLabelLines.length * 6 + 4;

      // Section content
      if (section.content) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#000000');

        const contentLines = doc.splitTextToSize(section.content, contentWidth);
        for (const line of contentLines) {
          checkPageBreak(20);
          doc.text(line, margin, yPosition);
          yPosition += 5;
        }
        yPosition += 3;
      }

      // Child sections (for detailed agenda)
      if (section.childSections && section.childSections.length > 0) {
        for (const child of section.childSections) {
          checkPageBreak(30);

          // Child section label
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor('#444444');
          doc.text(`  ${child.sectionLabel}`, margin, yPosition);
          yPosition += 6;

          // Child section content
          if (child.content) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#000000');
            const childContentLines = doc.splitTextToSize(child.content, contentWidth - 10);
            for (const line of childContentLines) {
              checkPageBreak(20);
              doc.text(line, margin + 5, yPosition);
              yPosition += 5;
            }
            yPosition += 2;
          }
        }
      }

      yPosition += 5;
    }
  }

  return doc.output('arraybuffer');
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
 * Export project report to PDF
 * Returns ArrayBuffer for Node.js compatibility
 */
export async function exportProjectReportToPDF(
  report: ProjectReportExportData
): Promise<ArrayBuffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Helper to check for page break
  const checkPageBreak = (requiredSpace: number = 40) => {
    if (yPosition > pageHeight - requiredSpace) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Report Title (H1)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkenColor(HEADING_COLORS.H1));
  const titleLines = doc.splitTextToSize(report.title, contentWidth);
  doc.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 8;

  // Report Info Table
  const infoRows: string[][] = [];
  if (report.project?.name) {
    infoRows.push(['Project', report.project.name]);
  }
  if (report.project?.address) {
    infoRows.push(['Address', report.project.address]);
  }
  if (report.preparedFor) {
    infoRows.push(['Prepared For', report.preparedFor]);
  }
  if (report.preparedBy) {
    infoRows.push(['Prepared By', report.preparedBy]);
  }
  if (report.reportDate) {
    const formattedDate = new Date(report.reportDate).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    infoRows.push(['Report Date', formattedDate]);
  }
  if (report.reportingPeriodStart || report.reportingPeriodEnd) {
    const startDate = report.reportingPeriodStart
      ? new Date(report.reportingPeriodStart).toLocaleDateString('en-AU')
      : '';
    const endDate = report.reportingPeriodEnd
      ? new Date(report.reportingPeriodEnd).toLocaleDateString('en-AU')
      : '';
    infoRows.push(['Reporting Period', `${startDate} - ${endDate}`]);
  }

  if (infoRows.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      body: infoRows,
      theme: 'grid',
      styles: { cellPadding: { top: 3, right: 3, bottom: 3, left: 3 } },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold', fillColor: [245, 245, 245] },
      },
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
    });
    yPosition = (doc as any).lastAutoTable?.finalY + 10 ?? yPosition + 30;
  }

  // Report Contents
  if (report.sections.length > 0) {
    checkPageBreak(50);

    // Contents heading
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkenColor(HEADING_COLORS.H2));
    doc.text('Contents', margin, yPosition);
    yPosition += 10;

    for (const section of report.sections) {
      checkPageBreak(40);

      // Section label (H3)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkenColor(HEADING_COLORS.H3));
      const sectionLabelLines = doc.splitTextToSize(section.sectionLabel, contentWidth);
      doc.text(sectionLabelLines, margin, yPosition);
      yPosition += sectionLabelLines.length * 6 + 4;

      // Section content
      if (section.content) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#000000');

        const contentLines = doc.splitTextToSize(section.content, contentWidth);
        for (const line of contentLines) {
          checkPageBreak(20);
          doc.text(line, margin, yPosition);
          yPosition += 5;
        }
        yPosition += 3;
      }

      // Child sections (for detailed contents)
      if (section.childSections && section.childSections.length > 0) {
        for (const child of section.childSections) {
          checkPageBreak(30);

          // Child section label
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor('#444444');
          doc.text(`  ${child.sectionLabel}`, margin, yPosition);
          yPosition += 6;

          // Child section content
          if (child.content) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#000000');
            const childContentLines = doc.splitTextToSize(child.content, contentWidth - 10);
            for (const line of childContentLines) {
              checkPageBreak(20);
              doc.text(line, margin + 5, yPosition);
              yPosition += 5;
            }
            yPosition += 2;
          }
        }
      }

      yPosition += 5;
    }
  }

  return doc.output('arraybuffer');
}

// ============================================================================
// RFT NEW EXPORT - Dedicated PDF export matching screen layout
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
 * Render two-column content section using autoTable.
 * Each content block becomes its own table row so autoTable handles
 * page breaks correctly with both columns side-by-side.
 */
function renderTwoColPDF(
  d: jsPDF, startY: number, mg: number, cw: number, _ph: number,
  lHead: string, rHead: string, lBlocks: ContentBlock[], rBlocks: ContentBlock[],
): number {
  const colW = cw / 2;

  // Convert blocks to row lines with bold flag
  type RowLine = { text: string; bold: boolean };
  function toLines(blocks: ContentBlock[]): RowLine[] {
    const out: RowLine[] = [];
    let first = true;
    for (const b of blocks) {
      if (b.type === 'heading') {
        if (!first) out.push({ text: '', bold: false });
        out.push({ text: b.text, bold: true });
      } else if (b.type === 'bullet') {
        out.push({ text: `\u2022  ${b.text}`, bold: false });
      } else {
        out.push({ text: b.text, bold: false });
      }
      first = false;
    }
    return out;
  }

  const lLines = toLines(lBlocks);
  const rLines = toLines(rBlocks);
  const rowCount = Math.max(lLines.length, rLines.length);

  const body: string[][] = [];
  const boldCells = new Set<string>();
  for (let i = 0; i < rowCount; i++) {
    body.push([lLines[i]?.text ?? '', rLines[i]?.text ?? '']);
    if (lLines[i]?.bold) boldCells.add(`${i}-0`);
    if (rLines[i]?.bold) boldCells.add(`${i}-1`);
  }

  const hS = { fontStyle: 'bold' as const, textColor: RFT_COLORS.blue, fillColor: RFT_COLORS.white, fontSize: 9 };

  autoTable(d, {
    startY,
    head: [[{ content: lHead, styles: hS }, { content: rHead, styles: hS }]],
    body,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: { top: 0.5, bottom: 0.5, left: 3, right: 3 },
      textColor: RFT_COLORS.body,
      overflow: 'linebreak',
    },
    columnStyles: { 0: { cellWidth: colW }, 1: { cellWidth: colW } },
    margin: { left: mg, right: mg },
    tableWidth: cw,
    didParseCell: (data: any) => {
      if (data.section === 'body' && boldCells.has(`${data.row.index}-${data.column.index}`)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = RFT_COLORS.dark;
      }
    },
    didDrawCell: (data: any) => {
      d.setDrawColor(...RFT_COLORS.border);
      d.setLineWidth(0.15);
      // Vertical separator between columns
      if (data.column.index === 0) {
        const x = data.cell.x + data.cell.width;
        d.line(x, data.cell.y, x, data.cell.y + data.cell.height);
      }
      // Header bottom border
      if (data.section === 'head') {
        const y = data.cell.y + data.cell.height;
        d.line(data.cell.x, y, data.cell.x + data.cell.width, y);
      }
    },
  });

  return ((d as any).lastAutoTable?.finalY ?? startY + 20) + 6;
}

export async function exportRFTNewToPDF(data: RFTExportData): Promise<ArrayBuffer> {
  const d = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = d.internal.pageSize.getWidth(), ph = d.internal.pageSize.getHeight();
  const mg = 15, cw = pw - 2 * mg;
  let y = 15;
  const cpb = (n: number) => { if (y + n > ph - 15) { d.addPage(); y = 15; } };

  // 1. PROJECT INFO
  autoTable(d, {
    startY: y,
    body: [
      [{ content: 'Project Name', styles: { fontStyle: 'bold' as const, textColor: RFT_COLORS.blue } }, { content: data.projectName, colSpan: 2 }],
      [{ content: 'Address', styles: { fontStyle: 'bold' as const, textColor: RFT_COLORS.blue } }, { content: data.address, colSpan: 2 }],
      [{ content: 'Document', styles: { fontStyle: 'bold' as const, textColor: RFT_COLORS.blue } }, { content: data.documentLabel, styles: { fontStyle: 'bold' as const } }, { content: `Issued ${data.issuedDate}`, styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: RFT_COLORS.blue } }],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: { top: 3, right: 3, bottom: 3, left: 3 }, lineColor: RFT_COLORS.border, lineWidth: 0.15 },
    columnStyles: { 0: { cellWidth: 28 } },
    margin: { left: mg, right: mg }, tableWidth: cw,
  });
  y = ((d as any).lastAutoTable?.finalY ?? y + 17) + 8;

  // 2. OBJECTIVES
  const fq = parseHtmlContent(data.objectives.functionalQuality);
  const pc = parseHtmlContent(data.objectives.planningCompliance);
  if (fq.length > 0 || pc.length > 0) {
    cpb(25);
    d.setFontSize(10); d.setFont('helvetica', 'bold'); d.setTextColor(...RFT_COLORS.dark);
    d.text('OBJECTIVES', mg, y); y += 5;
    y = renderTwoColPDF(d, y, mg, cw, ph, 'Functional & Quality', 'Planning & Compliance', fq, pc);
  } else {
    cpb(20); d.setFontSize(10); d.setFont('helvetica', 'bold'); d.setTextColor(...RFT_COLORS.dark);
    d.text('OBJECTIVES', mg, y); y += 5;
    d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor(...RFT_COLORS.muted); d.text('No objectives defined.', mg, y); y += 8;
  }

  // 3. BRIEF
  const sv = parseHtmlContent(data.brief.service);
  const dl = parseHtmlContent(data.brief.deliverables);
  if (sv.length > 0 || dl.length > 0) {
    cpb(25);
    d.setFontSize(10); d.setFont('helvetica', 'bold'); d.setTextColor(...RFT_COLORS.dark);
    d.text('BRIEF', mg, y); y += 5;
    y = renderTwoColPDF(d, y, mg, cw, ph, 'Service', 'Deliverables', sv, dl);
  } else {
    cpb(20); d.setFontSize(10); d.setFont('helvetica', 'bold'); d.setTextColor(...RFT_COLORS.dark);
    d.text('BRIEF', mg, y); y += 5;
    d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor(...RFT_COLORS.muted); d.text('No brief content.', mg, y); y += 8;
  }

  // 4. PROGRAM
  cpb(20); d.setFontSize(10); d.setFont('helvetica', 'bold'); d.setTextColor(...RFT_COLORS.dark);
  d.text('PROGRAM', mg, y); y += 5;
  const wd = data.activities.filter(a => a.startDate && a.endDate);
  if (wd.length > 0) {
    const allD = wd.flatMap(a => [new Date(a.startDate!), new Date(a.endDate!)]);
    const mnD = new Date(Math.min(...allD.map(x => x.getTime())));
    const mxD = new Date(Math.max(...allD.map(x => x.getTime())));
    const wC = generateWeekColumns(mnD, mxD);
    const mG = groupByMonth(wC);
    const ord = buildOrderedActivities(data.activities);

    const mRow: any[] = [
      { content: 'Activity', rowSpan: 2, styles: { halign: 'left' as const, fillColor: RFT_COLORS.headerBg, textColor: RFT_COLORS.blue, fontStyle: 'bold' as const, fontSize: 8 } },
      { content: 'Start', rowSpan: 2, styles: { halign: 'center' as const, fillColor: RFT_COLORS.headerBg, textColor: RFT_COLORS.blue, fontStyle: 'bold' as const, fontSize: 7 } },
      { content: 'End', rowSpan: 2, styles: { halign: 'center' as const, fillColor: RFT_COLORS.headerBg, textColor: RFT_COLORS.blue, fontStyle: 'bold' as const, fontSize: 7 } },
    ];
    mG.forEach(g => mRow.push({ content: g.label, colSpan: g.count, styles: { halign: 'center' as const, fillColor: RFT_COLORS.headerBg, textColor: RFT_COLORS.muted, fontSize: 7 } }));

    const dRow: any[] = wC.map(c => ({ content: String(c.dayLabel), styles: { halign: 'center' as const, fillColor: RFT_COLORS.headerBg, textColor: RFT_COLORS.muted, fontSize: 6.5 } }));

    const bRows = ord.map(a => {
      const ch = !!a.parentId;
      const aS = a.startDate ? new Date(a.startDate) : null;
      const aE = a.endDate ? new Date(a.endDate) : null;
      const r: any[] = [
        { content: `${ch ? '    ' : '\u25B8 '}${a.name}`, styles: ch ? { fontStyle: 'normal' as const, textColor: RFT_COLORS.muted, fontSize: 7.5 } : { fontStyle: 'bold' as const, textColor: RFT_COLORS.dark, fontSize: 7.5 } },
        { content: formatDateShort(a.startDate), styles: { halign: 'center' as const, textColor: RFT_COLORS.muted, fontSize: 7 } },
        { content: formatDateShort(a.endDate), styles: { halign: 'center' as const, textColor: RFT_COLORS.muted, fontSize: 7 } },
      ];
      wC.forEach(c => { r.push({ content: '', styles: { fillColor: aS && aE && isWeekInRange(c.start, aS, aE) ? RFT_COLORS.bar : RFT_COLORS.white } }); });
      return r;
    });

    const tlW = Math.min(7, (cw - 35 - 14 - 14) / wC.length);
    const cs: Record<number, any> = { 0: { cellWidth: 35 }, 1: { cellWidth: 14 }, 2: { cellWidth: 14 } };
    wC.forEach((_, i) => { cs[i + 3] = { cellWidth: tlW }; });

    autoTable(d, {
      startY: y, head: [mRow, dRow], body: bRows, theme: 'grid',
      styles: { cellPadding: 1.5, lineColor: RFT_COLORS.border, lineWidth: 0.15, overflow: 'hidden' },
      headStyles: { fillColor: RFT_COLORS.headerBg }, columnStyles: cs,
      margin: { left: mg, right: mg }, tableWidth: cw,
    });
    y = ((d as any).lastAutoTable?.finalY ?? y + 32) + 8;
  } else { d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor(...RFT_COLORS.muted); d.text('No program activities with dates.', mg, y); y += 8; }

  // 5. FEE
  cpb(20); d.setFontSize(10); d.setFont('helvetica', 'bold'); d.setTextColor(...RFT_COLORS.dark);
  d.text('FEE', mg, y); y += 5;
  if (data.feeItems.length > 0) {
    autoTable(d, {
      startY: y,
      head: [[{ content: 'Description', styles: { textColor: RFT_COLORS.blue, fillColor: RFT_COLORS.headerBg, fontStyle: 'bold' as const } }, { content: 'Amount (Excl. GST)', styles: { textColor: RFT_COLORS.blue, fillColor: RFT_COLORS.headerBg, fontStyle: 'bold' as const } }]],
      body: data.feeItems.map(f => [f.activity, '$']),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.5, lineColor: RFT_COLORS.border, lineWidth: 0.15 },
      columnStyles: { 1: { cellWidth: 40 } },
      margin: { left: mg, right: mg }, tableWidth: cw,
    });
    y = ((d as any).lastAutoTable?.finalY ?? y + 12) + 8;
  } else { d.setFontSize(8); d.setFont('helvetica', 'normal'); d.setTextColor(...RFT_COLORS.muted); d.text('No cost plan items.', mg, y); y += 8; }

  // 6. TRANSMITTAL
  cpb(20); d.setFontSize(10); d.setFont('helvetica', 'bold'); d.setTextColor(...RFT_COLORS.dark);
  d.text('TRANSMITTAL', mg, y); y += 5;
  if (data.transmittalDocs.length > 0) {
    const hS = { textColor: RFT_COLORS.dark, fillColor: [240, 240, 240] as [number, number, number], fontStyle: 'normal' as const };
    autoTable(d, {
      startY: y,
      head: [[
        { content: '#', styles: { ...hS, halign: 'center' as const } },
        { content: 'DWG #', styles: hS },
        { content: 'Name', styles: hS },
        { content: 'Rev', styles: { ...hS, halign: 'center' as const } },
        { content: 'Category', styles: hS },
        { content: 'Subcategory', styles: hS },
      ]],
      body: data.transmittalDocs.map((t, i) => [
        { content: String(i + 1), styles: { halign: 'center' as const, textColor: RFT_COLORS.muted } },
        t.drawingNumber || '-', t.drawingName || t.originalName,
        { content: t.drawingRevision || '-', styles: { halign: 'center' as const } },
        t.categoryName || '-', t.subcategoryName || '-',
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.5, lineColor: RFT_COLORS.border, lineWidth: 0.15 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 18 }, 3: { cellWidth: 12 }, 4: { cellWidth: 28 }, 5: { cellWidth: 28 } },
      margin: { left: mg, right: mg }, tableWidth: cw,
    });
  }

  return d.output('arraybuffer');
}
