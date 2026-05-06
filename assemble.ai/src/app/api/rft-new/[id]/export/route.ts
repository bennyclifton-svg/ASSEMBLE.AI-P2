
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    rftNew,
    projects,
    projectDetails,
    programActivities,
    projectStakeholders,
    costLines,
    rftNewTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories
} from '@/lib/db';
import { projectObjectives } from '@/lib/db/objectives-schema';
import { and, eq, asc } from 'drizzle-orm';
import { exportRFTNewToPDF } from '@/lib/export/pdf-enhanced';
import { exportRFTNewToDOCX } from '@/lib/export/docx-enhanced';
import type { RFTExportData } from '@/lib/export/rft-export';

type RouteParams = {
    params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { format } = body;

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

        // 3. Fetch Project Objectives (planning, functional, quality, compliance)
        const objectiveRows = await db
            .select()
            .from(projectObjectives)
            .where(and(
                eq(projectObjectives.projectId, projectId),
                eq(projectObjectives.isDeleted, false),
            ))
            .orderBy(asc(projectObjectives.objectiveType), asc(projectObjectives.sortOrder));

        const objectivesByType = {
            planning: objectiveRows
                .filter(r => r.objectiveType === 'planning')
                .map(r => r.textPolished ?? r.text),
            functional: objectiveRows
                .filter(r => r.objectiveType === 'functional')
                .map(r => r.textPolished ?? r.text),
            quality: objectiveRows
                .filter(r => r.objectiveType === 'quality')
                .map(r => r.textPolished ?? r.text),
            compliance: objectiveRows
                .filter(r => r.objectiveType === 'compliance')
                .map(r => r.textPolished ?? r.text),
        };

        // 4. Fetch Program Activities
        const activities = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId))
            .orderBy(asc(programActivities.sortOrder));

        // 5. Fetch Brief Data & Cost Lines (filtered by stakeholder)
        let briefService = '';
        let briefDeliverables = '';
        let contextName = '';
        let feeItems: { activity: string }[] = [];

        if (report.stakeholderId) {
            const [stakeholder] = await db
                .select()
                .from(projectStakeholders)
                .where(eq(projectStakeholders.id, report.stakeholderId))
                .limit(1);

            if (stakeholder) {
                // Honour the user's persisted view mode per sub-section. Long
                // mode prefers the polished column but falls back to the short
                // column if no polished content has been generated yet.
                briefService = stakeholder.briefServicesViewMode === 'long'
                    ? (stakeholder.briefServicesPolished || stakeholder.briefServices || '')
                    : (stakeholder.briefServices || '');
                briefDeliverables = stakeholder.briefDeliverablesViewMode === 'long'
                    ? (stakeholder.briefDeliverablesPolished || stakeholder.briefDeliverables || '')
                    : (stakeholder.briefDeliverables || '');
                contextName = stakeholder.name;
            }

            feeItems = await db
                .select({
                    activity: costLines.activity,
                })
                .from(costLines)
                .where(eq(costLines.stakeholderId, report.stakeholderId))
                .orderBy(asc(costLines.sortOrder));
        }

        // 6. Fetch Transmittal Documents (with drawing extraction fields)
        const transmittalDocs = await db
            .select({
                drawingNumber: fileAssets.drawingNumber,
                drawingName: fileAssets.drawingName,
                originalName: fileAssets.originalName,
                drawingRevision: fileAssets.drawingRevision,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
            })
            .from(rftNewTransmittals)
            .innerJoin(documents, eq(rftNewTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(rftNewTransmittals.rftNewId, id))
            .orderBy(asc(rftNewTransmittals.addedAt));

        // 7. Build export data matching RFTExportData interface
        const projectName = details?.projectName || project?.name || 'Untitled Project';
        const address = details?.address || '';
        const rftNum = String(report.rftNumber).padStart(2, '0');
        const documentLabel = `Request For Tender, ${contextName} ${rftNum}`;

        // Format date as DD/MM/YYYY (dedicated exporters prepend "Issued ")
        const rftDateStr = report.rftDate || new Date().toISOString().split('T')[0];
        const [year, month, day] = rftDateStr.split('-');
        const issuedDate = `${day}/${month}/${year}`;

        const exportData: RFTExportData = {
            projectName,
            address,
            documentLabel,
            issuedDate,
            objectivesVisible: report.objectivesVisible,
            programVisible: report.programVisible,
            objectives: objectivesByType,
            brief: {
                service: briefService,
                deliverables: briefDeliverables,
            },
            activities: activities.map(a => ({
                id: a.id,
                parentId: a.parentId,
                name: a.name,
                startDate: a.startDate,
                endDate: a.endDate,
                color: null,
                sortOrder: a.sortOrder,
            })),
            feeItems,
            transmittalDocs: transmittalDocs.map(d => ({
                drawingNumber: d.drawingNumber || null,
                drawingName: d.drawingName || null,
                originalName: d.originalName || 'Unknown',
                drawingRevision: d.drawingRevision || null,
                categoryName: d.categoryName || null,
                subcategoryName: d.subcategoryName || null,
            })),
        };

        // 8. Generate PDF or DOCX using dedicated RFT exporters
        let buffer: Buffer;
        let mimeType: string;
        let fileExtension: string;
        const exportTitle = `${projectName} - ${documentLabel}`;

        if (format === 'pdf') {
            const arrayBuffer = await exportRFTNewToPDF(exportData);
            buffer = Buffer.from(arrayBuffer);
            mimeType = 'application/pdf';
            fileExtension = 'pdf';
        } else {
            buffer = await exportRFTNewToDOCX(exportData);
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            fileExtension = 'docx';
        }

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
