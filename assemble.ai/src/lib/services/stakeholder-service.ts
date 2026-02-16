/**
 * Unified Stakeholder Service
 * Feature: 020-stakeholder
 *
 * CRUD operations for the unified stakeholder system
 */

import {
  db,
  projectStakeholders,
  stakeholderTenderStatuses,
  stakeholderSubmissionStatuses,
} from '../db';
import { eq, and, asc, isNull, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type {
  Stakeholder,
  StakeholderGroup,
  StakeholderWithStatus,
  StakeholderGroupCounts,
  StakeholderListResponse,
  CreateStakeholderRequest,
  UpdateStakeholderRequest,
  TenderStatus,
  TenderStatusType,
  SubmissionStatusRecord,
  SubmissionStatus,
  UpdateTenderStatusRequest,
  UpdateSubmissionStatusRequest,
} from '@/types/stakeholder';

// ============================================
// Constants
// ============================================

const TENDER_STATUS_TYPES: TenderStatusType[] = ['brief', 'tender', 'rec', 'award'];

// ============================================
// Helper Functions
// ============================================

/**
 * Create default tender statuses for a consultant/contractor stakeholder
 */
async function createDefaultTenderStatuses(stakeholderId: string): Promise<TenderStatus[]> {
  const statuses: TenderStatus[] = [];

  for (const statusType of TENDER_STATUS_TYPES) {
    const id = nanoid();
    await db.insert(stakeholderTenderStatuses).values({
      id,
      stakeholderId,
      statusType,
      isActive: false,
      isComplete: false,
    });

    statuses.push({
      id,
      stakeholderId,
      statusType,
      isActive: false,
      isComplete: false,
    });
  }

  return statuses;
}

/**
 * Create default submission status for an authority stakeholder
 */
async function createDefaultSubmissionStatus(stakeholderId: string): Promise<SubmissionStatusRecord> {
  const id = nanoid();
  await db.insert(stakeholderSubmissionStatuses).values({
    id,
    stakeholderId,
    status: 'pending',
    conditionsCleared: false,
  });

  return {
    id,
    stakeholderId,
    status: 'pending',
    conditionsCleared: false,
  };
}

// ============================================
// Read Operations
// ============================================

/**
 * Get all stakeholders for a project grouped by type
 */
export async function getStakeholders(projectId: string): Promise<StakeholderListResponse> {
  const stakeholders = await db
    .select()
    .from(projectStakeholders)
    .where(
      and(
        eq(projectStakeholders.projectId, projectId),
        isNull(projectStakeholders.deletedAt)
      )
    )
    .orderBy(asc(projectStakeholders.stakeholderGroup), asc(projectStakeholders.sortOrder));

  // Fetch tender statuses for consultant/contractor stakeholders
  const consultantContractorIds = stakeholders
    .filter(s => s.stakeholderGroup === 'consultant' || s.stakeholderGroup === 'contractor')
    .map(s => s.id);

  const tenderStatuses = consultantContractorIds.length > 0
    ? await db
        .select()
        .from(stakeholderTenderStatuses)
        .where(inArray(stakeholderTenderStatuses.stakeholderId, consultantContractorIds))
    : [];

  // Fetch submission statuses for authority stakeholders
  const authorityIds = stakeholders
    .filter(s => s.stakeholderGroup === 'authority')
    .map(s => s.id);

  const submissionStatuses = authorityIds.length > 0
    ? await db
        .select()
        .from(stakeholderSubmissionStatuses)
        .where(inArray(stakeholderSubmissionStatuses.stakeholderId, authorityIds))
    : [];

  // Map stakeholders with their statuses
  const stakeholdersWithStatus: StakeholderWithStatus[] = stakeholders.map(s => {
    const base: Stakeholder = {
      id: s.id,
      projectId: s.projectId,
      companyId: s.companyId ?? undefined,
      stakeholderGroup: s.stakeholderGroup as StakeholderGroup,
      name: s.name,
      role: s.role ?? undefined,
      organization: s.organization ?? undefined,
      contactName: s.contactName ?? undefined,
      contactEmail: s.contactEmail ?? undefined,
      contactPhone: s.contactPhone ?? undefined,
      disciplineOrTrade: s.disciplineOrTrade ?? undefined,
      isEnabled: s.isEnabled ?? true,
      briefServices: s.briefServices ?? undefined,
      briefDeliverables: s.briefDeliverables ?? undefined,
      briefFee: s.briefFee ?? undefined,
      briefProgram: s.briefProgram ?? undefined,
      scopeWorks: s.scopeWorks ?? undefined,
      scopePrice: s.scopePrice ?? undefined,
      scopeProgram: s.scopeProgram ?? undefined,
      submissionRef: s.submissionRef ?? undefined,
      submissionType: s.submissionType ?? undefined,
      sortOrder: s.sortOrder ?? 0,
      notes: s.notes ?? undefined,
      isAiGenerated: s.isAiGenerated ?? false,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : (s.createdAt ?? new Date().toISOString()),
      updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : (s.updatedAt ?? new Date().toISOString()),
      deletedAt: s.deletedAt instanceof Date ? s.deletedAt.toISOString() : (s.deletedAt ?? undefined),
    };

    if (s.stakeholderGroup === 'consultant' || s.stakeholderGroup === 'contractor') {
      const statuses = tenderStatuses
        .filter(ts => ts.stakeholderId === s.id)
        .map(ts => ({
          id: ts.id,
          stakeholderId: ts.stakeholderId,
          statusType: ts.statusType as TenderStatusType,
          isActive: ts.isActive ?? false,
          isComplete: ts.isComplete ?? false,
          completedAt: ts.completedAt instanceof Date ? ts.completedAt.toISOString() : (ts.completedAt ?? undefined),
        }));

      return { ...base, tenderStatuses: statuses } as StakeholderWithStatus;
    }

    if (s.stakeholderGroup === 'authority') {
      const submissionStatus = submissionStatuses.find(ss => ss.stakeholderId === s.id);
      return {
        ...base,
        submissionStatus: submissionStatus
          ? {
              id: submissionStatus.id,
              stakeholderId: submissionStatus.stakeholderId,
              status: submissionStatus.status as SubmissionStatus,
              submittedAt: submissionStatus.submittedAt instanceof Date ? submissionStatus.submittedAt.toISOString() : (submissionStatus.submittedAt ?? undefined),
              submissionRef: submissionStatus.submissionRef ?? undefined,
              responseDue: submissionStatus.responseDue instanceof Date ? submissionStatus.responseDue.toISOString() : (submissionStatus.responseDue ?? undefined),
              responseReceivedAt: submissionStatus.responseReceivedAt instanceof Date ? submissionStatus.responseReceivedAt.toISOString() : (submissionStatus.responseReceivedAt ?? undefined),
              responseNotes: submissionStatus.responseNotes ?? undefined,
              conditions: submissionStatus.conditions ? JSON.parse(submissionStatus.conditions) : undefined,
              conditionsCleared: submissionStatus.conditionsCleared ?? false,
            }
          : undefined,
      } as StakeholderWithStatus;
    }

    return base as StakeholderWithStatus;
  });

  // Calculate counts
  const counts: StakeholderGroupCounts = {
    client: stakeholders.filter(s => s.stakeholderGroup === 'client').length,
    authority: stakeholders.filter(s => s.stakeholderGroup === 'authority').length,
    consultant: stakeholders.filter(s => s.stakeholderGroup === 'consultant').length,
    contractor: stakeholders.filter(s => s.stakeholderGroup === 'contractor').length,
    total: stakeholders.length,
  };

  return { stakeholders: stakeholdersWithStatus, counts };
}

/**
 * Get a single stakeholder by ID
 */
export async function getStakeholderById(id: string): Promise<StakeholderWithStatus | null> {
  const [stakeholder] = await db
    .select()
    .from(projectStakeholders)
    .where(and(eq(projectStakeholders.id, id), isNull(projectStakeholders.deletedAt)));

  if (!stakeholder) return null;

  const base: Stakeholder = {
    id: stakeholder.id,
    projectId: stakeholder.projectId,
    companyId: stakeholder.companyId ?? undefined,
    stakeholderGroup: stakeholder.stakeholderGroup as StakeholderGroup,
    name: stakeholder.name,
    role: stakeholder.role ?? undefined,
    organization: stakeholder.organization ?? undefined,
    contactName: stakeholder.contactName ?? undefined,
    contactEmail: stakeholder.contactEmail ?? undefined,
    contactPhone: stakeholder.contactPhone ?? undefined,
    disciplineOrTrade: stakeholder.disciplineOrTrade ?? undefined,
    isEnabled: stakeholder.isEnabled ?? true,
    briefServices: stakeholder.briefServices ?? undefined,
    briefDeliverables: stakeholder.briefDeliverables ?? undefined,
    briefFee: stakeholder.briefFee ?? undefined,
    briefProgram: stakeholder.briefProgram ?? undefined,
    scopeWorks: stakeholder.scopeWorks ?? undefined,
    scopePrice: stakeholder.scopePrice ?? undefined,
    scopeProgram: stakeholder.scopeProgram ?? undefined,
    submissionRef: stakeholder.submissionRef ?? undefined,
    submissionType: stakeholder.submissionType ?? undefined,
    sortOrder: stakeholder.sortOrder ?? 0,
    notes: stakeholder.notes ?? undefined,
    isAiGenerated: stakeholder.isAiGenerated ?? false,
    createdAt: stakeholder.createdAt instanceof Date ? stakeholder.createdAt.toISOString() : (stakeholder.createdAt ?? new Date().toISOString()),
    updatedAt: stakeholder.updatedAt instanceof Date ? stakeholder.updatedAt.toISOString() : (stakeholder.updatedAt ?? new Date().toISOString()),
    deletedAt: stakeholder.deletedAt instanceof Date ? stakeholder.deletedAt.toISOString() : (stakeholder.deletedAt ?? undefined),
  };

  if (stakeholder.stakeholderGroup === 'consultant' || stakeholder.stakeholderGroup === 'contractor') {
    const statuses = await db
      .select()
      .from(stakeholderTenderStatuses)
      .where(eq(stakeholderTenderStatuses.stakeholderId, id));

    return {
      ...base,
      tenderStatuses: statuses.map(ts => ({
        id: ts.id,
        stakeholderId: ts.stakeholderId,
        statusType: ts.statusType as TenderStatusType,
        isActive: ts.isActive ?? false,
        isComplete: ts.isComplete ?? false,
        completedAt: ts.completedAt instanceof Date ? ts.completedAt.toISOString() : (ts.completedAt ?? undefined),
      })),
    } as StakeholderWithStatus;
  }

  if (stakeholder.stakeholderGroup === 'authority') {
    const [submissionStatus] = await db
      .select()
      .from(stakeholderSubmissionStatuses)
      .where(eq(stakeholderSubmissionStatuses.stakeholderId, id));

    return {
      ...base,
      submissionStatus: submissionStatus
        ? {
            id: submissionStatus.id,
            stakeholderId: submissionStatus.stakeholderId,
            status: submissionStatus.status as SubmissionStatus,
            submittedAt: submissionStatus.submittedAt instanceof Date ? submissionStatus.submittedAt.toISOString() : (submissionStatus.submittedAt ?? undefined),
            submissionRef: submissionStatus.submissionRef ?? undefined,
            responseDue: submissionStatus.responseDue instanceof Date ? submissionStatus.responseDue.toISOString() : (submissionStatus.responseDue ?? undefined),
            responseReceivedAt: submissionStatus.responseReceivedAt instanceof Date ? submissionStatus.responseReceivedAt.toISOString() : (submissionStatus.responseReceivedAt ?? undefined),
            responseNotes: submissionStatus.responseNotes ?? undefined,
            conditions: submissionStatus.conditions ? JSON.parse(submissionStatus.conditions) : undefined,
            conditionsCleared: submissionStatus.conditionsCleared ?? false,
          }
        : undefined,
    } as StakeholderWithStatus;
  }

  return base as StakeholderWithStatus;
}

/**
 * Get stakeholders by group
 */
export async function getStakeholdersByGroup(
  projectId: string,
  group: StakeholderGroup
): Promise<StakeholderWithStatus[]> {
  const result = await getStakeholders(projectId);
  return result.stakeholders.filter(s => s.stakeholderGroup === group);
}

// ============================================
// Create Operations
// ============================================

/**
 * Create a new stakeholder
 */
export async function createStakeholder(
  projectId: string,
  data: CreateStakeholderRequest
): Promise<StakeholderWithStatus> {
  const id = nanoid();

  // Get max sort order for this project/group
  const existing = await db
    .select({ sortOrder: projectStakeholders.sortOrder })
    .from(projectStakeholders)
    .where(
      and(
        eq(projectStakeholders.projectId, projectId),
        eq(projectStakeholders.stakeholderGroup, data.stakeholderGroup),
        isNull(projectStakeholders.deletedAt)
      )
    )
    .orderBy(asc(projectStakeholders.sortOrder));

  const maxSortOrder = existing.length > 0 ? Math.max(...existing.map(e => e.sortOrder ?? 0)) : -1;

  await db.insert(projectStakeholders).values({
    id,
    projectId,
    stakeholderGroup: data.stakeholderGroup,
    name: data.name,
    role: data.role,
    organization: data.organization,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    disciplineOrTrade: data.disciplineOrTrade,
    isEnabled: data.isEnabled ?? true,
    notes: data.notes,
    isAiGenerated: data.isAiGenerated ?? false,
    sortOrder: maxSortOrder + 1,
  });

  // Create default statuses based on group
  if (data.stakeholderGroup === 'consultant' || data.stakeholderGroup === 'contractor') {
    await createDefaultTenderStatuses(id);
  } else if (data.stakeholderGroup === 'authority') {
    await createDefaultSubmissionStatus(id);
  }

  return (await getStakeholderById(id))!;
}

/**
 * Bulk create stakeholders (for generation/import)
 */
export async function bulkCreateStakeholders(
  projectId: string,
  stakeholders: CreateStakeholderRequest[]
): Promise<StakeholderWithStatus[]> {
  const results: StakeholderWithStatus[] = [];

  for (const data of stakeholders) {
    const stakeholder = await createStakeholder(projectId, data);
    results.push(stakeholder);
  }

  return results;
}

// ============================================
// Update Operations
// ============================================

/**
 * Update a stakeholder
 */
export async function updateStakeholder(
  id: string,
  data: UpdateStakeholderRequest
): Promise<StakeholderWithStatus | null> {
  const existing = await getStakeholderById(id);
  if (!existing) return null;

  await db
    .update(projectStakeholders)
    .set({
      name: data.name,
      role: data.role,
      organization: data.organization,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      disciplineOrTrade: data.disciplineOrTrade,
      isEnabled: data.isEnabled,
      briefServices: data.briefServices,
      briefDeliverables: data.briefDeliverables,
      briefFee: data.briefFee,
      briefProgram: data.briefProgram,
      scopeWorks: data.scopeWorks,
      scopePrice: data.scopePrice,
      scopeProgram: data.scopeProgram,
      submissionRef: data.submissionRef,
      submissionType: data.submissionType,
      notes: data.notes,
      updatedAt: new Date(),
    })
    .where(eq(projectStakeholders.id, id));

  return getStakeholderById(id);
}

/**
 * Update tender status for a consultant/contractor
 */
export async function updateTenderStatus(
  stakeholderId: string,
  data: UpdateTenderStatusRequest
): Promise<TenderStatus | null> {
  const [existing] = await db
    .select()
    .from(stakeholderTenderStatuses)
    .where(
      and(
        eq(stakeholderTenderStatuses.stakeholderId, stakeholderId),
        eq(stakeholderTenderStatuses.statusType, data.statusType)
      )
    );

  if (!existing) return null;

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.isComplete !== undefined) {
    updates.isComplete = data.isComplete;
    if (data.isComplete) {
      updates.completedAt = new Date();
    }
  }

  await db
    .update(stakeholderTenderStatuses)
    .set(updates)
    .where(eq(stakeholderTenderStatuses.id, existing.id));

  const [updated] = await db
    .select()
    .from(stakeholderTenderStatuses)
    .where(eq(stakeholderTenderStatuses.id, existing.id));

  return {
    id: updated.id,
    stakeholderId: updated.stakeholderId,
    statusType: updated.statusType as TenderStatusType,
    isActive: updated.isActive ?? false,
    isComplete: updated.isComplete ?? false,
    completedAt: updated.completedAt instanceof Date ? updated.completedAt.toISOString() : (updated.completedAt ?? undefined),
  };
}

/**
 * Update submission status for an authority
 */
export async function updateSubmissionStatus(
  stakeholderId: string,
  data: UpdateSubmissionStatusRequest
): Promise<SubmissionStatusRecord | null> {
  const [existing] = await db
    .select()
    .from(stakeholderSubmissionStatuses)
    .where(eq(stakeholderSubmissionStatuses.stakeholderId, stakeholderId));

  if (!existing) return null;

  const updates: Record<string, unknown> = {
    status: data.status,
    updatedAt: new Date(),
  };

  if (data.submissionRef !== undefined) updates.submissionRef = data.submissionRef;
  if (data.responseDue !== undefined) updates.responseDue = data.responseDue;
  if (data.responseNotes !== undefined) updates.responseNotes = data.responseNotes;
  if (data.conditions !== undefined) updates.conditions = JSON.stringify(data.conditions);
  if (data.conditionsCleared !== undefined) updates.conditionsCleared = data.conditionsCleared;

  // Set submitted timestamp if status is submitted
  if (data.status === 'submitted' && !existing.submittedAt) {
    updates.submittedAt = new Date();
  }

  // Set response received timestamp if status is approved/rejected
  if ((data.status === 'approved' || data.status === 'rejected') && !existing.responseReceivedAt) {
    updates.responseReceivedAt = new Date();
  }

  await db
    .update(stakeholderSubmissionStatuses)
    .set(updates)
    .where(eq(stakeholderSubmissionStatuses.id, existing.id));

  const [updated] = await db
    .select()
    .from(stakeholderSubmissionStatuses)
    .where(eq(stakeholderSubmissionStatuses.id, existing.id));

  return {
    id: updated.id,
    stakeholderId: updated.stakeholderId,
    status: updated.status as SubmissionStatus,
    submittedAt: updated.submittedAt instanceof Date ? updated.submittedAt.toISOString() : (updated.submittedAt ?? undefined),
    submissionRef: updated.submissionRef ?? undefined,
    responseDue: updated.responseDue instanceof Date ? updated.responseDue.toISOString() : (updated.responseDue ?? undefined),
    responseReceivedAt: updated.responseReceivedAt instanceof Date ? updated.responseReceivedAt.toISOString() : (updated.responseReceivedAt ?? undefined),
    responseNotes: updated.responseNotes ?? undefined,
    conditions: updated.conditions ? JSON.parse(updated.conditions) : undefined,
    conditionsCleared: updated.conditionsCleared ?? false,
  };
}

/**
 * Toggle stakeholder enabled status
 */
export async function toggleStakeholderEnabled(
  id: string,
  isEnabled: boolean
): Promise<StakeholderWithStatus | null> {
  return updateStakeholder(id, { isEnabled });
}

/**
 * Reorder stakeholders within a group
 */
export async function reorderStakeholders(
  projectId: string,
  group: StakeholderGroup,
  stakeholderIds: string[]
): Promise<void> {
  for (let i = 0; i < stakeholderIds.length; i++) {
    await db
      .update(projectStakeholders)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(
        and(
          eq(projectStakeholders.id, stakeholderIds[i]),
          eq(projectStakeholders.projectId, projectId),
          eq(projectStakeholders.stakeholderGroup, group)
        )
      );
  }
}

// ============================================
// Delete Operations
// ============================================

/**
 * Soft delete a stakeholder
 */
export async function deleteStakeholder(id: string): Promise<boolean> {
  const existing = await getStakeholderById(id);
  if (!existing) return false;

  await db
    .update(projectStakeholders)
    .set({ deletedAt: new Date() })
    .where(eq(projectStakeholders.id, id));

  return true;
}

/**
 * Hard delete all stakeholders in a group (for replace mode)
 */
export async function deleteStakeholdersByGroup(
  projectId: string,
  group: StakeholderGroup
): Promise<number> {
  console.log('[deleteStakeholdersByGroup] projectId:', projectId, 'group:', group);

  // First get the IDs to delete
  const toDelete = await db
    .select({ id: projectStakeholders.id })
    .from(projectStakeholders)
    .where(
      and(
        eq(projectStakeholders.projectId, projectId),
        eq(projectStakeholders.stakeholderGroup, group),
        isNull(projectStakeholders.deletedAt)
      )
    );

  console.log('[deleteStakeholdersByGroup] Found', toDelete.length, 'stakeholders to delete');

  if (toDelete.length === 0) return 0;

  const ids = toDelete.map(s => s.id);
  console.log('[deleteStakeholdersByGroup] IDs to delete:', ids);

  // Delete related statuses (cascade should handle this but be explicit)
  await db.delete(stakeholderTenderStatuses).where(inArray(stakeholderTenderStatuses.stakeholderId, ids));
  await db.delete(stakeholderSubmissionStatuses).where(inArray(stakeholderSubmissionStatuses.stakeholderId, ids));

  // Delete the stakeholders
  await db.delete(projectStakeholders).where(inArray(projectStakeholders.id, ids));

  console.log('[deleteStakeholdersByGroup] Deleted', ids.length, 'stakeholders');
  return ids.length;
}

/**
 * Delete all stakeholders for a project (for testing/reset)
 */
export async function deleteAllProjectStakeholders(projectId: string): Promise<number> {
  const toDelete = await db
    .select({ id: projectStakeholders.id })
    .from(projectStakeholders)
    .where(eq(projectStakeholders.projectId, projectId));

  if (toDelete.length === 0) return 0;

  const ids = toDelete.map(s => s.id);

  // Delete related statuses
  await db.delete(stakeholderTenderStatuses).where(inArray(stakeholderTenderStatuses.stakeholderId, ids));
  await db.delete(stakeholderSubmissionStatuses).where(inArray(stakeholderSubmissionStatuses.stakeholderId, ids));

  // Delete the stakeholders
  await db.delete(projectStakeholders).where(inArray(projectStakeholders.id, ids));

  return ids.length;
}
