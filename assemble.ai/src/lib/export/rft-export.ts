/**
 * RFT Export - Shared data types and utilities for RFT PDF/DOCX export
 */

import { JSDOM } from 'jsdom';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface RFTExportData {
    projectName: string;
    address: string;
    documentLabel: string;
    issuedDate: string;
    objectives: {
        functionalQuality: string; // HTML content
        planningCompliance: string; // HTML content
    };
    brief: {
        service: string; // HTML content
        deliverables: string; // HTML content
    };
    activities: {
        id: string;
        parentId: string | null;
        name: string;
        startDate: string | null;
        endDate: string | null;
        color: string | null;
        sortOrder: number;
    }[];
    feeItems: { activity: string }[];
    transmittalDocs: {
        drawingNumber: string | null;
        drawingName: string | null;
        originalName: string;
        drawingRevision: string | null;
        categoryName: string | null;
        subcategoryName: string | null;
    }[];
}

export interface ContentBlock {
    type: 'heading' | 'paragraph' | 'bullet';
    text: string;
    bold?: boolean;
}

// ============================================================================
// PRINT-FRIENDLY AURORA THEME COLORS (RGB tuples for jsPDF)
// ============================================================================

export const RFT_COLORS = {
    blue: [0, 102, 204] as [number, number, number],
    blueHex: '0066CC',
    dark: [26, 26, 26] as [number, number, number],
    darkHex: '1A1A1A',
    body: [51, 51, 51] as [number, number, number],
    bodyHex: '333333',
    muted: [110, 110, 110] as [number, number, number],
    mutedHex: '6E6E6E',
    bar: [13, 148, 136] as [number, number, number],
    barHex: '0D9488',
    headerBg: [255, 255, 255] as [number, number, number],
    headerBgHex: 'FFFFFF',
    border: [218, 218, 218] as [number, number, number],
    borderHex: 'DADADA',
    white: [255, 255, 255] as [number, number, number],
};

// ============================================================================
// HTML CONTENT PARSER
// ============================================================================

/**
 * Parse rich HTML content (from RichTextEditor / objectives) into structured blocks
 * for export rendering. Handles headings, paragraphs, bold text, and bullet lists.
 */
export function parseHtmlContent(html: string): ContentBlock[] {
    if (!html || !html.trim()) return [];

    // Plain text (no HTML tags)
    if (!html.includes('<')) {
        return html.split('\n').filter(l => l.trim()).map(line => {
            const trimmed = line.trim();
            const mdBold = trimmed.match(/^\*\*(.+)\*\*$/);
            if (mdBold) {
                return { type: 'heading' as const, text: mdBold[1], bold: true };
            }
            return { type: 'paragraph' as const, text: trimmed };
        });
    }

    const dom = new JSDOM(`<div>${html}</div>`);
    const container = dom.window.document.querySelector('div')!;
    const blocks: ContentBlock[] = [];

    function processNode(node: Node) {
        if (node.nodeType !== 1) return;
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim();

        if (!text) return;

        if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
            blocks.push({ type: 'heading', text, bold: true });
        } else if (tag === 'p') {
            const strongEl = el.querySelector('strong, b');
            const isAllBold = strongEl && strongEl.textContent?.trim() === text;
            if (isAllBold) {
                blocks.push({ type: 'heading', text, bold: true });
            } else {
                // Handle markdown-style **bold** headings
                const mdBold = text.match(/^\*\*(.+)\*\*$/);
                if (mdBold) {
                    blocks.push({ type: 'heading', text: mdBold[1], bold: true });
                } else {
                    blocks.push({ type: 'paragraph', text });
                }
            }
        } else if (tag === 'ul' || tag === 'ol') {
            el.querySelectorAll(':scope > li').forEach(li => {
                const liText = (li.textContent || '').trim();
                if (liText) {
                    blocks.push({ type: 'bullet', text: liText });
                }
            });
        } else if (tag === 'div' || tag === 'section') {
            el.childNodes.forEach(child => processNode(child));
        }
    }

    container.childNodes.forEach(child => processNode(child));
    return blocks;
}

/**
 * Convert content blocks to plain text with formatting hints (for PDF cells)
 * Headings appear on their own line, bullets prefixed with bullet character
 */
export function blocksToPlainText(blocks: ContentBlock[]): string {
    const lines: string[] = [];
    let isFirst = true;

    for (const block of blocks) {
        if (block.type === 'heading') {
            if (!isFirst) lines.push('');
            lines.push(block.text);
            isFirst = false;
        } else if (block.type === 'bullet') {
            lines.push(`\u2022  ${block.text}`);
            isFirst = false;
        } else {
            lines.push(block.text);
            isFirst = false;
        }
    }

    return lines.join('\n');
}

// ============================================================================
// PROGRAM GANTT HELPERS
// ============================================================================

export interface WeekColumn {
    start: Date;
    dayLabel: number;
    month: string;
    year: number;
}

export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function generateWeekColumns(startDate: Date, endDate: Date): WeekColumn[] {
    const columns: WeekColumn[] = [];
    const current = getWeekStart(startDate);
    const end = new Date(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (current <= end) {
        columns.push({
            start: new Date(current),
            dayLabel: current.getDate(),
            month: months[current.getMonth()],
            year: current.getFullYear(),
        });
        current.setDate(current.getDate() + 7);
    }
    return columns;
}

export function groupByMonth(columns: WeekColumn[]): { label: string; count: number }[] {
    const groups: { label: string; count: number }[] = [];
    let currentGroup: { label: string; count: number } | null = null;

    columns.forEach(col => {
        const label = `${col.month} ${col.year}`;
        if (!currentGroup || currentGroup.label !== label) {
            if (currentGroup) groups.push(currentGroup);
            currentGroup = { label, count: 1 };
        } else {
            currentGroup.count++;
        }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
}

export function isWeekInRange(weekStart: Date, actStart: Date, actEnd: Date): boolean {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekStart <= actEnd && weekEnd >= actStart;
}

export function formatDateShort(dateStr: string | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}

/**
 * Build ordered activity list with parent-child hierarchy
 */
export function buildOrderedActivities(activities: RFTExportData['activities']): RFTExportData['activities'] {
    const parents = activities.filter(a => !a.parentId);
    const children = activities.filter(a => a.parentId);
    const ordered: RFTExportData['activities'] = [];

    parents.forEach(parent => {
        ordered.push(parent);
        const kids = children.filter(c => c.parentId === parent.id);
        kids.sort((a, b) => a.sortOrder - b.sortOrder);
        ordered.push(...kids);
    });

    // Add orphaned children
    children.filter(c => !parents.some(p => p.id === c.parentId)).forEach(a => {
        ordered.push(a);
    });

    return ordered;
}
