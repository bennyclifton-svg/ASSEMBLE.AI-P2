import { projectStakeholders, stakeholderTenderStatuses, stakeholderSubmissionStatuses } from '@/lib/db/pg-schema';
import { STAKEHOLDERS, type DemoStakeholder } from './data';
import type { ProfileResult } from './profile';

/**
 * Stakeholder lookup map. Two key shapes are stored so other seed modules can
 * reference stakeholders by either firm-org or by subgroup:
 *
 *   `${organization}::${role}`              — exact match (legacy lookups)
 *   `subgroup::${stakeholderGroup}::${subgroup}` — for cost-plan discipline lookup
 */
export type StakeholderIdMap = Map<string, string>;

export function stakeholderKey(organization: string, role: string): string {
  return `${organization}::${role}`;
}

export function subgroupKey(group: string, subgroup: string, organization?: string): string {
  return organization
    ? `subgroup::${group}::${subgroup}::${organization}`
    : `subgroup::${group}::${subgroup}`;
}

/**
 * Tender progress profile per consultant — gives partial completion across the list
 * (not all consultants fully through award). Uses index-based assignment.
 */
type TenderStage = 'brief' | 'tender' | 'rec' | 'award';

interface TenderProgress {
  brief: boolean;
  tender: boolean;
  rec: boolean;
  award: boolean;
}

/**
 * Returns realistic partial progress so the procurement panel shows
 * a project-realistic mix of tender stages.
 */
function tenderProgressForIndex(index: number, group: 'consultant' | 'contractor'): TenderProgress {
  // Pattern (cycle through):
  // 0: brief only        — early, just briefed
  // 1: brief + tender    — out for tender
  // 2: brief + tender + rec — recommended, awaiting signoff
  // 3: full award        — engaged
  // 4: full award        — engaged
  // 5: brief + tender + rec — recommended, awaiting signoff
  // 6: brief + tender    — out for tender (reissue)
  // 7+ cycles back
  const phase = index % 8;
  return {
    brief: true,
    tender: phase >= 1,
    rec: phase >= 2 && phase !== 6,
    award: phase === 3 || phase === 4,
  };
}

export async function seedStakeholders(
  tx: any,
  profile: ProfileResult
): Promise<StakeholderIdMap> {
  const map: StakeholderIdMap = new Map();
  const consultantSubmissionRows: any[] = [];
  const tenderStatusRows: any[] = [];

  let consultantIdx = 0;
  let contractorIdx = 0;

  const records = STAKEHOLDERS.map((s: DemoStakeholder, idx: number) => {
    const id = crypto.randomUUID();

    // Map keys
    map.set(stakeholderKey(s.organization, s.role), id);
    map.set(subgroupKey(s.group, s.subgroup, s.organization), id);
    // Also a "first match" subgroup key for any module that doesn't care which firm
    if (!map.has(subgroupKey(s.group, s.subgroup))) {
      map.set(subgroupKey(s.group, s.subgroup), id);
    }

    // Tender statuses (consultants + contractors): partial completion
    if (s.group === 'consultant' || s.group === 'contractor') {
      const progress =
        s.group === 'consultant'
          ? tenderProgressForIndex(consultantIdx++, 'consultant')
          : tenderProgressForIndex(contractorIdx++, 'contractor');
      const stages: TenderStage[] = ['brief', 'tender', 'rec', 'award'];
      for (const statusType of stages) {
        const completed = progress[statusType];
        tenderStatusRows.push({
          id: crypto.randomUUID(),
          stakeholderId: id,
          statusType,
          isActive: completed,
          isComplete: completed,
          completedAt: completed ? new Date('2025-09-15') : null,
        });
      }
    }

    // Authority submission statuses (DA approved / connection app etc)
    if (s.group === 'authority') {
      const isCouncil = s.organization === 'City of Parramatta Council';
      const isTfNSW = s.organization === 'Transport for NSW';
      const isFRNSW = s.organization === 'Fire and Rescue NSW';
      consultantSubmissionRows.push({
        id: crypto.randomUUID(),
        stakeholderId: id,
        status: isTfNSW ? 'submitted' : 'approved',
        submittedAt: new Date('2025-04-15'),
        submissionRef: isCouncil
          ? 'DA-2025-0142'
          : isTfNSW
            ? 'TfNSW-RFT-2025-0089'
            : isFRNSW
              ? 'FRNSW-Plans-2025-0312'
              : null,
        responseReceivedAt: isTfNSW ? null : new Date('2025-08-22'),
        responseNotes: isCouncil
          ? 'DA approved subject to 14 standard conditions and 6 deferred commencement conditions.'
          : isTfNSW
            ? 'Awaiting TfNSW response on revised footpath / kerb works submission. Under review since April 2025.'
            : isFRNSW
              ? 'Plans accepted. Hydrant flow test scheduled for May 2026 prior to Occupation Certificate.'
              : s.organization === 'Sydney Water'
                ? 'Section 73 NoR issued. Connection point confirmed at southern boundary.'
                : 'Connection application approved. Substation tie-in scheduled for April 2026.',
        conditionsCleared: isCouncil ? false : !isTfNSW,
      });
    }

    return {
      id,
      projectId: profile.projectId,
      companyId: null,
      stakeholderGroup: s.group,
      // KEY MAPPING: name + disciplineOrTrade hold the SUBGROUP (per UI convention)
      name: s.subgroup,
      role: s.role,
      organization: s.organization,
      contactName: s.personName,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone ?? null,
      disciplineOrTrade: s.subgroup,
      isEnabled: true,
      sortOrder: idx,
      notes: s.notes ?? null,
      isAiGenerated: false,
    };
  });

  await tx.insert(projectStakeholders).values(records);
  if (tenderStatusRows.length > 0) {
    await tx.insert(stakeholderTenderStatuses).values(tenderStatusRows);
  }
  if (consultantSubmissionRows.length > 0) {
    await tx.insert(stakeholderSubmissionStatuses).values(consultantSubmissionRows);
  }

  return map;
}
