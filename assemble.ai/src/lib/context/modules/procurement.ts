// src/lib/context/modules/procurement.ts
// Procurement module fetcher - extracts from projectStakeholders and stakeholderTenderStatuses

import { db } from '@/lib/db';
import {
  projectStakeholders,
  stakeholderTenderStatuses,
} from '@/lib/db/pg-schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProcurementData {
  consultants: StakeholderProcurementData[];
  contractors: StakeholderProcurementData[];
  overview: {
    consultantsTotal: number;
    consultantsAwarded: number;
    consultantsTendered: number;
    consultantsBriefed: number;
    contractorsTotal: number;
    contractorsAwarded: number;
    contractorsTendered: number;
    contractorsBriefed: number;
  };
  shortlistedFirms: Array<{
    firmName: string;
    disciplineOrTrade: string;
    type: 'consultant' | 'contractor';
  }>;
  awardedFirms: Array<{
    firmName: string;
    disciplineOrTrade: string;
    value: number | null;
    type: 'consultant' | 'contractor';
  }>;
}

export interface StakeholderProcurementData {
  id: string;
  name: string;
  group: string;
  disciplineOrTrade: string | null;
  currentStatus: string | null;
  awardedFirm: string | null;
  awardedValue: number | null;
}

/**
 * Determine the highest active tender status for a stakeholder.
 * Status types have a progression order: brief -> tender -> rec -> award
 */
const STATUS_ORDER = ['brief', 'tender', 'rec', 'award'];

function getHighestStatus(
  statuses: (typeof stakeholderTenderStatuses.$inferSelect)[]
): string | null {
  let highest: string | null = null;
  let highestIdx = -1;

  for (const s of statuses) {
    if (!s.isActive && !s.isComplete) continue;
    const idx = STATUS_ORDER.indexOf(s.statusType);
    if (idx > highestIdx) {
      highestIdx = idx;
      highest = s.statusType;
    }
  }

  return highest;
}

export async function fetchProcurement(
  projectId: string
): Promise<ModuleResult<ProcurementData>> {
  try {
    const stakeholders = await db
      .select()
      .from(projectStakeholders)
      .where(
        and(
          eq(projectStakeholders.projectId, projectId),
          isNull(projectStakeholders.deletedAt)
        )
      );

    // Fetch all tender statuses for these stakeholders in batch
    const stakeholderIds = stakeholders
      .filter(
        (s) =>
          s.stakeholderGroup === 'consultant' ||
          s.stakeholderGroup === 'contractor'
      )
      .map((s) => s.id);

    const allTenderStatuses =
      stakeholderIds.length > 0
        ? await db.select().from(stakeholderTenderStatuses)
        : [];

    // Group tender statuses by stakeholder ID
    const tenderStatusMap = new Map<
      string,
      (typeof stakeholderTenderStatuses.$inferSelect)[]
    >();
    for (const ts of allTenderStatuses) {
      if (!ts.stakeholderId || !stakeholderIds.includes(ts.stakeholderId))
        continue;
      const existing = tenderStatusMap.get(ts.stakeholderId) ?? [];
      existing.push(ts);
      tenderStatusMap.set(ts.stakeholderId, existing);
    }

    const consultantStakeholders: StakeholderProcurementData[] = [];
    const contractorStakeholders: StakeholderProcurementData[] = [];
    const shortlistedFirms: ProcurementData['shortlistedFirms'] = [];
    const awardedFirms: ProcurementData['awardedFirms'] = [];

    let cTotal = 0,
      cAwarded = 0,
      cTendered = 0,
      cBriefed = 0;
    let tTotal = 0,
      tAwarded = 0,
      tTendered = 0,
      tBriefed = 0;

    for (const s of stakeholders) {
      if (s.stakeholderGroup !== 'consultant' && s.stakeholderGroup !== 'contractor')
        continue;

      const statuses = tenderStatusMap.get(s.id) ?? [];
      const status = getHighestStatus(statuses);

      const entry: StakeholderProcurementData = {
        id: s.id,
        name: s.name ?? '',
        group: s.stakeholderGroup,
        disciplineOrTrade: s.disciplineOrTrade ?? null,
        currentStatus: status,
        awardedFirm: null,
        awardedValue: null,
      };

      if (s.stakeholderGroup === 'consultant') {
        consultantStakeholders.push(entry);
        cTotal++;
        if (status === 'award') cAwarded++;
        else if (status === 'tender' || status === 'rec') cTendered++;
        else cBriefed++;
      } else {
        contractorStakeholders.push(entry);
        tTotal++;
        if (status === 'award') tAwarded++;
        else if (status === 'tender' || status === 'rec') tTendered++;
        else tBriefed++;
      }
    }

    const data: ProcurementData = {
      consultants: consultantStakeholders,
      contractors: contractorStakeholders,
      overview: {
        consultantsTotal: cTotal,
        consultantsAwarded: cAwarded,
        consultantsTendered: cTendered,
        consultantsBriefed: cBriefed,
        contractorsTotal: tTotal,
        contractorsAwarded: tAwarded,
        contractorsTendered: tTendered,
        contractorsBriefed: tBriefed,
      },
      shortlistedFirms,
      awardedFirms,
    };

    const estimatedTokens = 30 + (cTotal + tTotal) * 15;

    return { moduleName: 'procurement', success: true, data, estimatedTokens };
  } catch (error) {
    return {
      moduleName: 'procurement',
      success: false,
      data: {} as ProcurementData,
      error: `Procurement fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
