import { reportGroups, reports, reportSections, reportAttendees } from '@/lib/db/pg-schema';
import type { ProfileResult } from './profile';
import type { StakeholderIdMap } from './stakeholders';
import { stakeholderKey } from './stakeholders';

/**
 * Reports follow the same versioned-section model as meetings:
 * - Each report = ONE record with ONE section by default (the report body)
 * - Subtabs within a report = versions of the report
 * - 6 reports total; 2 of them have 3 versions to demo the revision workflow
 */

interface ReportVersion {
  versionLabel: string;
  content: string;
}

interface ReportSeed {
  number: number;
  title: string;
  date: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  preparedBy: string;
  preparedFor: string;
  distribution: { organization: string; role: string }[];
  versions: ReportVersion[];
}

const REPORT_NOV_BODY = `# Monthly Status Report — November 2025
## Lighthouse Residences

### Executive Summary
Construction commenced 14 October 2025. Site establishment, hoarding and demolition successfully completed. Bulk excavation underway, encountering harder ground than design assumed (latent condition notice issued). Programme is tracking close to baseline. Cost expenditure to date $1.83M against the $20M total budget. No safety incidents.

### Progress Update
Site establishment 100% complete (Oct 31). Demolition 100% complete (Nov 21, 2 days ahead of programme). Bulk excavation 60% complete with shoring system installed along the southern boundary. Sandstone bedrock encountered in the southern third — additional rock-breaking required.

### Programme Status
Programme position: -3 days vs baseline (latent condition). PCD remains achievable for 23 October 2026 with the EOT granted.

### Cost Status
Expenditure to date $1.83M (9.2% of $20M budget). Construction contingency $850k (untouched).

### Risks + Outstanding
Top 3 risks: latent condition extent; polluted material classification; DA condition #14 (out-of-hours work).
`;

const REPORT_DEC_BODY = `# Monthly Status Report — December 2025
## Lighthouse Residences

### Executive Summary
Christmas shutdown completed safely. Concrete supplier industrial action 15-18 Dec lost 4 days. Footings ~75% complete prior to shutdown. EOT under assessment. Cost expenditure $4.2M (21% of budget).

### Progress Update
Footings 75% complete. Bulk excavation finalised. Basement walls programmed for January start.

### Programme Status
8 days behind original baseline (3 latent + 4 industrial action + 1 weather). Two EOTs granted, one pending.

### Cost Status
Expenditure $4.2M (21% of $20M). Forecast at completion remains $20M.

### Risks + Outstanding
Compensable Cause assessment for industrial action EOT pending solicitor advice.
`;

const REPORT_JAN_V1 = `# Monthly Status Report — January 2026 — VERSION 1 (DRAFT)
## Lighthouse Residences

**Status: Draft for Owner review**

### Executive Summary
Substructure works substantially complete. Footings, basement walls and basement slab all complete. Programme position: 8 days behind original baseline. Cost expenditure $7.96M.

### Progress Update
Footings + piling complete. Basement walls + slab complete. Three concrete pours completed, all meeting strength specification at 7-day testing.

### Programme Status
8 days behind. Two EOTs granted, one pending.

### Cost Status
Expenditure $7.96M (39.8% of budget).

### Risks + Outstanding
MSB capacity decision pending — will impact electrical procurement.
`;

const REPORT_JAN_V2 = `# Monthly Status Report — January 2026 — VERSION 2
## Lighthouse Residences

**Status: Revised after Owner feedback — added cost section detail and risk register expansion**

### Executive Summary
Substructure works substantially complete. Footings, basement walls and basement slab all complete to specification. Ground floor slab in progress, target completion 6 February. Programme position: 8 days behind original baseline. Cost expenditure to date $7.96M (39.8% of budget). **Out-of-hours work approval received from Council, enabling Saturday concrete pours from February.**

### Progress Update
Footings + piling complete (Jan 23). Basement walls + slab complete (Feb 20). Ground floor slab pour scheduled 6 March. Three concrete pours completed in January, all meeting strength specification at 7-day testing. **Excavation final cleanup completed mid-January.**

### Programme Status
Currently 8 days behind original baseline. Compounded delays from (a) latent condition Nov, (b) concrete supplier industrial action Dec, (c) wet weather Jan. Two EOTs granted, one pending. Topping out target unchanged: 21 May 2026 (subject to outcome of pending EOT).

### Cost Status
Expenditure to date $7.96M (39.8% of $20M budget). **Forecast at completion remains $20M. Variations approved: nil. Variations pending: VAR-002 (MSB uplift, $24k forecast). Construction contingency: $850k (untouched). Design contingency: $210k (untouched).**

### Risks + Outstanding
Top risks this period: (1) Concrete supply continuity post-industrial-action, (2) Compensable Cause assessment for industrial action EOT, (3) MSB capacity decision (pending — will impact electrical procurement). **Outstanding: VAR-002 awaiting Owner approval. EOT #3 awaiting solicitor advice on Compensable Cause.**
`;

const REPORT_JAN_V3 = `# Monthly Status Report — January 2026 — VERSION 3 (FINAL)
## Lighthouse Residences

**Status: Final — distributed to Owner and project distribution list**

### Executive Summary
Substructure works substantially complete. Footings, basement walls and basement slab all complete to specification. Ground floor slab in progress, target completion 6 February. Programme position: 8 days behind original baseline due to (a) latent condition (3 days, GRANTED), (b) concrete supplier industrial action (4 days, ASSESSMENT in progress), (c) wet weather (1 day, granted). Cost expenditure to date $7.96M (39.8% of budget). Out-of-hours work approval received from Council, enabling Saturday concrete pours from February.

### Progress Update
Footings + piling complete (Jan 23). Basement walls + slab complete (Feb 20). Ground floor slab pour scheduled 6 March. Three concrete pours completed in January, all meeting strength specification at 7-day testing. Excavation final cleanup completed mid-January.

### Programme Status
Currently 8 days behind original baseline. Compounded delays from (a) latent condition Nov, (b) concrete supplier industrial action Dec, (c) wet weather Jan. Two EOTs granted, one pending. Critical path remains through superstructure activities. Topping out target unchanged: 21 May 2026 (subject to outcome of pending EOT). **Final: PCD target 23 October 2026 maintained as cumulative impact remains within available float.**

### Cost Status
Expenditure to date $7.96M (39.8% of $20M budget). Forecast at completion remains $20M. Variations approved: nil. Variations pending: VAR-002 (MSB uplift, $24k forecast). Construction contingency: $850k (untouched). Design contingency: $210k (untouched).

### Risks + Outstanding
Top risks this period: (1) Concrete supply continuity post-industrial-action, (2) Compensable Cause assessment for industrial action EOT, (3) MSB capacity decision (pending — will impact electrical procurement). Outstanding: VAR-002 awaiting Owner approval. EOT #3 awaiting solicitor advice on Compensable Cause.

### Action Items (Final)
- Owner to approve VAR-002 by 5 February (Marcus)
- Solicitor advice on EOT #3 Compensable Cause by 8 February (PM)
- ADCO to confirm concrete supplier continuity for Feb-Mar pours by 31 January (Greg)
`;

const REPORT_FEB_BODY = `# Monthly Status Report — February 2026
## Lighthouse Residences

### Executive Summary
Substructure milestone formally signed off (6 March). L1 + L2 structure complete. Programme 11 days behind original baseline. Cost $11.6M (58% of budget). Two variations approved (BMU upgrade, MSB uplift).

### Progress Update
L1 structure complete. L2 structure complete. L3 in progress. Substructure formal sign-off completed.

### Programme Status
-11 days vs baseline. Cumulative EOTs granted: 6 days (latent 3, drawings 2, weather 1).

### Cost Status
Expenditure $11.6M (58% of budget). Variations approved: $84k.

### Risks + Outstanding
Acoustic upgrade pricing $27k under negotiation.
`;

const REPORT_MAR_BODY = `# Monthly Status Report — March 2026
## Lighthouse Residences

### Executive Summary
L3 complete, L4 in progress. Facade installation commenced 13 March. Wet weather event 17–24 March cost 5 programme days (EOT #1 granted). Programme 16 days behind. Cost $13.86M (69.3% of budget). Three variations approved this period.

### Progress Update
L1, L2, L3 slabs complete. L4 in progress. Facade install: 15% complete. Services rough-in: 45% complete.

### Programme Status
-16 days vs baseline. Cumulative EOTs granted: 11 days. Topping out target revised: 28 May. PCD revised: 28 October 2026.

### Cost Status
Expenditure $13.86M (69.3% of $20M). Forecast at completion: $20.13M. Variations approved $84k. Pending $70k.

### Risks + Outstanding
Critical risk: VAR-004 facade colour decision overdue. Acoustic upgrade pricing under negotiation.
`;

const REPORT_APR_V1 = `# Monthly Status Report — April 2026 — VERSION 1 (DRAFT)
## Lighthouse Residences

**Status: Draft — pending Owner review**

### Executive Summary
L4 65% complete. Facade install 15%. Services rough-in 45%. Programme 17 days behind baseline. Cost $15.2M (76% of budget).

### Progress Update
L4 in progress. L5 commencing.

### Programme Status
17 days behind. Topping out target 28 May.

### Cost Status
$15.2M expended. No new variations approved.

### Risks + Outstanding
VAR-004 facade colour decision overdue.
`;

const REPORT_APR_V2 = `# Monthly Status Report — April 2026 — VERSION 2
## Lighthouse Residences

**Status: Updated — added EOT #6 detail, FF&E procurement plan, and acoustic upgrade pricing context**

### Executive Summary
L4 65% complete. L5 commenced. Facade install 15% complete (initial panels installed). Services rough-in 45%. Programme position: 17 days behind original baseline. **PCD updated to 29 October 2026 reflecting EOT #6 (substation tie-in 1 day).** Cost expenditure to date $15.2M (76.0% of budget). No new variations approved this period.

### Progress Update
L4 structure 65% complete (target completion 1 May). L5 commenced 27 April. Facade install 15% complete (initial panels installed, fixings program testing in progress). Services rough-in: 45% complete (electrical conduit + hydraulic stack installation underway).

### Programme Status
**Position: -17 days vs original baseline. Cumulative EOTs granted: 12 days (latent 3, drawings 2, weather 5, substation 1, BMU coordination pending). Pending EOT: VAR-001 BMU coordination 1 day. Topping out target 28 May 2026. PCD 29 October 2026.**

### Cost Status
Expenditure $15.2M (76.0% of $20M). **Forecast at completion: $20.13M. Approved variations: $84k. Pending variations: VAR-004 ($35k facade colour), VAR-005 ($8k planters), acoustic upgrade ($27k). Construction contingency utilisation projected at 18% if all pending approved.**

### Risks + Outstanding
**Critical risk: VAR-004 facade colour decision overdue (target 25 April, lead-time impact accruing daily). Acoustic upgrade variation pricing under negotiation with ADCO. FF&E supplier shortlist confirmed; tender release scheduled 5 May.**
`;

const REPORT_APR_V3 = `# Monthly Status Report — April 2026 — VERSION 3 (FINAL)
## Lighthouse Residences

**Status: Final — distributed to Owner and project distribution list**

### Executive Summary
L4 65% complete. L5 commenced 27 April. Facade install 15% complete. Services rough-in 45%. Programme position: 17 days behind original baseline. PCD updated to 29 October 2026 reflecting EOT #6. Cost expenditure to date $15.2M (76.0% of budget). No new variations approved this period; three pending Owner direction.

### Progress Update
L4 structure 65% complete (target completion 1 May). L5 commenced 27 April. Facade install 15% complete (initial panels installed, fixings program testing in progress). Services rough-in: 45% complete (electrical conduit + hydraulic stack installation underway).

### Programme Status
Position: -17 days vs original baseline. Cumulative EOTs granted: 12 days (latent 3, drawings 2, weather 5, substation 1, BMU coordination pending). Pending EOT: VAR-001 BMU coordination 1 day. Topping out target 28 May 2026. PCD 29 October 2026.

### Cost Status
Expenditure $15.2M (76.0% of $20M). Forecast at completion: $20.13M. Approved variations: $84k. Pending variations: VAR-004 ($35k facade colour), VAR-005 ($8k planters), acoustic upgrade ($27k). Construction contingency utilisation projected at 18% if all pending approved.

### Risks + Outstanding
Critical risk: VAR-004 facade colour decision overdue (target 25 April, lead-time impact accruing daily). Acoustic upgrade variation pricing under negotiation with ADCO. FF&E supplier shortlist confirmed; tender release scheduled 5 May.

### Action Items (Final)
- Owner to direct VAR-004 facade colour decision by 30 April (Marcus)
- ADCO to issue revised programme post-substation tie-in by 5 May (Greg)
- RLB to issue FF&E tender package by 5 May (Olivia)
- NDY to negotiate acoustic upgrade pricing with ADCO by 8 May (Tom)
`;

const REPORTS: ReportSeed[] = [
  {
    number: 1,
    title: 'Monthly Status Report — November 2025',
    date: '2025-11-30',
    reportingPeriodStart: '2025-10-14',
    reportingPeriodEnd: '2025-11-30',
    preparedBy: 'Project Manager',
    preparedFor: 'Coastal Living Pty Ltd',
    distribution: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'Coastal Living Pty Ltd', role: 'Director' },
      { organization: 'Coastal Living Pty Ltd', role: 'Development Manager' },
    ],
    versions: [{ versionLabel: 'Version 1', content: REPORT_NOV_BODY }],
  },
  {
    number: 2,
    title: 'Monthly Status Report — December 2025',
    date: '2025-12-31',
    reportingPeriodStart: '2025-12-01',
    reportingPeriodEnd: '2025-12-31',
    preparedBy: 'Project Manager',
    preparedFor: 'Coastal Living Pty Ltd',
    distribution: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
    ],
    versions: [{ versionLabel: 'Version 1', content: REPORT_DEC_BODY }],
  },
  {
    // 3 versions
    number: 3,
    title: 'Monthly Status Report — January 2026',
    date: '2026-01-30',
    reportingPeriodStart: '2026-01-01',
    reportingPeriodEnd: '2026-01-30',
    preparedBy: 'Project Manager',
    preparedFor: 'Coastal Living Pty Ltd',
    distribution: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'Coastal Living Pty Ltd', role: 'Director' },
      { organization: 'Coastal Living Pty Ltd', role: 'Development Manager' },
    ],
    versions: [
      { versionLabel: 'Version 1 (draft)', content: REPORT_JAN_V1 },
      { versionLabel: 'Version 2 (revised)', content: REPORT_JAN_V2 },
      { versionLabel: 'Version 3 (final)', content: REPORT_JAN_V3 },
    ],
  },
  {
    number: 4,
    title: 'Monthly Status Report — February 2026',
    date: '2026-02-28',
    reportingPeriodStart: '2026-02-01',
    reportingPeriodEnd: '2026-02-28',
    preparedBy: 'Project Manager',
    preparedFor: 'Coastal Living Pty Ltd',
    distribution: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
    ],
    versions: [{ versionLabel: 'Version 1', content: REPORT_FEB_BODY }],
  },
  {
    number: 5,
    title: 'Monthly Status Report — March 2026',
    date: '2026-03-31',
    reportingPeriodStart: '2026-03-01',
    reportingPeriodEnd: '2026-03-31',
    preparedBy: 'Project Manager',
    preparedFor: 'Coastal Living Pty Ltd',
    distribution: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'Coastal Living Pty Ltd', role: 'Director' },
    ],
    versions: [{ versionLabel: 'Version 1', content: REPORT_MAR_BODY }],
  },
  {
    // 3 versions
    number: 6,
    title: 'Monthly Status Report — April 2026',
    date: '2026-04-30',
    reportingPeriodStart: '2026-04-01',
    reportingPeriodEnd: '2026-04-30',
    preparedBy: 'Project Manager',
    preparedFor: 'Coastal Living Pty Ltd',
    distribution: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'Coastal Living Pty Ltd', role: 'Director' },
      { organization: 'Coastal Living Pty Ltd', role: 'Development Manager' },
    ],
    versions: [
      { versionLabel: 'Version 1 (draft)', content: REPORT_APR_V1 },
      { versionLabel: 'Version 2 (revised)', content: REPORT_APR_V2 },
      { versionLabel: 'Version 3 (final)', content: REPORT_APR_V3 },
    ],
  },
];

export async function seedReports(
  tx: any,
  profile: ProfileResult,
  stakeholderIds: StakeholderIdMap
): Promise<void> {
  // ARCHITECTURE: one reportGroup per monthly report (= a panel).
  // Each report record within the group = a numbered tab (01, 02, 03).
  // Single-version groups: 1 report record (= 1 tab).
  // January + April groups (demo'd versions): 3 report records (= 3 version tabs).

  for (const r of REPORTS) {
    const groupId = crypto.randomUUID();

    await tx.insert(reportGroups).values({
      id: groupId,
      projectId: profile.projectId,
      organizationId: profile.organizationId,
      groupNumber: r.number,
      title: r.title,
    });

    for (const v of r.versions) {
      const reportId = crypto.randomUUID();
      const ts = new Date(r.date + 'T16:00:00').toISOString();

      const reportTitle =
        r.versions.length === 1
          ? r.title
          : `${r.title} — ${v.versionLabel}`;

      await tx.insert(reports).values({
        id: reportId,
        projectId: profile.projectId,
        organizationId: profile.organizationId,
        groupId,
        title: reportTitle,
        reportDate: r.date,
        preparedBy: r.preparedBy,
        preparedFor: r.preparedFor,
        contentsType: 'standard',
        reportingPeriodStart: r.reportingPeriodStart,
        reportingPeriodEnd: r.reportingPeriodEnd,
        createdAt: ts,
        updatedAt: ts,
      });

      // Single section per report — the body
      await tx.insert(reportSections).values({
        id: crypto.randomUUID(),
        reportId,
        sectionKey: 'body',
        sectionLabel: 'Report',
        content: v.content,
        sortOrder: 0,
        createdAt: ts,
        updatedAt: ts,
      });

      if (r.distribution.length > 0) {
        await tx.insert(reportAttendees).values(
          r.distribution.map((a) => {
            const sid = stakeholderIds.get(stakeholderKey(a.organization, a.role));
            return {
              id: crypto.randomUUID(),
              reportId,
              stakeholderId: sid ?? null,
              adhocName: sid ? null : a.role,
              adhocFirm: sid ? null : a.organization,
              adhocGroup: null,
              adhocSubGroup: null,
              isDistribution: true,
              createdAt: ts,
            };
          })
        );
      }
    }
  }
}
