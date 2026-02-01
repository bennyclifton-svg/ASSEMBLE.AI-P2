'use client';

import dynamic from 'next/dynamic';
import { useMemo, useCallback, useState, useEffect } from 'react';
import type { CostLineWithCalculations, CostLineSection, CostPlanTotals } from '@/types/cost-plan';
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';

// Import FortuneSheet CSS
import '@fortune-sheet/react/dist/index.css';

// FortuneSheet must be imported dynamically as it uses browser APIs
const Workbook = dynamic(
  () => import('@fortune-sheet/react').then((mod) => mod.Workbook),
  { ssr: false, loading: () => <div className="p-4 text-gray-400">Loading spreadsheet...</div> }
);

const SECTION_NAMES: Record<CostLineSection, string> = {
  FEES: 'FEES AND CHARGES',
  CONSULTANTS: 'CONSULTANTS',
  CONSTRUCTION: 'CONSTRUCTION',
  CONTINGENCY: 'CONTINGENCY',
};

// Editable column indices
const EDITABLE_COLUMNS: Record<number, string> = {
  1: 'description',
  2: 'reference',
  3: 'budgetCents',
  4: 'approvedContractCents',
};

interface CostPlanSheetProps {
  costLines: CostLineWithCalculations[];
  totals: CostPlanTotals | null;
  currencyCode?: string;
  onCellChange?: (costLineId: string, field: string, value: unknown) => void;
  onAddLine?: (section: CostLineSection) => void;
}

// Create header row
function createHeaderRow() {
  const headers = [
    'Discipline', 'Description', 'Reference',
    'Budget', 'Approved Contract', 'Forecast Vars', 'Approved Vars',
    'Final Forecast', 'Variance', 'Claimed', 'Current Month', 'ETC'
  ];

  return headers.map((h) => ({
    v: h,
    ct: { fa: '@', t: 's' },
    bg: '#D4A574',
    fc: '#141618',
    bl: 1,
    ht: 0, // Center align
  }));
}

// Create section header row
function createSectionHeaderRow(section: CostLineSection) {
  const cells = Array(12).fill(null).map(() => ({
    v: '',
    bg: '#374151',
    fc: '#ffffff',
  }));
  cells[0] = {
    v: `► ${SECTION_NAMES[section]}`,
    ct: { fa: '@', t: 's' },
    bg: '#374151',
    fc: '#ffffff',
    bl: 1,
  };
  return cells;
}

// Create empty placeholder row for empty sections
function createEmptyRow() {
  return Array(12).fill(null).map(() => ({
    v: '',
    bg: '#1e1e2e',
    fc: '#6b7280',
  }));
}

// Create cost line row
function createCostLineRow(line: CostLineWithCalculations) {
  const variance = line.calculated.varianceToBudgetCents;
  const varianceColor = variance < 0 ? '#dc2626' : variance > 0 ? '#16a34a' : '#000000';
  const varianceBg = variance < 0 ? '#fee2e2' : undefined;

  return [
    { v: line.stakeholder?.name || '', ct: { fa: '@', t: 's' }, fc: '#3b82f6' },
    { v: line.activity, ct: { fa: '@', t: 's' }, fc: '#3b82f6' },
    { v: line.reference || '', ct: { fa: '@', t: 's' }, fc: '#3b82f6' },
    { v: line.budgetCents / 100, ct: { fa: '$#,##0', t: 'n' }, fc: '#3b82f6' },
    { v: line.approvedContractCents / 100, ct: { fa: '$#,##0', t: 'n' }, fc: '#3b82f6' },
    { v: line.calculated.forecastVariationsCents / 100, ct: { fa: '$#,##0', t: 'n' } },
    { v: line.calculated.approvedVariationsCents / 100, ct: { fa: '$#,##0', t: 'n' } },
    { v: line.calculated.finalForecastCents / 100, ct: { fa: '$#,##0', t: 'n' } },
    { v: variance / 100, ct: { fa: '$#,##0', t: 'n' }, fc: varianceColor, bg: varianceBg },
    { v: line.calculated.claimedToDateCents / 100, ct: { fa: '$#,##0', t: 'n' } },
    { v: line.calculated.currentMonthCents / 100, ct: { fa: '$#,##0', t: 'n' } },
    { v: line.calculated.etcCents / 100, ct: { fa: '$#,##0', t: 'n' } },
  ];
}

// Create totals row
function createTotalsRow(totals: CostPlanTotals) {
  const varianceColor = totals.varianceCents < 0 ? '#dc2626' : '#16a34a';

  return [
    { v: 'TOTAL', ct: { fa: '@', t: 's' }, bg: '#D4A574', fc: '#141618', bl: 1 },
    { v: '', bg: '#D4A574' },
    { v: '', bg: '#D4A574' },
    { v: '', bg: '#D4A574' },
    { v: totals.budgetCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: '#141618', bl: 1 },
    { v: totals.approvedContractCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: '#141618', bl: 1 },
    { v: totals.forecastVariationsCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: '#141618', bl: 1 },
    { v: totals.approvedVariationsCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: '#141618', bl: 1 },
    { v: totals.finalForecastCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: '#141618', bl: 1 },
    { v: totals.varianceCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: varianceColor, bl: 1 },
    { v: totals.claimedCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: '#141618', bl: 1 },
    { v: totals.currentMonthCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: '#141618', bl: 1 },
    { v: totals.etcCents / 100, ct: { fa: '$#,##0', t: 'n' }, bg: '#D4A574', fc: '#141618', bl: 1 },
  ];
}

// Convert rows to FortuneSheet celldata format
function toCellData(rows: unknown[][]) {
  const celldata: Array<{ r: number; c: number; v: unknown }> = [];
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      celldata.push({ r, c, v: cell });
    });
  });
  return celldata;
}

// Row mapping type for lookup
type RowMapping = Array<{ type: 'header' | 'section' | 'line' | 'total'; id?: string; section?: CostLineSection }>;

export function CostPlanSheet({
  costLines,
  totals,
  currencyCode = 'AUD',
  onCellChange,
  onAddLine,
}: CostPlanSheetProps) {
  const [rowMapping, setRowMapping] = useState<RowMapping>([]);

  // Build sheet data from cost lines
  const sheetData = useMemo(() => {
    const rows: unknown[][] = [];
    const mapping: RowMapping = [];

    // Header row
    rows.push(createHeaderRow());
    mapping.push({ type: 'header' });

    // Always show all sections, even if empty
    const sections: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];

    // Group cost lines by section
    const linesBySection = sections.reduce((acc, section) => {
      acc[section] = costLines
        .filter(line => line.section === section)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return acc;
    }, {} as Record<CostLineSection, typeof costLines>);

    // Render each section with its lines
    sections.forEach((section) => {
      // Always add section header
      rows.push(createSectionHeaderRow(section));
      mapping.push({ type: 'section', section });

      // Add cost lines for this section
      const sectionLines = linesBySection[section];
      sectionLines.forEach((line) => {
        rows.push(createCostLineRow(line));
        mapping.push({ type: 'line', id: line.id });
      });

      // Add empty placeholder row if section is empty (for visual spacing)
      if (sectionLines.length === 0) {
        rows.push(createEmptyRow());
        mapping.push({ type: 'header' }); // Use header type to prevent editing
      }
    });

    // Add totals row
    const displayTotals = totals || {
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
    rows.push(createTotalsRow(displayTotals as CostPlanTotals));
    mapping.push({ type: 'total' });

    // Update row mapping state
    setRowMapping(mapping);

    const celldata = toCellData(rows);

    return [{
      name: 'Project Summary',
      celldata,
      row: rows.length + 10,
      column: 13,
      config: {
        columnlen: {
          0: 80,   // Cost Code
          1: 200,  // Discipline
          2: 250,  // Description
          3: 100,  // Reference
          4: 100,  // Budget
          5: 120,  // Approved Contract
          6: 100,  // Forecast Vars
          7: 100,  // Approved Vars
          8: 110,  // Final Forecast
          9: 100,  // Variance
          10: 100, // Claimed
          11: 110, // Current Month
          12: 100, // ETC
        },
        rowlen: {},
        rowhidden: {},
      },
    }];
  }, [costLines, totals]);

  // Handle cell changes from FortuneSheet
  const handleChange = useCallback((data: unknown[]) => {
    if (!onCellChange || !data || !Array.isArray(data) || data.length === 0) return;

    // FortuneSheet passes the full sheet data array on change
    // We need to detect which cell changed by comparing with previous
    // For now, we'll handle direct cell edits via onCellEdit callback
  }, [onCellChange]);

  // Handle individual cell edits
  const handleCellEdit = useCallback((
    row: number,
    col: number,
    value: unknown
  ) => {
    if (!onCellChange) return;

    // Check if this is an editable column
    const field = EDITABLE_COLUMNS[col];
    if (!field) return;

    // Look up the cost line ID from row mapping
    const rowInfo = rowMapping[row];
    if (!rowInfo || rowInfo.type !== 'line' || !rowInfo.id) return;

    // Convert currency values to cents
    let processedValue = value;
    if (field === 'budgetCents' || field === 'approvedContractCents') {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(numValue)) {
        processedValue = Math.round(numValue * 100);
      }
    }

    onCellChange(rowInfo.id, field, processedValue);
  }, [onCellChange, rowMapping]);

  // Hook configuration for FortuneSheet
  const hooks = useMemo(() => ({
    cellUpdated: (
      row: number,
      col: number,
      _oldValue: unknown,
      newValue: unknown
    ) => {
      handleCellEdit(row, col, newValue);
    },
  }), [handleCellEdit]);

  return (
    <div className="h-full fortune-sheet-container">
      <Workbook
        data={sheetData}
        onChange={handleChange}
        hook={hooks}
        showToolbar={false}
        showFormulaBar={false}
        showSheetTabs={false}
        allowEdit={true}
      />
      <style jsx global>{`
        .fortune-sheet-container {
          --fortune-sheet-bg: #1e1e2e;
        }
        .fortune-sheet-container .luckysheet {
          background-color: #1e1e2e !important;
        }
        .fortune-sheet-container .luckysheet-cell-input {
          background-color: #252536 !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}

export default CostPlanSheet;
