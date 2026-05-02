'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Factory,
  Home,
  Landmark,
  Layers,
  Route,
  Shield,
  Tractor,
} from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import { useToast } from '@/lib/hooks/use-toast';
import {
  ConsultantPreview,
  ContextChips,
  ComplexityScore,
  MarketContext,
  RiskFlags,
} from './PowerFeatures';
import type {
  BuildingClass,
  BuildingClassConfig,
  ComplexityOption,
  ProjectType,
  Region,
  ScaleField,
  SubclassOption,
  WorkScopeCategory,
  WorkScopeClassOverride,
  WorkScopeItem,
  WorkScopeOptions,
} from '@/types/profiler';

type ProfileTemplateData = typeof profileTemplates & {
  workScopeOptions?: WorkScopeOptions;
};

const templates = profileTemplates as ProfileTemplateData;

const BUILDING_CLASS_ORDER: BuildingClass[] = [
  'residential',
  'commercial',
  'industrial',
  'institution',
  'mixed',
  'infrastructure',
  'agricultural',
  'defense_secure',
];

const BUILDING_CLASS_ICONS: Record<string, React.ReactNode> = {
  residential: <Home className="h-3.5 w-3.5" />,
  commercial: <Building2 className="h-3.5 w-3.5" />,
  industrial: <Factory className="h-3.5 w-3.5" />,
  institution: <Landmark className="h-3.5 w-3.5" />,
  mixed: <Layers className="h-3.5 w-3.5" />,
  infrastructure: <Route className="h-3.5 w-3.5" />,
  agricultural: <Tractor className="h-3.5 w-3.5" />,
  defense_secure: <Shield className="h-3.5 w-3.5" />,
};

interface ProfilerMiddlePanelProps {
  projectId: string;
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  onClassChange?: (cls: BuildingClass) => void;
  onTypeChange?: (type: ProjectType) => void;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  initialData?: {
    subclass?: string[];
    subclassOther?: string[];
    scaleData?: Record<string, number>;
    complexity?: Record<string, string | string[]>;
    workScope?: string[];
  };
  onProfileComplete?: () => void;
  onProfileLoad?: (buildingClass: BuildingClass, projectType: ProjectType) => void;
}

interface ScopeCategoryWithItems {
  key: string;
  label: string;
  items: WorkScopeItem[];
}

function formatKey(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function fieldRange(field: ScaleField): { min: number; max: number; step: number; unit?: string } {
  const min = typeof field.min === 'number' ? field.min : 0;
  let max = typeof field.max === 'number' ? field.max : 1000;
  let step = 1;

  if (typeof field.max !== 'number') {
    if (field.key === 'storeys') max = 60;
    else if (field.key.endsWith('_sqm') || field.key === 'gfa_sqm') max = 50000;
    else if (['units', 'beds', 'dwellings', 'sites', 'ilus'].includes(field.key)) max = 1000;
    else if (field.key === 'bedrooms') max = 8;
    else if (field.key === 'garage_spaces') max = 6;
    else if (field.key.endsWith('_percent')) max = 100;
    else if (field.key === 'site_area_ha') max = 100;
  }

  if (field.type === 'decimal') {
    if (field.key.endsWith('_sqm') || field.key === 'gfa_sqm') step = 50;
    else if (field.key.endsWith('_percent')) step = 5;
  } else if (field.key.endsWith('_sqm') || field.key === 'gfa_sqm') {
    step = 50;
  }

  const unit = field.key.endsWith('_sqm') || field.key === 'gfa_sqm'
    ? 'm2'
    : field.key.endsWith('_percent')
      ? '%'
      : undefined;

  return { min, max, step, unit };
}

function clampToRange(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round(clamped / step) * step;
}

function arraysMatch(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// Complexity dimensions that allow multiple values rather than a single value.
// site_conditions are not severity levels — they're independent characteristics
// (greenfield, sloping, bushfire, etc.) that can co-exist on one site.
const MULTI_SELECT_COMPLEXITY = new Set<string>(['site_conditions']);

export function ProfilerMiddlePanel({
  projectId,
  buildingClass,
  projectType,
  onClassChange,
  onTypeChange,
  initialData,
  onProfileComplete,
  onProfileLoad,
}: ProfilerMiddlePanelProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubclasses, setSelectedSubclasses] = useState<string[]>(initialData?.subclass || []);
  const [subclassOther, setSubclassOther] = useState<string[]>(initialData?.subclassOther || []);
  const [scaleData, setScaleData] = useState<Record<string, number>>(initialData?.scaleData || {});
  const [complexity, setComplexity] = useState<Record<string, string | string[]>>(initialData?.complexity || {});
  const [workScope, setWorkScope] = useState<string[]>(initialData?.workScope || []);
  const [complexityLevel, setComplexityLevel] = useState(2);
  const [complexityOverrides, setComplexityOverrides] = useState<Record<string, string>>({});
  const [scopeLevel, setScopeLevel] = useState(0);
  const [scopeOverrides, setScopeOverrides] = useState<Record<string, string[]>>({});
  const prevBuildingClassRef = useRef<BuildingClass | null>(buildingClass);

  useEffect(() => {
    const prevClass = prevBuildingClassRef.current;
    if (prevClass !== null && buildingClass !== null && prevClass !== buildingClass && !initialData && !isLoading && !isSaving) {
      setSelectedSubclasses([]);
      setSubclassOther([]);
      setScaleData({});
      setComplexity({});
      setComplexityOverrides({});
      setWorkScope([]);
      setScopeOverrides({});
      setScopeLevel(0);
    }
    prevBuildingClassRef.current = buildingClass;
  }, [buildingClass, initialData, isLoading, isSaving]);

  useEffect(() => {
    if (initialData) {
      setSelectedSubclasses(initialData.subclass || []);
      setSubclassOther(initialData.subclassOther || []);
      setScaleData(initialData.scaleData || {});
      setComplexity(initialData.complexity || {});
      setComplexityOverrides({});
      setWorkScope(initialData.workScope || []);
      setScopeOverrides({});
      setScopeLevel((initialData.workScope?.length || 0) > 0 ? 2 : 0);
    }
  }, [initialData]);

  const classConfig = useMemo<BuildingClassConfig | null>(() => {
    if (!buildingClass) return null;
    return (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[buildingClass] ?? null;
  }, [buildingClass]);

  const scaleFields = useMemo<ScaleField[]>(() => {
    if (!classConfig) return [];
    const primarySubclass = selectedSubclasses[0];
    if (primarySubclass && classConfig.scaleFields[primarySubclass]) {
      return classConfig.scaleFields[primarySubclass];
    }
    return classConfig.scaleFields.default;
  }, [classConfig, selectedSubclasses]);

  const complexityOptions = useMemo<Record<string, ComplexityOption[]>>(() => {
    if (!classConfig) return {};
    const primarySubclass = selectedSubclasses[0];
    let options = classConfig.complexityOptions.default;
    if (primarySubclass && classConfig.complexityOptions[primarySubclass]) {
      options = classConfig.complexityOptions[primarySubclass];
    }
    if (Array.isArray(options)) return { default: options };
    return options as Record<string, ComplexityOption[]>;
  }, [classConfig, selectedSubclasses]);

  const scopeCategories = useMemo<ScopeCategoryWithItems[]>(() => {
    if (!buildingClass || !projectType) return [];
    const workScopeOptions = templates.workScopeOptions;
    if (!workScopeOptions) return [];

    const applicableTypes = (workScopeOptions.applicableProjectTypes as string[]) ?? [];
    if (!applicableTypes.includes(projectType)) return [];

    const typeConfig = workScopeOptions[projectType] as Record<string, WorkScopeCategory> | undefined;
    if (!typeConfig) return [];

    const categories = Object.entries(typeConfig).map(([key, category]) => ({
      key,
      label: category.label,
      items: [...category.items],
    }));

    const classOverrides = (workScopeOptions.classOverrides as Record<string, { additionalItems?: WorkScopeClassOverride[] }> | undefined)?.[buildingClass];
    classOverrides?.additionalItems?.forEach((override) => {
      const [overrideType, categoryKey] = override.category.split('.');
      if (overrideType !== projectType) return;
      const category = categories.find((item) => item.key === categoryKey);
      if (!category) return;
      category.items.push({
        value: override.value,
        label: override.label,
        consultants: override.consultants,
      });
    });

    return categories;
  }, [buildingClass, projectType]);

  const handleSubclassToggle = (subclass: string) => {
    const maxSubclasses = buildingClass === 'mixed' ? 4 : 1;

    setSelectedSubclasses((prev) => {
      if (prev.includes(subclass)) return prev.filter((item) => item !== subclass);
      if (prev.length >= maxSubclasses) return maxSubclasses === 1 ? [subclass] : [...prev.slice(1), subclass];
      return [...prev, subclass];
    });

    setScaleData({});
    setComplexity({});
    setComplexityOverrides({});
  };

  const updateScaleField = (key: string, rawValue: string) => {
    if (rawValue === '') {
      setScaleData((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    const numeric = Number(rawValue);
    if (Number.isNaN(numeric)) return;
    setScaleData((prev) => ({ ...prev, [key]: numeric }));
  };

  const stepScaleField = (field: ScaleField, delta: number) => {
    const range = fieldRange(field);
    setScaleData((prev) => {
      const current = typeof prev[field.key] === 'number' ? prev[field.key] : range.min;
      return {
        ...prev,
        [field.key]: clampToRange(current + delta, range.min, range.max, range.step),
      };
    });
  };

  const normalizeScaleField = (field: ScaleField) => {
    const range = fieldRange(field);
    setScaleData((prev) => {
      const value = prev[field.key];
      if (typeof value !== 'number') return prev;
      return {
        ...prev,
        [field.key]: clampToRange(value, range.min, range.max, range.step),
      };
    });
  };

  const selectType = (type: ProjectType) => {
    onTypeChange?.(type);
    setWorkScope([]);
    setScopeOverrides({});
    setScopeLevel(0);
  };

  const buildComplexityFromLevel = useCallback((level: number, overrides: Record<string, string>) => {
    if (level <= 0) return {};

    return Object.entries(complexityOptions).reduce<Record<string, string>>((next, [dimension, options]) => {
      if (options.length === 0) return next;
      // Multi-select dimensions are user-driven — slider does not auto-fill them.
      if (MULTI_SELECT_COMPLEXITY.has(dimension)) return next;
      const defaultIndex = Math.min(level - 1, options.length - 1);
      const override = overrides[dimension];
      next[dimension] = override && options.some((option) => option.value === override)
        ? override
        : options[defaultIndex].value;
      return next;
    }, {});
  }, [complexityOptions]);

  const applyComplexityLevel = useCallback((level: number) => {
    setComplexityLevel(level);
    if (level <= 0) {
      setComplexityOverrides({});
    }
    setComplexity((prev) => {
      // Preserve user-driven multi-select selections across slider changes.
      const preserved: Record<string, string | string[]> = {};
      MULTI_SELECT_COMPLEXITY.forEach((dim) => {
        if (prev[dim] !== undefined) preserved[dim] = prev[dim];
      });
      if (level <= 0) return preserved;
      return { ...buildComplexityFromLevel(level, complexityOverrides), ...preserved };
    });
  }, [buildComplexityFromLevel, complexityOverrides]);

  const selectComplexityOption = (dimension: string, option: ComplexityOption) => {
    if (MULTI_SELECT_COMPLEXITY.has(dimension)) {
      setComplexity((prev) => {
        const current = prev[dimension];
        const currentArray = Array.isArray(current)
          ? current
          : current
            ? [current as string]
            : [];
        const next = currentArray.includes(option.value)
          ? currentArray.filter((v) => v !== option.value)
          : [...currentArray, option.value];
        const nextState = { ...prev };
        if (next.length === 0) delete nextState[dimension];
        else nextState[dimension] = next;
        return nextState;
      });
      return;
    }

    const options = complexityOptions[dimension] ?? [];
    const defaultIndex = complexityLevel > 0
      ? Math.min(complexityLevel - 1, Math.max(options.length - 1, 0))
      : -1;
    const defaultValue = defaultIndex >= 0 ? options[defaultIndex]?.value : undefined;
    const rawValue = complexity[dimension];
    const isSelected = Array.isArray(rawValue)
      ? rawValue.includes(option.value)
      : rawValue === option.value;

    if (isSelected && defaultValue === undefined) {
      setComplexityOverrides((prev) => {
        const next = { ...prev };
        delete next[dimension];
        return next;
      });
      setComplexity((prev) => {
        const next = { ...prev };
        delete next[dimension];
        return next;
      });
      return;
    }

    if (isSelected && option.value !== defaultValue) {
      setComplexityOverrides((prev) => {
        const next = { ...prev };
        delete next[dimension];
        return next;
      });
      setComplexity((prev) => ({ ...prev, [dimension]: defaultValue as string }));
      return;
    }

    setComplexityOverrides((prev) => {
      const next = { ...prev };
      if (option.value === defaultValue) delete next[dimension];
      else next[dimension] = option.value;
      return next;
    });
    setComplexity((prev) => ({ ...prev, [dimension]: option.value }));
  };

  const defaultScopeCount = useCallback((items: WorkScopeItem[], level = scopeLevel) => {
    if (items.length === 0 || level <= 0) return 0;
    if (level >= 3) return items.length;
    return Math.ceil((level / 3) * items.length);
  }, [scopeLevel]);

  const defaultScopeValues = useCallback((items: WorkScopeItem[], level = scopeLevel) => {
    return items.slice(0, defaultScopeCount(items, level)).map((item) => item.value);
  }, [defaultScopeCount, scopeLevel]);

  const buildScopeFromLevel = useCallback((level: number, overrides: Record<string, string[]>) => {
    if (level <= 0) return [];

    return scopeCategories.flatMap((category) => {
      return overrides[category.key] ?? defaultScopeValues(category.items, level);
    });
  }, [defaultScopeValues, scopeCategories]);

  const applyScopeLevel = (level: number) => {
    setScopeLevel(level);
    if (level <= 0) {
      setScopeOverrides({});
      setWorkScope([]);
      return;
    }
    setWorkScope(buildScopeFromLevel(level, scopeOverrides));
  };

  const selectScopeItem = (category: ScopeCategoryWithItems, item: WorkScopeItem) => {
    const defaultValues = defaultScopeValues(category.items);
    const categoryValues = category.items.map((scopeItem) => scopeItem.value);
    const currentValues = category.items
      .map((scopeItem) => scopeItem.value)
      .filter((value) => workScope.includes(value));
    const valueSet = new Set(currentValues);
    if (valueSet.has(item.value)) valueSet.delete(item.value);
    else valueSet.add(item.value);

    const selectedValues = category.items
      .map((scopeItem) => scopeItem.value)
      .filter((value) => valueSet.has(value));
    const nextOverrides = { ...scopeOverrides };
    if (arraysMatch(selectedValues, defaultValues)) delete nextOverrides[category.key];
    else nextOverrides[category.key] = selectedValues;
    setScopeOverrides(nextOverrides);
    setWorkScope([
      ...workScope.filter((value) => !categoryValues.includes(value)),
      ...selectedValues,
    ]);
  };

  const handleSave = async () => {
    if (!buildingClass || !projectType) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please select building class and project type',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        buildingClass,
        projectType,
        subclass: selectedSubclasses,
        subclassOther: subclassOther.length > 0 ? subclassOther : null,
        scaleData,
        complexity,
        workScope: workScope.length > 0 ? workScope : null,
      };

      const response = await fetch(`/api/projects/${projectId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save profile');
      }

      toast({
        title: 'Profile Saved',
        description: 'Project profile has been updated',
        variant: 'success',
      });
      onProfileComplete?.();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/profile`);
      if (!response.ok) throw new Error('Failed to load profile');
      const result = await response.json();
      const data = result.data;
      if (!data) throw new Error('No saved profile found');

      const loadedSubclasses = data.subclass ?? [];
      const loadedSubclassOther = data.subclassOther ?? [];
      const loadedScaleData = data.scaleData ?? {};
      const loadedComplexity = data.complexity ?? {};
      const loadedWorkScope = data.workScope ?? [];

      setSelectedSubclasses(loadedSubclasses);
      setSubclassOther(loadedSubclassOther);
      setScaleData(loadedScaleData);
      setComplexity(loadedComplexity);
      setComplexityOverrides({});
      setWorkScope(loadedWorkScope);
      setScopeOverrides({});
      setScopeLevel(loadedWorkScope.length > 0 ? 2 : 0);

      if (data.buildingClass && data.projectType) {
        onProfileLoad?.(data.buildingClass as BuildingClass, data.projectType as ProjectType);
      }

      toast({
        title: 'Profile Loaded',
        description: 'Previously saved profile has been restored',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Load Failed',
        description: error instanceof Error ? error.message : 'No saved profile found',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canSave = Boolean(buildingClass && projectType);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-end gap-2 border-b border-[var(--color-border)] px-5 py-2.5">
        <button
          type="button"
          onClick={handleLoad}
          disabled={isLoading}
          className="rounded px-3 py-1.5 text-xs font-medium bg-[#1776c1] text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Load Profile'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !canSave}
          className={`rounded px-2.5 py-1.5 text-xs font-medium ${canSave && !isSaving
            ? 'text-[var(--primary-foreground)] bg-[var(--color-accent-green)] hover:bg-[var(--primitive-green-dark)]'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
            }`}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 p-2 shadow-sm">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Class Tree
          </span>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1">
            {BUILDING_CLASS_ORDER.map((key) => {
              const config = (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[key];
              const selected = buildingClass === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onClassChange?.(key)}
                  title={config?.label ?? formatKey(key)}
                  className={`flex min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 py-1.5 text-[10px] font-semibold transition-all ${selected
                    ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-copper)]/50'
                    }`}
                >
                  {BUILDING_CLASS_ICONS[key]}
                  <span className="truncate">{config?.label ?? formatKey(key)}</span>
                </button>
              );
            })}
          </div>

          {classConfig && (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-[var(--color-border)] pt-2">
              {classConfig.subclasses.map((sub: SubclassOption) => {
                const selected = selectedSubclasses.includes(sub.value);
                return (
                  <button
                    key={sub.value}
                    type="button"
                    onClick={() => handleSubclassToggle(sub.value)}
                    className={`max-w-[150px] truncate rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${selected
                      ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-copper)]/50'
                      }`}
                    title={sub.label}
                  >
                    {sub.label}
                  </button>
                );
              })}
              {buildingClass === 'mixed' && (
                <span className="self-center text-[10px] text-[var(--color-text-muted)]">
                  up to 4
                </span>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(420px,1fr)_minmax(300px,0.72fr)] gap-3">
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 p-2 shadow-sm">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Type
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {profileTemplates.projectTypes.map((type) => {
                const selected = projectType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => selectType(type.value as ProjectType)}
                    className={`min-h-10 rounded-md border px-1.5 py-1.5 text-center text-[11px] font-semibold transition-all ${selected
                      ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-copper)]/50'
                      }`}
                  >
                    <span className="block h-1 rounded-full bg-current opacity-40 mb-1" />
                    <span className="block truncate">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 p-2 shadow-sm">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Scale
            </span>
            {scaleFields.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">Select a class to configure scale.</p>
            ) : (
              <div className="grid grid-cols-2 2xl:grid-cols-3 gap-1.5">
                {scaleFields.map((field) => {
                  const range = fieldRange(field);
                  const value = scaleData[field.key] ?? '';
                  return (
                    <div key={field.key} className="min-w-0">
                      <label className="mb-0.5 block truncate text-[10px] font-semibold text-[var(--color-text-muted)]" title={field.label}>
                        {field.label}
                      </label>
                      <div className="grid grid-cols-[20px_minmax(0,1fr)_20px] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                        <button
                          type="button"
                          onClick={() => stepScaleField(field, -range.step)}
                          className="h-6 text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-accent-copper-tint)] hover:text-[var(--color-accent-copper)]"
                          aria-label={`Decrease ${field.label}`}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={value}
                          min={range.min}
                          max={range.max}
                          step={range.step}
                          placeholder={field.placeholder}
                          onChange={(event) => updateScaleField(field.key, event.target.value)}
                          onBlur={() => normalizeScaleField(field)}
                          className="h-6 min-w-0 border-x border-[var(--color-border)] bg-[var(--color-bg-primary)] px-1 text-center text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent-copper)]"
                        />
                        <button
                          type="button"
                          onClick={() => stepScaleField(field, range.step)}
                          className="h-6 text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-accent-copper-tint)] hover:text-[var(--color-accent-copper)]"
                          aria-label={`Increase ${field.label}`}
                        >
                          +
                        </button>
                      </div>
                      {range.unit && (
                        <span className="mt-0.5 block text-[9px] font-medium text-[var(--color-text-muted)]">
                          {range.unit}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="min-w-0">
            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 p-2 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <strong className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Complexity
                </strong>
              </div>

              {selectedSubclasses.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">Select a subclass to configure complexity.</p>
              ) : (
                <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-2">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    value={complexityLevel}
                    onChange={(event) => applyComplexityLevel(Number(event.target.value))}
                    className="[writing-mode:vertical-lr] [direction:rtl] h-[248px] w-7 accent-[var(--color-accent-yellow)]"
                    aria-label="Complexity level"
                  />
                  <div className="space-y-1">
                    {Object.entries(complexityOptions).map(([dimension, options]) => {
                      const isMultiSelect = MULTI_SELECT_COMPLEXITY.has(dimension);
                      const baselineIndex = !isMultiSelect && complexityLevel > 0
                        ? Math.min(complexityLevel - 1, Math.max(options.length - 1, 0))
                        : -1;
                      const rawValue = complexity[dimension];
                      const selectedIndex = options.findIndex((option) =>
                        Array.isArray(rawValue) ? rawValue.includes(option.value) : rawValue === option.value
                      );
                      const activeIndex = selectedIndex >= 0 ? selectedIndex : baselineIndex;

                      return (
                        <div
                          key={dimension}
                          className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-1.5 py-1"
                        >
                          <div className="flex min-w-0 items-center gap-1">
                            <span className="truncate text-[9px] font-semibold text-[var(--color-text-muted)]" title={formatKey(dimension)}>
                              {formatKey(dimension)}
                            </span>
                          </div>
                          <div
                            className="grid gap-0.5 rounded-md bg-[var(--color-bg-primary)] p-0.5"
                            style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))` }}
                          >
                            {options.map((option, index) => {
                              const selected = isMultiSelect
                                ? Array.isArray(rawValue)
                                  ? rawValue.includes(option.value)
                                  : rawValue === option.value
                                : index === activeIndex;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => selectComplexityOption(dimension, option)}
                                  className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold transition-all ${selected
                                    ? 'bg-[var(--color-card-firm-selected)] text-[var(--color-text-primary)]'
                                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                                    }`}
                                  title={option.label}
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
                </div>
              )}
            </section>
          </div>

          <section className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 p-2 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  Scope / Work
                </strong>
              </div>
            </div>

            {scopeCategories.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">Select a supported type and class to configure scope.</p>
            ) : (
              <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-2">
                <input
                  type="range"
                  min={0}
                  max={3}
                  value={scopeLevel}
                  onChange={(event) => applyScopeLevel(Number(event.target.value))}
                  className="[writing-mode:vertical-lr] [direction:rtl] h-[248px] w-7 accent-[var(--color-accent-green)]"
                  aria-label="Scope level"
                />
                <div className="space-y-1">
                  {scopeCategories.map((category) => {
                    return (
                      <div
                        key={category.key}
                        className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-1.5 py-1"
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          <span className="truncate text-[9px] font-semibold text-[var(--color-text-muted)]" title={category.label}>
                            {category.label}
                          </span>
                        </div>
                        <div
                          className="grid gap-0.5 rounded-md bg-[var(--color-bg-primary)] p-0.5"
                          style={{ gridTemplateColumns: `repeat(${Math.max(category.items.length, 1)}, minmax(0, 1fr))` }}
                        >
                          {category.items.map((item) => {
                            const selected = workScope.includes(item.value);
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => selectScopeItem(category, item)}
                                className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold transition-all ${selected
                                  ? 'bg-[var(--color-card-scope-selected)] text-[var(--color-text-primary)]'
                                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                                  }`}
                                title={item.label}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <aside className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 min-w-0">
            {selectedSubclasses.length > 0 && (
              <ContextChips
                buildingClass={buildingClass}
                projectType={projectType}
                subclass={selectedSubclasses}
                scaleData={scaleData}
                complexity={complexity}
              />
            )}

            {Object.keys(complexity).length > 0 && (
              <>
                <ComplexityScore
                  buildingClass={buildingClass}
                  projectType={projectType}
                  subclass={selectedSubclasses}
                  scaleData={scaleData}
                  complexity={complexity}
                  workScope={workScope}
                />
                <MarketContext
                  buildingClass={buildingClass}
                  projectType={projectType}
                  subclass={selectedSubclasses}
                  scaleData={scaleData}
                  complexity={complexity}
                />
                <RiskFlags
                  buildingClass={buildingClass}
                  projectType={projectType}
                  subclass={selectedSubclasses}
                  scaleData={scaleData}
                  complexity={complexity}
                  workScope={workScope}
                />
                <ConsultantPreview
                  buildingClass={buildingClass}
                  projectType={projectType}
                  subclass={selectedSubclasses}
                  scaleData={scaleData}
                  complexity={complexity}
                  workScope={workScope}
                />
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
