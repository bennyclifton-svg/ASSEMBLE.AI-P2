import {
  projects,
  projectDetails,
  projectObjectives,
  projectStages,
  consultantDisciplines,
  consultantStatuses,
  contractorTrades,
  contractorStatuses,
  projectProfiles,
  profilerObjectives,
} from '@/lib/db/pg-schema';
import { CONSULTANT_DISCIPLINES, CONTRACTOR_TRADES, STATUS_TYPES } from '@/lib/constants/disciplines';
import {
  DEMO_PROJECT_NAME,
  DEMO_PROJECT_CODE,
  PROJECT_ADDRESS,
  PROJECT_LEGAL,
  PROJECT_LATITUDE,
  PROJECT_LONGITUDE,
  PROJECT_LOT_AREA,
  PROJECT_STORIES,
  PROJECT_BUILDING_CLASS,
  PROJECT_ZONING,
  PROJECT_JURISDICTION,
  PROJECT_START,
  PCD_TARGET,
  isoDate,
} from './data';

export interface ProfileResult {
  projectId: string;
  organizationId: string;
  userId: string;
}

export async function seedProfile(
  tx: any,
  owner: { userId: string; organizationId: string }
): Promise<ProfileResult> {
  const projectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Note: drawingExtractionEnabled is `integer` in DB but `boolean` in schema.
  // Skipping the field — DB default applies (NULL/0).
  await tx.insert(projects).values({
    id: projectId,
    name: DEMO_PROJECT_NAME,
    code: DEMO_PROJECT_CODE,
    status: 'active',
    organizationId: owner.organizationId,
    projectType: 'apartments',
    currencyCode: 'AUD',
    showGst: false,
    revision: 'REV C',
    currentReportMonth: '2026-04',
    createdAt: PROJECT_START,
    updatedAt: new Date(),
  } as any);

  await tx.insert(projectDetails).values({
    id: crypto.randomUUID(),
    projectId,
    projectName: DEMO_PROJECT_NAME,
    address: PROJECT_ADDRESS,
    legalAddress: PROJECT_LEGAL,
    zoning: PROJECT_ZONING,
    jurisdiction: PROJECT_JURISDICTION,
    lotArea: PROJECT_LOT_AREA,
    numberOfStories: PROJECT_STORIES,
    buildingClass: PROJECT_BUILDING_CLASS,
    latitude: PROJECT_LATITUDE,
    longitude: PROJECT_LONGITUDE,
    placeId: null,
    formattedAddress: PROJECT_ADDRESS,
    tenderReleaseDate: '2025-08-12',
  });

  await tx.insert(projectObjectives).values({
    id: crypto.randomUUID(),
    projectId,
    functional:
      'Deliver 33 high-quality residential apartments across 6 levels above a single basement carpark, with ground-floor concierge, communal lounge and gymnasium. Apartment mix: 8 × 1-bed, 18 × 2-bed, 7 × 3-bed. Target 5-Star Green Star Multi-Unit Residential rating.',
    quality:
      'Premium owner-occupier finishes — engineered timber to living areas, full-height tiling to wet areas, integrated joinery to kitchens, Miele appliances. Facade: anodised aluminium and precast feature panels. BMU access to facade for maintenance.',
    budget:
      'Total project budget AUD $20,000,000 (excl. land). Construction contract sum $16.5M (lump sum, AS 4902-2000 amended). Consultant fees capped at 10% of construction. Contingency: 5% construction + 1% design.',
    program:
      'Construction commenced 14 October 2025. Topping out targeted 28 May 2026. Practical Completion target 23 October 2026 (54 calendar weeks). 12-month defects liability period to October 2027.',
    questionAnswers: JSON.stringify({
      apartmentCount: 33,
      basementLevels: 1,
      residentialLevels: 6,
      groundFloorUse: 'Lobby + amenities',
      bmuRequired: true,
      sustainabilityTarget: '5-Star Green Star',
    }),
  });

  // Building tab — projectProfiles (class, subclass, scale, work type, complexity, scope tiles)
  await tx.insert(projectProfiles).values({
    id: crypto.randomUUID(),
    projectId,
    buildingClass: 'Class 2',                     // SOU residential
    projectType: 'apartments',                    // project_type_v2
    subclass: JSON.stringify(['SOU', 'Mixed-tenure', 'Owner-occupier']),
    subclassOther: null,
    scaleData: JSON.stringify({
      apartments: 33,
      levels: 7,                  // 1 basement + GF + 5 residential + roof terrace level
      basementLevels: 1,
      gfa_sqm: 4_180,
      site_area_sqm: 2_840,
    }),
    complexity: JSON.stringify({
      quality: 'premium',
      site: 'urban infill',
      structure: 'reinforced concrete with post-tensioned slabs',
      facade: 'engineered cladding system',
      services: 'central plant + EV charging provision',
      sustainability: '5-Star Green Star',
      acoustic: 'Rw50 party walls — high spec',
    }),
    workScope: JSON.stringify([
      'New build',
      'Basement excavation',
      'Superstructure',
      'Facade installation',
      'Full services',
      'Internal fitout',
      'Landscaping (roof + ground)',
      'BMU + facade access',
    ]),
    complexityScore: 7,
    region: 'AU',
  });

  // Objectives tab v2 — profilerObjectives (Functional/Quality + Planning/Compliance)
  const FUNCTIONAL_QUALITY = `## Functional Objectives

- 33 apartments across 6 residential levels above ground-floor amenities and a single basement carpark
- Apartment mix: 8 × 1-bed, 18 × 2-bed, 7 × 3-bed (target ~70% owner-occupier, ~30% investor)
- Ground floor: lobby, concierge desk, communal lounge, gymnasium, mailroom, bin store
- Roof terrace: communal landscaped area with planters, BBQ zone and seating
- 14 carpark bays with EV charging provision (future-proofed via 1200A MSB)
- 2 × 13-person passenger lifts (KONE EcoSpace, destination control)
- BMU for full facade access including new western planter extension

## Quality Objectives

- Premium owner-occupier finishes throughout
- Living/dining: engineered timber flooring (220mm wide oak boards)
- Bedrooms: 100% wool carpet
- Wet areas: full-height porcelain tiling, frameless glass screens, brushed nickel tapware
- Kitchens: 20mm reconstituted stone benches (Calacatta Vena), 2-pak joinery, Miele appliances
- Joinery: Eurobib supplier, Blum LegraBox + soft-close hardware
- Facade: anodised aluminium feature cladding (RAL 7016) + precast concrete spandrels
- Acoustic separation: Rw50 between apartments (architect schedule upgraded post-RFI-031)
- Sustainability: 5-Star Green Star Multi-Unit Residential, 7-star NatHERS minimum`;

  const PLANNING_COMPLIANCE = `## Planning Objectives

- DA approval secured under City of Parramatta LEP 2023 (R4 High Density Residential zone)
- DA-2025-0142 approved 22 August 2025 with 14 standard conditions + 6 deferred commencement conditions
- FSR achieved: 2.4:1 (within 2.5:1 maximum)
- Building height: 24.8m to top of parapet (within 25m maximum control)
- Setbacks: 4m front, 3m side, 6m rear — all compliant
- Parking: 14 resident bays + 2 visitor bays (LEP requires 0.5 per dwelling minimum, achieved)
- Communal open space: 318 m² (10% of site — achieved 11.2%)
- Deep soil zone: 245 m² (15% target — achieved 15.6%)

## Compliance Objectives

- NCC 2022 Volume 1 — Class 2 residential, Type B construction
- DTS solution adopted for fire engineering except Stair B pressurisation (performance solution under C2D14 — Holmes Fire RFI-014 closed)
- AS 1428.1 accessibility compliance for ground-floor common areas + 3 adaptable apartments
- BASIX certificate issued (energy 50, water 40, thermal performance pass)
- Section 7.11 contributions paid: $180,000 (development infrastructure)
- Long Service Levy: $56,500 (paid pre-CC)
- Construction Certificate (CC) issued 30 September 2025 by Philip Chun (Building Certifier)
- WHS Act 2011 compliant — construction period notification lodged with SafeWork NSW
- POEO Act 1997 compliance for soil/spoil disposal (general solid waste classification confirmed Nov 2025)`;

  await tx.insert(profilerObjectives).values({
    id: crypto.randomUUID(),
    projectId,
    functionalQuality: JSON.stringify({
      content: FUNCTIONAL_QUALITY,
      source: 'manual',
      originalAi: null,
      editHistory: [],
    }),
    planningCompliance: JSON.stringify({
      content: PLANNING_COMPLIANCE,
      source: 'manual',
      originalAi: null,
      editHistory: [],
    }),
    profileContext: JSON.stringify({
      buildingClass: 'Class 2',
      projectType: 'apartments',
      apartments: 33,
      levels: 7,
    }),
    generatedAt: new Date('2025-01-20'),
    polishedAt: new Date('2025-02-12'),
  });

  // 5 master stages with realistic progress reflecting April 2026
  const stageRecords = [
    {
      name: 'Initiation',
      number: 1,
      startDate: isoDate(new Date('2024-11-01')),
      endDate: isoDate(new Date('2025-01-15')),
      status: 'completed',
    },
    {
      name: 'Scheme Design',
      number: 2,
      startDate: isoDate(new Date('2025-01-16')),
      endDate: isoDate(new Date('2025-04-30')),
      status: 'completed',
    },
    {
      name: 'Detail Design',
      number: 3,
      startDate: isoDate(new Date('2025-05-01')),
      endDate: isoDate(new Date('2025-07-31')),
      status: 'completed',
    },
    {
      name: 'Procurement',
      number: 4,
      startDate: isoDate(new Date('2025-08-01')),
      endDate: isoDate(new Date('2025-10-13')),
      status: 'completed',
    },
    {
      name: 'Delivery',
      number: 5,
      startDate: isoDate(PROJECT_START),
      endDate: isoDate(PCD_TARGET),
      status: 'in_progress',
    },
  ];
  await tx.insert(projectStages).values(
    stageRecords.map((s) => ({
      id: crypto.randomUUID(),
      projectId,
      stageNumber: s.number,
      stageName: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      duration: Math.ceil(
        (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
      status: s.status,
    }))
  );

  // Consultant disciplines (full set, key ones enabled)
  const enabledDisciplines = new Set([
    'Architect',
    'Structural',
    'Mechanical',
    'Electrical',
    'Hydraulic',
    'Civil',
    'Geotech',
    'Cost Planning',
    'Town Planning',
    'Acoustic',
    'Building Certifier',
    'Fire Engineering',
    'Landscape',
    'Survey',
  ]);
  const disciplineRecords = CONSULTANT_DISCIPLINES.map((d) => ({
    id: crypto.randomUUID(),
    projectId,
    disciplineName: d.name,
    isEnabled: enabledDisciplines.has(d.name),
    order: d.order,
  }));
  const insertedDisciplines = await tx
    .insert(consultantDisciplines)
    .values(disciplineRecords)
    .returning();

  await tx.insert(consultantStatuses).values(
    insertedDisciplines.flatMap((d: any) =>
      STATUS_TYPES.map((statusType) => ({
        id: crypto.randomUUID(),
        disciplineId: d.id,
        statusType,
        isActive: enabledDisciplines.has(d.disciplineName),
      }))
    )
  );

  // Contractor trades
  const enabledTrades = new Set([
    'Demolition',
    'Concrete',
    'Structural Steel',
    'Formwork',
    'Facade',
    'Electrical',
    'Hydraulic',
    'Mechanical',
    'Lift',
    'Waterproofing',
    'Tiler',
    'Painter',
  ]);
  const tradeRecords = CONTRACTOR_TRADES.map((t) => ({
    id: crypto.randomUUID(),
    projectId,
    tradeName: t.name,
    isEnabled: enabledTrades.has(t.name),
    order: t.order,
  }));
  const insertedTrades = await tx.insert(contractorTrades).values(tradeRecords).returning();

  await tx.insert(contractorStatuses).values(
    insertedTrades.flatMap((t: any) =>
      STATUS_TYPES.map((statusType) => ({
        id: crypto.randomUUID(),
        tradeId: t.id,
        statusType,
        isActive: enabledTrades.has(t.tradeName),
      }))
    )
  );

  return {
    projectId,
    organizationId: owner.organizationId,
    userId: owner.userId,
  };
}
