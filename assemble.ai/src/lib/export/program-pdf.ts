/**
 * Program Module PDF Export
 *
 * Exports program activities to a PDF document with Gantt-style timeline view.
 * Features:
 * - 2-tier header: Months (Tier 1) spanning Weeks (Tier 2)
 * - Visual activity bars with colors
 * - Compact row heights
 * - Milestone markers
 */

import jsPDF from 'jspdf';
import autoTable, { CellDef, RowInput, Styles } from 'jspdf-autotable';

interface ProgramActivity {
    id: string;
    name: string;
    parentId: string | null;
    startDate: string | null;
    endDate: string | null;
    color: string | null;
}

interface ProgramMilestone {
    id: string;
    activityId: string;
    name: string;
    date: string;
}

interface ProgramData {
    activities: ProgramActivity[];
    milestones: ProgramMilestone[];
    projectName: string;
}

interface WeekColumn {
    weekStart: Date;
    weekEnd: Date;
    dayLabel: string; // Day of month (e.g., "15")
    monthKey: string; // For grouping (e.g., "2025-12")
    monthLabel: string; // Display label (e.g., "Dec 2025")
}

// Convert hex to RGB tuple
function hexToRgb(hex: string): [number, number, number] {
    const cleanHex = hex.replace('#', '');
    const fullHex = cleanHex.length === 3
        ? cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2]
        : cleanHex;

    return [
        parseInt(fullHex.substring(0, 2), 16),
        parseInt(fullHex.substring(2, 4), 16),
        parseInt(fullHex.substring(4, 6), 16),
    ];
}

// Get Monday of the week for a given date
function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Generate week columns between two dates
function generateWeekColumns(startDate: Date, endDate: Date): WeekColumn[] {
    const columns: WeekColumn[] = [];
    const current = getMonday(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 7); // Include the last week

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (current <= end) {
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${monthNames[current.getMonth()]} ${current.getFullYear()}`;

        columns.push({
            weekStart: new Date(current),
            weekEnd: weekEnd,
            dayLabel: String(current.getDate()),
            monthKey,
            monthLabel,
        });

        current.setDate(current.getDate() + 7);
    }

    return columns;
}

// Group week columns by month
function groupByMonth(columns: WeekColumn[]): Map<string, { label: string; count: number }> {
    const groups = new Map<string, { label: string; count: number }>();

    for (const col of columns) {
        const existing = groups.get(col.monthKey);
        if (existing) {
            existing.count++;
        } else {
            groups.set(col.monthKey, { label: col.monthLabel, count: 1 });
        }
    }

    return groups;
}

// Check if activity spans a week
function activitySpansWeek(
    activityStart: Date | null,
    activityEnd: Date | null,
    weekStart: Date,
    weekEnd: Date
): boolean {
    if (!activityStart || !activityEnd) return false;
    // Activity spans this week if it starts before week ends AND ends after week starts
    return activityStart <= weekEnd && activityEnd >= weekStart;
}

// Build hierarchical structure
function buildHierarchy(activities: ProgramActivity[]): Array<ProgramActivity & { depth: number }> {
    const result: Array<ProgramActivity & { depth: number }> = [];
    const childMap = new Map<string | null, ProgramActivity[]>();

    // Group by parent
    for (const activity of activities) {
        const parentId = activity.parentId;
        if (!childMap.has(parentId)) {
            childMap.set(parentId, []);
        }
        childMap.get(parentId)!.push(activity);
    }

    // Recursive traversal
    function traverse(parentId: string | null, depth: number) {
        const children = childMap.get(parentId) || [];
        for (const child of children) {
            result.push({ ...child, depth });
            traverse(child.id, depth + 1);
        }
    }

    traverse(null, 0);
    return result;
}

// Default color for activities without a color
const DEFAULT_ACTIVITY_COLOR = '#4A90A4';
const PARENT_ACTIVITY_COLOR = '#D97706'; // Orange for parent/phase rows

export async function exportProgramToPDF(data: ProgramData): Promise<ArrayBuffer> {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(207, 114, 43); // Orange title
    doc.text('Program', margin, margin + 5);

    // Build hierarchical activities
    const hierarchicalActivities = buildHierarchy(data.activities);

    // Determine date range from activities
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const activity of data.activities) {
        if (activity.startDate) {
            const start = new Date(activity.startDate);
            if (!minDate || start < minDate) minDate = start;
        }
        if (activity.endDate) {
            const end = new Date(activity.endDate);
            if (!maxDate || end > maxDate) maxDate = end;
        }
    }

    // Default to current month + 6 months if no dates
    if (!minDate) minDate = new Date();
    if (!maxDate) {
        maxDate = new Date(minDate);
        maxDate.setMonth(maxDate.getMonth() + 6);
    }

    // Add some padding to dates
    const paddedStart = new Date(minDate);
    paddedStart.setDate(paddedStart.getDate() - 7);
    const paddedEnd = new Date(maxDate);
    paddedEnd.setDate(paddedEnd.getDate() + 14);

    // Generate week columns
    const weekColumns = generateWeekColumns(paddedStart, paddedEnd);
    const monthGroups = groupByMonth(weekColumns);

    // Calculate column widths
    const activityColWidth = 55;
    const availableWidth = pageWidth - (2 * margin) - activityColWidth;
    const weekColWidth = Math.min(8, availableWidth / weekColumns.length);

    // Build month header row (Tier 1)
    const monthHeaderRow: CellDef[] = [{ content: '', styles: { fillColor: [37, 37, 38] } }];
    for (const [, group] of monthGroups) {
        monthHeaderRow.push({
            content: group.label,
            colSpan: group.count,
            styles: {
                halign: 'center',
                fillColor: [37, 37, 38],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                cellPadding: 1,
            },
        });
    }

    // Build week header row (Tier 2)
    const weekHeaderRow: CellDef[] = [{
        content: 'Activity',
        styles: {
            halign: 'left',
            fillColor: [50, 50, 52],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 1,
        },
    }];
    for (const week of weekColumns) {
        weekHeaderRow.push({
            content: week.dayLabel,
            styles: {
                halign: 'center',
                fillColor: [50, 50, 52],
                textColor: [255, 255, 255],
                fontSize: 6,
                cellPadding: 1,
            },
        });
    }

    // Build body rows
    const bodyRows: RowInput[] = [];

    for (const activity of hierarchicalActivities) {
        const isParent = activity.depth === 0;
        const indent = isParent ? '>' : '  '.repeat(activity.depth);
        const activityStart = activity.startDate ? new Date(activity.startDate) : null;
        const activityEnd = activity.endDate ? new Date(activity.endDate) : null;
        const activityColor = activity.color || (isParent ? PARENT_ACTIVITY_COLOR : DEFAULT_ACTIVITY_COLOR);

        const row: CellDef[] = [{
            content: indent + activity.name,
            styles: {
                halign: 'left',
                fontSize: 7,
                fontStyle: isParent ? 'bold' : 'normal',
                cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 1 },
                overflow: 'ellipsize',
            },
        }];

        // Add week cells
        for (const week of weekColumns) {
            const spans = activitySpansWeek(activityStart, activityEnd, week.weekStart, week.weekEnd);

            row.push({
                content: '',
                styles: {
                    fillColor: [255, 255, 255],
                    cellPadding: 0,
                    minCellHeight: 6,
                },
                // Store bar info for drawing
                // @ts-expect-error - custom property for didDrawCell
                _barInfo: spans ? {
                    color: activityColor,
                    isParent,
                } : null,
            });
        }

        bodyRows.push(row);
    }

    // Column styles
    const columnStyles: { [key: number]: Partial<Styles> } = {
        0: { cellWidth: activityColWidth },
    };
    for (let i = 1; i <= weekColumns.length; i++) {
        columnStyles[i] = { cellWidth: weekColWidth };
    }

    // Add table with custom drawing
    autoTable(doc, {
        startY: margin + 10,
        head: [monthHeaderRow, weekHeaderRow],
        body: bodyRows,
        theme: 'plain',
        styles: {
            lineColor: [220, 220, 220],
            lineWidth: 0.1,
        },
        columnStyles,
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        didDrawCell: (hookData) => {
            // Draw activity bars
            if (hookData.section === 'body' && hookData.column.index > 0) {
                const cell = hookData.cell;
                // @ts-expect-error - accessing custom property
                const barInfo = cell.raw?._barInfo;

                if (barInfo) {
                    const rgb = hexToRgb(barInfo.color);
                    const barHeight = barInfo.isParent ? 3 : 4;
                    const barY = cell.y + (cell.height - barHeight) / 2;
                    const barX = cell.x + 0.3;
                    const barWidth = cell.width - 0.6;

                    doc.setFillColor(rgb[0], rgb[1], rgb[2]);

                    if (barInfo.isParent) {
                        // Parent rows get a thinner bar with rounded ends
                        doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');
                    } else {
                        // Child rows get a solid bar
                        doc.rect(barX, barY, barWidth, barHeight, 'F');
                    }
                }
            }
        },
        didParseCell: (hookData) => {
            // Add alternating row colors for readability
            if (hookData.section === 'body') {
                const rowIndex = hookData.row.index;
                if (rowIndex % 2 === 1) {
                    hookData.cell.styles.fillColor = [250, 250, 250];
                }
            }
        },
    });

    // Get final Y position
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;

    // Add legend
    if (finalY + 15 < pageHeight - margin) {
        const legendY = finalY + 8;
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('Legend:', margin, legendY);

        // Phase bar
        const phaseColor = hexToRgb(PARENT_ACTIVITY_COLOR);
        doc.setFillColor(phaseColor[0], phaseColor[1], phaseColor[2]);
        doc.roundedRect(margin + 15, legendY - 2, 12, 3, 1, 1, 'F');
        doc.text('Phase', margin + 29, legendY);

        // Task bar
        const taskColor = hexToRgb(DEFAULT_ACTIVITY_COLOR);
        doc.setFillColor(taskColor[0], taskColor[1], taskColor[2]);
        doc.rect(margin + 45, legendY - 2, 12, 3, 'F');
        doc.text('Task', margin + 59, legendY);
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
        `Generated: ${new Date().toLocaleDateString('en-AU')} | Assemble.ai`,
        pageWidth - margin,
        pageHeight - 5,
        { align: 'right' }
    );

    return doc.output('arraybuffer');
}
