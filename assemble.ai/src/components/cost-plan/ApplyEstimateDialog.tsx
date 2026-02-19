'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Lock, Unlock, Plus, AlertTriangle, DollarSign, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency, formatCurrencyCompact } from '@/lib/calculations/cost-plan-formulas';
import {
  type AllocationPreviewLine,
  type AllocationStakeholder,
  getProfileForBuildingClass,
  buildAllocationPreview,
  recalculateAmounts,
  adjustLinePercent,
  removeLineAndRedistribute,
  getSectionTotals,
  getGrandTotalPercent,
} from '@/lib/calculations/estimate-allocation';
import type { CostLineSection, CostLineWithCalculations } from '@/types/cost-plan';

// ============================================================================
// TYPES
// ============================================================================

interface ApplyEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costLines: CostLineWithCalculations[];
  /** NCC building class string, e.g. "Class 2" */
  buildingClass: string | null;
  /** Estimate range in cents */
  estimateLowCents: number;
  estimateHighCents: number;
  /** Suggested contingency % from complexity score */
  suggestedContingencyPercent?: number;
  /** Project stakeholders for matching suggested disciplines */
  stakeholders: AllocationStakeholder[];
  /** Called when user confirms - receives budget updates and new lines */
  onApply: (updates: BudgetUpdate[], newLines: NewBudgetLine[]) => Promise<void>;
}

export interface BudgetUpdate {
  costLineId: string;
  budgetCents: number;
}

export interface NewBudgetLine {
  section: CostLineSection;
  activity: string;
  budgetCents: number;
  stakeholderId?: string | null;
}

// ============================================================================
// SECTION DISPLAY
// ============================================================================

const SECTION_LABELS: Record<CostLineSection, string> = {
  FEES: 'DEVELOPER',
  CONSULTANTS: 'CONSULTANTS',
  CONSTRUCTION: 'CONSTRUCTION',
  CONTINGENCY: 'CONTINGENCY',
};

const SECTION_ORDER: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];

// ============================================================================
// COMPONENT
// ============================================================================

export function ApplyEstimateDialog({
  open,
  onOpenChange,
  costLines,
  buildingClass,
  estimateLowCents,
  estimateHighCents,
  suggestedContingencyPercent,
  stakeholders,
  onApply,
}: ApplyEstimateDialogProps) {
  // Total budget slider state (in cents)
  const midpointCents = Math.round((estimateLowCents + estimateHighCents) / 2);
  const [totalBudgetCents, setTotalBudgetCents] = useState(midpointCents);
  const [lines, setLines] = useState<AllocationPreviewLine[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  // Unified checked state: tracks which lines user wants to include
  const [checkedLines, setCheckedLines] = useState<Set<number>>(new Set());
  // Track removed lines — their % is redistributed to siblings
  const [removedLines, setRemovedLines] = useState<Set<number>>(new Set());

  // Get profile for the building class
  const profile = useMemo(
    () => (buildingClass ? getProfileForBuildingClass(buildingClass) : null),
    [buildingClass]
  );

  // Build initial preview only when dialog first opens (not on polling refreshes)
  const prevOpenRef = React.useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (justOpened && profile) {
      const preview = buildAllocationPreview(profile, costLines, midpointCents, stakeholders);
      setLines(preview);
      setTotalBudgetCents(midpointCents);
      setRemovedLines(new Set());

      // Pre-check all existing cost plan lines (matched + unallocated)
      // Suggested lines start unchecked
      const initialChecked = new Set<number>();
      preview.forEach((line, i) => {
        if (line.matchStatus === 'matched' || line.matchStatus === 'unallocated') {
          initialChecked.add(i);
        }
      });
      setCheckedLines(initialChecked);
    }
  }, [open, profile, costLines, midpointCents, stakeholders]);

  // Suggested line indices for header "select all" checkbox
  const suggestedIndices = useMemo(
    () => lines
      .map((l, i) => ({ index: i, isSuggested: l.matchStatus === 'suggested' }))
      .filter(x => x.isSuggested && !removedLines.has(x.index))
      .map(x => x.index),
    [lines, removedLines]
  );
  const allSuggestedSelected = suggestedIndices.length > 0 && suggestedIndices.every(i => checkedLines.has(i));
  const someSuggestedSelected = suggestedIndices.some(i => checkedLines.has(i));

  const handleSelectAllSuggested = useCallback(() => {
    setCheckedLines(prev => {
      const next = new Set(prev);
      if (allSuggestedSelected) {
        // Deselect all suggested
        for (const i of suggestedIndices) next.delete(i);
      } else {
        // Select all suggested
        for (const i of suggestedIndices) next.add(i);
      }
      return next;
    });
  }, [allSuggestedSelected, suggestedIndices]);

  // Section totals
  const sectionTotals = useMemo(() => getSectionTotals(lines), [lines]);
  const grandTotalPercent = useMemo(() => getGrandTotalPercent(lines), [lines]);
  const percentWarning = Math.abs(grandTotalPercent - 100) > 0.5;

  // Handle slider change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTotal = parseInt(e.target.value, 10);
    setTotalBudgetCents(newTotal);
    setLines(prev => recalculateAmounts(prev, newTotal));
  }, []);

  // Handle manual dollar input
  const handleDollarInput = useCallback((value: string) => {
    const dollars = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (!isNaN(dollars)) {
      const cents = Math.round(dollars * 100);
      const clamped = Math.max(estimateLowCents, Math.min(estimateHighCents, cents));
      setTotalBudgetCents(clamped);
      setLines(prev => recalculateAmounts(prev, clamped));
    }
  }, [estimateLowCents, estimateHighCents]);

  // Handle individual line % change
  const handlePercentChange = useCallback((index: number, newPercent: number) => {
    setLines(prev => adjustLinePercent(prev, index, newPercent, totalBudgetCents));
  }, [totalBudgetCents]);

  // Handle lock toggle
  const handleLockToggle = useCallback((index: number) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], locked: !updated[index].locked };
      return updated;
    });
  }, []);

  // Toggle line checked state
  const handleLineToggle = useCallback((index: number) => {
    setCheckedLines(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Remove a line and redistribute its % to remaining section siblings
  const handleRemoveLine = useCallback((index: number) => {
    const newRemoved = new Set(removedLines);
    newRemoved.add(index);
    setRemovedLines(newRemoved);
    setLines(prev => removeLineAndRedistribute(prev, index, newRemoved, totalBudgetCents));
    setCheckedLines(prev => { const next = new Set(prev); next.delete(index); return next; });
  }, [removedLines, totalBudgetCents]);

  // Apply budgets — only process checked lines
  const handleApply = useCallback(async () => {
    setIsApplying(true);
    try {
      const updates: BudgetUpdate[] = [];
      const newBudgetLines: NewBudgetLine[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (removedLines.has(i)) continue;
        if (!checkedLines.has(i)) continue;

        const line = lines[i];

        if (line.costLineId) {
          // Existing line (matched or unallocated) — update budget
          updates.push({ costLineId: line.costLineId, budgetCents: line.amountCents });
        } else if (line.matchStatus === 'suggested') {
          // New suggested line — create with stakeholder
          newBudgetLines.push({
            section: line.section,
            activity: line.activity,
            budgetCents: line.amountCents,
            stakeholderId: line.stakeholderId,
          });
        }
      }

      await onApply(updates, newBudgetLines);
      onOpenChange(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsApplying(false);
    }
  }, [lines, checkedLines, removedLines, onApply, onOpenChange]);

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
          <DialogTitle className="text-sm font-semibold">
            Apply Budget Estimate
          </DialogTitle>
          <DialogDescription className="text-xs">
            Distribute the profiler estimate across your cost plan using {profile.label} allocation profile.
          </DialogDescription>
        </DialogHeader>

        {/* Total Budget Slider */}
        <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--color-text-muted)]">
              Estimate Range: {formatCurrencyCompact(estimateLowCents)} – {formatCurrencyCompact(estimateHighCents)}
            </span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={formatCurrency(totalBudgetCents).replace('$', '')}
                onChange={(e) => handleDollarInput(e.target.value)}
                className="w-32 text-right text-sm font-semibold bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-teal)]"
              />
            </div>
          </div>
          <input
            type="range"
            min={estimateLowCents}
            max={estimateHighCents}
            value={totalBudgetCents}
            onChange={handleSliderChange}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#1776c1]"
            style={{
              background: `linear-gradient(to right, #1776c1 ${((totalBudgetCents - estimateLowCents) / (estimateHighCents - estimateLowCents)) * 100}%, var(--color-border) ${((totalBudgetCents - estimateLowCents) / (estimateHighCents - estimateLowCents)) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">{formatCurrencyCompact(estimateLowCents)}</span>
            <span className="text-[10px] text-[var(--color-text-muted)]">{formatCurrencyCompact(estimateHighCents)}</span>
          </div>
        </div>

        {/* Line Item Table */}
        <div className="flex-1 overflow-auto min-h-0 px-1">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)]">
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-center px-3 py-2 w-8">
                  {suggestedIndices.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allSuggestedSelected}
                      ref={(el) => { if (el) el.indeterminate = someSuggestedSelected && !allSuggestedSelected; }}
                      onChange={handleSelectAllSuggested}
                      className="w-3 h-3 accent-[#1776c1] cursor-pointer"
                      title={allSuggestedSelected ? 'Deselect all suggested lines' : 'Select all suggested lines'}
                    />
                  )}
                </th>
                <th className="text-left px-2 py-2 text-[var(--color-text-muted)] font-medium">Discipline</th>
                <th className="text-right px-2 py-2 text-[var(--color-text-muted)] font-medium w-20">Alloc %</th>
                <th className="text-right px-2 py-2 text-[var(--color-text-muted)] font-medium w-28">Budget</th>
                <th className="text-right px-2 py-2 text-[var(--color-text-muted)] font-medium w-28">Current</th>
                <th className="text-center px-1 py-2 w-14"></th>
              </tr>
            </thead>
            <tbody>
              {SECTION_ORDER.map(section => {
                const sectionLines = lines
                  .map((l, i) => ({ line: l, index: i }))
                  .filter(({ line, index }) => line.section === section && !removedLines.has(index))
                  .sort((a, b) => {
                    // Existing lines first (matched/unallocated), then suggested
                    const aOrder = a.line.matchStatus === 'suggested' ? 1 : 0;
                    const bOrder = b.line.matchStatus === 'suggested' ? 1 : 0;
                    return aOrder - bOrder;
                  });

                if (sectionLines.length === 0) return null;

                const st = sectionTotals[section];

                return (
                  <React.Fragment key={section}>
                    {/* Section Header */}
                    <tr className="bg-[var(--color-bg-tertiary)]/50">
                      <td colSpan={2} className="px-3 py-1.5 font-bold text-[var(--color-text-primary)] text-[11px] tracking-wide">
                        {SECTION_LABELS[section]}
                      </td>
                      <td className="text-right px-2 py-1.5 font-bold text-[var(--color-text-primary)]">
                        {st.percent.toFixed(1)}%
                      </td>
                      <td className="text-right px-2 py-1.5 font-bold text-[var(--color-text-primary)]">
                        {formatCurrency(st.amountCents)}
                      </td>
                      <td></td>
                      <td></td>
                    </tr>

                    {/* Line Items */}
                    {sectionLines.map(({ line, index }, i) => {
                      // Show separator between existing and suggested lines
                      const prevLine = i > 0 ? sectionLines[i - 1].line : null;
                      const showSuggestedDivider = line.matchStatus === 'suggested' &&
                        prevLine && prevLine.matchStatus !== 'suggested';

                      return (
                      <React.Fragment key={index}>
                        {showSuggestedDivider && (
                          <tr>
                            <td colSpan={6} className="px-3 py-1">
                              <div className="flex items-center gap-2 text-[9px] text-[var(--color-text-muted)]">
                                <div className="flex-1 border-t border-dashed border-[var(--color-border)]" />
                                <span>Suggested from stakeholder pool</span>
                                <div className="flex-1 border-t border-dashed border-[var(--color-border)]" />
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`border-b border-[var(--color-border)]/30 hover:bg-[var(--color-bg-tertiary)]/30 transition-colors ${
                            line.matchStatus === 'suggested' && !checkedLines.has(index) ? 'opacity-60' : ''
                          }`}
                        >
                          {/* Checkbox for all lines */}
                          <td className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={checkedLines.has(index)}
                              onChange={() => handleLineToggle(index)}
                              className="w-3 h-3 accent-[#1776c1] cursor-pointer"
                              title={line.matchStatus === 'suggested'
                                ? 'Include this suggested discipline'
                                : 'Include this existing line'}
                            />
                          </td>

                          {/* Activity */}
                          <td className="px-2 py-1.5 text-[var(--color-text-primary)]">
                            <div className="flex items-center gap-1.5">
                              <span>{line.activity}</span>
                              {line.matchStatus === 'suggested' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-[#1776c1]/10 text-[#1776c1]">
                                  <Plus className="w-2.5 h-2.5" /> suggested
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Allocation % */}
                          <td className="text-right px-2 py-1.5">
                            {(() => {
                              const step = line.percent < 1.0 ? 0.1 : 0.2;
                              return (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handlePercentChange(index, Math.max(0, Math.round((line.percent - step) * 100) / 100))}
                                className="w-4 h-4 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                                title={`Decrease ${step}%`}
                              >
                                –
                              </button>
                              <span className="w-10 text-right font-mono text-[var(--color-text-primary)]">
                                {line.percent < 1.0 ? line.percent.toFixed(2) : line.percent.toFixed(1)}%
                              </span>
                              <button
                                onClick={() => handlePercentChange(index, Math.round((line.percent + step) * 100) / 100)}
                                className="w-4 h-4 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                                title={`Increase ${step}%`}
                              >
                                +
                              </button>
                            </div>
                              );
                            })()}
                          </td>

                          {/* Proposed Budget */}
                          <td className="text-right px-2 py-1.5 font-mono text-[var(--color-text-primary)]">
                            {formatCurrency(line.amountCents)}
                          </td>

                          {/* Current Budget */}
                          <td className="text-right px-2 py-1.5 font-mono text-[var(--color-text-muted)]">
                            {line.currentBudgetCents > 0 ? formatCurrency(line.currentBudgetCents) : '–'}
                          </td>

                          {/* Lock Toggle + Remove */}
                          <td className="text-center px-1 py-1.5">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => handleLockToggle(index)}
                                className={`p-0.5 rounded transition-colors ${
                                  line.locked
                                    ? 'text-[#1776c1]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                                title={line.locked ? 'Unlock percentage' : 'Lock percentage'}
                              >
                                {line.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => handleRemoveLine(index)}
                                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Remove line and redistribute budget"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-3">
            {percentWarning && (
              <div className="flex items-center gap-1 text-amber-500 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Total: {grandTotalPercent.toFixed(1)}% (not 100%)</span>
              </div>
            )}
            {!percentWarning && (
              <span className="text-xs text-[var(--color-text-muted)]">
                Total: {formatCurrency(totalBudgetCents)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="px-4 py-1.5 text-xs bg-[#1776c1] text-white rounded hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? 'Applying...' : 'Apply to Cost Plan'}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
