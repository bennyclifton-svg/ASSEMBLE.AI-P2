import { costLines } from '@/lib/db/pg-schema';
import type { ProfileResult } from './profile';
import type { StakeholderIdMap } from './stakeholders';
import { stakeholderKey, subgroupKey } from './stakeholders';

/**
 * Returns a map keyed by costCode so other modules (variations, invoices) can
 * link back to the right cost line.
 */
export type CostLineIdMap = Map<string, string>;

interface CostLineSeed {
  section: string;
  costCode: string;
  /** The activity / description column (e.g. "Schematic Design") */
  activity: string;
  budgetCents: number;
  approvedContractCents?: number;
  reference?: string;
  /** Lookup by firm + role */
  stakeholderLookup?: { organization: string; role: string };
  /** Or lookup by subgroup (used by trades that don't have a unique role) */
  subgroupLookup?: { group: 'consultant' | 'contractor' | 'client' | 'authority'; subgroup: string; organization?: string };
  masterStage?: string;
}

const LINES: CostLineSeed[] = [
  // ============ FEES ============ ($310k)
  { section: 'FEES', costCode: '1.01', activity: 'DA application fees', budgetCents: 4_500_00, approvedContractCents: 4_500_00, masterStage: 'initiation' },
  { section: 'FEES', costCode: '1.02', activity: 'CC / Building approval fees', budgetCents: 8_500_00, approvedContractCents: 8_500_00, masterStage: 'procurement' },
  { section: 'FEES', costCode: '1.03', activity: 'S7.11 contributions', budgetCents: 180_000_00, approvedContractCents: 180_000_00, masterStage: 'initiation' },
  { section: 'FEES', costCode: '1.04', activity: 'Long Service Levy', budgetCents: 56_500_00, approvedContractCents: 56_500_00, masterStage: 'procurement' },
  { section: 'FEES', costCode: '1.05', activity: 'Legal fees (contract drafting + admin)', budgetCents: 40_000_00, approvedContractCents: 40_000_00 },
  { section: 'FEES', costCode: '1.06', activity: 'Contract works insurance + PI', budgetCents: 20_500_00, approvedContractCents: 20_500_00 },

  // ============ CONSULTANTS ============ ($1.45M)
  // Project Manager (internal) — single line
  { section: 'CONSULTANTS', costCode: '2.01', activity: 'Project management — full delivery', budgetCents: 137_000_00, approvedContractCents: 137_000_00, subgroupLookup: { group: 'client', subgroup: 'Owner' } },

  // Architect — SJB ($420k split per stage)
  { section: 'CONSULTANTS', costCode: '2.02.1', activity: 'Schematic Design', budgetCents: 60_000_00, approvedContractCents: 60_000_00, stakeholderLookup: { organization: 'SJB Architects', role: 'Project Architect' }, masterStage: 'schematic_design' },
  { section: 'CONSULTANTS', costCode: '2.02.2', activity: 'Detail Design', budgetCents: 130_000_00, approvedContractCents: 130_000_00, stakeholderLookup: { organization: 'SJB Architects', role: 'Project Architect' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.02.3', activity: 'CC Documentation', budgetCents: 110_000_00, approvedContractCents: 110_000_00, stakeholderLookup: { organization: 'SJB Architects', role: 'Project Architect' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.02.4', activity: 'Contract Administration', budgetCents: 120_000_00, approvedContractCents: 120_000_00, stakeholderLookup: { organization: 'SJB Architects', role: 'Project Architect' }, masterStage: 'delivery' },

  // Structural — Northrop ($180k split per stage)
  { section: 'CONSULTANTS', costCode: '2.03.1', activity: 'Schematic Design', budgetCents: 30_000_00, approvedContractCents: 30_000_00, stakeholderLookup: { organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer' }, masterStage: 'schematic_design' },
  { section: 'CONSULTANTS', costCode: '2.03.2', activity: 'Detail Design', budgetCents: 80_000_00, approvedContractCents: 80_000_00, stakeholderLookup: { organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.03.3', activity: 'CC Documentation', budgetCents: 40_000_00, approvedContractCents: 40_000_00, stakeholderLookup: { organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.03.4', activity: 'Contract Administration', budgetCents: 30_000_00, approvedContractCents: 30_000_00, stakeholderLookup: { organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer' }, masterStage: 'delivery' },

  // Mechanical/Electrical/Hydraulic — NDY ($240k split per stage; same firm, single stakeholder under Mechanical subgroup)
  { section: 'CONSULTANTS', costCode: '2.04.1', activity: 'Schematic Design', budgetCents: 40_000_00, approvedContractCents: 40_000_00, stakeholderLookup: { organization: 'Norman Disney & Young', role: 'Services Lead (Mech/Elec/Hyd)' }, masterStage: 'schematic_design' },
  { section: 'CONSULTANTS', costCode: '2.04.2', activity: 'Detail Design', budgetCents: 110_000_00, approvedContractCents: 110_000_00, stakeholderLookup: { organization: 'Norman Disney & Young', role: 'Services Lead (Mech/Elec/Hyd)' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.04.3', activity: 'CC Documentation', budgetCents: 50_000_00, approvedContractCents: 50_000_00, stakeholderLookup: { organization: 'Norman Disney & Young', role: 'Services Lead (Mech/Elec/Hyd)' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.04.4', activity: 'Contract Administration', budgetCents: 40_000_00, approvedContractCents: 40_000_00, stakeholderLookup: { organization: 'Norman Disney & Young', role: 'Services Lead (Mech/Elec/Hyd)' }, masterStage: 'delivery' },

  // Civil — Calibre ($80k)
  { section: 'CONSULTANTS', costCode: '2.05.1', activity: 'Schematic + Detail Design', budgetCents: 50_000_00, approvedContractCents: 50_000_00, stakeholderLookup: { organization: 'Calibre Consulting', role: 'Civil Engineer' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.05.2', activity: 'CC Documentation + CA', budgetCents: 30_000_00, approvedContractCents: 30_000_00, stakeholderLookup: { organization: 'Calibre Consulting', role: 'Civil Engineer' }, masterStage: 'delivery' },

  // Geotech — JK Geotechnics ($35k single line)
  { section: 'CONSULTANTS', costCode: '2.06', activity: 'Geotechnical investigation + advice', budgetCents: 35_000_00, approvedContractCents: 35_000_00, stakeholderLookup: { organization: 'JK Geotechnics', role: 'Geotechnical Engineer' }, masterStage: 'initiation' },

  // QS — RLB ($95k)
  { section: 'CONSULTANTS', costCode: '2.07.1', activity: 'Cost planning (SD → CC stages)', budgetCents: 55_000_00, approvedContractCents: 55_000_00, stakeholderLookup: { organization: 'Rider Levett Bucknall', role: 'Quantity Surveyor' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.07.2', activity: 'Monthly cost reporting (delivery)', budgetCents: 40_000_00, approvedContractCents: 40_000_00, stakeholderLookup: { organization: 'Rider Levett Bucknall', role: 'Quantity Surveyor' }, masterStage: 'delivery' },

  // Town Planner — Urbis ($55k single)
  { section: 'CONSULTANTS', costCode: '2.08', activity: 'Town planning + DA preparation', budgetCents: 55_000_00, approvedContractCents: 55_000_00, stakeholderLookup: { organization: 'Urbis', role: 'Town Planner' }, masterStage: 'schematic_design' },

  // Acoustic — Acoustic Logic ($42k)
  { section: 'CONSULTANTS', costCode: '2.09', activity: 'Acoustic design + site testing', budgetCents: 42_000_00, approvedContractCents: 42_000_00, stakeholderLookup: { organization: 'Acoustic Logic', role: 'Acoustic Consultant' }, masterStage: 'design_development' },

  // BCA — Philip Chun ($48k)
  { section: 'CONSULTANTS', costCode: '2.10', activity: 'Building certification + CC issue', budgetCents: 48_000_00, approvedContractCents: 48_000_00, stakeholderLookup: { organization: 'Philip Chun', role: 'BCA / Building Certifier' }, masterStage: 'procurement' },

  // Fire Engineer — Holmes Fire ($58k)
  { section: 'CONSULTANTS', costCode: '2.11.1', activity: 'Fire engineering report', budgetCents: 38_000_00, approvedContractCents: 38_000_00, stakeholderLookup: { organization: 'Holmes Fire', role: 'Fire Engineer' }, masterStage: 'design_development' },
  { section: 'CONSULTANTS', costCode: '2.11.2', activity: 'CA + RFI responses', budgetCents: 20_000_00, approvedContractCents: 20_000_00, stakeholderLookup: { organization: 'Holmes Fire', role: 'Fire Engineer' }, masterStage: 'delivery' },

  // Landscape — 360 Degrees ($35k)
  { section: 'CONSULTANTS', costCode: '2.12', activity: 'Landscape design + CA', budgetCents: 35_000_00, approvedContractCents: 35_000_00, stakeholderLookup: { organization: '360 Degrees Landscape Architects', role: 'Landscape Architect' }, masterStage: 'design_development' },

  // Surveyor — Veris ($25k)
  { section: 'CONSULTANTS', costCode: '2.13', activity: 'Survey + set-out + as-builts', budgetCents: 25_000_00, approvedContractCents: 25_000_00, stakeholderLookup: { organization: 'Veris', role: 'Surveyor' }, masterStage: 'initiation' },

  // ============ CONSTRUCTION ============ ($17.18M)
  // Head contract trade-letting breakdown
  { section: 'CONSTRUCTION', costCode: '3.01', activity: 'Site establishment + preliminaries', budgetCents: 980_000_00, approvedContractCents: 980_000_00, reference: 'ADCO HC', stakeholderLookup: { organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)' } },
  { section: 'CONSTRUCTION', costCode: '3.02', activity: 'Demolition (existing structure)', budgetCents: 320_000_00, approvedContractCents: 320_000_00, stakeholderLookup: { organization: 'Liberty Industrial', role: 'Demolition Contractor' } },
  { section: 'CONSTRUCTION', costCode: '3.03', activity: 'Excavation, piling + shoring', budgetCents: 1_180_000_00, approvedContractCents: 1_180_000_00, stakeholderLookup: { organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)' } },
  { section: 'CONSTRUCTION', costCode: '3.04', activity: 'Concrete works (basement + superstructure)', budgetCents: 3_400_000_00, approvedContractCents: 3_400_000_00, stakeholderLookup: { organization: 'Concrete Constructions Group', role: 'Concrete Subcontractor' } },
  { section: 'CONSTRUCTION', costCode: '3.05', activity: 'Formwork', budgetCents: 1_200_000_00, approvedContractCents: 1_200_000_00, stakeholderLookup: { organization: 'PERI Australia', role: 'Formwork Subcontractor' } },
  { section: 'CONSTRUCTION', costCode: '3.06', activity: 'Structural steel + connections', budgetCents: 480_000_00, approvedContractCents: 480_000_00, stakeholderLookup: { organization: 'Active Steel', role: 'Structural Steel Subcontractor' } },
  { section: 'CONSTRUCTION', costCode: '3.07', activity: 'Facade — anodised aluminium + precast', budgetCents: 2_000_000_00, approvedContractCents: 2_000_000_00, stakeholderLookup: { organization: 'Fairview Architectural', role: 'Cladding Subcontractor' } },
  { section: 'CONSTRUCTION', costCode: '3.08', activity: 'Roofing + waterproofing', budgetCents: 380_000_00, approvedContractCents: 380_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.09', activity: 'Electrical services', budgetCents: 1_420_000_00, approvedContractCents: 1_420_000_00, stakeholderLookup: { organization: 'Stowe Australia', role: 'Electrical Subcontractor' } },
  { section: 'CONSTRUCTION', costCode: '3.10', activity: 'Hydraulic services', budgetCents: 980_000_00, approvedContractCents: 980_000_00, stakeholderLookup: { organization: 'Cooke & Dowsett', role: 'Plumbing/Hydraulic Subcontractor' } },
  { section: 'CONSTRUCTION', costCode: '3.11', activity: 'Mechanical services (HVAC)', budgetCents: 720_000_00, approvedContractCents: 720_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.12', activity: 'Fire services + fire engineering', budgetCents: 280_000_00, approvedContractCents: 280_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.13', activity: 'Lifts (2 × passenger)', budgetCents: 380_000_00, approvedContractCents: 380_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.14', activity: 'Internal lining (plasterboard + carpentry)', budgetCents: 620_000_00, approvedContractCents: 620_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.15', activity: 'Wet area waterproofing + tiling', budgetCents: 540_000_00, approvedContractCents: 540_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.16', activity: 'Joinery — kitchens + wardrobes', budgetCents: 720_000_00, approvedContractCents: 720_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.17', activity: 'Floor finishes (engineered timber + carpet)', budgetCents: 280_000_00, approvedContractCents: 280_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.18', activity: 'Painting + decorative finishes', budgetCents: 220_000_00, approvedContractCents: 220_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.19', activity: 'BMU + facade access', budgetCents: 110_000_00, approvedContractCents: 110_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.20', activity: 'Landscape + soft landscaping', budgetCents: 180_000_00, approvedContractCents: 180_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.21', activity: 'External works + paving', budgetCents: 110_000_00, approvedContractCents: 110_000_00 },
  // Separable portions ($480k)
  { section: 'CONSTRUCTION', costCode: '3.30', activity: 'FF&E — Lobby + amenities', budgetCents: 240_000_00, approvedContractCents: 0 },
  { section: 'CONSTRUCTION', costCode: '3.31', activity: 'Signage + wayfinding', budgetCents: 80_000_00, approvedContractCents: 0 },
  { section: 'CONSTRUCTION', costCode: '3.32', activity: 'Landscape extras + roof terrace planting', budgetCents: 160_000_00, approvedContractCents: 0 },
  // Authority backcharges ($200k)
  { section: 'CONSTRUCTION', costCode: '3.40', activity: 'Sydney Water Section 73 works', budgetCents: 120_000_00, approvedContractCents: 120_000_00 },
  { section: 'CONSTRUCTION', costCode: '3.41', activity: 'Ausgrid substation + connection', budgetCents: 80_000_00, approvedContractCents: 80_000_00 },

  // ============ CONTINGENCY ============ ($1.06M)
  { section: 'CONTINGENCY', costCode: '4.01', activity: 'Construction contingency', budgetCents: 850_000_00 },
  { section: 'CONTINGENCY', costCode: '4.02', activity: 'Design contingency', budgetCents: 210_000_00 },
];

export async function seedCostPlan(
  tx: any,
  profile: ProfileResult,
  stakeholderIds: StakeholderIdMap
): Promise<CostLineIdMap> {
  // Sanity check — assert total = $20M
  const total = LINES.reduce((sum, l) => sum + l.budgetCents, 0);
  if (total !== 20_000_000_00) {
    throw new Error(`Cost plan total ${total} cents != expected ${20_000_000_00} cents`);
  }

  const map: CostLineIdMap = new Map();
  const records = LINES.map((l, idx) => {
    const id = crypto.randomUUID();
    map.set(l.costCode, id);

    let stakeholderId: string | null = null;
    if (l.stakeholderLookup) {
      stakeholderId = stakeholderIds.get(stakeholderKey(l.stakeholderLookup.organization, l.stakeholderLookup.role)) ?? null;
    } else if (l.subgroupLookup) {
      stakeholderId = stakeholderIds.get(subgroupKey(l.subgroupLookup.group, l.subgroupLookup.subgroup, l.subgroupLookup.organization)) ?? null;
    }

    return {
      id,
      projectId: profile.projectId,
      stakeholderId,
      section: l.section,
      costCode: l.costCode,
      activity: l.activity,
      reference: l.reference ?? null,
      budgetCents: l.budgetCents,
      approvedContractCents: l.approvedContractCents ?? 0,
      masterStage: l.masterStage ?? 'delivery',
      sortOrder: idx,
    };
  });

  await tx.insert(costLines).values(records);
  return map;
}
