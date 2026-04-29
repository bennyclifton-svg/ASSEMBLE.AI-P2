'use client';

import { useEffect, useMemo } from 'react';
import { ClassPicker } from './ClassPicker';
import { TypePicker } from './TypePicker';
import { SubclassPicker } from './SubclassPicker';
import { ScalePanel } from './ScalePanel';
import { ComplexityGrid, getComplexityOptionsFor } from './ComplexityGrid';
import { RiskSlider } from './RiskSlider';
import { ScopePanel } from './ScopePanel';
import { complexityPatchForRisk } from './riskMapping';
import { getPreset } from './presetMatrix';
import { isRiskModified, type Action, type ProfileState, type RiskLevel } from './profilerReducer';
import type { BuildingClass, ProjectType } from '@/types/profiler';

interface ProfilerFormProps {
  state: ProfileState;
  dispatch: (a: Action) => void;
  onClassChange?: (cls: BuildingClass | null) => void;
  onTypeChange?: (t: ProjectType | null) => void;
}

export function ProfilerForm({ state, dispatch, onClassChange, onTypeChange }: ProfilerFormProps) {
  const { buildingClass, projectType, subclass, scaleData, complexity, workScope } = state;

  const complexityOptions = useMemo(
    () => getComplexityOptionsFor(buildingClass, subclass),
    [buildingClass, subclass]
  );

  const preset = useMemo(() => getPreset(buildingClass, projectType), [buildingClass, projectType]);

  // Keep parent in sync when reducer's class/type drift via STAMP_PRESET or HYDRATE.
  useEffect(() => {
    onClassChange?.(buildingClass);
  }, [buildingClass, onClassChange]);
  useEffect(() => {
    onTypeChange?.(projectType);
  }, [projectType, onTypeChange]);

  const handleClassChange = (v: BuildingClass | null) => {
    dispatch({ t: 'SET_CLASS', v });
  };
  const handleTypeChange = (v: ProjectType | null) => {
    dispatch({ t: 'SET_TYPE', v });
  };

  const handleRiskChange = (level: RiskLevel) => {
    const patch = complexityPatchForRisk(level, buildingClass, complexityOptions);
    dispatch({ t: 'STAMP_RISK', level, complexityPatch: patch });
  };

  const handleRiskClear = () => {
    dispatch({ t: 'CLEAR_RISK' });
  };

  const handleTickStandard = () => {
    if (preset?.standardScopeItems) {
      dispatch({ t: 'TICK_STANDARD_SCOPE', items: preset.standardScopeItems });
    }
  };

  const modified = isRiskModified(state);
  const subclassMax: 1 | 4 = buildingClass === 'mixed' ? 4 : 1;
  const riskEnabled = buildingClass !== null && subclass.length > 0;

  return (
    <div className="space-y-3">
      {/* Tier 1: Class */}
      <ClassPicker
        value={buildingClass}
        onChange={handleClassChange}
        expandedOthers={state.expandedClassOthers}
        onExpandedChange={(v) => dispatch({ t: 'SET_EXPANDED_CLASS_OTHERS', v })}
      />

      {/* Tier 1: Type */}
      <TypePicker value={projectType} onChange={handleTypeChange} />

      {/* Divider */}
      <div className="border-t border-[var(--color-border)]" />

      {/* Tier 2: Subclass — horizontal scroll strip */}
      <SubclassPicker
        buildingClass={buildingClass}
        value={subclass}
        onToggle={(v) => dispatch({ t: 'TOGGLE_SUBCLASS', v, max: subclassMax })}
        expandedOthers={state.expandedSubclassOthers}
        onExpandedChange={(v) => dispatch({ t: 'SET_EXPANDED_SUBCLASS_OTHERS', v })}
      />

      {/* Tier 3: Scale + Risk side by side */}
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <ScalePanel
            buildingClass={buildingClass}
            subclass={subclass}
            value={scaleData}
            onChange={(key, v) => dispatch({ t: 'SET_SCALE_FIELD', key, v })}
          />
        </div>
        <div className="w-[90px] flex-shrink-0 pt-0.5">
          <RiskSlider
            value={state.riskLevel}
            isModified={modified}
            disabled={!riskEnabled}
            onChange={handleRiskChange}
            onClear={handleRiskClear}
          />
        </div>
      </div>

      {/* Divider (only shown when subclass is set) */}
      {subclass.length > 0 && <div className="border-t border-[var(--color-border)]" />}

      {/* Tier 4: Complexity carousel */}
      <ComplexityGrid
        buildingClass={buildingClass}
        subclass={subclass}
        value={complexity}
        onToggle={(dim, v, multi) => dispatch({ t: 'TOGGLE_COMPLEXITY', dim, v, multi })}
      />

      {/* Tier 5: Scope of Work — tab-based */}
      {(buildingClass !== null && projectType !== null) && (
        <div className="border-t border-[var(--color-border)] pt-3">
          <ScopePanel
            buildingClass={buildingClass}
            projectType={projectType}
            value={workScope}
            onChange={(scopes) => dispatch({ t: 'SET_WORK_SCOPE', items: scopes })}
            standardItems={preset?.standardScopeItems ?? null}
            onTickStandard={preset ? handleTickStandard : undefined}
          />
        </div>
      )}
    </div>
  );
}

/** Imperative hook used by the outer panel's "Set Default" button. */
export function buildPresetApplyHandler(
  state: ProfileState,
  dispatch: (a: Action) => void
): () => void {
  return () => {
    const preset = getPreset(state.buildingClass, state.projectType);
    if (!preset || !state.buildingClass || !state.projectType) return;
    const opts = getComplexityOptionsFor(state.buildingClass, preset.subclass);
    const base = complexityPatchForRisk(preset.riskLevel, state.buildingClass, opts);
    const merged: Record<string, string | string[]> = { ...base };
    if (preset.complexityOverrides) {
      for (const [dim, val] of Object.entries(preset.complexityOverrides)) {
        if (opts[dim]) {
          const allowed = new Set(opts[dim].map((o) => o.value));
          if (Array.isArray(val)) {
            const filtered = val.filter((v) => allowed.has(v));
            if (filtered.length > 0) merged[dim] = filtered;
          } else if (allowed.has(val)) {
            merged[dim] = val;
          }
        }
      }
    }
    dispatch({
      t: 'STAMP_PRESET',
      patch: {
        subclass: preset.subclass,
        scaleData: preset.scaleData,
        complexity: merged,
        riskLevel: preset.riskLevel,
        workScope: preset.standardScopeItems,
      },
    });
  };
}
