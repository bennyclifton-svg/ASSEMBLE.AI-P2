'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import profileTemplates from '@/lib/data/profile-templates.json';
import { useToast } from '@/lib/hooks/use-toast';
import { BuildingTabView, type BuildingTabTemplates } from '@/components/brief/BuildingTabView';
import {
  ConsultantPreview as _ConsultantPreview,
  ContextChips as _ContextChips,
  ComplexityScore as _ComplexityScore,
  MarketContext as _MarketContext,
  RiskFlags as _RiskFlags,
} from './PowerFeatures';
import type {
  BuildingClass,
  BuildingClassConfig,
  ComplexityOption,
  ProjectType,
  Region,
  ScaleField,
  WorkScopeCategory,
  WorkScopeClassOverride,
  WorkScopeItem,
  WorkScopeOptions,
} from '@/types/profiler';

// Suppress unused warnings — these power-feature components remain importable
// for downstream consumers but are no longer rendered inline (their data is
// now surfaced via the inline cards in BuildingTabView).
void _ConsultantPreview;
void _ContextChips;
void _ComplexityScore;
void _MarketContext;
void _RiskFlags;

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

function arraysMatch(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// Complexity dimensions that allow multiple values rather than a single value.
// site_conditions are not severity levels — they're independent characteristics
// (greenfield, sloping, bushfire, etc.) that can co-exist on one site.
const MULTI_SELECT_COMPLEXITY = new Set<string>(['site_conditions']);

// ---- Per-dimension chip accent colours (matches the wireframe). ----
const DIMENSION_ACCENT: Record<string, string> = {
  quality_tier: 'var(--sw-peach)',
  site_conditions: 'var(--sw-amber)',
  heritage: 'var(--sw-amber)',
  approval_pathway: 'var(--sw-cyan)',
  contamination_level: 'var(--sw-amber)',
  access_constraints: 'var(--sw-cyan)',
  operational_constraints: 'var(--sw-cyan)',
  procurement_route: 'var(--sw-lav)',
  stakeholder_complexity: 'var(--sw-lav)',
  environmental_sensitivity: 'var(--sw-amber)',
};
function dimensionAccent(key: string): string {
  return DIMENSION_ACCENT[key] ?? 'var(--sw-ink)';
}

// ---- Project type labels ----
const PROJECT_TYPE_OPTIONS: Array<{ value: ProjectType; label: string }> =
  (profileTemplates.projectTypes as Array<{ value: string; label: string }>).map(
    (t) => ({ value: t.value as ProjectType, label: t.label }),
  );

// ---- Building class labels in canonical order ----
const BUILDING_CLASS_OPTIONS: Array<{ value: BuildingClass; label: string }> =
  BUILDING_CLASS_ORDER.map((key) => ({
    value: key,
    label:
      (profileTemplates.buildingClasses as Record<string, BuildingClassConfig>)[key]
        ?.label ?? formatKey(key),
  }));

// ---- Derivation helpers (NCC, cost band, complexity band, contingency) ----

function deriveComplexityBand(score: number | null | undefined): string | null {
  if (score == null) return null;
  if (score < 3) return 'low';
  if (score < 6) return 'standard';
  if (score < 8) return 'high';
  if (score < 10) return 'very high';
  return 'extreme';
}

function deriveContingencyBand(
  band: string | null | undefined,
): string | null {
  switch (band) {
    case 'low':
      return '5-10%';
    case 'standard':
      return '10-15%';
    case 'high':
      return '15-25%';
    case 'very high':
      return '20-35%';
    case 'extreme':
      return '25-40%';
    default:
      return null;
  }
}

/**
 * Best-effort NCC class derivation from building class + subclasses + storeys.
 * Initial mapping; not exhaustive. Returns null if no confident mapping.
 */
function deriveNCCClass(
  buildingClass: BuildingClass | null,
  subclasses: string[],
  storeys?: number,
): { classCode: string; typeAndVolume?: string } | null {
  if (!buildingClass) return null;

  // Type A/B/C is determined primarily by rise in storeys / effective height.
  // Simplified: storeys >= 4 (or unknown) → Type A · Vol 1
  //             storeys 2-3 → Type B · Vol 1
  //             storeys 1   → Type C · Vol 1
  const tav = ((): string => {
    if (storeys == null || storeys >= 4) return 'Type A . Vol 1';
    if (storeys >= 2) return 'Type B . Vol 1';
    return 'Type C . Vol 1';
  })();

  if (buildingClass === 'residential') {
    if (subclasses.includes('house') || subclasses.includes('townhouses')) {
      return { classCode: 'Class 1a', typeAndVolume: 'Vol 2' };
    }
    if (subclasses.includes('aged_care_9c')) {
      return { classCode: 'Class 9c', typeAndVolume: tav };
    }
    if (
      subclasses.includes('apartments') ||
      subclasses.includes('btr') ||
      subclasses.includes('student_housing') ||
      subclasses.includes('social_affordable') ||
      subclasses.includes('coliving') ||
      subclasses.includes('heritage_conversion')
    ) {
      return { classCode: 'Class 2', typeAndVolume: tav };
    }
    return { classCode: 'Class 2', typeAndVolume: tav };
  }

  if (buildingClass === 'commercial') {
    if (subclasses.includes('hotel')) {
      return { classCode: 'Class 3', typeAndVolume: tav };
    }
    if (subclasses.includes('retail_shopping')) {
      return { classCode: 'Class 6', typeAndVolume: tav };
    }
    return { classCode: 'Class 5', typeAndVolume: tav };
  }

  if (buildingClass === 'industrial') {
    return { classCode: 'Class 7/8', typeAndVolume: tav };
  }

  if (buildingClass === 'institution') {
    if (subclasses.includes('healthcare_hospital')) {
      return { classCode: 'Class 9a', typeAndVolume: tav };
    }
    if (
      subclasses.includes('education_school') ||
      subclasses.includes('education_tertiary')
    ) {
      return { classCode: 'Class 9b', typeAndVolume: tav };
    }
    return { classCode: 'Class 9b', typeAndVolume: tav };
  }

  if (buildingClass === 'mixed') {
    return { classCode: 'Mixed (Class 2 + 5/6)', typeAndVolume: tav };
  }

  return { classCode: '-' };
}

/**
 * TODO(real-cost-derivation): hardcoded cost bands per project type for v1.
 * Future: read from CostBenchmark + scaleData.gfa_sqm × per-sqm rates.
 */
function deriveEstCostBand(
  projectType: ProjectType | null,
  scaleData: Record<string, number>,
): { lowAUD: number; highAUD: number } | null {
  if (!projectType) return null;
  const gfa = Number(scaleData.gfa_sqm) || 0;
  if (gfa > 0) {
    // Coarse rate ranges per project type (AUD/m2)
    const ratesByType: Record<ProjectType, [number, number]> = {
      new: [3000, 6500],
      extend: [3500, 7000],
      refurb: [1800, 4500],
      remediation: [800, 2500],
      advisory: [0, 0],
    };
    const [lowRate, highRate] = ratesByType[projectType] ?? [0, 0];
    if (lowRate === 0 && highRate === 0) return null;
    return { lowAUD: gfa * lowRate, highAUD: gfa * highRate };
  }

  // Fallback band per project type when GFA unknown
  switch (projectType) {
    case 'new':
      return { lowAUD: 12_000_000, highAUD: 35_000_000 };
    case 'extend':
      return { lowAUD: 6_000_000, highAUD: 18_000_000 };
    case 'refurb':
      return { lowAUD: 3_000_000, highAUD: 12_000_000 };
    case 'remediation':
      return { lowAUD: 1_000_000, highAUD: 6_000_000 };
    case 'advisory':
      return null;
    default:
      return null;
  }
}

// ---- RiskFlags translation: replicates the existing RiskFlags logic, but
// returns the wireframe shape `{ label, description, tag }`. ----

interface InlineRiskFlag {
  label: string;
  description: string;
  tag: string;
}

function findWorkScopeItem(
  scopeValue: string,
  projectType: ProjectType | null,
): WorkScopeItem | null {
  if (!projectType) return null;
  const workScopeOptions = templates.workScopeOptions;
  const typeConfig =
    (workScopeOptions as unknown as Record<string, Record<string, WorkScopeCategory>>)?.[
      projectType
    ];
  if (!typeConfig) return null;
  for (const category of Object.values(typeConfig) as WorkScopeCategory[]) {
    const item = category.items.find((i) => i.value === scopeValue);
    if (item) return item;
  }
  return null;
}

function deriveRiskFlags(args: {
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  subclass: string[];
  scaleData: Record<string, number>;
  complexity: Record<string, string | string[]>;
  workScope: string[];
}): InlineRiskFlag[] {
  const { buildingClass, projectType, subclass, scaleData, complexity, workScope } = args;
  const result: InlineRiskFlag[] = [];
  if (!buildingClass || subclass.length === 0) return result;

  const workScopeOptions = templates.workScopeOptions;
  const riskDefinitions =
    (workScopeOptions as unknown as { riskDefinitions?: Record<string, { severity: string; title: string; description: string }> })
      ?.riskDefinitions ?? {};
  const seen = new Set<string>();

  const siteConditionsValue = complexity.site_conditions;
  const siteConditions: string[] = Array.isArray(siteConditionsValue)
    ? siteConditionsValue
    : siteConditionsValue
      ? [siteConditionsValue as string]
      : [];

  workScope.forEach((scopeValue) => {
    const item = findWorkScopeItem(scopeValue, projectType);
    if (item?.riskFlag && !seen.has(item.riskFlag)) {
      const def = riskDefinitions[item.riskFlag];
      if (def) {
        seen.add(item.riskFlag);
        result.push({
          label: def.title,
          description: def.description,
          tag: def.severity.toUpperCase(),
        });
      }
    }
  });

  if (siteConditions.includes('bushfire') && subclass.includes('aged_care_9c')) {
    result.push({
      label: 'BAL-FZ + Class 9c Conflict',
      description:
        'Bushfire Flame Zone (BAL-FZ) creates evacuation challenges for non-ambulatory residents. Consider alternate site or enhanced fire engineering.',
      tag: 'CRITICAL',
    });
  }
  if (siteConditions.includes('bushfire')) {
    result.push({
      label: 'Bushfire Attack Level',
      description:
        'BAL ratings require compliant construction methods, materials certification, and may limit design options.',
      tag: 'WARNING',
    });
  }
  if (siteConditions.includes('flood')) {
    result.push({
      label: 'Flood Overlay Zone',
      description:
        'Flood planning controls may require elevated floor levels, flood-resistant materials, and stormwater management.',
      tag: 'WARNING',
    });
  }
  if (siteConditions.includes('coastal')) {
    result.push({
      label: 'Coastal Site',
      description:
        'Coastal areas require consideration of sea level rise, storm surge, and corrosive marine environment on materials.',
      tag: 'WARNING',
    });
  }
  if (siteConditions.includes('sloping')) {
    result.push({
      label: 'Sloping Site (>15%)',
      description:
        'Steep gradients may require retaining walls, specialized foundations, and additional excavation/fill.',
      tag: 'INFO',
    });
  }
  if (complexity.heritage === 'listed') {
    result.push({
      label: 'Heritage Listed Building',
      description:
        'Heritage listing adds 15-40% to costs. Requires heritage consultant, conservation management plan, and extended approvals.',
      tag: 'WARNING',
    });
  }
  if (complexity.approval_pathway === 'state_significant') {
    result.push({
      label: 'State Significant Development',
      description:
        'SSD pathway typically adds 40+ weeks to approval timeline. Early engagement with planning authority recommended.',
      tag: 'WARNING',
    });
  }
  const storeys = (scaleData.storeys || scaleData.total_storeys || 0) as number;
  if (storeys > 25) {
    result.push({
      label: 'High-Rise Construction',
      description:
        'Buildings over 25 storeys require fire engineering, specialized construction methods, and longer programmes.',
      tag: 'INFO',
    });
  }
  return result;
}

// ---- Disciplines translation: replicates ConsultantPreview logic, returns
// `{ required, suggested }` arrays of discipline names. ----

const BASE_DISCIPLINES = [
  'Architect',
  'Structural',
  'Civil',
  'Mechanical',
  'Electrical',
  'Hydraulic',
];

const CLASS_DISCIPLINES: Record<string, string[]> = {
  residential: ['Landscape', 'Acoustic'],
  commercial: ['Facade', 'Acoustic', 'ESD'],
  industrial: ['Fire Engineer', 'ESD'],
  institution: ['Acoustic', 'Security'],
  mixed: ['Facade', 'Traffic', 'Acoustic'],
  infrastructure: ['Geotech', 'Environmental', 'Traffic'],
  defense_secure: ['Security', 'SCIF Specialist', 'Fire Engineer'],
  agricultural: ['Agricultural', 'Environmental', 'Civil'],
};

interface DisciplineHit {
  name: string;
  required: boolean;
}

const SUBCLASS_DISCIPLINES: Record<string, DisciplineHit[]> = {
  aged_care_9c: [
    { name: 'Fire Engineer', required: true },
    { name: 'Access', required: true },
    { name: 'Kitchen Consultant', required: false },
  ],
  healthcare_hospital: [
    { name: 'Medical Planner', required: true },
    { name: 'Fire Engineer', required: true },
    { name: 'Acoustic', required: true },
    { name: 'Infection Control Consultant', required: false },
  ],
  data_centre: [
    { name: 'Data Centre Specialist', required: true },
    { name: 'Fire Engineer', required: true },
    { name: 'Security', required: true },
  ],
  hotel: [
    { name: 'Interior', required: true },
    { name: 'Kitchen Consultant', required: true },
    { name: 'Acoustic', required: true },
    { name: 'Lighting', required: false },
  ],
};

const COMPLEXITY_DISCIPLINES: Record<string, DisciplineHit> = {
  heritage: { name: 'Heritage', required: true },
  listed: { name: 'Heritage Architect', required: true },
  bushfire: { name: 'Bushfire', required: true },
  flood: { name: 'Flood', required: true },
  state_significant: { name: 'Planning', required: true },
  complex_da: { name: 'Town Planning', required: true },
  triple_cert: { name: 'ESD', required: true },
  net_zero: { name: 'Net Zero Consultant', required: true },
  tier_3: { name: 'Commissioning Agent', required: true },
  tier_4: { name: 'Commissioning Agent', required: true },
};

function deriveDisciplines(args: {
  buildingClass: BuildingClass | null;
  subclass: string[];
  complexity: Record<string, string | string[]>;
  workScope: string[];
  projectType: ProjectType | null;
}): { required: string[]; suggested: string[] } {
  const { buildingClass, subclass, complexity, workScope, projectType } = args;
  if (!buildingClass || subclass.length === 0) {
    return { required: [], suggested: [] };
  }
  const map = new Map<string, DisciplineHit>();
  BASE_DISCIPLINES.forEach((name) =>
    map.set(name, { name, required: true }),
  );
  (CLASS_DISCIPLINES[buildingClass] ?? []).forEach((name) => {
    if (!map.has(name)) map.set(name, { name, required: false });
  });
  subclass.forEach((sub) => {
    (SUBCLASS_DISCIPLINES[sub] ?? []).forEach((d) => {
      if (!map.has(d.name) || d.required) map.set(d.name, d);
    });
  });
  Object.values(complexity).forEach((value) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((v) => {
      const hit = COMPLEXITY_DISCIPLINES[v as string];
      if (hit && !map.has(hit.name)) map.set(hit.name, hit);
    });
  });
  workScope.forEach((scopeValue) => {
    const item = findWorkScopeItem(scopeValue, projectType);
    item?.consultants?.forEach((c) => {
      if (!map.has(c)) map.set(c, { name: c, required: true });
    });
  });

  const required: string[] = [];
  const suggested: string[] = [];
  Array.from(map.values())
    .sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .forEach((d) => (d.required ? required.push(d.name) : suggested.push(d.name)));
  return { required, suggested };
}

// ============================================================================
// COMPONENT
// ============================================================================

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
  // Slider levels: kept in their original 0-N domain to preserve existing
  // bucketing logic (`buildComplexityFromLevel`, `buildScopeFromLevel`).
  const [complexityLevel, setComplexityLevel] = useState(2);
  const [complexityOverrides, setComplexityOverrides] = useState<Record<string, string>>({});
  const [scopeLevel, setScopeLevel] = useState(0);
  const [scopeOverrides, setScopeOverrides] = useState<Record<string, string[]>>({});
  // Composite complexity score from API (set on Save / Load).
  const [complexityScore, setComplexityScore] = useState<number | null>(null);
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

  // ---- Handlers (state-mutating logic preserved verbatim) ----

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

  /**
   * Handles a click on any scope chip — finds the owning category, then applies
   * the original `selectScopeItem` semantics (overrides + workScope mutation).
   * Adapter shape so BuildingTabView only needs the value, not the category.
   */
  const handleScopeToggle = (scopeValue: string) => {
    const category = scopeCategories.find((cat) =>
      cat.items.some((item) => item.value === scopeValue),
    );
    if (!category) return;
    const item = category.items.find((i) => i.value === scopeValue);
    if (!item) return;

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

  /**
   * Adapter for BuildingTabView's complexity chip click — resolves the option
   * object from the (dimension, value) pair and delegates to the existing
   * single/multi-select handler.
   */
  const handleComplexityChange = (dimension: string, value: string) => {
    const options = complexityOptions[dimension] ?? [];
    const option = options.find((o) => o.value === value);
    if (!option) return;
    selectComplexityOption(dimension, option);
  };

  // BuildingTabView's slider uses 0-100. Existing complexityLevel is 0-4
  // (5 buckets) and scopeLevel is 0-3 (4 buckets). Scale on the way in/out.
  const COMPLEXITY_BUCKETS = 4; // levels 0..4
  const SCOPE_BUCKETS = 3; // levels 0..3

  const complexitySliderValue = Math.round((complexityLevel / COMPLEXITY_BUCKETS) * 100);
  const scopeSliderValue = Math.round((scopeLevel / SCOPE_BUCKETS) * 100);

  const handleComplexitySliderChange = (sliderValue: number) => {
    const level = Math.round((sliderValue / 100) * COMPLEXITY_BUCKETS);
    applyComplexityLevel(level);
  };
  const handleScopeSliderChange = (sliderValue: number) => {
    const level = Math.round((sliderValue / 100) * SCOPE_BUCKETS);
    applyScopeLevel(level);
  };

  // ---- Persistence (verbatim) ----

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

      const result = await response.json().catch(() => null);
      if (result?.data?.complexityScore != null) {
        setComplexityScore(Number(result.data.complexityScore));
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
      if (data.complexityScore != null) {
        setComplexityScore(Number(data.complexityScore));
      }

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

  // ---- Derive BuildingTabTemplates (the BuildingTabView contract) ----

  const derivedTemplates = useMemo<BuildingTabTemplates>(() => {
    const subclassOptions = classConfig?.subclasses
      ? classConfig.subclasses.map((s) => ({ value: s.value, label: s.label }))
      : [];

    const complexityDimensions = Object.entries(complexityOptions).map(
      ([key, options]) => ({
        key,
        label: formatKey(key),
        options,
        accent: dimensionAccent(key),
      }),
    );

    const scopeGroups = scopeCategories.map((cat) => ({
      categoryLabel: cat.label,
      items: cat.items,
    }));

    const scaleFieldsView = scaleFields.map((f) => {
      const unit = f.key.endsWith('_sqm') || f.key === 'gfa_sqm'
        ? 'm2'
        : f.key.endsWith('_percent')
          ? '%'
          : undefined;
      return {
        key: f.key,
        label: f.label,
        unit,
        note: f.placeholder ? `placeholder ${f.placeholder}` : undefined,
      };
    });

    return {
      buildingClasses: BUILDING_CLASS_OPTIONS,
      projectTypes: PROJECT_TYPE_OPTIONS,
      subclassOptions,
      complexityDimensions,
      scopeGroups,
      scaleFields: scaleFieldsView,
    };
  }, [classConfig, complexityOptions, scopeCategories, scaleFields]);

  // ---- Derive optional extras ----

  const complexityBand = useMemo(
    () => deriveComplexityBand(complexityScore),
    [complexityScore],
  );
  const contingencyBand = useMemo(
    () => deriveContingencyBand(complexityBand),
    [complexityBand],
  );
  const nccClass = useMemo(
    () => deriveNCCClass(buildingClass, selectedSubclasses, scaleData.storeys as number | undefined),
    [buildingClass, selectedSubclasses, scaleData],
  );
  const estCostBand = useMemo(
    () => deriveEstCostBand(projectType, scaleData),
    [projectType, scaleData],
  );
  const riskFlags = useMemo(
    () =>
      deriveRiskFlags({
        buildingClass,
        projectType,
        subclass: selectedSubclasses,
        scaleData,
        complexity,
        workScope,
      }),
    [buildingClass, projectType, selectedSubclasses, scaleData, complexity, workScope],
  );
  const disciplines = useMemo(
    () =>
      deriveDisciplines({
        buildingClass,
        subclass: selectedSubclasses,
        complexity,
        workScope,
        projectType,
      }),
    [buildingClass, selectedSubclasses, complexity, workScope, projectType],
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* TODO(task-6): move Save/Load into BriefPanel chrome strip */}
      <div className="flex items-center justify-end gap-2 border-b border-[var(--color-border)] px-5 py-2.5">
        <button
          type="button"
          onClick={handleLoad}
          disabled={isLoading}
          className="rounded px-3 py-1.5 text-xs font-medium bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

      <div className="flex-1 overflow-y-auto p-5">
        <BuildingTabView
          buildingClass={buildingClass}
          projectType={projectType}
          subclasses={selectedSubclasses}
          scaleData={scaleData}
          complexity={complexity}
          workScope={workScope}
          complexityLevel={complexitySliderValue}
          scopeLevel={scopeSliderValue}
          onClassChange={(cls) => onClassChange?.(cls)}
          onTypeChange={(type) => selectType(type)}
          onSubclassToggle={handleSubclassToggle}
          onComplexityChange={handleComplexityChange}
          onScopeToggle={handleScopeToggle}
          onComplexityLevelChange={handleComplexitySliderChange}
          onScopeLevelChange={handleScopeSliderChange}
          templates={derivedTemplates}
          complexityScore={complexityScore}
          complexityBand={complexityBand}
          contingencyBand={contingencyBand}
          nccClass={nccClass}
          estCostBand={estCostBand}
          riskFlags={riskFlags}
          disciplines={disciplines}
        />
      </div>
    </div>
  );
}
