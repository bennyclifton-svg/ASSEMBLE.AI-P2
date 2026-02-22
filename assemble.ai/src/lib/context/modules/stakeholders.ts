// src/lib/context/modules/stakeholders.ts
// Stakeholders module fetcher - team roster from projectStakeholders

import { db } from '@/lib/db';
import { projectStakeholders } from '@/lib/db/pg-schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface StakeholdersData {
  consultants: StakeholderEntry[];
  contractors: StakeholderEntry[];
  authorities: StakeholderEntry[];
  other: StakeholderEntry[];
  totalCount: number;
}

export interface StakeholderEntry {
  id: string;
  name: string;
  group: string;
  role: string | null;
  organization: string | null;
  disciplineOrTrade: string | null;
  contactName: string | null;
  contactEmail: string | null;
}

export async function fetchStakeholders(
  projectId: string
): Promise<ModuleResult<StakeholdersData>> {
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

    const consultants: StakeholderEntry[] = [];
    const contractors: StakeholderEntry[] = [];
    const authorities: StakeholderEntry[] = [];
    const other: StakeholderEntry[] = [];

    for (const s of stakeholders) {
      const entry: StakeholderEntry = {
        id: s.id,
        name: s.name ?? '',
        group: s.stakeholderGroup,
        role: s.role ?? null,
        organization: s.organization ?? null,
        disciplineOrTrade: s.disciplineOrTrade ?? null,
        contactName: s.contactName ?? null,
        contactEmail: s.contactEmail ?? null,
      };

      switch (s.stakeholderGroup) {
        case 'consultant':
          consultants.push(entry);
          break;
        case 'contractor':
          contractors.push(entry);
          break;
        case 'authority':
          authorities.push(entry);
          break;
        default:
          other.push(entry);
          break;
      }
    }

    const data: StakeholdersData = {
      consultants,
      contractors,
      authorities,
      other,
      totalCount: stakeholders.length,
    };

    const estimatedTokens = 20 + stakeholders.length * 10;

    return {
      moduleName: 'stakeholders',
      success: true,
      data,
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'stakeholders',
      success: false,
      data: {} as StakeholdersData,
      error: `Stakeholders fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
