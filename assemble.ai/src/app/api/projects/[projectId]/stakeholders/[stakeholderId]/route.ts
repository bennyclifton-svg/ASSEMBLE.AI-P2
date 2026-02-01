/**
 * Individual Stakeholder API Route
 * Feature: 020-stakeholder
 *
 * GET /api/projects/[projectId]/stakeholders/[stakeholderId] - Get stakeholder
 * PATCH /api/projects/[projectId]/stakeholders/[stakeholderId] - Update stakeholder
 * DELETE /api/projects/[projectId]/stakeholders/[stakeholderId] - Delete stakeholder
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getStakeholderById,
  updateStakeholder,
  deleteStakeholder,
  updateTenderStatus,
  updateSubmissionStatus,
} from '@/lib/services/stakeholder-service';
import type { UpdateStakeholderRequest, TenderStatusType, SubmissionStatus } from '@/types/stakeholder';

interface RouteParams {
  params: Promise<{ projectId: string; stakeholderId: string }>;
}

/**
 * GET /api/projects/[projectId]/stakeholders/[stakeholderId]
 * Get a single stakeholder
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stakeholderId } = await params;

    if (!stakeholderId) {
      return NextResponse.json(
        { error: 'Stakeholder ID is required' },
        { status: 400 }
      );
    }

    const stakeholder = await getStakeholderById(stakeholderId);

    if (!stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(stakeholder);
  } catch (error) {
    console.error('[GET /api/projects/[projectId]/stakeholders/[stakeholderId]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stakeholder' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[projectId]/stakeholders/[stakeholderId]
 * Update a stakeholder
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { stakeholderId } = await params;

    if (!stakeholderId) {
      return NextResponse.json(
        { error: 'Stakeholder ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if this is a status update
    if (body.statusUpdate) {
      const { type, data } = body.statusUpdate;

      if (type === 'tender') {
        // Update tender status
        const statusType = data.statusType as TenderStatusType;
        if (!['brief', 'tender', 'rec', 'award'].includes(statusType)) {
          return NextResponse.json(
            { error: 'Invalid tender status type' },
            { status: 400 }
          );
        }

        const result = await updateTenderStatus(stakeholderId, {
          statusType,
          isActive: data.isActive,
          isComplete: data.isComplete,
        });

        if (!result) {
          return NextResponse.json(
            { error: 'Tender status not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(result);
      }

      if (type === 'submission') {
        // Update submission status
        const status = data.status as SubmissionStatus;
        if (!['pending', 'submitted', 'approved', 'rejected', 'withdrawn'].includes(status)) {
          return NextResponse.json(
            { error: 'Invalid submission status' },
            { status: 400 }
          );
        }

        const result = await updateSubmissionStatus(stakeholderId, {
          status,
          submissionRef: data.submissionRef,
          responseDue: data.responseDue,
          responseNotes: data.responseNotes,
          conditions: data.conditions,
          conditionsCleared: data.conditionsCleared,
        });

        if (!result) {
          return NextResponse.json(
            { error: 'Submission status not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(result);
      }

      return NextResponse.json(
        { error: 'Invalid status update type' },
        { status: 400 }
      );
    }

    // Regular stakeholder update
    const updateRequest: UpdateStakeholderRequest = {};

    if (body.name !== undefined) updateRequest.name = body.name;
    if (body.role !== undefined) updateRequest.role = body.role;
    if (body.organization !== undefined) updateRequest.organization = body.organization;
    if (body.contactName !== undefined) updateRequest.contactName = body.contactName;
    if (body.contactEmail !== undefined) updateRequest.contactEmail = body.contactEmail;
    if (body.contactPhone !== undefined) updateRequest.contactPhone = body.contactPhone;
    if (body.isEnabled !== undefined) updateRequest.isEnabled = body.isEnabled;
    if (body.briefServices !== undefined) updateRequest.briefServices = body.briefServices;
    if (body.briefDeliverables !== undefined) updateRequest.briefDeliverables = body.briefDeliverables;
    if (body.briefFee !== undefined) updateRequest.briefFee = body.briefFee;
    if (body.briefProgram !== undefined) updateRequest.briefProgram = body.briefProgram;
    if (body.scopeWorks !== undefined) updateRequest.scopeWorks = body.scopeWorks;
    if (body.scopePrice !== undefined) updateRequest.scopePrice = body.scopePrice;
    if (body.scopeProgram !== undefined) updateRequest.scopeProgram = body.scopeProgram;
    if (body.submissionRef !== undefined) updateRequest.submissionRef = body.submissionRef;
    if (body.submissionType !== undefined) updateRequest.submissionType = body.submissionType;
    if (body.notes !== undefined) updateRequest.notes = body.notes;

    const stakeholder = await updateStakeholder(stakeholderId, updateRequest);

    if (!stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(stakeholder);
  } catch (error) {
    console.error('[PATCH /api/projects/[projectId]/stakeholders/[stakeholderId]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update stakeholder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/stakeholders/[stakeholderId]
 * Delete a stakeholder (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { stakeholderId } = await params;

    if (!stakeholderId) {
      return NextResponse.json(
        { error: 'Stakeholder ID is required' },
        { status: 400 }
      );
    }

    const success = await deleteStakeholder(stakeholderId);

    if (!success) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/projects/[projectId]/stakeholders/[stakeholderId]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete stakeholder' },
      { status: 500 }
    );
  }
}
