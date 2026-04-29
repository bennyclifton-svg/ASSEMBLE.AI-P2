import { variations } from '@/lib/db/pg-schema';
import type { ProfileResult } from './profile';
import type { CostLineIdMap } from './cost-plan';

export type VariationIdMap = Map<string, string>;

interface VariationSeed {
  number: string;
  category: string;
  description: string;
  status: 'Forecast' | 'Approved' | 'Rejected';
  amountForecastCents: number;
  amountApprovedCents: number;
  dateSubmitted: string;
  dateApproved?: string;
  requestedBy: string;
  approvedBy?: string;
  costLineCode?: string;
}

const VARIATIONS: VariationSeed[] = [
  {
    number: 'VAR-001',
    category: 'Client',
    description:
      'BMU upgrade — additional reach to cover extended roof terrace planters per amended landscape design. Includes track extension and additional davit point. ADCO subcontractor proposal accepted following value engineering review.',
    status: 'Approved',
    amountForecastCents: 52_000_00,
    amountApprovedCents: 48_000_00,
    dateSubmitted: '2026-02-15',
    dateApproved: '2026-03-04',
    requestedBy: 'Coastal Living Pty Ltd',
    approvedBy: "Marcus O'Brien",
    costLineCode: '3.19',
  },
  {
    number: 'VAR-002',
    category: 'Consultant',
    description:
      'MSB capacity uplift from 800A to 1200A — required following NDY load study identifying additional EV charging demand for resident bays. Includes substation transformer upgrade coordinated with Ausgrid.',
    status: 'Approved',
    amountForecastCents: 24_000_00,
    amountApprovedCents: 22_000_00,
    dateSubmitted: '2026-01-22',
    dateApproved: '2026-02-12',
    requestedBy: 'Norman Disney & Young',
    approvedBy: "Marcus O'Brien",
    costLineCode: '3.09',
  },
  {
    number: 'VAR-003',
    category: 'Client',
    description:
      'Lift specification change — upgrade to KONE EcoSpace from base specification. Improved car finishes, higher capacity (13-person), upgraded destination control. Client preference for premium-tier upgrade.',
    status: 'Approved',
    amountForecastCents: 14_000_00,
    amountApprovedCents: 14_000_00,
    dateSubmitted: '2026-02-08',
    dateApproved: '2026-02-26',
    requestedBy: 'Coastal Living Pty Ltd',
    approvedBy: "Marcus O'Brien",
    costLineCode: '3.13',
  },
  {
    number: 'VAR-004',
    category: 'Client',
    description:
      'Facade colour revision — change from RAL 7016 (anthracite grey) to bespoke bronze anodised finish. Pending architect coordination of revised drawings and supplier confirmation of lead time impact (estimated 4 weeks).',
    status: 'Forecast',
    amountForecastCents: 35_000_00,
    amountApprovedCents: 0,
    dateSubmitted: '2026-04-08',
    requestedBy: 'Coastal Living Pty Ltd',
    costLineCode: '3.07',
  },
  {
    number: 'VAR-005',
    category: 'Consultant',
    description:
      'Additional planter boxes to north-east roof terrace — per landscape architect proposal to enhance amenity. Includes 6 × 1500L self-watering planters with structural beam reinforcement.',
    status: 'Forecast',
    amountForecastCents: 8_000_00,
    amountApprovedCents: 0,
    dateSubmitted: '2026-04-15',
    requestedBy: '360 Degrees Landscape Architects',
    costLineCode: '3.32',
  },
  {
    number: 'VAR-006',
    category: 'Client',
    description:
      'Lobby finishes upgrade to honed travertine + brushed brass — value-engineered out following cost review. Original specification (porcelain large-format tiles + powder-coated aluminium) retained.',
    status: 'Rejected',
    amountForecastCents: 42_000_00,
    amountApprovedCents: 0,
    dateSubmitted: '2026-03-05',
    dateApproved: '2026-03-19',
    requestedBy: 'Coastal Living Pty Ltd',
    approvedBy: "Marcus O'Brien",
    costLineCode: '3.30',
  },
];

export async function seedVariations(
  tx: any,
  profile: ProfileResult,
  costLineIds: CostLineIdMap
): Promise<VariationIdMap> {
  const map: VariationIdMap = new Map();

  const records = VARIATIONS.map((v) => {
    const id = crypto.randomUUID();
    map.set(v.number, id);
    return {
      id,
      projectId: profile.projectId,
      costLineId: v.costLineCode ? costLineIds.get(v.costLineCode) ?? null : null,
      variationNumber: v.number,
      category: v.category,
      description: v.description,
      status: v.status,
      amountForecastCents: v.amountForecastCents,
      amountApprovedCents: v.amountApprovedCents,
      dateSubmitted: v.dateSubmitted,
      dateApproved: v.dateApproved ?? null,
      requestedBy: v.requestedBy,
      approvedBy: v.approvedBy ?? null,
    };
  });

  await tx.insert(variations).values(records);
  return map;
}
