/**
 * TRR Transmittal Download API Route
 * GET /api/trr/[id]/transmittal/download - Download TRR attachments as ZIP
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { trr, trrTransmittals, documents, versions, fileAssets, categories, subcategories } from '@/lib/db';
import { eq } from 'drizzle-orm';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getFileFromStorage } from '@/lib/storage';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;

        // 1. Verify TRR exists
        const [existing] = await db
            .select({
                id: trr.id,
                disciplineId: trr.disciplineId,
                tradeId: trr.tradeId,
            })
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        // 2. Fetch transmittal items with document details
        const items = await db
            .select({
                originalName: fileAssets.originalName,
                storagePath: fileAssets.storagePath,
                versionNumber: versions.versionNumber,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
            })
            .from(trrTransmittals)
            .innerJoin(documents, eq(trrTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(trrTransmittals.trrId, id));

        if (items.length === 0) {
            return NextResponse.json({ error: 'No attachments found' }, { status: 400 });
        }

        // 3. Create ZIP
        const zip = new JSZip();
        const folderName = 'TRR_Attachments';
        const folder = zip.folder(folderName) || zip;

        // Add files to ZIP
        for (const item of items) {
            try {
                // Use getFileFromStorage to support both local and Supabase storage
                if (item.storagePath) {
                    const fileData = await getFileFromStorage(item.storagePath);
                    if (fileData) {
                        folder.file(item.originalName || 'unknown_file', fileData);
                    } else {
                        console.warn(`File not found: ${item.storagePath}`);
                        folder.file(`${item.originalName || 'unknown'}.txt`, `Error: File not found on server.`);
                    }
                } else {
                    folder.file(`${item.originalName || 'unknown'}.txt`, `Error: No storage path.`);
                }
            } catch (e) {
                console.error(`Failed to add file ${item.originalName} to zip`, e);
            }
        }

        // 4. Generate Attachments Cover Sheet (PDF)
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('TRR Attachments', 14, 22);

        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
        doc.text(`Total Documents: ${items.length}`, 14, 38);

        const tableData = items.map((item, index) => [
            (index + 1).toString(),
            item.originalName || 'Unknown',
            `v${item.versionNumber || 1}`,
            item.categoryName || '-',
            item.subcategoryName || '-',
        ]);

        autoTable(doc, {
            startY: 48,
            head: [['#', 'Document Name', 'Rev', 'Category', 'Subcategory']],
            body: tableData,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [91, 155, 213] },
        });

        const pdfBuffer = doc.output('arraybuffer');
        folder.file('Attachments_Cover_Sheet.pdf', pdfBuffer);

        // 5. Generate ZIP Buffer
        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

        // 6. Return Response
        const filename = `TRR_Attachments_${new Date().toISOString().split('T')[0]}.zip`;

        return new NextResponse(zipContent as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    });
}
