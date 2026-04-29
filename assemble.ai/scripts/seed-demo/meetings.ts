import { meetingGroups, meetings, meetingSections, meetingAttendees } from '@/lib/db/pg-schema';
import type { ProfileResult } from './profile';
import type { StakeholderIdMap } from './stakeholders';
import { stakeholderKey } from './stakeholders';

/**
 * Architecture (per user direction 27 Apr 2026):
 * - Each meeting = ONE record with ONE section (the meeting minutes)
 * - "Subtabs" within a meeting = versions/revisions of the minutes
 * - 6 meetings, most with 1 version (1 section)
 * - 2 selected meetings have 3 versions (3 sections labelled "Version 1/2/3")
 */

interface MeetingMinutesVersion {
  versionLabel: string;        // "Version 1", "Version 2", etc.
  content: string;
}

interface MeetingSeed {
  number: number;
  title: string;
  date: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  attendees: { organization: string; role: string }[];
  versions: MeetingMinutesVersion[];   // 1 entry usually, 3 entries for the demo'd meetings
}

// Combined-content minutes per meeting (all the previous sections rolled into one body)
const PCG_1_MINUTES = `## PCG #1 — Project Kick-off (22 October 2025)

### 1. Safety + WHS
Site safety induction completed for all PCG attendees prior to walk. Hoardings and perimeter fencing installed, signage in place. ADCO confirmed SWMS in place for all imminent demolition activities. No incidents to report. Safety target: zero LTI for the project. Weekly toolbox talks scheduled Wednesdays 7am.

### 2. Programme + Critical Path
Construction commenced 14 October. Site establishment 100% complete; demolition mobilising for 1 November start. Critical path runs through demolition → bulk excavation → footings → basement slab → GF slab → superstructure. PCD target 23 October 2026 (54 weeks). Programme floats: 5 days on demolition, 8 days on superstructure. ADCO to issue baseline programme REV B by 30 October.

### 3. Procurement Status
All consultant engagements executed. Head contract executed (AS 4902 lump sum, $16.5M). Sub-trades currently in procurement: structural steel (target award 5 November), facade (target award 12 November), mechanical (target award 19 November). All other trades to be procured prior to need-by dates per programme.

### 4. Design Coordination + RFIs
Design release schedule issued by SJB. CC documentation complete and submitted; awaiting CC issue (target 30 October per certifier). RFI register established. Open RFIs: 3 (apartment ventilation grilles, balcony balustrade fixings, lift pit drainage). All to be closed within 14 days. Design coordination meetings to occur weekly on Tuesdays.

### 5. Risks + Outstanding Items
Top risks identified: (1) Latent ground conditions — mitigated by JK Geotechnics review of bore log data; (2) Concrete supply — primary supplier Holcim Erskine Park, backup nominated; (3) DA condition #14 (out-of-hours work) requires Council application — ADCO to lodge by mid-November. Owner to confirm if separable portions (FF&E, signage) will be procured separately or rolled into a follow-on contract.

### Action Items
- ADCO to issue baseline programme REV B by 30 October
- ADCO to lodge out-of-hours work application with Council by 15 November
- Owner to confirm separable portions strategy by 5 November
`;

const PCG_2_MINUTES = `## PCG #2 — November Progress (26 November 2025)

### 1. Safety + WHS
Zero incidents YTD. Excavation safety briefings conducted prior to each new dig face. Confined spaces SWMS in place for piling work commencing next week.

### 2. Programme + Critical Path
Demolition 100% complete (Nov 21, 2 days ahead). Bulk excavation 60% complete. Latent condition (sandstone bedrock) encountered. Estimated 3-day impact (granted under EOT #2). Critical path remains through footings → basement slab. Programme on track despite latent condition.

### 3. Procurement Status
Structural steel awarded to Active Steel ($480k). Facade awarded to Fairview Architectural ($2.18M). Mechanical procurement extended by 2 weeks pending NDY load study revision.

### 4. Design Coordination + RFIs
Open RFIs: 5. RFI-014 (Stair B pressurisation) requires fire engineer input. RFI-018 (slab penetration coordination) escalated for L3 pour scheduling. SJB issued CC drawings REV C following council request for additional accessibility detail.

### 5. Risks + Outstanding Items
Latent condition (bedrock) — material exceeded design assumption. Variation + EOT pending. Concrete supply confirmed through to February. Suspected polluted material in SW corner — testing in progress, results expected 4 December.
`;

const PCG_3_MINUTES = `## PCG #3 — December Progress (17 December 2025)

### 1. Safety + WHS
Zero incidents. Christmas shutdown safety brief delivered. Site secured 22 Dec to 5 Jan with security patrols 4× daily.

### 2. Programme + Critical Path
Concrete supplier industrial action 15-18 Dec lost 4 days. ADCO submitted EOT #3 (under assessment). Footings ~75% complete prior to shutdown. Currently 8 days behind baseline (3 latent + 4 industrial action + 1 weather).

### 3. Procurement Status
Mechanical procurement complete — sub-contract executed. Lift contract negotiation in progress with KONE; expected award January.

### 4. Design Coordination + RFIs
RFI-014 closed — NDY confirmed AHU re-trim provides 50Pa per fire engineer requirement. RFI-018 in coordination with slab pour.

### 5. Risks + Outstanding Items
Polluted material classified as general solid waste — disposed under standard waste management plan. Three EOTs in train.
`;

const PCG_4_V1 = `## PCG #4 — February Progress — VERSION 1 (issued 25 February 2026)

**Status: Draft — for review by attendees**

### 1. Safety + WHS
Zero incidents.

### 2. Programme + Critical Path
Substructure complete 6 March (formally signed off — see green note). L1 + L2 structure complete. L3 currently in progress, target completion 17 March. EOT #4 granted (2 days for late L3 structural drawings). Currently 11 days behind original baseline.

### 3. Procurement Status
All trades engaged. Lift contract awarded to KONE.

### 4. Design Coordination + RFIs
RFI-022 (balustrade) closed. RFI-025 (basement waterproofing interface) closed.

### 5. Variations
Approved this period: VAR-002 ($22k MSB uplift), VAR-003 ($14k lift upgrade).

### 6. Risks + Outstanding Items
Top risk this period: facade colour — client considering revision.
`;

const PCG_4_V2 = `## PCG #4 — February Progress — VERSION 2 (revised 27 February 2026)

**Status: Revised after attendee comments — added WHS notice + facade context**

### 1. Safety + WHS
Zero incidents. **Added: WHS notice CN-006 (scaffold inspection lapse) raised 10 Feb — addressed same-day, daily checklist revised. Working at heights training delivered to all new starters (5 personnel) commencing facade work.**

### 2. Programme + Critical Path
Substructure complete 6 March (formally signed off). L1 + L2 structure complete. L3 currently in progress, target completion 17 March. EOT #4 granted (2 days for late L3 structural drawings). Currently 11 days behind original baseline. **Topping out target revised: 28 May 2026 (was 21 May).**

### 3. Procurement Status
All trades engaged. Lift contract awarded to KONE (with VAR-003 spec upgrade). Mechanical commissioning scope clarified with subcontractor. Cladding procurement in progress — Fairview to deliver first batch 12 March.

### 4. Design Coordination + RFIs
RFI-022 (balustrade) closed. RFI-025 (basement waterproofing interface) closed. RFI-029 (lift pit drainage) closed. **Added: Two new RFIs opened (services riser + acoustic walls). VAR-002 (MSB uplift) approved — enables future EV charging across all 14 carpark bays.**

### 5. Variations
Approved this period: VAR-002 ($22k MSB uplift), VAR-003 ($14k lift upgrade). Pending: VAR-001 (BMU upgrade — pending QS review). **Forecast variation total: $84k against $850k construction contingency.**

### 6. Risks + Outstanding Items
Top risk this period: facade colour — client considering revision, may impact lead time. Tile selection finalised (closed). Outstanding: cladding sample sign-off (target 25 Feb).
`;

const PCG_4_V3 = `## PCG #4 — February Progress — VERSION 3 (FINAL, issued 4 March 2026)

**Status: Final — all attendee comments incorporated; published to distribution list**

### 1. Safety + WHS
Zero incidents. WHS notice CN-006 (scaffold inspection lapse) raised 10 Feb — addressed same-day, daily checklist revised. Working at heights training delivered to all new starters (5 personnel) commencing facade work. **Final addition: SafeWork NSW site visit recap — no observations or directions issued.**

### 2. Programme + Critical Path
Substructure complete 6 March (formally signed off). L1 + L2 structure complete. L3 currently in progress, target completion 17 March. EOT #4 granted (2 days for late L3 structural drawings). Currently 11 days behind original baseline. Topping out target revised: 28 May 2026 (was 21 May). **Final: PCD target updated to 28 October 2026 reflecting EOT #1 (5 days wet weather granted).**

### 3. Procurement Status
All trades engaged. Lift contract awarded to KONE (with VAR-003 spec upgrade). Mechanical commissioning scope clarified with subcontractor. Cladding procurement in progress — Fairview to deliver first batch 12 March.

### 4. Design Coordination + RFIs
RFI-022 (balustrade) closed. RFI-025 (basement waterproofing interface) closed. RFI-029 (lift pit drainage) closed. Two new RFIs opened (services riser + acoustic walls). VAR-002 (MSB uplift) approved — enables future EV charging across all 14 carpark bays. NDY to coordinate substation transformer upgrade with Ausgrid.

### 5. Variations
Approved this period: VAR-002 ($22k MSB uplift), VAR-003 ($14k lift upgrade). Pending: VAR-001 (BMU upgrade — pending QS review). Forecast variation total: $84k against $850k construction contingency. **Final: VAR-006 lobby finishes upgrade rejected, value engineering rationale documented.**

### 6. Risks + Outstanding Items
Top risk this period: facade colour — client considering revision, may impact lead time. Tile selection finalised (closed). Outstanding: cladding sample sign-off (target 25 Feb — see green note). Pre-pour notification protocol working well; no neighbour complaints.

### Action Items
- ADCO to confirm cladding sample to architect by 25 Feb (Mike, Greg)
- Owner to direct on VAR-004 facade colour by 30 April (Marcus)
- NDY to issue acoustic upgrade options in next coordination meeting (Tom)
- ADCO to verify EOT #5 critical path impact substantiation by 16 April (Greg, Karen)
`;

const PCG_5_MINUTES = `## PCG #5 — March Progress (25 March 2026)

### 1. Safety + WHS
Zero incidents. Wet weather PPE refreshed across site. Fall arrest equipment inspected for facade install commencement. SafeWork NSW site visit 12 March — no observations or directions issued.

### 2. Programme + Critical Path
Wet weather event 17–24 March cost 5 days (EOT #1 granted). L3 structure complete. L4 in progress (currently 65%). Facade installation commenced 13 March. Services rough-in commenced 23 March (slightly ahead). Current programme position: 16 days behind original baseline. Revised PCD: 28 October 2026.

### 3. Procurement Status
All construction trades engaged. Separable portions (FF&E, signage, landscape extras) to be procured 4-6 weeks before need-by dates. RLB to issue separable scope packages by end April.

### 4. Design Coordination + RFIs
Joinery shop drawings approved. Acoustic Logic raised RFI-031 (apartment party wall acoustic separation) — current detail provides Rw48 vs Rw50 brief. Resolution path: upgrade plasterboard spec, $27k cost impact. VAR-006 (lobby finishes upgrade) — REJECTED, value engineering rationale documented.

### 5. Variations
Approved this period: VAR-001 ($48k BMU upgrade). Pending: VAR-004 (facade colour) — significant decision deadline 25 April. VAR-005 (planter additions) submitted 15 April. Total approved variations: $84k. Construction contingency utilisation: 9.9%.

### 6. Risks + Outstanding Items
Top risk: facade colour decision (deadline 25 April). Acoustic upgrade $27k under cost review. Wet weather contingency reduced — only 5 weather days remaining in baseline. Outstanding: VAR-004 client decision; KONE shop drawings awaiting return.
`;

const PCG_6_V1 = `## PCG #6 — April Progress — VERSION 1 (draft, issued 22 April 2026)

**Status: Draft — pending Owner review**

### 1. Safety + WHS
Zero incidents.

### 2. Programme + Critical Path
L4 structure 65% complete. L5 commenced this week. Facade install 15% complete. Services rough-in 45%. Programme position: 17 days behind baseline. Topping out target 28 May 2026.

### 3. Procurement Status
All trades on programme. Separable portions packages issued for review 18 April.

### 4. Design Coordination + RFIs
New RFIs this period: RFI-034 (planter waterproofing), RFI-038 (fire damper coordination). VAR-004 facade colour decision overdue.

### 5. Variations
No new variations approved this period.

### 6. Risks + Outstanding Items
Critical risk: VAR-004 decision overdue, daily impact accruing.
`;

const PCG_6_V2 = `## PCG #6 — April Progress — VERSION 2 (updated 24 April 2026)

**Status: Updated with substation tie-in detail and FF&E procurement plan**

### 1. Safety + WHS
Zero incidents. **Added: Service interruption notice CN-004 issued for Ausgrid substation tie-in 28 April — generators arranged. Working at heights register reviewed for facade work; all current.**

### 2. Programme + Critical Path
L4 structure 65% complete. L5 commenced this week. Facade install 15% complete (initial panels installed, fixings program testing). Services rough-in 45%. Programme position: 17 days behind baseline. Topping out target 28 May 2026. **Added: PCD now 29 October 2026 (EOT #6 granted for substation tie-in).**

### 3. Procurement Status
All trades on programme. Separable portions packages issued for review 18 April. **Added: FF&E supplier shortlist confirmed; tender release scheduled 5 May.**

### 4. Design Coordination + RFIs
New RFIs this period: RFI-034 (planter waterproofing), RFI-038 (fire damper coordination). VAR-004 facade colour decision overdue (target was 25 April, now 30 April). **Added: Acoustic upgrade variation pricing under negotiation with ADCO.**

### 5. Variations
No new variations approved this period. Pending: VAR-004 (facade colour, $35k), VAR-005 (planter additions, $8k), acoustic upgrade ($27k). **Forecast total variations: $154k. Construction contingency utilisation projected at 18% if all pending approved.**

### 6. Risks + Outstanding Items
Critical risk: VAR-004 decision overdue, daily impact accruing. Topping out milestone tight given acoustic upgrade may require sequencing impact. Owner to provide direction on VAR-004 by EoW.
`;

const PCG_6_V3 = `## PCG #6 — April Progress — VERSION 3 (FINAL, issued 26 April 2026)

**Status: Final — distributed to all attendees and distribution list**

### 1. Safety + WHS
Zero incidents. Service interruption notice CN-004 issued for Ausgrid substation tie-in 28 April — generators arranged. Working at heights register reviewed for facade work; all current. **Final addition: Crane SWL signage refreshed.**

### 2. Programme + Critical Path
L4 structure 65% complete. L5 commenced this week. Facade install 15% complete (initial panels installed, fixings program testing). Services rough-in 45%. Programme position: 17 days behind baseline. Topping out target 28 May 2026. PCD now 29 October 2026 (EOT #6 granted for substation tie-in).

### 3. Procurement Status
All trades on programme. Separable portions packages issued for review 18 April. FF&E supplier shortlist confirmed; tender release scheduled 5 May.

### 4. Design Coordination + RFIs
New RFIs this period: RFI-034 (planter waterproofing), RFI-038 (fire damper coordination). VAR-004 facade colour decision overdue (target was 25 April, now 30 April). Acoustic upgrade variation pricing under negotiation with ADCO.

### 5. Variations
No new variations approved this period. Pending: VAR-004 (facade colour, $35k), VAR-005 (planter additions, $8k), acoustic upgrade ($27k). Forecast total variations: $154k. Construction contingency utilisation projected at 18% if all pending approved.

### 6. Risks + Outstanding Items
Critical risk: VAR-004 decision overdue, daily impact accruing. Topping out milestone tight given acoustic upgrade may require sequencing impact. Owner to provide direction on VAR-004 by EoW.

### Action Items
- Owner to direct VAR-004 facade colour decision by 30 April (Marcus)
- ADCO to issue revised programme post-substation tie-in by 5 May (Greg)
- RLB to issue FF&E tender package by 5 May (Olivia)
- NDY to negotiate acoustic upgrade pricing with ADCO by 8 May (Tom)
`;

const MEETINGS: MeetingSeed[] = [
  {
    number: 1,
    title: 'PCG #1 — Project Kick-off',
    date: '2025-10-22',
    reportingPeriodStart: '2025-10-14',
    reportingPeriodEnd: '2025-10-22',
    attendees: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'Coastal Living Pty Ltd', role: 'Development Manager' },
      { organization: 'SJB Architects', role: 'Project Architect' },
      { organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)' },
      { organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer' },
      { organization: 'Norman Disney & Young', role: 'Services Lead (Mech/Elec/Hyd)' },
      { organization: 'Rider Levett Bucknall', role: 'Quantity Surveyor' },
    ],
    versions: [{ versionLabel: 'Version 1', content: PCG_1_MINUTES }],
  },
  {
    number: 2,
    title: 'PCG #2 — November Progress',
    date: '2025-11-26',
    reportingPeriodStart: '2025-10-23',
    reportingPeriodEnd: '2025-11-26',
    attendees: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'SJB Architects', role: 'Project Architect' },
      { organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)' },
      { organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer' },
      { organization: 'JK Geotechnics', role: 'Geotechnical Engineer' },
    ],
    versions: [{ versionLabel: 'Version 1', content: PCG_2_MINUTES }],
  },
  {
    number: 3,
    title: 'PCG #3 — December Progress',
    date: '2025-12-17',
    reportingPeriodStart: '2025-11-27',
    reportingPeriodEnd: '2025-12-17',
    attendees: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'SJB Architects', role: 'Project Architect' },
      { organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)' },
      { organization: 'Holmes Fire', role: 'Fire Engineer' },
    ],
    versions: [{ versionLabel: 'Version 1', content: PCG_3_MINUTES }],
  },
  {
    // 3 versions — demonstrates revision workflow
    number: 4,
    title: 'PCG #4 — February Progress',
    date: '2026-02-25',
    reportingPeriodStart: '2026-01-08',
    reportingPeriodEnd: '2026-02-25',
    attendees: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'Coastal Living Pty Ltd', role: 'Development Manager' },
      { organization: 'SJB Architects', role: 'Project Architect' },
      { organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)' },
      { organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer' },
      { organization: 'Norman Disney & Young', role: 'Services Lead (Mech/Elec/Hyd)' },
      { organization: 'Rider Levett Bucknall', role: 'Quantity Surveyor' },
      { organization: 'Holmes Fire', role: 'Fire Engineer' },
    ],
    versions: [
      { versionLabel: 'Version 1 (draft)', content: PCG_4_V1 },
      { versionLabel: 'Version 2 (revised)', content: PCG_4_V2 },
      { versionLabel: 'Version 3 (final)', content: PCG_4_V3 },
    ],
  },
  {
    number: 5,
    title: 'PCG #5 — March Progress',
    date: '2026-03-25',
    reportingPeriodStart: '2026-02-26',
    reportingPeriodEnd: '2026-03-25',
    attendees: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'Coastal Living Pty Ltd', role: 'Director' },
      { organization: 'SJB Architects', role: 'Project Architect' },
      { organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)' },
      { organization: 'Acoustic Logic', role: 'Acoustic Consultant' },
    ],
    versions: [{ versionLabel: 'Version 1', content: PCG_5_MINUTES }],
  },
  {
    // 3 versions — demonstrates revision workflow on most-recent meeting
    number: 6,
    title: 'PCG #6 — April Progress',
    date: '2026-04-22',
    reportingPeriodStart: '2026-03-26',
    reportingPeriodEnd: '2026-04-22',
    attendees: [
      { organization: 'Coastal Living Pty Ltd', role: "Owner's Representative" },
      { organization: 'Coastal Living Pty Ltd', role: 'Development Manager' },
      { organization: 'SJB Architects', role: 'Project Architect' },
      { organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)' },
      { organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer' },
      { organization: 'Norman Disney & Young', role: 'Services Lead (Mech/Elec/Hyd)' },
      { organization: 'Rider Levett Bucknall', role: 'Quantity Surveyor' },
      { organization: 'Holmes Fire', role: 'Fire Engineer' },
      { organization: 'Fairview Architectural', role: 'Cladding Subcontractor' },
    ],
    versions: [
      { versionLabel: 'Version 1 (draft)', content: PCG_6_V1 },
      { versionLabel: 'Version 2 (updated)', content: PCG_6_V2 },
      { versionLabel: 'Version 3 (final)', content: PCG_6_V3 },
    ],
  },
];

export async function seedMeetings(
  tx: any,
  profile: ProfileResult,
  stakeholderIds: StakeholderIdMap
): Promise<void> {
  // ARCHITECTURE: one meetingGroup per PCG title (= a panel).
  // Each meeting record within the group = a numbered tab (01, 02, 03).
  // For single-version PCGs: 1 meeting record (= 1 tab).
  // For PCG #4 + #6 (demo'd versions): 3 meeting records (= 3 version tabs).

  for (let gi = 0; gi < MEETINGS.length; gi++) {
    const m = MEETINGS[gi];
    const groupId = crypto.randomUUID();

    await tx.insert(meetingGroups).values({
      id: groupId,
      projectId: profile.projectId,
      organizationId: profile.organizationId,
      groupNumber: m.number,
      title: m.title,
    });

    for (let vi = 0; vi < m.versions.length; vi++) {
      const v = m.versions[vi];
      const meetingId = crypto.randomUUID();
      const ts = new Date(m.date + 'T10:00:00').toISOString();

      // If only one version, the meeting title matches the group title (cleaner header).
      // If multiple versions, prefix with the group title and append the version label
      // (the panel header shows the active meeting's title).
      const meetingTitle =
        m.versions.length === 1
          ? m.title
          : `${m.title} — ${v.versionLabel}`;

      await tx.insert(meetings).values({
        id: meetingId,
        projectId: profile.projectId,
        organizationId: profile.organizationId,
        groupId,
        title: meetingTitle,
        meetingDate: m.date,
        agendaType: 'standard',
        reportingPeriodStart: m.reportingPeriodStart,
        reportingPeriodEnd: m.reportingPeriodEnd,
        createdAt: ts,
        updatedAt: ts,
      });

      // Single section per meeting — the body of the minutes.
      await tx.insert(meetingSections).values({
        id: crypto.randomUUID(),
        meetingId,
        sectionKey: 'minutes',
        sectionLabel: 'Minutes',
        content: v.content,
        sortOrder: 0,
        createdAt: ts,
        updatedAt: ts,
      });

      if (m.attendees.length > 0) {
        await tx.insert(meetingAttendees).values(
          m.attendees.map((a) => {
            const sid = stakeholderIds.get(stakeholderKey(a.organization, a.role));
            return {
              id: crypto.randomUUID(),
              meetingId,
              stakeholderId: sid ?? null,
              adhocName: sid ? null : a.role,
              adhocFirm: sid ? null : a.organization,
              adhocGroup: null,
              adhocSubGroup: null,
              isAttending: true,
              isDistribution: true,
              createdAt: ts,
            };
          })
        );
      }
    }
  }
}
