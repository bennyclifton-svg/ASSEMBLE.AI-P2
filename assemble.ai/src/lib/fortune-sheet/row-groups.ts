/**
 * FortuneSheet Row Groups
 * Feature 006 - Cost Planning Module (Task T075)
 *
 * Generate row group configurations for collapsible sections in FortuneSheet.
 * Note: FortuneSheet doesn't have native row grouping, so we use rowhidden workaround.
 */

import type { CostLineSection, CostLineWithCalculations } from '@/types/cost-plan';

// ============================================================================
// SECTION CONFIGURATION
// ============================================================================

export const SECTION_ORDER: CostLineSection[] = [
  'FEES',
  'CONSULTANTS',
  'CONSTRUCTION',
  'CONTINGENCY',
];

export const SECTION_NAMES: Record<CostLineSection, string> = {
  FEES: 'FEES AND CHARGES',
  CONSULTANTS: 'CONSULTANTS',
  CONSTRUCTION: 'CONSTRUCTION',
  CONTINGENCY: 'CONTINGENCY',
};

export const SECTION_ICONS: Record<CostLineSection, string> = {
  FEES: '💰',
  CONSULTANTS: '👥',
  CONSTRUCTION: '🏗️',
  CONTINGENCY: '🛡️',
};

// ============================================================================
// ROW MAPPING TYPES
// ============================================================================

export type RowType = 'header' | 'section' | 'line' | 'subtotal' | 'total' | 'empty';

export interface RowMapping {
  type: RowType;
  id?: string; // Cost line ID for 'line' type
  section?: CostLineSection; // Section for 'section', 'line', 'subtotal' types
  rowIndex: number; // Actual row index in the sheet
}

export interface SectionGroup {
  section: CostLineSection;
  headerRowIndex: number;
  lineStartIndex: number;
  lineEndIndex: number;
  subtotalRowIndex: number;
  isCollapsed: boolean;
  lineCount: number;
}

// ============================================================================
// ROW MAPPING GENERATION
// ============================================================================

/**
 * Generate row mapping from cost lines
 * Returns array of row mappings and the row indices for each section
 */
export function generateRowMapping(
  costLines: CostLineWithCalculations[]
): {
  mapping: RowMapping[];
  sections: Map<CostLineSection, SectionGroup>;
} {
  const mapping: RowMapping[] = [];
  const sections = new Map<CostLineSection, SectionGroup>();

  let currentRow = 0;

  // Header row
  mapping.push({ type: 'header', rowIndex: currentRow });
  currentRow++;

  // Process each section in order
  SECTION_ORDER.forEach((section) => {
    const sectionLines = costLines
      .filter((cl) => cl.section === section && !cl.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const headerRowIndex = currentRow;

    // Section header row
    mapping.push({ type: 'section', section, rowIndex: currentRow });
    currentRow++;

    const lineStartIndex = currentRow;

    // Cost lines for this section
    sectionLines.forEach((line) => {
      mapping.push({
        type: 'line',
        id: line.id,
        section,
        rowIndex: currentRow,
      });
      currentRow++;
    });

    // If section is empty, add an empty placeholder row
    if (sectionLines.length === 0) {
      mapping.push({
        type: 'empty',
        section,
        rowIndex: currentRow,
      });
      currentRow++;
    }

    const lineEndIndex = currentRow - 1;

    // Subtotal row
    mapping.push({ type: 'subtotal', section, rowIndex: currentRow });
    const subtotalRowIndex = currentRow;
    currentRow++;

    // Store section info
    sections.set(section, {
      section,
      headerRowIndex,
      lineStartIndex,
      lineEndIndex,
      subtotalRowIndex,
      isCollapsed: false,
      lineCount: sectionLines.length,
    });
  });

  // Grand total row
  mapping.push({ type: 'total', rowIndex: currentRow });

  return { mapping, sections };
}

// ============================================================================
// COLLAPSE/EXPAND FUNCTIONALITY
// ============================================================================

export interface RowHiddenConfig {
  [rowIndex: number]: number; // 1 = hidden, 0 = visible
}

/**
 * Generate rowhidden config for collapsed sections
 */
export function generateRowHiddenConfig(
  sections: Map<CostLineSection, SectionGroup>,
  collapsedSections: Set<CostLineSection>
): RowHiddenConfig {
  const rowhidden: RowHiddenConfig = {};

  sections.forEach((sectionGroup, section) => {
    if (collapsedSections.has(section)) {
      // Hide all lines in this section (but keep header and subtotal visible)
      for (let i = sectionGroup.lineStartIndex; i <= sectionGroup.lineEndIndex; i++) {
        rowhidden[i] = 1;
      }
    }
  });

  return rowhidden;
}

/**
 * Toggle section collapsed state
 */
export function toggleSectionCollapse(
  sections: Map<CostLineSection, SectionGroup>,
  collapsedSections: Set<CostLineSection>,
  section: CostLineSection
): Set<CostLineSection> {
  const newCollapsed = new Set(collapsedSections);

  if (newCollapsed.has(section)) {
    newCollapsed.delete(section);
  } else {
    newCollapsed.add(section);
  }

  return newCollapsed;
}

/**
 * Collapse all sections
 */
export function collapseAllSections(
  sections: Map<CostLineSection, SectionGroup>
): Set<CostLineSection> {
  return new Set(sections.keys());
}

/**
 * Expand all sections
 */
export function expandAllSections(): Set<CostLineSection> {
  return new Set();
}

// ============================================================================
// ROW LOOKUP HELPERS
// ============================================================================

/**
 * Find cost line ID from row index
 */
export function getCostLineIdFromRow(
  mapping: RowMapping[],
  rowIndex: number
): string | null {
  const rowMapping = mapping.find((m) => m.rowIndex === rowIndex);
  return rowMapping?.type === 'line' ? rowMapping.id ?? null : null;
}

/**
 * Find section from row index
 */
export function getSectionFromRow(
  mapping: RowMapping[],
  rowIndex: number
): CostLineSection | null {
  const rowMapping = mapping.find((m) => m.rowIndex === rowIndex);
  return rowMapping?.section ?? null;
}

/**
 * Find row index from cost line ID
 */
export function getRowIndexFromCostLineId(
  mapping: RowMapping[],
  costLineId: string
): number | null {
  const rowMapping = mapping.find((m) => m.type === 'line' && m.id === costLineId);
  return rowMapping?.rowIndex ?? null;
}

/**
 * Get row type for a given row index
 */
export function getRowType(mapping: RowMapping[], rowIndex: number): RowType | null {
  const rowMapping = mapping.find((m) => m.rowIndex === rowIndex);
  return rowMapping?.type ?? null;
}

/**
 * Check if row is editable (only 'line' type rows are editable)
 */
export function isRowEditable(mapping: RowMapping[], rowIndex: number): boolean {
  const rowType = getRowType(mapping, rowIndex);
  return rowType === 'line';
}

// ============================================================================
// SECTION NAVIGATION
// ============================================================================

/**
 * Get next section's header row index
 */
export function getNextSectionHeaderRow(
  sections: Map<CostLineSection, SectionGroup>,
  currentSection: CostLineSection
): number | null {
  const sectionIndex = SECTION_ORDER.indexOf(currentSection);
  if (sectionIndex === -1 || sectionIndex === SECTION_ORDER.length - 1) {
    return null;
  }

  const nextSection = SECTION_ORDER[sectionIndex + 1];
  return sections.get(nextSection)?.headerRowIndex ?? null;
}

/**
 * Get previous section's header row index
 */
export function getPreviousSectionHeaderRow(
  sections: Map<CostLineSection, SectionGroup>,
  currentSection: CostLineSection
): number | null {
  const sectionIndex = SECTION_ORDER.indexOf(currentSection);
  if (sectionIndex <= 0) {
    return null;
  }

  const prevSection = SECTION_ORDER[sectionIndex - 1];
  return sections.get(prevSection)?.headerRowIndex ?? null;
}

/**
 * Get first data row of a section
 */
export function getFirstDataRowOfSection(
  sections: Map<CostLineSection, SectionGroup>,
  section: CostLineSection
): number | null {
  const sectionGroup = sections.get(section);
  return sectionGroup?.lineStartIndex ?? null;
}

/**
 * Get last data row of a section
 */
export function getLastDataRowOfSection(
  sections: Map<CostLineSection, SectionGroup>,
  section: CostLineSection
): number | null {
  const sectionGroup = sections.get(section);
  return sectionGroup?.lineEndIndex ?? null;
}
