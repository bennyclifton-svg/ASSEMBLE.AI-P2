'use client';

/**
 * Project Summary Sheet Component
 * Feature 006 - Cost Planning Module (Task T087)
 *
 * FortuneSheet-based spreadsheet for cost plan summary view.
 * Maps cost lines to sheet data with section grouping and calculated columns.
 */

import dynamic from 'next/dynamic';
import { useMemo, useCallback, useState } from 'react';
import type { CostLineWithCalculations, CostLineSection, CostPlanTotals } from '@/types/cost-plan';
import { PROJECT_SUMMARY_COLUMNS, getColumnWidths } from './sheet-configs/columns';
import { COLORS } from '@/lib/fortune-sheet/config';
import {
  createCurrencyCell,
  createTextCell,
  createDisciplineCell,
  createVarianceCell,
  createHeaderCell,
  createSectionHeaderCell,
  createSubtotalCell,
  createTotalCell,
  createEmptyCell,
} from '@/lib/fortune-sheet/cell-renderers';
import { SECTION_NAMES, generateRowMapping, type RowMapping } from '@/lib/fortune-sheet/row-groups';

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
      <div className="text-sm text-[#858585]">Loading spreadsheet...</div>
    </div>
  );
}

const SECTIONS: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];

interface ProjectSummarySheetProps {
  costLines: CostLineWithCalculations[];
  totals: CostPlanTotals | null;
  onCellChange?: (costLineId: string, field: string, value: unknown) => void;
  onAddLine?: (section: CostLineSection) => void;
}

export function ProjectSummarySheet({
  costLines,
  totals,
  onCellChange,
  onAddLine,
}: ProjectSummarySheetProps) {
  const [rowMapping, setRowMapping] = useState<RowMapping>([]);

  // Build sheet data from cost lines
  const sheetData = useMemo(() => {
    const rows: Record<string, unknown>[][] = [];
    const mapping: RowMapping = [];

    // Header row
    const headerRow = PROJECT_SUMMARY_COLUMNS.map((col) =>
      createHeaderCell(col.label, { align: col.align as 'left' | 'center' | 'right' })
    );
    rows.push(headerRow);
    mapping.push({ type: 'header' });

    // Group cost lines by section
    const linesBySection = SECTIONS.reduce((acc, section) => {
      acc[section] = costLines
        .filter((line) => line.section === section)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return acc;
    }, {} as Record<CostLineSection, CostLineWithCalculations[]>);

    // Render each section
    SECTIONS.forEach((section) => {
      const sectionLines = linesBySection[section];

      // Section header row
      const sectionHeader = PROJECT_SUMMARY_COLUMNS.map((_, colIndex) => {
        if (colIndex === 0) {
          return createSectionHeaderCell(SECTION_NAMES[section]);
        }
        return createEmptyCell(COLORS.bg.hover);
      });
      rows.push(sectionHeader);
      mapping.push({ type: 'section', section });

      // Cost line rows
      sectionLines.forEach((line) => {
        const row = createCostLineRow(line);
        rows.push(row);
        mapping.push({ type: 'line', id: line.id });
      });

      // Section subtotal row
      const sectionTotals = calculateSectionTotals(sectionLines);
      const subtotalRow = createSubtotalRow(sectionTotals);
      rows.push(subtotalRow);
      mapping.push({ type: 'subtotal', section });
    });

    // Grand total row
    const grandTotalRow = createGrandTotalRow(totals);
    rows.push(grandTotalRow);
    mapping.push({ type: 'total' });

    setRowMapping(mapping);

    // Convert to FortuneSheet celldata format
    const celldata = toCellData(rows);

    return [
      {
        name: 'Project Summary',
        celldata,
        row: rows.length + 20,
        column: PROJECT_SUMMARY_COLUMNS.length,
        config: {
          columnlen: getColumnWidths(PROJECT_SUMMARY_COLUMNS),
          rowlen: {},
          rowhidden: {},
        },
      },
    ];
  }, [costLines, totals]);

  // Handle cell edits
  const handleCellEdit = useCallback(
    (row: number, col: number, value: unknown) => {
      if (!onCellChange) return;

      const rowInfo = rowMapping[row];
      if (!rowInfo || rowInfo.type !== 'line' || !rowInfo.id) return;

      const column = PROJECT_SUMMARY_COLUMNS[col];
      if (!column?.editable) return;

      // Convert currency values to cents
      let processedValue = value;
      if (column.type === 'currency' || column.type === 'currencyVariance') {
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

// Helper: Create a cost line row
function createCostLineRow(line: CostLineWithCalculations): Record<string, unknown>[] {
  return [
    createTextCell(line.costCode || '', { editable: true }),
    createDisciplineCell(line.stakeholder, true),
    createTextCell(line.activity, { editable: true }),
    createTextCell(line.reference || '', { editable: true }),
    createCurrencyCell(line.budgetCents, { editable: true }),
    createCurrencyCell(line.approvedContractCents, { editable: true }),
    createCurrencyCell(line.calculated.forecastVariationsCents),
    createCurrencyCell(line.calculated.approvedVariationsCents),
    createCurrencyCell(line.calculated.finalForecastCents),
    createVarianceCell(line.calculated.varianceToBudgetCents),
    createCurrencyCell(line.calculated.claimedToDateCents),
    createCurrencyCell(line.calculated.currentMonthCents),
    createCurrencyCell(line.calculated.etcCents),
  ];
}

// Helper: Calculate section totals
function calculateSectionTotals(lines: CostLineWithCalculations[]) {
  return lines.reduce(
    (acc, line) => ({
      budgetCents: acc.budgetCents + line.budgetCents,
      approvedContractCents: acc.approvedContractCents + line.approvedContractCents,
      forecastVariationsCents: acc.forecastVariationsCents + line.calculated.forecastVariationsCents,
      approvedVariationsCents: acc.approvedVariationsCents + line.calculated.approvedVariationsCents,
      finalForecastCents: acc.finalForecastCents + line.calculated.finalForecastCents,
      varianceCents: acc.varianceCents + line.calculated.varianceToBudgetCents,
      claimedCents: acc.claimedCents + line.calculated.claimedToDateCents,
      currentMonthCents: acc.currentMonthCents + line.calculated.currentMonthCents,
      etcCents: acc.etcCents + line.calculated.etcCents,
    }),
    {
      budgetCents: 0,
      approvedContractCents: 0,
      forecastVariationsCents: 0,
      approvedVariationsCents: 0,
      finalForecastCents: 0,
      varianceCents: 0,
      claimedCents: 0,
      currentMonthCents: 0,
      etcCents: 0,
    }
  );
}

// Helper: Create subtotal row
function createSubtotalRow(totals: ReturnType<typeof calculateSectionTotals>): Record<string, unknown>[] {
  return [
    createSubtotalCell('Sub-Total', false),
    createSubtotalCell('', false),
    createSubtotalCell('', false),
    createSubtotalCell('', false),
    createSubtotalCell(totals.budgetCents),
    createSubtotalCell(totals.approvedContractCents),
    createSubtotalCell(totals.forecastVariationsCents),
    createSubtotalCell(totals.approvedVariationsCents),
    createSubtotalCell(totals.finalForecastCents),
    createSubtotalCell(totals.varianceCents),
    createSubtotalCell(totals.claimedCents),
    createSubtotalCell(totals.currentMonthCents),
    createSubtotalCell(totals.etcCents),
  ];
}

// Helper: Create grand total row
function createGrandTotalRow(totals: CostPlanTotals | null): Record<string, unknown>[] {
  const t = totals || {
    budgetCents: 0,
    approvedContractCents: 0,
    forecastVariationsCents: 0,
    approvedVariationsCents: 0,
    finalForecastCents: 0,
    varianceCents: 0,
    claimedCents: 0,
    currentMonthCents: 0,
    etcCents: 0,
  };

  return [
    createTotalCell('GRAND TOTAL', false),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell('', false),
    createTotalCell(t.budgetCents),
    createTotalCell(t.approvedContractCents),
    createTotalCell(t.forecastVariationsCents),
    createTotalCell(t.approvedVariationsCents),
    createTotalCell(t.finalForecastCents),
    createTotalCell(t.varianceCents),
    createTotalCell(t.claimedCents),
    createTotalCell(t.currentMonthCents),
    createTotalCell(t.etcCents),
  ];
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

export default ProjectSummarySheet;
