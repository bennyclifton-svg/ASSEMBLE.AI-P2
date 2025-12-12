/**
 * T147: POST /api/reports/[id]/refresh
 * Refresh Short RFT - clears sections and resets to TOC pending
 *
 * Flow:
 * 1. Fetch existing report
 * 2. Delete existing sections
 * 3. Reset status to toc_pending
 * 4. Clear edited content (unless preserveEdits is true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq } from 'drizzle-orm';

type RouteParams = {
  params: Promise<{ id: string }>;
};

interface RefreshRequest {
  preserveEdits?: boolean;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse body safely - may be empty
    let body: RefreshRequest = {};
    try {
      body = await request.json();
    } catch {
      // No body sent - use defaults
    }

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

    // Only allow refresh for Short RFT (data_only mode) or reports without chain set
    // Allow refresh if reportChain is 'short', null, or undefined
    if (report.reportChain && report.reportChain !== 'short') {
      return NextResponse.json(
        { error: 'Refresh is only available for Short RFT reports' },
        { status: 400 }
      );
    }

    // Check if report has been edited - skip check if preserveEdits is explicitly false
    if (report.isEdited && body.preserveEdits !== false && !body.preserveEdits) {
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

    const now = new Date();

    // Clear existing sections (will be regenerated)
    await ragDb.delete(reportSections).where(eq(reportSections.reportId, id));

    // Reset report to toc_pending state so user can re-approve TOC and regenerate
    const updateData: Record<string, any> = {
      status: 'toc_pending',
      lockedBy: userId,
      lockedByName: userName,
      lockedAt: now,
      updatedAt: now,
      // Clear graph state so a fresh generation can happen
      graphState: null,
    };

    // Clear edited content unless preserveEdits is true
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
