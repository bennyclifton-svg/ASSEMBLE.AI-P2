/**
 * POST /api/reports/[id]/reset
 * Reset a stalled report generation - allows user to manually cancel and restart
 *
 * Flow:
 * 1. Fetch existing report
 * 2. Check if report is in a stalled state (generating for too long or stuck)
 * 3. Delete existing sections
 * 4. Reset status to toc_pending so generation can be restarted
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq } from 'drizzle-orm';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch existing report
    const report = await ragDb.query.reportTemplates.findFirst({
      where: eq(reportTemplates.id, id),
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Only allow reset for reports that are generating or failed
    if (report.status !== 'generating' && report.status !== 'failed') {
      return NextResponse.json(
        {
          error: 'Invalid status for reset',
          message: `Report status is '${report.status}'. Reset is only available for 'generating' or 'failed' reports.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Clear existing sections (will be regenerated)
    await ragDb.delete(reportSections).where(eq(reportSections.reportId, id));

    // Reset report to toc_pending state so user can re-approve TOC and regenerate
    await ragDb.update(reportTemplates)
      .set({
        status: 'toc_pending',
        currentSectionIndex: 0,
        updatedAt: now,
        // Clear graph state so a fresh generation can happen
        graphState: null,
        // Clear any edited content since we're starting fresh
        editedContent: null,
        isEdited: false,
        lastEditedAt: null,
      })
      .where(eq(reportTemplates.id, id));

    // Return updated report
    const updatedReport = await ragDb.query.reportTemplates.findFirst({
      where: eq(reportTemplates.id, id),
    });

    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: 'Report generation has been reset. You can now regenerate the report.',
    });

  } catch (error) {
    console.error('[api/reports/[id]/reset] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset report' },
      { status: 500 }
    );
  }
}
