/**
 * T143: Export API Endpoint
 *
 * POST /api/reports/[id]/export
 * - Accepts format parameter ('pdf' or 'docx')
 * - Fetches report content from database
 * - Calls appropriate export function
 * - Returns binary file with proper headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq, asc } from 'drizzle-orm';
import { exportToPDF } from '@/lib/export/pdf-enhanced';
import { exportToDOCX } from '@/lib/export/docx-enhanced';
import { sectionsToHTML } from '@/lib/utils/report-formatting';

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

    // Fetch report
    const [report] = await ragDb
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.id, id))
      .limit(1);

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get HTML content
    let htmlContent: string;

    if (report.editedContent) {
      // Use edited content if available
      htmlContent = report.editedContent;
    } else {
      // Generate from sections
      const sections = await ragDb
        .select()
        .from(reportSections)
        .where(eq(reportSections.reportId, id))
        .orderBy(asc(reportSections.sectionIndex));

      const tableOfContents = report.tableOfContents as any;
      htmlContent = sectionsToHTML(sections, tableOfContents);
    }

    // Generate export blob
    let blob: Blob;
    let mimeType: string;
    let fileExtension: string;

    if (format === 'pdf') {
      blob = await exportToPDF(htmlContent, report.reportTitle);
      mimeType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      blob = await exportToDOCX(htmlContent, report.reportTitle);
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileExtension = 'docx';
    }

    // Create filename (sanitize report title)
    const sanitizedTitle = report.reportTitle
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100);
    const filename = `${sanitizedTitle}.${fileExtension}`;

    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return binary response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export report', details: (error as Error).message },
      { status: 500 }
    );
  }
}
