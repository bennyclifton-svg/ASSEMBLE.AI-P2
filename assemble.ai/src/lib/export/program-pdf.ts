/**
 * Program Module PDF Export
 *
 * Exports program activities to a PDF document with Gantt-style timeline view
 * matching the on-screen appearance.
 * Features:
 * - 2-tier header: Months (Tier 1) spanning Weeks (Tier 2)
 * - Activity, Start, End columns
 * - Continuous activity bars with sub-cell fractional positioning
 * - Dependency arrows (FS, SS, FF)
 * - Activity name text inside bars
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
    sortOrder: number;
}

interface ProgramDependency {
    id: string;
    fromActivityId: string;
    toActivityId: string;
    type: 'FS' | 'SS' | 'FF';
}

interface ProgramMilestone {
    id: string;
    activityId: string;
    name: string;
    date: string;
}

interface ProgramData {
    activities: ProgramActivity[];
    dependencies: ProgramDependency[];
    milestones: ProgramMilestone[];
    projectName: string;
}

interface WeekColumn {
    weekStart: Date;
    weekEnd: Date;
    dayLabel: string;
    monthKey: string;
    monthLabel: string;
}

// Theme colors matching on-screen teal theme
const TEAL: [number, number, number] = [13, 148, 136];
const BAR_FILL: [number, number, number] = [207, 234, 231]; // teal/20 on white
const BAR_BORDER: [number, number, number] = [158, 212, 207]; // teal/40 on white
const ARROW_COLOR: [number, number, number] = [120, 120, 120]; // text-muted
const HEADER_BG: [number, number, number] = [37, 55, 53]; // dark teal-tinted
const HEADER_BG_LIGHT: [number, number, number] = [50, 70, 68]; // lighter teal-tinted

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
    end.setDate(end.getDate() + 7);

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

// Build hierarchical structure sorted by sortOrder
function buildHierarchy(activities: ProgramActivity[]): Array<ProgramActivity & { depth: number }> {
    const result: Array<ProgramActivity & { depth: number }> = [];
    const childMap = new Map<string | null, ProgramActivity[]>();

    for (const activity of activities) {
        const parentId = activity.parentId;
        if (!childMap.has(parentId)) {
            childMap.set(parentId, []);
        }
        childMap.get(parentId)!.push(activity);
    }

    function traverse(parentId: string | null, depth: number) {
        const children = (childMap.get(parentId) || []).sort((a, b) => a.sortOrder - b.sortOrder);
        for (const child of children) {
            result.push({ ...child, depth });
            traverse(child.id, depth + 1);
        }
    }

    traverse(null, 0);
    return result;
}

// Format date as DD/MM/YY
function formatDateShort(dateStr: string | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}

// Get X position for a date within the timeline
function getTimelineX(
    date: Date,
    weekColumns: WeekColumn[],
    colPositions: Array<{ x: number; width: number }>
): number {
    if (colPositions.length === 0 || weekColumns.length === 0) return 0;

    const dateTime = date.getTime();

    for (let i = 0; i < weekColumns.length; i++) {
        const colStart = weekColumns[i].weekStart.getTime();
        const colEnd = i < weekColumns.length - 1
            ? weekColumns[i + 1].weekStart.getTime()
            : colStart + 7 * 24 * 60 * 60 * 1000;

        if (dateTime >= colStart && dateTime < colEnd) {
            const fraction = (dateTime - colStart) / (colEnd - colStart);
            return colPositions[i].x + fraction * colPositions[i].width;
        }
    }

    // Before all columns
    if (dateTime < weekColumns[0].weekStart.getTime()) {
        return colPositions[0].x;
    }

    // After all columns
    const lastIdx = colPositions.length - 1;
    return colPositions[lastIdx].x + colPositions[lastIdx].width;
}

// Draw an arrowhead triangle
function drawArrowhead(doc: jsPDF, x: number, y: number, direction: 'left' | 'right') {
    const size = 1.2;
    if (direction === 'right') {
        doc.triangle(
            x, y,
            x - size, y - size * 0.6,
            x - size, y + size * 0.6,
            'F'
        );
    } else {
        doc.triangle(
            x, y,
            x + size, y - size * 0.6,
            x + size, y + size * 0.6,
            'F'
        );
    }
}

export async function exportProgramToPDF(data: ProgramData): Promise<ArrayBuffer> {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Title in teal
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
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

    if (!minDate) minDate = new Date();
    if (!maxDate) {
        maxDate = new Date(minDate);
        maxDate.setMonth(maxDate.getMonth() + 6);
    }

    // Pad dates
    const paddedStart = new Date(minDate);
    paddedStart.setDate(paddedStart.getDate() - 7);
    const paddedEnd = new Date(maxDate);
    paddedEnd.setDate(paddedEnd.getDate() + 14);

    // Generate timeline columns
    const weekColumns = generateWeekColumns(paddedStart, paddedEnd);
    const monthGroups = groupByMonth(weekColumns);

    // Column widths
    const activityColWidth = 50;
    const startColWidth = 18;
    const endColWidth = 18;
    const fixedColsWidth = activityColWidth + startColWidth + endColWidth;
    const availableWidth = pageWidth - (2 * margin) - fixedColsWidth;
    const weekColWidth = Math.min(8, availableWidth / weekColumns.length);

    // === Month header row (Tier 1) ===
    const monthHeaderRow: CellDef[] = [
        {
            content: 'ACTIVITY',
            styles: {
                halign: 'left',
                fillColor: HEADER_BG as unknown as [number, number, number],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                cellPadding: 1,
            },
        },
        {
            content: 'START',
            styles: {
                halign: 'center',
                fillColor: HEADER_BG as unknown as [number, number, number],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 6,
                cellPadding: 1,
            },
        },
        {
            content: 'END',
            styles: {
                halign: 'center',
                fillColor: HEADER_BG as unknown as [number, number, number],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 6,
                cellPadding: 1,
            },
        },
    ];
    for (const [, group] of monthGroups) {
        monthHeaderRow.push({
            content: group.label,
            colSpan: group.count,
            styles: {
                halign: 'center',
                fillColor: HEADER_BG as unknown as [number, number, number],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                cellPadding: 1,
            },
        });
    }

    // === Week header row (Tier 2) ===
    const weekHeaderRow: CellDef[] = [
        { content: '', styles: { fillColor: HEADER_BG_LIGHT as unknown as [number, number, number], cellPadding: 1 } },
        { content: '', styles: { fillColor: HEADER_BG_LIGHT as unknown as [number, number, number], cellPadding: 1 } },
        { content: '', styles: { fillColor: HEADER_BG_LIGHT as unknown as [number, number, number], cellPadding: 1 } },
    ];
    for (const week of weekColumns) {
        weekHeaderRow.push({
            content: week.dayLabel,
            styles: {
                halign: 'center',
                fillColor: HEADER_BG_LIGHT as unknown as [number, number, number],
                textColor: [255, 255, 255],
                fontSize: 6,
                cellPadding: 1,
            },
        });
    }

    // === Body rows ===
    const bodyRows: RowInput[] = [];

    for (const activity of hierarchicalActivities) {
        const isParent = activity.depth === 0;
        const tierMarker = isParent ? '\u00BB ' : '\u00AB ';
        const indent = '  '.repeat(activity.depth);

        const row: CellDef[] = [
            // Activity name with tier marker
            {
                content: `${indent}${tierMarker}${activity.name}`,
                styles: {
                    halign: 'left',
                    fontSize: 7,
                    fontStyle: isParent ? 'bold' : 'normal',
                    textColor: isParent ? [30, 30, 30] : [100, 100, 100],
                    cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 1 },
                    overflow: 'ellipsize',
                },
            },
            // Start date
            {
                content: formatDateShort(activity.startDate),
                styles: {
                    halign: 'center',
                    fontSize: 6,
                    textColor: activity.startDate ? [80, 80, 80] : [180, 180, 180],
                    cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
                },
            },
            // End date
            {
                content: formatDateShort(activity.endDate),
                styles: {
                    halign: 'center',
                    fontSize: 6,
                    textColor: activity.endDate ? [80, 80, 80] : [180, 180, 180],
                    cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
                },
            },
        ];

        // Timeline cells (empty white - bars drawn on top after table)
        for (let _i = 0; _i < weekColumns.length; _i++) {
            row.push({
                content: '',
                styles: {
                    fillColor: [255, 255, 255],
                    cellPadding: 0,
                    minCellHeight: 6,
                },
            });
        }

        bodyRows.push(row);
    }

    // Column styles
    const columnStyles: { [key: number]: Partial<Styles> } = {
        0: { cellWidth: activityColWidth },
        1: { cellWidth: startColWidth },
        2: { cellWidth: endColWidth },
    };
    for (let i = 3; i < 3 + weekColumns.length; i++) {
        columnStyles[i] = { cellWidth: weekColWidth };
    }

    // === Cell position tracking for post-table bar/arrow drawing ===
    const rowPositions: Array<{ y: number; height: number }> = [];
    const colPositions: Array<{ x: number; width: number }> = [];
    let colsCaptured = false;

    // === Draw table ===
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
            if (hookData.section === 'body') {
                const rowIdx = hookData.row.index;
                const colIdx = hookData.column.index;

                // Capture row Y position from the activity name column
                if (colIdx === 0) {
                    rowPositions[rowIdx] = {
                        y: hookData.cell.y,
                        height: hookData.cell.height,
                    };
                }

                // Capture timeline column positions from the first body row
                if (!colsCaptured && colIdx >= 3) {
                    colPositions[colIdx - 3] = {
                        x: hookData.cell.x,
                        width: hookData.cell.width,
                    };
                    if (colIdx === 3 + weekColumns.length - 1) {
                        colsCaptured = true;
                    }
                }
            }
        },
        didParseCell: (hookData) => {
            if (hookData.section === 'body') {
                if (hookData.row.index % 2 === 1) {
                    hookData.cell.styles.fillColor = [250, 250, 250];
                }
            }
        },
    });

    // === Draw continuous activity bars ===
    if (colPositions.length > 0) {
        for (let i = 0; i < hierarchicalActivities.length; i++) {
            const activity = hierarchicalActivities[i];
            if (!activity.startDate || !activity.endDate) continue;

            const row = rowPositions[i];
            if (!row) continue;

            const startDate = new Date(activity.startDate);
            const endDate = new Date(activity.endDate);

            const barStartX = getTimelineX(startDate, weekColumns, colPositions);
            const barEndX = getTimelineX(endDate, weekColumns, colPositions);
            const barWidth = Math.max(barEndX - barStartX, 2);

            const barHeight = 4.5;
            const barY = row.y + (row.height - barHeight) / 2;

            // Fill and border
            doc.setFillColor(BAR_FILL[0], BAR_FILL[1], BAR_FILL[2]);
            doc.setDrawColor(BAR_BORDER[0], BAR_BORDER[1], BAR_BORDER[2]);
            doc.setLineWidth(0.2);
            doc.roundedRect(barStartX, barY, barWidth, barHeight, 0.5, 0.5, 'FD');

            // Activity name inside bar (if wide enough)
            if (barWidth > 15) {
                doc.setFontSize(5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
                const textY = barY + barHeight / 2 + 1.2;
                doc.text(activity.name, barStartX + 1.5, textY, {
                    maxWidth: barWidth - 3,
                });
            }
        }
    }

    // === Draw dependency arrows ===
    if (data.dependencies && data.dependencies.length > 0 && colPositions.length > 0) {
        for (const dep of data.dependencies) {
            const fromIdx = hierarchicalActivities.findIndex(a => a.id === dep.fromActivityId);
            const toIdx = hierarchicalActivities.findIndex(a => a.id === dep.toActivityId);
            if (fromIdx === -1 || toIdx === -1) continue;

            const fromActivity = hierarchicalActivities[fromIdx];
            const toActivity = hierarchicalActivities[toIdx];
            const fromRow = rowPositions[fromIdx];
            const toRow = rowPositions[toIdx];
            if (!fromRow || !toRow) continue;

            // Get dates based on dependency type
            let fromDate: Date | null = null;
            let toDate: Date | null = null;

            switch (dep.type) {
                case 'FS':
                    fromDate = fromActivity.endDate ? new Date(fromActivity.endDate) : null;
                    toDate = toActivity.startDate ? new Date(toActivity.startDate) : null;
                    break;
                case 'SS':
                    fromDate = fromActivity.startDate ? new Date(fromActivity.startDate) : null;
                    toDate = toActivity.startDate ? new Date(toActivity.startDate) : null;
                    break;
                case 'FF':
                    fromDate = fromActivity.endDate ? new Date(fromActivity.endDate) : null;
                    toDate = toActivity.endDate ? new Date(toActivity.endDate) : null;
                    break;
            }

            if (!fromDate || !toDate) continue;

            const fromX = getTimelineX(fromDate, weekColumns, colPositions);
            const toX = getTimelineX(toDate, weekColumns, colPositions);
            const fromY = fromRow.y + fromRow.height / 2;
            const toY = toRow.y + toRow.height / 2;

            // Set arrow styling
            doc.setDrawColor(ARROW_COLOR[0], ARROW_COLOR[1], ARROW_COLOR[2]);
            doc.setFillColor(ARROW_COLOR[0], ARROW_COLOR[1], ARROW_COLOR[2]);
            doc.setLineWidth(0.3);

            // Dashed lines for SS and FF
            if (dep.type !== 'FS') {
                doc.setLineDashPattern([1.5, 0.8], 0);
            } else {
                doc.setLineDashPattern([], 0);
            }

            // Route the arrow based on dependency type
            const gap = 3; // mm horizontal gap for routing
            const goingDown = toY > fromY;
            const midY = goingDown
                ? fromRow.y + fromRow.height + 0.5
                : fromRow.y - 0.5;

            if (dep.type === 'FS') {
                if (Math.abs(fromY - toY) < 0.5) {
                    // Same row - direct line
                    doc.line(fromX, fromY, toX, toY);
                } else if (toX >= fromX + gap) {
                    // Normal L-shape: right, drop, enter
                    const dropX = fromX + gap;
                    doc.line(fromX, fromY, dropX, fromY);
                    doc.line(dropX, fromY, dropX, toY);
                    doc.line(dropX, toY, toX, toY);
                } else {
                    // Route around: right, drop to gap, left, drop to target, enter
                    const exitX = fromX + gap;
                    const entryX = toX - gap;
                    doc.line(fromX, fromY, exitX, fromY);
                    doc.line(exitX, fromY, exitX, midY);
                    doc.line(exitX, midY, entryX, midY);
                    doc.line(entryX, midY, entryX, toY);
                    doc.line(entryX, toY, toX, toY);
                }
            } else if (dep.type === 'SS') {
                if (Math.abs(fromY - toY) < 0.5) {
                    doc.line(fromX, fromY, toX, toY);
                } else {
                    const exitX = Math.min(fromX, toX) - gap;
                    doc.line(fromX, fromY, exitX, fromY);
                    doc.line(exitX, fromY, exitX, toY);
                    doc.line(exitX, toY, toX, toY);
                }
            } else {
                // FF
                if (Math.abs(fromY - toY) < 0.5) {
                    doc.line(fromX, fromY, toX, toY);
                } else {
                    const exitX = Math.max(fromX, toX) + gap;
                    doc.line(fromX, fromY, exitX, fromY);
                    doc.line(exitX, fromY, exitX, toY);
                    doc.line(exitX, toY, toX, toY);
                }
            }

            // Reset dash pattern
            doc.setLineDashPattern([], 0);

            // Arrowhead at target: FS/SS enter from left (point right), FF enters from right (point left)
            drawArrowhead(doc, toX, toY, dep.type === 'FF' ? 'left' : 'right');

            // Start dot
            doc.circle(fromX, fromY, 0.5, 'F');
        }

        // Reset line dash
        doc.setLineDashPattern([], 0);
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
