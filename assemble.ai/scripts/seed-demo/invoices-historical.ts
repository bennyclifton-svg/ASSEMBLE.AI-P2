import { invoices } from '@/lib/db/pg-schema';
import type { ProfileResult } from './profile';
import type { CostLineIdMap } from './cost-plan';

interface InvoiceSeed {
  invoiceNumber: string;
  invoiceDate: string;
  costLineCode: string;
  description: string;
  amountCents: number;
  poNumber?: string;
  paidStatus?: 'unpaid' | 'paid' | 'partial';
  paidDate?: string;
}

const INVOICES: InvoiceSeed[] = [
  // ADCO Head Contractor — Progress Claims #1-#5
  {
    invoiceNumber: 'ADCO-PC-001',
    invoiceDate: '2025-11-28',
    costLineCode: '3.01',
    description: 'Progress Claim #1 — Site establishment + Nov demolition + bulk excavation start',
    amountCents: 1_800_000_00,
    poNumber: 'PO-LH-2025-001',
    paidStatus: 'paid',
    paidDate: '2025-12-19',
  },
  {
    invoiceNumber: 'ADCO-PC-002',
    invoiceDate: '2025-12-22',
    costLineCode: '3.03',
    description: 'Progress Claim #2 — Excavation, shoring + footings (Dec)',
    amountCents: 2_400_000_00,
    poNumber: 'PO-LH-2025-001',
    paidStatus: 'paid',
    paidDate: '2026-01-15',
  },
  {
    invoiceNumber: 'ADCO-PC-003',
    invoiceDate: '2026-01-30',
    costLineCode: '3.04',
    description: 'Progress Claim #3 — Basement walls + slab + GF slab partial',
    amountCents: 2_100_000_00,
    poNumber: 'PO-LH-2025-001',
    paidStatus: 'paid',
    paidDate: '2026-02-20',
  },
  {
    invoiceNumber: 'ADCO-PC-004',
    invoiceDate: '2026-02-27',
    costLineCode: '3.04',
    description: 'Progress Claim #4 — GF slab complete + L1 structure',
    amountCents: 1_600_000_00,
    poNumber: 'PO-LH-2025-001',
    paidStatus: 'paid',
    paidDate: '2026-03-19',
  },
  {
    invoiceNumber: 'ADCO-PC-005',
    invoiceDate: '2026-03-28',
    costLineCode: '3.04',
    description: 'Progress Claim #5 — L2 + L3 structure + facade preliminaries',
    amountCents: 1_900_000_00,
    poNumber: 'PO-LH-2025-001',
    paidStatus: 'paid',
    paidDate: '2026-04-22',
  },

  // SJB Architects — monthly fees (CA stage line)
  {
    invoiceNumber: 'SJB-2025-114',
    invoiceDate: '2025-11-30',
    costLineCode: '2.02.4',
    description: 'Architectural services — November 2025 (CA Stage)',
    amountCents: 35_000_00,
    poNumber: 'PO-LH-CONS-002',
    paidStatus: 'paid',
    paidDate: '2025-12-22',
  },
  {
    invoiceNumber: 'SJB-2026-008',
    invoiceDate: '2026-01-31',
    costLineCode: '2.02.4',
    description: 'Architectural services — January 2026 (CA Stage)',
    amountCents: 35_000_00,
    poNumber: 'PO-LH-CONS-002',
    paidStatus: 'paid',
    paidDate: '2026-02-19',
  },
  {
    invoiceNumber: 'SJB-2026-022',
    invoiceDate: '2026-02-28',
    costLineCode: '2.02.4',
    description: 'Architectural services — February 2026 (CA Stage + RFI responses)',
    amountCents: 35_000_00,
    poNumber: 'PO-LH-CONS-002',
    paidStatus: 'paid',
    paidDate: '2026-03-21',
  },

  // Northrop Structural — CA stage line
  {
    invoiceNumber: 'NCE-INV-3441',
    invoiceDate: '2025-12-15',
    costLineCode: '2.03.4',
    description: 'Structural engineering — Nov-Dec CA + RFI responses',
    amountCents: 22_000_00,
    poNumber: 'PO-LH-CONS-003',
    paidStatus: 'paid',
    paidDate: '2026-01-10',
  },
  {
    invoiceNumber: 'NCE-INV-3502',
    invoiceDate: '2026-02-28',
    costLineCode: '2.03.4',
    description: 'Structural engineering — Feb CA + L3-L4 detail review',
    amountCents: 18_000_00,
    poNumber: 'PO-LH-CONS-003',
    paidStatus: 'paid',
    paidDate: '2026-03-19',
  },

  // NDY Services — CA stage line
  {
    invoiceNumber: 'NDY-1108-22',
    invoiceDate: '2026-01-15',
    costLineCode: '2.04.4',
    description: 'Services engineering — Dec-Jan coordination + MSB study',
    amountCents: 28_000_00,
    poNumber: 'PO-LH-CONS-004',
    paidStatus: 'paid',
    paidDate: '2026-02-09',
  },
  {
    invoiceNumber: 'NDY-1108-31',
    invoiceDate: '2026-03-15',
    costLineCode: '2.04.4',
    description: 'Services engineering — Feb-Mar CA + rough-in support',
    amountCents: 24_000_00,
    poNumber: 'PO-LH-CONS-004',
    paidStatus: 'paid',
    paidDate: '2026-04-08',
  },
];

export async function seedHistoricalInvoices(
  tx: any,
  profile: ProfileResult,
  costLineIds: CostLineIdMap
): Promise<void> {
  const records = INVOICES.map((inv) => {
    const costLineId = costLineIds.get(inv.costLineCode);
    if (!costLineId) throw new Error(`Invoice ${inv.invoiceNumber}: cost line ${inv.costLineCode} not found`);

    const date = new Date(inv.invoiceDate);
    const gstCents = Math.round(inv.amountCents * 0.1);

    return {
      id: crypto.randomUUID(),
      projectId: profile.projectId,
      costLineId,
      variationId: null,
      companyId: null,
      fileAssetId: null,
      invoiceDate: inv.invoiceDate,
      poNumber: inv.poNumber ?? null,
      invoiceNumber: inv.invoiceNumber,
      description: inv.description,
      amountCents: inv.amountCents,
      gstCents,
      periodYear: date.getFullYear(),
      periodMonth: date.getMonth() + 1,
      paidStatus: inv.paidStatus ?? 'paid',
      paidDate: inv.paidDate ?? null,
    };
  });

  await tx.insert(invoices).values(records);
}
