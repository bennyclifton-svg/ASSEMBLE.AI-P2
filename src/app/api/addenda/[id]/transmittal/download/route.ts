/**
 * Addendum Transmittal Download API Route
 * GET /api/addenda/[id]/transmittal/download - Download transmittal documents as ZIP
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { addenda, addendumTransmittals, documents, versions, fileAssets, categories, subcategories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;

        // 1. Verify Addendum exists and get context info
        const [existing] = await db
            .select({
                id: addenda.id,
                addendumNumber: addenda.addendumNumber,
                disciplineId: addenda.disciplineId,
                tradeId: addenda.tradeId,
            })
            .from(addenda)
            .where(eq(addenda.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Addendum not found' }, { status: 404 });
        }

        // 2. Fetch transmittal items with document details
        const items = await db
            .select({
                originalName: fileAssets.originalName,
                storagePath: fileAssets.storagePath,
                versionNumber: versions.versionNumber,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                sortOrder: addendumTransmittals.sortOrder,
            })
            .from(addendumTransmittals)
            .innerJoin(documents, eq(addendumTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(addendumTransmittals.addendumId, id))
            .orderBy(addendumTransmittals.sortOrder);

        if (items.length === 0) {
            return NextResponse.json({ error: 'Transmittal is empty' }, { status: 400 });
        }

        // 3. Create ZIP
        const zip = new JSZip();
        const addendumNumber = String(existing.addendumNumber).padStart(2, '0');
        const folderName = `Addendum_${addendumNumber}_Transmittal`;
        const folder = zip.folder(folderName) || zip;

        // Add files to ZIP
        for (const item of items) {
            try {
                // Storage paths are relative like /uploads/filename.ext
                // Need to join with process.cwd() to get full path
                const fullPath = item.storagePath ? path.join(process.cwd(), item.storagePath) : null;
                if (fullPath && fs.existsSync(fullPath)) {
                    const fileData = fs.readFileSync(fullPath);
                    folder.file(item.originalName || 'unknown_file', fileData);
                } else {
                    console.warn(`File not found: ${fullPath}`);
                    folder.file(`${item.originalName || 'unknown'}.txt`, `Error: File not found on server.`);
                }
            } catch (e) {
                console.error(`Failed to add file ${item.originalName} to zip`, e);
            }
        }

        // 4. Generate Transmittal Cover Sheet (PDF)
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Addendum ${addendumNumber} Transmittal`, 14, 22);

        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
        doc.text(`Total Documents: ${items.length}`, 14, 38);

        const tableData = items.map((item: typeof items[number], index: number) => [
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
        folder.file('Transmittal_Cover_Sheet.pdf', pdfBuffer);

        // 5. Generate ZIP Buffer
        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

        // 6. Return Response
        const filename = `Addendum_${addendumNumber}_Transmittal_${new Date().toISOString().split('T')[0]}.zip`;

        return new NextResponse(zipContent as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    });
}
