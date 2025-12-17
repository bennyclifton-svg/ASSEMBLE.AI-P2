
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    rftNew,
    projects,
    projectDetails,
    projectObjectives,
    programActivities,
    consultantDisciplines,
    contractorTrades,
    costLines,
    rftNewTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories
} from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { exportToPDF } from '@/lib/export/pdf-enhanced';
import { exportToDOCX } from '@/lib/export/docx-enhanced';

type RouteParams = {
    params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { format } = body;

        // Validate format
        if (!format || !['pdf', 'docx'].includes(format)) {
            return NextResponse.json(
                { error: 'Invalid format. Must be "pdf" or "docx"' },
                { status: 400 }
            );
        }

        // 1. Fetch RFT NEW record
        const [report] = await db
            .select()
            .from(rftNew)
            .where(eq(rftNew.id, id))
            .limit(1);

        if (!report) {
            return NextResponse.json({ error: 'RFT NEW not found' }, { status: 404 });
        }

        const projectId = report.projectId;

        // 2. Fetch Project & Details
        const [project] = await db
            .select({ name: projects.name })
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);

        const [details] = await db
            .select({
                projectName: projectDetails.projectName,
                address: projectDetails.address,
            })
            .from(projectDetails)
            .where(eq(projectDetails.projectId, projectId))
            .limit(1);

        // 3. Fetch Planning Data (Objectives, Program Activities, Risks)
        const [objectives] = await db
            .select()
            .from(projectObjectives)
            .where(eq(projectObjectives.projectId, projectId))
            .limit(1);

        const activities = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId))
            .orderBy(asc(programActivities.sortOrder));

        // 4. Fetch Brief Data & Cost Lines
        let briefData = { service: '', deliverables: '', contextName: '' };
        let feeItems: any[] = [];
        let contextType = 'Unknown';

        if (report.disciplineId) {
            contextType = 'Discipline';
            const [discipline] = await db
                .select()
                .from(consultantDisciplines)
                .where(eq(consultantDisciplines.id, report.disciplineId))
                .limit(1);

            if (discipline) {
                briefData = {
                    service: discipline.briefServices || '',
                    deliverables: discipline.briefDeliverables || '',
                    contextName: discipline.disciplineName,
                };
            }

            // Fetch Cost Lines for Discipline
            feeItems = await db
                .select({
                    id: costLines.id,
                    activity: costLines.activity,
                })
                .from(costLines)
                .where(eq(costLines.disciplineId, report.disciplineId))
                .orderBy(asc(costLines.sortOrder));

        } else if (report.tradeId) {
            contextType = 'Trade';
            const [trade] = await db
                .select()
                .from(contractorTrades)
                .where(eq(contractorTrades.id, report.tradeId))
                .limit(1);

            if (trade) {
                briefData = {
                    service: trade.scopeWorks || '',
                    deliverables: trade.scopeDeliverables || '',
                    contextName: trade.tradeName,
                };
            }

            // Fetch Cost Lines for Trade
            feeItems = await db
                .select({
                    id: costLines.id,
                    activity: costLines.activity,
                })
                .from(costLines)
                .where(eq(costLines.tradeId, report.tradeId))
                .orderBy(asc(costLines.sortOrder));
        }

        // 5. Fetch Transmittal Documents
        const transmittalDocs = await db
            .select({
                originalName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                addedAt: rftNewTransmittals.addedAt,
            })
            .from(rftNewTransmittals)
            .innerJoin(documents, eq(rftNewTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id)) // Use leftJoin in case version is missing
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(rftNewTransmittals.rftNewId, id))
            .orderBy(asc(rftNewTransmittals.addedAt));

        // 6. Generate HTML
        const projectName = details?.projectName || project?.name || 'Untitled Project';
        const address = details?.address || '';
        const title = `RFT NEW - ${briefData.contextName}`;

        const htmlContent = generateRFTNewHTML({
            projectName,
            address,
            title,
            objectives,
            activities,
            brief: briefData,
            feeItems,
            transmittalDocs,
        });

        // 7. Generate PDF/DOCX
        let buffer: Buffer;
        let mimeType: string;
        let fileExtension: string;
        const exportTitle = `${projectName} - ${title}`;

        if (format === 'pdf') {
            const arrayBuffer = await exportToPDF(htmlContent, exportTitle);
            buffer = Buffer.from(arrayBuffer);
            mimeType = 'application/pdf';
            fileExtension = 'pdf';
        } else {
            buffer = await exportToDOCX(htmlContent, exportTitle);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            fileExtension = 'docx';
        }

        // Create filename
        const sanitizedTitle = exportTitle
            .replace(/[/\\:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100) || 'RFT_NEW';
        const filename = `${sanitizedTitle}.${fileExtension}`;

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('RFT NEW export error:', error);
        console.error('RFT NEW export error stack:', (error as Error).stack);
        return NextResponse.json(
            {
                error: 'Failed to export RFT NEW',
                details: (error as Error).message,
                stack: (error as Error).stack,
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// HTML GENERATOR
// ============================================================================

interface ProgramActivity {
    id: string;
    parentId: string | null;
    name: string;
    startDate: string | null;
    endDate: string | null;
    color: string | null;
    sortOrder: number;
}

interface HTMLParams {
    projectName: string;
    address: string;
    title: string;
    objectives: any;
    activities: ProgramActivity[];
    brief: { service: string; deliverables: string; contextName: string };
    feeItems: any[];
    transmittalDocs: any[];
}

// Helper to get week start (Monday) for a date
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Generate weekly columns with month grouping
interface WeekColumn {
    start: Date;
    dayLabel: number;
    month: string;
    year: number;
}

function generateWeekColumnsWithMonths(startDate: Date, endDate: Date): WeekColumn[] {
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

// Group columns by month for header
function groupColumnsByMonth(columns: WeekColumn[]): { label: string; count: number }[] {
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

// Generate Program Gantt HTML - PDF-friendly version using pure table cells (no absolute positioning)
function generateProgramGanttHTML(activities: ProgramActivity[]): string {
    const activitiesWithDates = activities.filter(a => a.startDate && a.endDate);

    if (activitiesWithDates.length === 0) {
        return `
            <h3>Program</h3>
            <p style="color: #666; font-size: 12px;">No program activities with dates.</p>
        `;
    }

    // Calculate date range
    const allDates = activitiesWithDates.flatMap(a => [
        new Date(a.startDate!),
        new Date(a.endDate!),
    ]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Generate week columns with month info
    const weekColumns = generateWeekColumnsWithMonths(minDate, maxDate);
    const monthGroups = groupColumnsByMonth(weekColumns);
    const columnWidth = 40; // pixels per week column for print

    // Build hierarchy (parent activities first, then children)
    const parentActivities = activities.filter(a => !a.parentId);
    const childActivities = activities.filter(a => a.parentId);

    const orderedActivities: ProgramActivity[] = [];
    parentActivities.forEach(parent => {
        orderedActivities.push(parent);
        const children = childActivities.filter(c => c.parentId === parent.id);
        children.sort((a, b) => a.sortOrder - b.sortOrder);
        orderedActivities.push(...children);
    });
    // Add orphaned children
    childActivities.filter(c => !parentActivities.some(p => p.id === c.parentId)).forEach(a => {
        orderedActivities.push(a);
    });

    // All bars use consistent teal color
    const barColor = '#0d9488';

    // Generate month header row (use bgcolor for PDF compatibility)
    const monthHeaderCells = monthGroups.map(group =>
        `<th colspan="${group.count}" bgcolor="#f5f5f5" style="text-align: center; font-size: 10px; padding: 4px; border: 1px solid #ddd; white-space: nowrap;">${group.label}</th>`
    ).join('');

    // Generate day number header row
    const dayHeaderCells = weekColumns.map(col =>
        `<th bgcolor="#f5f5f5" style="width: ${columnWidth}px; text-align: center; font-size: 9px; padding: 3px; border: 1px solid #ddd;">${col.dayLabel}</th>`
    ).join('');

    // Check if a week column falls within an activity's date range
    const isWeekInRange = (weekStart: Date, activityStart: Date, activityEnd: Date): boolean => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        // Week overlaps with activity if week starts before activity ends AND week ends after activity starts
        return weekStart <= activityEnd && weekEnd >= activityStart;
    };

    // Generate activity rows using individual cells for timeline
    const activityRows = orderedActivities.map(activity => {
        const isChild = !!activity.parentId;
        const hasDateRange = activity.startDate && activity.endDate;
        const activityStart = hasDateRange ? new Date(activity.startDate!) : null;
        const activityEnd = hasDateRange ? new Date(activity.endDate!) : null;

        // Color indicator for children, chevron for parents (use simple > for PDF compatibility)
        const indicator = isChild
            ? `<span style="display: inline-block; width: 4px; height: 12px; background: ${barColor}; margin-right: 6px;"></span>`
            : `<span style="color: #666; margin-right: 4px;">&gt;</span>`;

        const nameStyle = isChild
            ? 'font-weight: normal; color: #555;'
            : 'font-weight: 600; color: #333;';

        // Indentation for child activities
        const paddingLeft = isChild ? '16px' : '6px';

        // Generate timeline cells - color cell if it falls within activity date range
        // Use bgcolor attribute for PDF compatibility (CSS background-color often doesn't render in PDF)
        const timelineCells = weekColumns.map(col => {
            const inRange = hasDateRange && activityStart && activityEnd && isWeekInRange(col.start, activityStart, activityEnd);
            if (inRange) {
                return `<td bgcolor="${barColor}" style="width: ${columnWidth}px; height: 20px; padding: 0; border: 1px solid #ddd;"></td>`;
            }
            return `<td style="width: ${columnWidth}px; height: 20px; padding: 0; border: 1px solid #eee; background-color: #fff;"></td>`;
        }).join('');

        return `
            <tr>
                <td style="padding: 4px 6px; padding-left: ${paddingLeft}; border: 1px solid #ddd; white-space: nowrap; font-size: 10px; ${nameStyle}">
                    ${indicator}${escapeHtml(activity.name)}
                </td>
                ${timelineCells}
            </tr>
        `;
    }).join('');

    return `
        <h3>Program</h3>
        <table class="gantt-table" style="table-layout: fixed; border-collapse: collapse;">
            <thead>
                <tr>
                    <th rowspan="2" bgcolor="#f5f5f5" style="width: 160px; text-align: left; padding: 6px 8px; border: 1px solid #ddd; font-size: 10px; font-weight: bold;">Activity</th>
                    ${monthHeaderCells}
                </tr>
                <tr>
                    ${dayHeaderCells}
                </tr>
            </thead>
            <tbody>
                ${activityRows}
            </tbody>
        </table>
    `;
}

function generateRFTNewHTML(params: HTMLParams): string {
    const { projectName, address, title, objectives, activities, brief, feeItems, transmittalDocs } = params;

    const logoHtml = `<div style="margin-bottom: 20px; font-size: 24px; font-weight: bold; color: #333;">ASSEMBLE.AI</div>`;

    // 1. Objectives Rows
    const objectiveRows = `
        <tr><td class="label">Functional</td><td>${escapeHtml(objectives?.functional || '-')}</td></tr>
        <tr><td class="label">Quality</td><td>${escapeHtml(objectives?.quality || '-')}</td></tr>
        <tr><td class="label">Budget</td><td>${escapeHtml(objectives?.budget || '-')}</td></tr>
        <tr><td class="label">Program</td><td>${escapeHtml(objectives?.program || '-')}</td></tr>
    `;

    // 2. Program Gantt
    const programHtml = generateProgramGanttHTML(activities);

    // 3. Fee Rows
    const feeRows = feeItems.length > 0
        ? feeItems.map(item => `
            <tr>
                <td>${escapeHtml(item.activity)}</td>
                <td style="background-color: #fcfcfc;"></td> <!-- Empty for nomination -->
            </tr>
        `).join('')
        : '<tr><td colspan="2" style="text-align: center; color: #666;">No cost plan items found.</td></tr>';

    // 5. Transmittal Rows
    const transmittalRows = transmittalDocs.length > 0
        ? transmittalDocs.map((doc, index) => `
            <tr>
                <td style="text-align: center; color: #666;">${index + 1}</td>
                <td>${escapeHtml(doc.originalName || 'Unknown')}</td>
                <td style="text-align: center;">${String(doc.versionNumber || 0).padStart(2, '0')}</td>
                <td>${escapeHtml(doc.categoryName || '-')}</td>
                <td>${escapeHtml(doc.subcategoryName || '-')}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="5" style="text-align: center; color: #666;">No documents attached.</td></tr>';

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h3 { color: #444; border-bottom: 2px solid #ddd; padding-bottom: 8px; margin-top: 30px; text-transform: uppercase; font-size: 14px; letter-spacing: 0.5px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
        th, td { padding: 8px 10px; border: 1px solid #ddd; text-align: left; vertical-align: top; }
        th { background-color: #f5f5f5; font-weight: bold; color: #555; }
        
        .project-table td.label { width: 140px; background-color: #f5f5f5; font-weight: bold; color: #555; }
        .project-table td.value { font-size: 14px; }
        
        .section-table td.label { width: 140px; background-color: #f5f5f5; font-weight: bold; color: #555; }
        
        .fee-table th:last-child { width: 30%; }

        .brief-content { background-color: #fafafa; padding: 10px; border: 1px solid #eee; min-height: 40px; white-space: pre-wrap; font-size: 12px; }

        .gantt-table { table-layout: fixed; }
        .gantt-table th, .gantt-table td { border: 1px solid #ddd; }
        .gantt-table th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    ${logoHtml}
    
    <!-- Project Info -->
    <table class="project-table">
        <tr><td class="label">Project Name</td><td class="value">${escapeHtml(projectName)}</td></tr>
        <tr><td class="label">Address</td><td class="value">${escapeHtml(address)}</td></tr>
        <tr><td class="label">Document</td><td class="value" style="font-weight: bold;">${escapeHtml(title)}</td></tr>
    </table>

    <!-- Objectives -->
    <h3>Objectives</h3>
    <table class="section-table">
        ${objectiveRows}
    </table>

    <!-- Brief -->
    <h3>Brief</h3>
    <table class="section-table">
        <tr>
            <td class="label">Service</td>
            <td><div class="brief-content">${escapeHtml(brief.service || '-')}</div></td>
        </tr>
        <tr>
            <td class="label">Deliverables</td>
            <td><div class="brief-content">${escapeHtml(brief.deliverables || '-')}</div></td>
        </tr>
    </table>

    <!-- Program -->
    ${programHtml}

    <!-- Fee -->
    <h3>Fee Structure</h3>
    <table class="fee-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Amount (Excl. GST)</th>
            </tr>
        </thead>
        <tbody>
            ${feeRows}
        </tbody>
    </table>

    <!-- Transmittal -->
    <h3>Transmittal Document Schedule</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th>Document</th>
                <th style="width: 8%; text-align: center;">Rev</th>
                <th style="width: 20%;">Category</th>
                <th style="width: 20%;">Subcategory</th>
            </tr>
        </thead>
        <tbody>
            ${transmittalRows}
        </tbody>
    </table>
</body>
</html>
    `.trim();
}

function escapeHtml(text: string): string {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
