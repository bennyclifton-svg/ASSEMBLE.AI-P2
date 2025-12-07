'use client';

/**
 * Invoices Sheet Component
 * Feature 006 - Cost Planning Module (Task T088)
 *
 * FortuneSheet-based spreadsheet for invoice management.
 * Maps invoices to sheet data with period formatting and status display.
 */

import dynamic from 'next/dynamic';
import { useMemo, useCallback, useState } from 'react';
import type { InvoiceWithRelations, InvoiceSummary } from '@/types/invoice';
import { INVOICES_COLUMNS, getColumnWidths } from './sheet-configs/columns';
import { COLORS } from '@/lib/fortune-sheet/config';
import {
  createCurrencyCell,
  createTextCell,
  createCompanyCell,
  createPeriodCell,
  createHeaderCell,
  createTotalCell,
  createEmptyCell,
} from '@/lib/fortune-sheet/cell-renderers';
import { applyStatusFormat, STATUS_COLORS } from './sheet-configs/formatting';

// Import FortuneSheet CSS
import '@fortune-sheet/react/dist/index.css';

// FortuneSheet must be imported dynamically as it uses browser APIs
const Workbook = dynamic(
  () => import('@fortune-sheet/react').then((mod) => mod.Workbook),
  { ssr: false, loading: () => <SheetLoading /> }
);

function SheetLoading() {
  return (
    <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
      <div className="text-sm text-[#858585]">Loading invoices...</div>
    </div>
  );
}

type RowMapping = Array<{
  type: 'header' | 'invoice' | 'total' | 'empty';
  id?: string;
}>;

interface InvoicesSheetProps {
  invoices: InvoiceWithRelations[];
  summary: InvoiceSummary | null;
  onCellChange?: (invoiceId: string, field: string, value: unknown) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

export function InvoicesSheet({
  invoices,
  summary,
  onCellChange,
  onDeleteInvoice,
}: InvoicesSheetProps) {
  const [rowMapping, setRowMapping] = useState<RowMapping>([]);

  // Build sheet data from invoices
  const sheetData = useMemo(() => {
    const rows: Record<string, unknown>[][] = [];
    const mapping: RowMapping = [];

    // Header row
    const headerRow = INVOICES_COLUMNS.map((col) =>
      createHeaderCell(col.label, { align: col.align as 'left' | 'center' | 'right' })
    );
    rows.push(headerRow);
    mapping.push({ type: 'header' });

    // Invoice rows
    if (invoices.length === 0) {
      // Empty state row
      const emptyRow = INVOICES_COLUMNS.map((_, colIndex) => {
        if (colIndex === 0) {
          return {
            v: 'No invoices found',
            ct: { fa: '@', t: 's' },
            fc: COLORS.text.muted,
            it: 1,
            ht: 1,
          };
        }
        return createEmptyCell();
      });
      rows.push(emptyRow);
      mapping.push({ type: 'empty' });
    } else {
      invoices.forEach((invoice) => {
        const row = createInvoiceRow(invoice);
        rows.push(row);
        mapping.push({ type: 'invoice', id: invoice.id });
      });
    }

    // Summary/total row
    if (summary && invoices.length > 0) {
      const totalRow = createTotalRow(summary);
      rows.push(totalRow);
      mapping.push({ type: 'total' });
    }

    setRowMapping(mapping);

    // Convert to FortuneSheet celldata format
    const celldata = toCellData(rows);

    return [
      {
        name: 'Invoices',
        celldata,
        row: rows.length + 50,
        column: INVOICES_COLUMNS.length,
        config: {
          columnlen: getColumnWidths(INVOICES_COLUMNS),
          rowlen: {},
          rowhidden: {},
        },
      },
    ];
  }, [invoices, summary]);

  // Handle cell edits
  const handleCellEdit = useCallback(
    (row: number, col: number, value: unknown) => {
      if (!onCellChange) return;

      const rowInfo = rowMapping[row];
      if (!rowInfo || rowInfo.type !== 'invoice' || !rowInfo.id) return;

      const column = INVOICES_COLUMNS[col];
      if (!column?.editable) return;

      // Convert currency values to cents
      let processedValue = value;
      if (column.type === 'currency') {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        if (!isNaN(numValue)) {
          processedValue = Math.round(numValue * 100);
        }
      }

      onCellChange(rowInfo.id, column.key, processedValue);
    },
    [onCellChange, rowMapping]
  );

  // FortuneSheet hooks
  const hooks = useMemo(
    () => ({
      cellUpdated: (row: number, col: number, _oldValue: unknown, newValue: unknown) => {
        handleCellEdit(row, col, newValue);
      },
    }),
    [handleCellEdit]
  );

  return (
    <div className="h-full fortune-sheet-container">
      <Workbook
        data={sheetData}
        hook={hooks}
        showToolbar={false}
        showFormulaBar={false}
        showSheetTabs={false}
        allowEdit={true}
      />
      <style jsx global>{`
        .fortune-sheet-container {
          --fortune-sheet-bg: #1e1e1e;
        }
        .fortune-sheet-container .luckysheet {
          background-color: #1e1e1e !important;
        }
        .fortune-sheet-container .luckysheet-cell-input {
          background-color: #252526 !important;
          color: #cccccc !important;
        }
      `}</style>
    </div>
  );
}

// Helper: Create an invoice row
function createInvoiceRow(invoice: InvoiceWithRelations): Record<string, unknown>[] {
  const totalCents = invoice.amountCents + invoice.gstCents;

  // Status cell with color
  const statusCell = {
    v: invoice.paidStatus,
    ct: { fa: '@', t: 's' },
    fc: getStatusColor(invoice.paidStatus),
    ht: 0, // Center
  };

  // Date cell
  const dateCell = invoice.invoiceDate
    ? {
        v: formatDate(invoice.invoiceDate),
        ct: { fa: '@', t: 's' },
        fc: COLORS.text.primary,
        ht: 0, // Center
      }
    : createEmptyCell();

  return [
    createTextCell(invoice.invoiceNumber, { editable: true }),
    createCompanyCell(invoice.company, true),
    createTextCell(invoice.costLine?.description || '', { editable: true }),
    createTextCell(invoice.description || '', { editable: true }),
    createPeriodCell(invoice.periodYear, invoice.periodMonth),
    createCurrencyCell(invoice.amountCents, { editable: true }),
    createCurrencyCell(invoice.gstCents),
    createCurrencyCell(totalCents),
    createTextCell(invoice.variation?.variationNumber || '', { editable: true }),
    statusCell,
    dateCell,
  ];
}

// Helper: Create total row
function createTotalRow(summary: InvoiceSummary): Record<string, unknown>[] {
  return [
    createTotalCell(`${summary.totalCount} Invoices`, false),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell(summary.totalAmountCents),
    createTotalCell(summary.totalGstCents),
    createTotalCell(summary.totalAmountCents + summary.totalGstCents),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell('', false),
  ];
}

// Helper: Get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return STATUS_COLORS.approved.text;
    case 'unpaid':
      return STATUS_COLORS.pending.text;
    case 'partial':
      return STATUS_COLORS.forecast.text;
    default:
      return COLORS.text.secondary;
  }
}

// Helper: Format date
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Helper: Convert rows to celldata format
function toCellData(rows: Record<string, unknown>[][]): Array<{ r: number; c: number; v: unknown }> {
  const celldata: Array<{ r: number; c: number; v: unknown }> = [];
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      celldata.push({ r, c, v: cell });
    });
  });
  return celldata;
}

export default InvoicesSheet;
