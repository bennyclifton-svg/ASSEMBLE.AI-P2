/**
 * T147: POST /api/reports/[id]/refresh
 * Refresh Short RFT with updated data from database
 *
 * Flow:
 * 1. Fetch existing report
 * 2. Re-fetch planning context, consultants, transmittals
 * 3. Re-generate report in data_only mode
 * 4. Update editedContent with new HTML
 * 5. Optionally preserve user edits
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq } from 'drizzle-orm';
import { startReportGeneration } from '@/lib/langgraph/graph';

type RouteParams = {
  params: Promise<{ id: string }>;
};

interface RefreshRequest {
  preserveEdits?: boolean;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: RefreshRequest = await request.json();

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

    // Only allow refresh for Short RFT (data_only mode)
    if (report.reportChain !== 'short') {
      return NextResponse.json(
        { error: 'Refresh is only available for Short RFT reports' },
        { status: 400 }
      );
    }

    // Check if report has been edited
    if (report.isEdited && !body.preserveEdits) {
      return NextResponse.json(
        {
          error: 'Report has been edited',
          message: 'Report contains manual edits. Use preserveEdits flag to overwrite.',
          isEdited: true,
        },
        { status: 409 }
      );
    }

    // TODO: Get user from session
    const userId = 'user-placeholder';
    const userName = 'Current User';

    // Lock the report for refresh
    const now = new Date();
    await ragDb.update(reportTemplates)
      .set({
        lockedBy: userId,
        lockedByName: userName,
        lockedAt: now,
        status: 'generating',
        updatedAt: now,
      })
      .where(eq(reportTemplates.id, id));

    // Clear existing sections (will be regenerated)
    await ragDb.delete(reportSections).where(eq(reportSections.reportId, id));

    // Re-generate report using LangGraph workflow in data_only mode
    const { threadId, state } = await startReportGeneration({
      projectId: report.projectId,
      reportType: report.reportType,
      title: report.title,
      discipline: report.discipline ?? undefined,
      documentSetIds: report.documentSetIds,
      reportId: id,
      generationMode: 'data_only', // Force data_only mode for refresh
      lockedBy: userId,
      lockedByName: userName,
    });

    // Update report with new TOC and reset edit flags
    const updateData: any = {
      tableOfContents: state.toc,
      status: 'toc_pending',
      graphState: {
        threadId,
        checkpointId: `${threadId}-1`,
        messages: [],
      },
      updatedAt: new Date(),
    };

    // If preserveEdits is false, clear edited content
    if (!body.preserveEdits) {
      updateData.editedContent = null;
      updateData.isEdited = false;
      updateData.lastEditedAt = null;
    }

    await ragDb.update(reportTemplates)
      .set(updateData)
      .where(eq(reportTemplates.id, id));

    // Return updated report
    const updatedReport = await ragDb.query.reportTemplates.findFirst({
      where: eq(reportTemplates.id, id),
    });

    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: 'Report refresh initiated',
    });

  } catch (error) {
    console.error('[api/reports/[id]/refresh] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh report' },
      { status: 500 }
    );
  }
}
