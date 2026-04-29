/**
 * Generate plain-content PDF invoices for the live drag-drop upload demo.
 * No styling, no logos — just enough text content for the AI extractor to parse.
 */
import { join } from 'path';
import { createWriteStream } from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

interface FreshInvoiceSeed {
  filename: string;
  companyName: string;
  abn: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  description: string;
  amountAud: number;        // Subtotal in AUD (excl GST)
  contactEmail: string;
  contactPhone: string;
}

const FRESH_INVOICES: FreshInvoiceSeed[] = [
  {
    filename: 'ADCO-PC-006-April-2026.pdf',
    companyName: 'ADCO Constructions Pty Ltd',
    abn: '85 003 002 124',
    invoiceNumber: 'ADCO-PC-006',
    invoiceDate: '2026-04-25',
    dueDate: '2026-05-23',
    poNumber: 'PO-LH-2025-001',
    description:
      'Progress Claim #6 — Lighthouse Residences\n' +
      '  L4 structure 65% complete + facade install commencement\n' +
      '  Services rough-in progressed to 45% complete',
    amountAud: 1_750_000,
    contactEmail: 'accounts@adcoconstruct.com.au',
    contactPhone: '+61 2 9430 0888',
  },
  {
    filename: 'SJB-Architects-April-2026.pdf',
    companyName: 'SJB Architects Pty Ltd',
    abn: '20 095 537 482',
    invoiceNumber: 'SJB-2026-041',
    invoiceDate: '2026-04-30',
    dueDate: '2026-05-30',
    poNumber: 'PO-LH-CONS-002',
    description:
      'Architectural services — April 2026 (Contract Administration Stage)\n' +
      '  Project: Lighthouse Residences\n' +
      '  Includes RFI responses, site coordination, sample sign-offs',
    amountAud: 32_000,
    contactEmail: 'accounts@sjb.com.au',
    contactPhone: '+61 2 9380 9911',
  },
  {
    filename: 'NDY-April-2026.pdf',
    companyName: 'Norman Disney & Young Pty Ltd',
    abn: '83 002 558 528',
    invoiceNumber: 'NDY-1108-44',
    invoiceDate: '2026-04-28',
    dueDate: '2026-05-26',
    poNumber: 'PO-LH-CONS-004',
    description:
      'Building services engineering — April 2026\n' +
      '  Project: Lighthouse Residences\n' +
      '  Mechanical/Electrical/Hydraulic CA + RFI-031 acoustic review',
    amountAud: 26_000,
    contactEmail: 'accounts@ndy.com',
    contactPhone: '+61 2 9080 6900',
  },
  {
    filename: 'Northrop-Structural-April-2026.pdf',
    companyName: 'Northrop Consulting Engineers',
    abn: '81 005 696 596',
    invoiceNumber: 'NCE-INV-3589',
    invoiceDate: '2026-04-30',
    dueDate: '2026-05-28',
    poNumber: 'PO-LH-CONS-003',
    description:
      'Structural engineering — April 2026\n' +
      '  Project: Lighthouse Residences\n' +
      '  Contract administration + L4-L5 detail review + EOT #5 substantiation',
    amountAud: 19_500,
    contactEmail: 'accounts@northrop.com.au',
    contactPhone: '+61 2 9241 4188',
  },
  {
    filename: 'Holmes-Fire-Stair-Pressurisation-Report.pdf',
    companyName: 'Holmes Fire Pty Ltd',
    abn: '32 008 593 421',
    invoiceNumber: 'HF-2026-218',
    invoiceDate: '2026-04-18',
    dueDate: '2026-05-16',
    poNumber: 'PO-LH-CONS-011',
    description:
      'Fire engineering — Stair B pressurisation review (RFI-014)\n' +
      '  Project: Lighthouse Residences\n' +
      '  One-off engagement: report + AHU re-trim recommendation',
    amountAud: 7_800,
    contactEmail: 'accounts@holmesfire.com',
    contactPhone: '+61 2 9252 9442',
  },
  {
    filename: 'Fairview-Cladding-Deposit.pdf',
    companyName: 'Fairview Architectural Pty Ltd',
    abn: '49 098 745 211',
    invoiceNumber: 'FA-2026-0412',
    invoiceDate: '2026-04-12',
    dueDate: '2026-05-10',
    poNumber: 'PO-LH-2025-007',
    description:
      'Cladding subcontract — deposit (10%)\n' +
      '  Project: Lighthouse Residences\n' +
      '  Anodised aluminium facade panels — first tranche material order',
    amountAud: 145_000,
    contactEmail: 'accounts@fairviewarchitectural.com',
    contactPhone: '+61 2 8722 4444',
  },
  {
    filename: 'Acoustic-Logic-Site-Testing.pdf',
    companyName: 'Acoustic Logic Pty Ltd',
    abn: '93 099 821 776',
    invoiceNumber: 'AL-INV-12451',
    invoiceDate: '2026-04-20',
    dueDate: '2026-05-18',
    poNumber: 'PO-LH-CONS-009',
    description:
      'Site acoustic testing — April 2026\n' +
      '  Project: Lighthouse Residences\n' +
      '  Party wall test sample (RFI-031 substantiation)',
    amountAud: 4_200,
    contactEmail: 'accounts@acousticlogic.com.au',
    contactPhone: '+61 2 8755 8888',
  },
  {
    filename: 'Stowe-Electrical-April-Progress.pdf',
    companyName: 'Stowe Australia Pty Ltd',
    abn: '50 008 558 711',
    invoiceNumber: 'STW-LH-026',
    invoiceDate: '2026-04-26',
    dueDate: '2026-05-24',
    poNumber: 'PO-LH-2025-009',
    description:
      'Electrical subcontract — April progress claim\n' +
      '  Project: Lighthouse Residences\n' +
      '  Sub-mains rough-in L1-L3 + apartment circuit pre-installation',
    amountAud: 89_000,
    contactEmail: 'accounts@stowe.com.au',
    contactPhone: '+61 2 9748 7000',
  },
];

function formatAud(n: number): string {
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function generateOne(outDir: string, inv: FreshInvoiceSeed): Promise<void> {
  const path = join(outDir, inv.filename);
  const gst = inv.amountAud * 0.1;
  const total = inv.amountAud + gst;

  return new Promise((resolve, reject) => {
    // compress: false + pdfVersion 1.4 produces output that pdf-parse can read
    // (the local fallback parser, after LlamaParse and Unstructured)
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      compress: false,
      pdfVersion: '1.4',
    });
    const stream = createWriteStream(path);
    doc.pipe(stream);

    doc.fontSize(16).text(inv.companyName);
    doc.fontSize(10).text(`ABN ${inv.abn}`);
    doc.moveDown();

    doc.fontSize(14).text('TAX INVOICE');
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text(`Invoice Number: ${inv.invoiceNumber}`);
    doc.text(`Invoice Date: ${inv.invoiceDate}`);
    doc.text(`Due Date: ${inv.dueDate}`);
    doc.text(`PO Number: ${inv.poNumber}`);
    doc.moveDown();

    doc.text('Bill To:');
    doc.text('Coastal Living Pty Ltd');
    doc.text('Project: Lighthouse Residences');
    doc.text('12 Burroway Road, Wentworth Point NSW 2127');
    doc.moveDown();

    doc.text('Description:');
    doc.text(inv.description);
    doc.moveDown();

    doc.text(`Subtotal: ${formatAud(inv.amountAud)}`);
    doc.text(`GST (10%): ${formatAud(gst)}`);
    doc.fontSize(12).text(`TOTAL: ${formatAud(total)}`, { underline: true });
    doc.moveDown();

    doc.fontSize(9);
    doc.text(`Contact: ${inv.contactEmail}`);
    doc.text(`Phone: ${inv.contactPhone}`);
    doc.text('Payment terms: 28 days net.');

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

export async function generateInvoicePdfs(outDir: string): Promise<void> {
  for (const inv of FRESH_INVOICES) {
    await generateOne(outDir, inv);
    console.log(`  wrote ${inv.filename}`);
  }
}
