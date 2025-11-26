import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { transmittals, transmittalItems, versions, fileAssets, documents, subcategories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleApiError(async () => {
        const { id: transmittalId } = await params;

        // 1. Fetch Transmittal Details
        const transmittal = await db.select({
            id: transmittals.id,
            name: transmittals.name,
            status: transmittals.status,
            issuedAt: transmittals.issuedAt,
            subcategoryName: subcategories.name,
        })
            .from(transmittals)
            .leftJoin(subcategories, eq(transmittals.subcategoryId, subcategories.id))
            .where(eq(transmittals.id, transmittalId))
            .get();

        if (!transmittal) {
            return NextResponse.json({ error: 'Transmittal not found' }, { status: 404 });
        }

        // 2. Fetch Items
        const items = await db.select({
            originalName: fileAssets.originalName,
            storagePath: fileAssets.storagePath,
            versionNumber: versions.versionNumber,
            documentId: documents.id,
        })
            .from(transmittalItems)
            .innerJoin(versions, eq(transmittalItems.versionId, versions.id))
            .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .innerJoin(documents, eq(versions.documentId, documents.id))
            .where(eq(transmittalItems.transmittalId, transmittalId));

        if (items.length === 0) {
            return NextResponse.json({ error: 'Transmittal is empty' }, { status: 400 });
        }

        // 3. Create ZIP
        const zip = new JSZip();
        const folder = zip.folder(transmittal.name) || zip;

        // Add files to ZIP
        for (const item of items) {
            try {
                if (fs.existsSync(item.storagePath)) {
                    const fileData = fs.readFileSync(item.storagePath);
                    folder.file(item.originalName, fileData);
                } else {
                    console.warn(`File not found: ${item.storagePath}`);
                    folder.file(`${item.originalName}.txt`, `Error: File not found on server.`);
                }
            } catch (e) {
                console.error(`Failed to add file ${item.originalName} to zip`, e);
            }
        }

        // 4. Generate Transmittal Sheet (PDF)
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Transmittal Sheet', 14, 22);

        doc.setFontSize(12);
        doc.text(`Name: ${transmittal.name}`, 14, 32);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38);
        doc.text(`Status: ${transmittal.status}`, 14, 44);
        doc.text(`Subcategory: ${transmittal.subcategoryName || '-'}`, 14, 50);

        const tableData = items.map(item => [
            item.originalName,
            `v${item.versionNumber}`,
            'Transmitted'
        ]);

        autoTable(doc, {
            startY: 60,
            head: [['Document Name', 'Version', 'Status']],
            body: tableData,
        });

        const pdfBuffer = doc.output('arraybuffer');
        folder.file('Transmittal_Sheet.pdf', pdfBuffer);

        // 5. Generate ZIP Buffer
        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

        // 6. Return Response
        // Cast Buffer to any to bypass strict type check or convert to Uint8Array
        return new NextResponse(zipContent as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${transmittal.name.replace(/[^a-z0-9]/gi, '_')}.zip"`,
            },
        });
    });
}
