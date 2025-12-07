'use client';

/**
 * Snapshot Compare Dialog
 * Feature 006 - Cost Planning Module (Task T104)
 *
 * Dialog for comparing a historical snapshot with the current cost plan.
 * Shows side-by-side comparison with difference highlighting.
 */

import { useState, useMemo } from 'react';
import {
  X,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Camera,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';
import type { CostLineSection, SECTION_NAMES } from '@/types/cost-plan';

// ============================================================================
// TYPES
// ============================================================================

interface CostLineCompare {
  id: string;
  costCode?: string | null;
  description: string;
  section: CostLineSection;
  // Snapshot values (null if line didn't exist)
  snapshotBudgetCents: number | null;
  snapshotContractCents: number | null;
  snapshotForecastCents: number | null;
  // Current values (null if line was deleted)
  currentBudgetCents: number | null;
  currentContractCents: number | null;
  currentForecastCents: number | null;
  // Change status
  status: 'added' | 'removed' | 'changed' | 'unchanged';
}

interface SectionCompare {
  section: CostLineSection;
  sectionName: string;
  lines: CostLineCompare[];
  snapshotTotalCents: number;
  currentTotalCents: number;
  changeCents: number;
}

interface TotalsCompare {
  snapshotBudgetCents: number;
  currentBudgetCents: number;
  snapshotContractCents: number;
  currentContractCents: number;
  snapshotForecastCents: number;
  currentForecastCents: number;
}

interface SnapshotCompareDialogProps {
  isOpen: boolean;
  snapshotName: string;
  snapshotDate: string;
  sections: SectionCompare[];
  totals: TotalsCompare;
  onClose: () => void;
  onExport?: () => void;
}

type ViewMode = 'all' | 'changes';

// ============================================================================
// STATUS COLORS
// ============================================================================

const STATUS_STYLES = {
  added: {
    bg: 'bg-[#4ade80]/10',
    text: 'text-[#4ade80]',
    badge: 'bg-[#4ade80]/20 text-[#4ade80]',
    label: 'Added',
  },
  removed: {
    bg: 'bg-[#f87171]/10',
    text: 'text-[#f87171]',
    badge: 'bg-[#f87171]/20 text-[#f87171]',
    label: 'Removed',
  },
  changed: {
    bg: 'bg-[#fbbf24]/10',
    text: 'text-[#fbbf24]',
    badge: 'bg-[#fbbf24]/20 text-[#fbbf24]',
    label: 'Changed',
  },
  unchanged: {
    bg: '',
    text: 'text-[#858585]',
    badge: 'bg-[#3e3e42] text-[#858585]',
    label: 'No Change',
  },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ChangeIndicator({ oldValue, newValue }: { oldValue: number | null; newValue: number | null }) {
  if (oldValue === null || newValue === null) {
    return <span className="text-[#6e6e6e]">--</span>;
  }

  const diff = newValue - oldValue;
  if (diff === 0) {
    return <Minus className="w-4 h-4 text-[#6e6e6e]" />;
  }

  return diff > 0 ? (
    <div className="flex items-center gap-1 text-[#4ade80]">
      <TrendingUp className="w-3 h-3" />
      <span className="text-xs">+{formatCurrency(diff)}</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-[#f87171]">
      <TrendingDown className="w-3 h-3" />
      <span className="text-xs">{formatCurrency(diff)}</span>
    </div>
  );
}

function ValueCell({ value, strikethrough = false }: { value: number | null; strikethrough?: boolean }) {
  if (value === null) {
    return <span className="text-[#6e6e6e]">--</span>;
  }
  return (
    <span className={strikethrough ? 'line-through text-[#6e6e6e]' : ''}>
      {formatCurrency(value)}
    </span>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SnapshotCompareDialog({
  isOpen,
  snapshotName,
  snapshotDate,
  sections,
  totals,
  onClose,
  onExport,
}: SnapshotCompareDialogProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [expandedSections, setExpandedSections] = useState<Set<CostLineSection>>(
    new Set(sections.map((s) => s.section))
  );

  // Filter sections based on view mode
  const filteredSections = useMemo(() => {
    if (viewMode === 'all') {
      return sections;
    }
    // Only show sections with changes
    return sections
      .map((section) => ({
        ...section,
        lines: section.lines.filter((line) => line.status !== 'unchanged'),
      }))
      .filter((section) => section.lines.length > 0);
  }, [sections, viewMode]);

  // Count changes
  const changeCounts = useMemo(() => {
    const counts = { added: 0, removed: 0, changed: 0, unchanged: 0 };
    sections.forEach((section) => {
      section.lines.forEach((line) => {
        counts[line.status]++;
      });
    });
    return counts;
  }, [sections]);

  // Toggle section expansion
  const toggleSection = (section: CostLineSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#3e3e42] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Compare: {snapshotName}
            </h2>
            <p className="text-sm text-[#858585]">
              Snapshot from {formatDate(snapshotDate)} vs Current
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <button
                onClick={onExport}
                className="px-3 py-1.5 text-sm text-[#cccccc] hover:text-white hover:bg-[#37373d] rounded transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-[#858585] hover:text-white rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="px-4 py-3 border-b border-[#3e3e42] bg-[#1e1e1e] flex items-center justify-between shrink-0">
          {/* Change counts */}
          <div className="flex items-center gap-4">
            {changeCounts.added > 0 && (
              <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLES.added.badge}`}>
                +{changeCounts.added} Added
              </span>
            )}
            {changeCounts.removed > 0 && (
              <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLES.removed.badge}`}>
                -{changeCounts.removed} Removed
              </span>
            )}
            {changeCounts.changed > 0 && (
              <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLES.changed.badge}`}>
                {changeCounts.changed} Changed
              </span>
            )}
            {changeCounts.added === 0 && changeCounts.removed === 0 && changeCounts.changed === 0 && (
              <span className="text-sm text-[#858585]">No changes detected</span>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-[#252526] rounded p-1">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'all'
                  ? 'bg-[#37373d] text-white'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              All Lines
            </button>
            <button
              onClick={() => setViewMode('changes')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'changes'
                  ? 'bg-[#37373d] text-white'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              Changes Only
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto min-h-0">
          {/* Table Header */}
          <div className="sticky top-0 bg-[#1e1e1e] border-b border-[#3e3e42] z-10">
            <div className="grid grid-cols-[300px_1fr_1fr_1fr_100px] gap-2 px-4 py-2 text-xs text-[#858585] font-medium uppercase tracking-wider">
              <div>Description</div>
              <div className="text-right">
                <div>Budget</div>
                <div className="flex items-center justify-end gap-2 text-[#6e6e6e] font-normal normal-case">
                  <span>Snapshot</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>Current</span>
                </div>
              </div>
              <div className="text-right">
                <div>Contract</div>
                <div className="flex items-center justify-end gap-2 text-[#6e6e6e] font-normal normal-case">
                  <span>Snapshot</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>Current</span>
                </div>
              </div>
              <div className="text-right">
                <div>Forecast</div>
                <div className="flex items-center justify-end gap-2 text-[#6e6e6e] font-normal normal-case">
                  <span>Snapshot</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>Current</span>
                </div>
              </div>
              <div className="text-center">Change</div>
            </div>
          </div>

          {/* Sections */}
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 text-[#858585]">
              No changes to display
            </div>
          ) : (
            filteredSections.map((section) => {
              const isExpanded = expandedSections.has(section.section);

              return (
                <div key={section.section}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.section)}
                    className="w-full grid grid-cols-[300px_1fr_1fr_1fr_100px] gap-2 px-4 py-2 bg-[#2a2d2e] hover:bg-[#37373d] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#858585]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#858585]" />
                      )}
                      <span className="text-[#cccccc] font-medium">
                        {section.sectionName}
                      </span>
                      <span className="text-xs text-[#6e6e6e]">
                        ({section.lines.length} line{section.lines.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="text-right text-[#cccccc]">
                      <ValueCell value={section.snapshotTotalCents} />
                      <span className="text-[#6e6e6e] mx-2">→</span>
                      <ValueCell value={section.currentTotalCents} />
                    </div>
                    <div />
                    <div />
                    <div className="flex justify-center">
                      <ChangeIndicator
                        oldValue={section.snapshotTotalCents}
                        newValue={section.currentTotalCents}
                      />
                    </div>
                  </button>

                  {/* Section Lines */}
                  {isExpanded && (
                    <div className="divide-y divide-[#3e3e42]">
                      {section.lines.map((line) => {
                        const style = STATUS_STYLES[line.status];

                        return (
                          <div
                            key={line.id}
                            className={`grid grid-cols-[300px_1fr_1fr_1fr_100px] gap-2 px-4 py-2 ${style.bg}`}
                          >
                            {/* Description */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {line.costCode && (
                                  <span className="text-xs text-[#6e6e6e] font-mono">
                                    {line.costCode}
                                  </span>
                                )}
                                <span
                                  className={`truncate ${
                                    line.status === 'removed'
                                      ? 'line-through text-[#6e6e6e]'
                                      : 'text-[#cccccc]'
                                  }`}
                                >
                                  {line.description}
                                </span>
                              </div>
                            </div>

                            {/* Budget */}
                            <div className="text-right text-sm">
                              <ValueCell
                                value={line.snapshotBudgetCents}
                                strikethrough={line.status === 'removed'}
                              />
                              <span className="text-[#6e6e6e] mx-2">→</span>
                              <ValueCell
                                value={line.currentBudgetCents}
                                strikethrough={line.status === 'removed'}
                              />
                            </div>

                            {/* Contract */}
                            <div className="text-right text-sm">
                              <ValueCell
                                value={line.snapshotContractCents}
                                strikethrough={line.status === 'removed'}
                              />
                              <span className="text-[#6e6e6e] mx-2">→</span>
                              <ValueCell
                                value={line.currentContractCents}
                                strikethrough={line.status === 'removed'}
                              />
                            </div>

                            {/* Forecast */}
                            <div className="text-right text-sm">
                              <ValueCell
                                value={line.snapshotForecastCents}
                                strikethrough={line.status === 'removed'}
                              />
                              <span className="text-[#6e6e6e] mx-2">→</span>
                              <ValueCell
                                value={line.currentForecastCents}
                                strikethrough={line.status === 'removed'}
                              />
                            </div>

                            {/* Status Badge */}
                            <div className="flex justify-center items-center">
                              <span className={`px-2 py-0.5 rounded text-xs ${style.badge}`}>
                                {style.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer - Totals */}
        <div className="px-4 py-3 border-t border-[#3e3e42] bg-[#1e1e1e] shrink-0">
          <div className="grid grid-cols-[300px_1fr_1fr_1fr_100px] gap-2 text-sm">
            <div className="text-[#cccccc] font-medium">Total</div>
            <div className="text-right">
              <span className="text-[#858585]">{formatCurrency(totals.snapshotBudgetCents)}</span>
              <span className="text-[#6e6e6e] mx-2">→</span>
              <span className="text-white font-medium">{formatCurrency(totals.currentBudgetCents)}</span>
            </div>
            <div className="text-right">
              <span className="text-[#858585]">{formatCurrency(totals.snapshotContractCents)}</span>
              <span className="text-[#6e6e6e] mx-2">→</span>
              <span className="text-white font-medium">{formatCurrency(totals.currentContractCents)}</span>
            </div>
            <div className="text-right">
              <span className="text-[#858585]">{formatCurrency(totals.snapshotForecastCents)}</span>
              <span className="text-[#6e6e6e] mx-2">→</span>
              <span className="text-white font-medium">{formatCurrency(totals.currentForecastCents)}</span>
            </div>
            <div className="flex justify-center">
              <ChangeIndicator
                oldValue={totals.snapshotForecastCents}
                newValue={totals.currentForecastCents}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SnapshotCompareDialog;
