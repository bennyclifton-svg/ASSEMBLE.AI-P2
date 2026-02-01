'use client';

/**
 * Variations Sheet Component
 * Feature 006 - Cost Planning Module (Task T089)
 *
 * FortuneSheet-based spreadsheet for variation management.
 * Maps variations to sheet data with status and category formatting.
 */

import dynamic from 'next/dynamic';
import { useMemo, useCallback, useState } from 'react';
import type { VariationWithCostLine, VariationSummary, VariationStatus, VariationCategory } from '@/types/variation';
import { VARIATIONS_COLUMNS, getColumnWidths } from './sheet-configs/columns';
import { COLORS } from '@/lib/fortune-sheet/config';
import {
  createCurrencyCell,
  createTextCell,
  createHeaderCell,
  createTotalCell,
  createEmptyCell,
} from '@/lib/fortune-sheet/cell-renderers';
import { STATUS_COLORS } from './sheet-configs/formatting';

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
      <div className="text-sm text-[#858585]">Loading variations...</div>
    </div>
  );
}

type RowMapping = Array<{
  type: 'header' | 'variation' | 'total' | 'empty';
  id?: string;
}>;

// Category colors
const CATEGORY_COLORS: Record<VariationCategory, string> = {
  Principal: '#6B9BD1',    // Blue
  Contractor: '#D4A574',   // Orange/amber
  'Lessor Works': '#9F7AEA', // Purple
};

// Status colors
const VARIATION_STATUS_COLORS: Record<VariationStatus, string> = {
  Forecast: STATUS_COLORS.forecast.text,
  Approved: STATUS_COLORS.approved.text,
  Rejected: STATUS_COLORS.rejected.text,
  Withdrawn: COLORS.text.muted,
};

interface VariationsSheetProps {
  variations: VariationWithCostLine[];
  summary: VariationSummary | null;
  onCellChange?: (variationId: string, field: string, value: unknown) => void;
  onDeleteVariation?: (variationId: string) => void;
}

export function VariationsSheet({
  variations,
  summary,
  onCellChange,
  onDeleteVariation,
}: VariationsSheetProps) {
  const [rowMapping, setRowMapping] = useState<RowMapping>([]);

  // Build sheet data from variations
  const sheetData = useMemo(() => {
    const rows: Record<string, unknown>[][] = [];
    const mapping: RowMapping = [];

    // Header row
    const headerRow = VARIATIONS_COLUMNS.map((col) =>
      createHeaderCell(col.label, { align: col.align as 'left' | 'center' | 'right' })
    );
    rows.push(headerRow);
    mapping.push({ type: 'header' });

    // Variation rows
    if (variations.length === 0) {
      // Empty state row
      const emptyRow = VARIATIONS_COLUMNS.map((_, colIndex) => {
        if (colIndex === 0) {
          return {
            v: 'No variations found',
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
      variations.forEach((variation) => {
        const row = createVariationRow(variation);
        rows.push(row);
        mapping.push({ type: 'variation', id: variation.id });
      });
    }

    // Summary/total row
    if (summary && variations.length > 0) {
      const totalRow = createTotalRow(summary);
      rows.push(totalRow);
      mapping.push({ type: 'total' });
    }

    setRowMapping(mapping);

    // Convert to FortuneSheet celldata format
    const celldata = toCellData(rows);

    return [
      {
        name: 'Variations',
        celldata,
        row: rows.length + 50,
        column: VARIATIONS_COLUMNS.length,
        config: {
          columnlen: getColumnWidths(VARIATIONS_COLUMNS),
          rowlen: {},
          rowhidden: {},
        },
      },
    ];
  }, [variations, summary]);

  // Handle cell edits
  const handleCellEdit = useCallback(
    (row: number, col: number, value: unknown) => {
      if (!onCellChange) return;

      const rowInfo = rowMapping[row];
      if (!rowInfo || rowInfo.type !== 'variation' || !rowInfo.id) return;

      const column = VARIATIONS_COLUMNS[col];
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

// Helper: Create a variation row
function createVariationRow(variation: VariationWithCostLine): Record<string, unknown>[] {
  // Variation number cell (auto-generated, not editable)
  const varNumCell = {
    v: variation.variationNumber,
    ct: { fa: '@', t: 's' },
    fc: CATEGORY_COLORS[variation.category] || COLORS.text.primary,
    bl: 1,
    ht: 1, // Left align
  };

  // Cost line cell
  const costLineCell = createTextCell(
    variation.costLine?.activity || '',
    { editable: true }
  );

  // Category cell with color
  const categoryCell = {
    v: getCategoryLabel(variation.category),
    ct: { fa: '@', t: 's' },
    fc: CATEGORY_COLORS[variation.category] || COLORS.text.primary,
    ht: 0, // Center
  };

  // Status cell with color
  const statusCell = {
    v: variation.status,
    ct: { fa: '@', t: 's' },
    fc: VARIATION_STATUS_COLORS[variation.status] || COLORS.text.secondary,
    ht: 0, // Center
  };

  // Date cells
  const requestedDateCell = variation.dateSubmitted
    ? {
        v: formatDate(variation.dateSubmitted),
        ct: { fa: '@', t: 's' },
        fc: COLORS.text.primary,
        ht: 0, // Center
      }
    : createEmptyCell();

  const approvedDateCell = variation.dateApproved
    ? {
        v: formatDate(variation.dateApproved),
        ct: { fa: '@', t: 's' },
        fc: COLORS.text.primary,
        ht: 0, // Center
      }
    : createEmptyCell();

  return [
    varNumCell,
    costLineCell,
    createTextCell(variation.description, { editable: true }),
    categoryCell,
    statusCell,
    createCurrencyCell(variation.amountForecastCents, { editable: true }),
    createCurrencyCell(variation.amountApprovedCents, { editable: true }),
    requestedDateCell,
    approvedDateCell,
    createTextCell(variation.requestedBy || '', { editable: true }),
  ];
}

// Helper: Create total row
function createTotalRow(summary: VariationSummary): Record<string, unknown>[] {
  return [
    createTotalCell(`${summary.totalCount} Variations`, false),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell(`${summary.forecastCount} Fcst / ${summary.approvedCount} Appr`, false),
    createTotalCell(summary.totalForecastCents),
    createTotalCell(summary.totalApprovedCents),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell('', false),
  ];
}

// Helper: Get category label (short form)
function getCategoryLabel(category: VariationCategory): string {
  switch (category) {
    case 'Principal':
      return 'PV';
    case 'Contractor':
      return 'CV';
    case 'Lessor Works':
      return 'LV';
    default:
      return category;
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

export default VariationsSheet;
