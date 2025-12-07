/**
 * T133: Report Formatting Utilities
 * Convert report sections to unified HTML for editable content area
 */

import type { ReportSection } from '@/lib/hooks/use-report-generation';
import type { TableOfContents } from '@/lib/langgraph/state';

// Single heading color (consistent, clean look)
export const HEADING_COLOR = '#9CDCFE'; // Soft cyan - VS Code variable color

// Legacy export for compatibility (all same color now)
export const HEADING_COLORS = {
  H1: HEADING_COLOR,
  H2: HEADING_COLOR,
  H3: HEADING_COLOR,
} as const;

/**
 * Convert report sections array to unified HTML string
 * with color-coded headings and inline styles
 */
export function sectionsToHTML(
  sections: ReportSection[],
  tableOfContents: TableOfContents,
  transmittalHTML?: string
): string {
  if (!sections || sections.length === 0) {
    return '<p>No content available</p>';
  }

  // Build a map of section index to heading level from TOC
  const levelMap = new Map<number, number>();
  tableOfContents.sections.forEach((tocSection, index) => {
    levelMap.set(index, tocSection.level || 2); // Default to H2 if no level
  });

  // Convert each section to HTML
  const htmlParts: string[] = [];

  sections.forEach((section) => {
    const level = levelMap.get(section.sectionIndex) || 2;
    const headingTag = `h${level}`;
    const color = HEADING_COLORS[`H${level}` as keyof typeof HEADING_COLORS] || HEADING_COLORS.H2;

    // Add heading with inline color style
    htmlParts.push(
      `<${headingTag} style="color: ${color}">${escapeHTML(section.title)}</${headingTag}>`
    );

    // Add content (convert markdown to HTML)
    if (section.content) {
      let content = section.content;

      // Remove duplicate heading if content starts with ## SectionTitle
      // This prevents "Project Objectives" appearing twice
      const duplicateHeadingPattern = new RegExp(`^##\\s*${escapeRegExp(section.title)}\\s*\\n`, 'i');
      content = content.replace(duplicateHeadingPattern, '');

      // If content already contains HTML tags (e.g., transmittal table), use as-is
      // Otherwise convert markdown to HTML
      const contentHTML = content.includes('<table') || content.includes('<h2')
        ? content
        : markdownToHTML(content, section.title);

      htmlParts.push(contentHTML);
    }
  });

  // Add transmittal table at the end if provided
  if (transmittalHTML) {
    htmlParts.push(transmittalHTML);
  }

  return htmlParts.join('\n');
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert markdown table to HTML table
 */
function convertMarkdownTable(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  for (const line of lines) {
    // Check if line is a table row (starts with |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Skip separator rows (|---|---|)
      if (/^\|[\s-:|]+\|$/.test(line.trim())) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableRows = [];
      }

      // Parse cells
      const cells = line
        .trim()
        .slice(1, -1) // Remove leading and trailing |
        .split('|')
        .map(cell => cell.trim());

      tableRows.push(cells.join('|||')); // Use delimiter for later processing
    } else {
      // End of table
      if (inTable && tableRows.length > 0) {
        result.push(buildHTMLTable(tableRows));
        tableRows = [];
        inTable = false;
      }
      result.push(line);
    }
  }

  // Handle table at end of content
  if (inTable && tableRows.length > 0) {
    result.push(buildHTMLTable(tableRows));
  }

  return result.join('\n');
}

/**
 * Build HTML table from parsed rows
 */
function buildHTMLTable(rows: string[]): string {
  if (rows.length === 0) return '';

  const headerCells = rows[0].split('|||');
  const headerRow = headerCells.map(cell => `<th>${escapeHTML(cell)}</th>`).join('');

  const bodyRows = rows.slice(1).map(row => {
    const cells = row.split('|||');
    return `<tr>${cells.map(cell => `<td>${escapeHTML(cell)}</td>`).join('')}</tr>`;
  }).join('\n    ');

  return `<table class="transmittal-table">
  <thead>
    <tr>${headerRow}</tr>
  </thead>
  <tbody>
    ${bodyRows}
  </tbody>
</table>`;
}

/**
 * Convert bullet list with bold labels to a two-column table
 * Pattern: - **Label**: Value
 */
function convertBulletListToTable(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let listItems: Array<{ label: string; value: string }> = [];

  for (const line of lines) {
    // Match pattern: - **Label**: Value or - **Label:** Value
    const match = line.match(/^-\s*\*\*([^*]+)\*\*:?\s*(.*)$/);
    if (match) {
      listItems.push({ label: match[1].replace(/:$/, ''), value: match[2] });
    } else {
      // End of list - convert collected items to table
      if (listItems.length >= 2) {
        result.push(buildKeyValueTable(listItems));
        listItems = [];
      } else if (listItems.length === 1) {
        // Single item, keep as text
        result.push(`<p><strong>${listItems[0].label}:</strong> ${listItems[0].value}</p>`);
        listItems = [];
      }
      result.push(line);
    }
  }

  // Handle list at end of content
  if (listItems.length >= 2) {
    result.push(buildKeyValueTable(listItems));
  } else if (listItems.length === 1) {
    result.push(`<p><strong>${listItems[0].label}:</strong> ${listItems[0].value}</p>`);
  }

  return result.join('\n');
}

/**
 * Build a two-column key-value table from label/value pairs
 */
function buildKeyValueTable(items: Array<{ label: string; value: string }>): string {
  const rows = items
    .filter(item => item.value.trim()) // Only include items with values
    .map(item => `<tr><td><strong>${escapeHTML(item.label)}</strong></td><td>${escapeHTML(item.value)}</td></tr>`)
    .join('\n    ');

  if (!rows) return '';

  return `<table class="details-table">
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

/**
 * Convert markdown formatting to HTML
 * Handles: ## headings, ### headings, **bold**, tables, and extra blank lines
 * @param markdown - The markdown content to convert
 * @param sectionTitle - Optional section title to help detect duplicates
 */
export function markdownToHTML(markdown: string, sectionTitle?: string): string {
  let html = markdown;

  // Collapse multiple blank lines to single blank line
  html = html.replace(/\n{3,}/g, '\n\n');

  // Convert markdown tables first (before other conversions)
  html = convertMarkdownTable(html);

  // Convert bullet lists with bold labels to tables (e.g., Project Details)
  html = convertBulletListToTable(html);

  // Convert ### headings (H3) with amber color
  html = html.replace(
    /^### (.+)$/gm,
    `<h3 style="color: ${HEADING_COLORS.H3}">$1</h3>`
  );

  // Convert ## headings (H2) with green color
  html = html.replace(
    /^## (.+)$/gm,
    `<h2 style="color: ${HEADING_COLORS.H2}">$1</h2>`
  );

  // Convert standalone bold lines to H2 headings
  // Pattern: line that is ONLY **text** (subheading like "Functional Objectives")
  html = html.replace(
    /^\*\*([^*]+)\*\*$/gm,
    `<h2 style="color: ${HEADING_COLORS.H2}">$1</h2>`
  );

  // Convert remaining **bold** to <strong> (inline bold within paragraphs)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* to <em> (but not inside HTML tags)
  html = html.replace(/(?<![<])\*([^*]+)\*(?![>])/g, '<em>$1</em>');

  // Convert remaining bullet lists (- item) that weren't converted to tables
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`);

  // Split into paragraphs and wrap non-HTML content
  const blocks = html.split('\n\n');
  html = blocks
    .map(block => {
      const trimmed = block.trim();
      // Don't wrap if already HTML (starts with < and ends with >)
      if (trimmed.startsWith('<') && (trimmed.endsWith('>') || trimmed.includes('</ul>') || trimmed.includes('</table>'))) {
        return trimmed;
      }
      // Don't wrap empty blocks
      if (!trimmed) {
        return '';
      }
      // Wrap in paragraph, convert single newlines to <br>
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .filter(block => block) // Remove empty blocks
    .join('\n');  // Use single newline for tighter spacing

  return html;
}

/**
 * Format transmittal data as HTML table with category colors
 */
export function formatTransmittalAsHTML(
  transmittal: Array<{
    name: string;
    version: string;
    category: string;
    categoryColor?: string;
  }>
): string {
  if (!transmittal || transmittal.length === 0) {
    return '';
  }

  const rows = transmittal
    .map(
      (doc) => `
    <tr>
      <td>${escapeHTML(doc.name)}</td>
      <td>${escapeHTML(doc.version)}</td>
      <td style="color: ${doc.categoryColor || '#cccccc'}">${escapeHTML(doc.category)}</td>
    </tr>
  `
    )
    .join('');

  return `<table class="transmittal-table">
  <thead>
    <tr>
      <th>Document Name</th>
      <th>Version</th>
      <th>Category</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
  `.trim();
}

/**
 * Extract plain text from HTML for preview/search
 */
export function htmlToPlainText(html: string): string {
  // Server-side compatible: strip HTML tags
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}
