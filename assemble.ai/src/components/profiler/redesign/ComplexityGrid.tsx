'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type { BuildingClass, BuildingClassConfig, ComplexityOption } from '@/types/profiler';
import type { ComplexityValue } from './profilerReducer';

interface ComplexityGridProps {
  buildingClass: BuildingClass | null;
  subclass: string[];
  value: Record<string, ComplexityValue>;
  onToggle: (dim: string, v: string, multi: boolean) => void;
}

const MULTI_DIMS = new Set(['site_conditions']);
const TILES_PER_PAGE = 2;

export function getComplexityOptionsFor(
  buildingClass: BuildingClass | null,
  subclass: string[]
): Record<string, ComplexityOption[]> {
  if (!buildingClass) return {};
  const config = (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[buildingClass];
  if (!config) return {};
  const primary = subclass[0];
  let options = config.complexityOptions.default;
  if (primary && config.complexityOptions[primary]) {
    options = config.complexityOptions[primary];
  }
  if (Array.isArray(options)) return { default: options };
  return options as Record<string, ComplexityOption[]>;
}

export function ComplexityGrid({ buildingClass, subclass, value, onToggle }: ComplexityGridProps) {
  const [page, setPage] = useState(0);

  const open = buildingClass !== null && subclass.length > 0;
  if (!open) return null;

  const options = getComplexityOptionsFor(buildingClass, subclass);
  const dims = Object.entries(options);
  const totalPages = Math.ceil(dims.length / TILES_PER_PAGE);
  const safePage = Math.min(page, totalPages - 1);
  const pageDims = dims.slice(safePage * TILES_PER_PAGE, safePage * TILES_PER_PAGE + TILES_PER_PAGE);

  return (
    <div>
      {/* Header: label + navigation */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Complexity
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors"
            aria-label="Previous dimensions"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-[9px] text-[var(--color-text-muted)] tabular-nums">
            {safePage + 1}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors"
            aria-label="Next dimensions"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Two-column tile view */}
      <div className="grid grid-cols-2 gap-2">
        {pageDims.map(([dim, opts]) => {
          const isProcurement = dim === 'procurement_route';
          const multi = MULTI_DIMS.has(dim);
          const dimValue = value[dim];
          const hasSelection = opts.some((o) =>
            multi
              ? (Array.isArray(dimValue) ? dimValue.includes(o.value) : dimValue === o.value)
              : dimValue === o.value
          );

          return (
            <div
              key={dim}
              className={`rounded-lg p-2 shadow-sm transition-all duration-200 backdrop-blur-md border flex flex-col min-h-[90px] ${
                isProcurement
                  ? 'border-[var(--color-card-procurement-border)] bg-[var(--color-card-procurement)]'
                  : 'border-[var(--color-card-firm-border)] bg-[var(--color-card-firm)]'
              }`}
              style={{
                borderLeftWidth: '2px',
                borderLeftColor: isProcurement
                  ? hasSelection
                    ? 'var(--color-card-procurement-accent-bright)'
                    : 'var(--color-card-procurement-accent)'
                  : hasSelection
                    ? 'var(--color-card-firm-accent-bright)'
                    : 'var(--color-card-firm-accent)',
              }}
            >
              <label className="block text-[9px] font-semibold text-[var(--color-text-primary)] mb-1.5 capitalize leading-tight">
                {dim.replace(/_/g, ' ')}
              </label>
              <div className="flex flex-col gap-0.5">
                {opts.map((option) => {
                  const isSelected = multi
                    ? (Array.isArray(dimValue) ? dimValue.includes(option.value) : dimValue === option.value)
                    : dimValue === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onToggle(dim, option.value, multi)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all text-left leading-tight ${
                        isProcurement
                          ? isSelected
                            ? 'bg-[var(--color-card-procurement-selected)]'
                            : 'bg-[var(--color-card-procurement)] hover:bg-[var(--color-card-procurement-hover)]'
                          : isSelected
                            ? 'bg-[var(--color-card-firm-selected)]'
                            : 'bg-[var(--color-card-firm)] hover:bg-[var(--color-card-firm-hover)]'
                      }`}
                      style={{
                        color: isProcurement
                          ? 'var(--color-card-procurement-text)'
                          : 'var(--color-card-firm-text)',
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              className={`rounded-full transition-all ${
                i === safePage
                  ? 'w-3 h-1.5 bg-[var(--color-accent-copper)]'
                  : 'w-1.5 h-1.5 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
              }`}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
