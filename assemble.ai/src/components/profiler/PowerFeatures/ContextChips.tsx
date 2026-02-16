'use client';

import { useMemo } from 'react';
import { Building2, DollarSign, Calendar, Globe } from 'lucide-react';
import type { BuildingClass, ProjectType, Region } from '@/types/profiler';
import profileTemplates from '@/lib/data/profile-templates.json';

interface ContextChipsProps {
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  subclass: string[];
  scaleData: Record<string, number>;
  complexity: Record<string, string | string[]>;
  region?: Region;
}

interface Chip {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'copper' | 'purple' | 'amber' | 'gray' | 'blue';
}

// Access region config from templates
const regionConfig = (profileTemplates as any).regionConfig as Record<Region, {
  code: Region;
  name: string;
  buildingCodeName: string;
  buildingCodeAbbrev: string;
  currency: string;
  currencySymbol: string;
}>;

// Access building code mappings from templates
const buildingCodeMappings = (profileTemplates as any).buildingCodeMappings as Record<Region, Record<string, Record<string, { classCode: string; className: string; description: string }>>>;

// Access cost benchmarks from templates
const costBenchmarks = (profileTemplates as any).costBenchmarks as Record<Region, any>;

// NCC class mapping based on building class and subclass
const NCC_CLASS_MAPPING: Record<string, Record<string, string>> = {
  residential: {
    house: 'Class 1a',
    apartments: 'Class 2',
    townhouses: 'Class 1a/2',
    btr: 'Class 2',
    student_housing: 'Class 3',
    retirement_living_ilu: 'Class 1a/2/3',
    aged_care_9c: 'Class 9c',
    social_affordable: 'Class 2',
  },
  commercial: {
    office: 'Class 5',
    retail_shopping: 'Class 6',
    retail_standalone: 'Class 6',
    hotel: 'Class 3',
    food_beverage: 'Class 6',
    serviced_office: 'Class 5',
  },
  industrial: {
    warehouse: 'Class 7b',
    logistics: 'Class 7b',
    manufacturing: 'Class 8',
    cold_storage: 'Class 7b',
    data_centre: 'Class 7b',
    dangerous_goods: 'Class 7a',
  },
  institution: {
    education_early: 'Class 9b',
    education_school: 'Class 9b',
    education_tertiary: 'Class 9b',
    healthcare_hospital: 'Class 9a',
    healthcare_medical: 'Class 5/9a',
    healthcare_clinic: 'Class 5/9a',
    government: 'Class 5/9b',
    religious: 'Class 9b',
  },
  mixed: {
    default: 'Multi-class',
  },
  infrastructure: {
    default: 'Non-building',
  },
};

// Typical cost ranges based on class and complexity ($/m2)
const COST_RANGES: Record<string, { low: number; mid: number; high: number }> = {
  residential_standard: { low: 2500, mid: 3500, high: 4500 },
  residential_premium: { low: 4000, mid: 5500, high: 7500 },
  residential_luxury: { low: 6000, mid: 8500, high: 12000 },
  commercial_office: { low: 3000, mid: 4500, high: 6000 },
  commercial_hotel: { low: 4000, mid: 6000, high: 10000 },
  commercial_retail: { low: 2500, mid: 4000, high: 6000 },
  industrial_warehouse: { low: 800, mid: 1200, high: 2000 },
  industrial_data_centre: { low: 15000, mid: 20000, high: 30000 },
  institution_education: { low: 3500, mid: 5000, high: 7000 },
  institution_healthcare: { low: 6000, mid: 12000, high: 18000 },
};

// Typical programme durations (months)
const PROGRAMME_RANGES: Record<string, { min: number; typical: number; max: number }> = {
  residential_house: { min: 6, typical: 9, max: 18 },
  residential_apartments: { min: 18, typical: 24, max: 36 },
  commercial_office: { min: 12, typical: 18, max: 30 },
  commercial_hotel: { min: 18, typical: 24, max: 36 },
  industrial_warehouse: { min: 6, typical: 9, max: 15 },
  institution_education: { min: 12, typical: 18, max: 30 },
  institution_healthcare: { min: 24, typical: 36, max: 60 },
};

export function ContextChips({
  buildingClass,
  projectType,
  subclass,
  scaleData,
  complexity,
  region = 'AU',
}: ContextChipsProps) {
  const chips = useMemo<Chip[]>(() => {
    const result: Chip[] = [];

    if (!buildingClass || subclass.length === 0) return result;

    // Get region-specific configuration
    const currentRegionConfig = regionConfig[region];
    const codeAbbrev = currentRegionConfig?.buildingCodeAbbrev || 'NCC';

    // Building Code Class chip - use region-specific mappings if available
    let buildingCodeValue = 'N/A';
    const regionMappings = buildingCodeMappings[region];
    if (regionMappings && regionMappings[buildingClass]) {
      const subclassMapping = regionMappings[buildingClass][subclass[0]] || regionMappings[buildingClass].default;
      if (subclassMapping) {
        buildingCodeValue = subclassMapping.className;
      }
    } else {
      // Fallback to NCC mapping for AU
      const nccClassMap = NCC_CLASS_MAPPING[buildingClass] || {};
      buildingCodeValue = nccClassMap[subclass[0]] || nccClassMap.default || 'N/A';
    }

    result.push({
      id: 'building_code',
      label: codeAbbrev,
      value: buildingCodeValue,
      icon: <Building2 className="w-3 h-3" />,
      color: 'copper',
    });

    // Cost range chip - use region-specific benchmarks if available
    // Note: quality_tier and grade are always single-select strings, not arrays
    const qualityTierValue = complexity.quality_tier || complexity.grade;
    const qualityTier = (Array.isArray(qualityTierValue) ? qualityTierValue[0] : qualityTierValue) || 'standard';
    const regionBenchmarks = costBenchmarks[region];
    let costRange: { low: number; mid: number; high: number } | null = null;
    let currencySymbol = currentRegionConfig?.currencySymbol || '$';
    let unit = regionBenchmarks?.unit || 'sqm';

    if (regionBenchmarks && regionBenchmarks[buildingClass]) {
      const subclassBenchmarks = regionBenchmarks[buildingClass][subclass[0]];
      if (subclassBenchmarks && subclassBenchmarks[qualityTier]) {
        costRange = subclassBenchmarks[qualityTier];
      }
    }

    // Fallback to hardcoded AU ranges
    if (!costRange) {
      const costKey = `${buildingClass}_${qualityTier}` as keyof typeof COST_RANGES;
      const altCostKey = `${buildingClass}_${subclass[0]}` as keyof typeof COST_RANGES;
      costRange = COST_RANGES[costKey] || COST_RANGES[altCostKey] || null;
      currencySymbol = '$';
      unit = 'sqm';
    }

    if (costRange) {
      const gfa = scaleData.gfa_sqm || scaleData.nla_sqm || scaleData.total_gfa_sqm || 0;
      if (gfa > 0) {
        const lowCost = Math.round((gfa * costRange.low) / 1000000);
        const highCost = Math.round((gfa * costRange.high) / 1000000);
        result.push({
          id: 'cost',
          label: 'Est. Cost',
          value: `${currencySymbol}${lowCost}M - ${currencySymbol}${highCost}M`,
          icon: <DollarSign className="w-3 h-3" />,
          color: 'purple',
        });
      } else {
        const unitLabel = unit === 'sqft' ? '/sf' : '/m\u00b2';
        result.push({
          id: 'cost',
          label: 'Rate',
          value: `${currencySymbol}${costRange.low.toLocaleString()} - ${currencySymbol}${costRange.high.toLocaleString()}${unitLabel}`,
          icon: <DollarSign className="w-3 h-3" />,
          color: 'purple',
        });
      }
    }

    // Programme timeframe chip
    const programmeKey = `${buildingClass}_${subclass[0]}` as keyof typeof PROGRAMME_RANGES;
    const altProgrammeKey = `${buildingClass}_${projectType}` as keyof typeof PROGRAMME_RANGES;
    const programme = PROGRAMME_RANGES[programmeKey] || PROGRAMME_RANGES[altProgrammeKey];

    if (programme) {
      result.push({
        id: 'programme',
        label: 'Programme',
        value: `${programme.min}-${programme.max} months`,
        icon: <Calendar className="w-3 h-3" />,
        color: 'amber',
      });
    }

    // Region badge chip (if not AU, show it prominently)
    if (region !== 'AU' && currentRegionConfig) {
      result.push({
        id: 'region',
        label: 'Region',
        value: currentRegionConfig.name,
        icon: <Globe className="w-3 h-3" />,
        color: 'blue',
      });
    }

    return result;
  }, [buildingClass, projectType, subclass, scaleData, complexity, region]);

  if (chips.length === 0) return null;

  const colorClasses: Record<string, string> = {
    copper: 'bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)] border-[var(--color-accent-copper)]/25',
    purple: 'bg-[var(--color-accent-purple)]/10 text-[var(--color-accent-purple)] border-[var(--color-accent-purple)]/20',
    amber: 'bg-[var(--color-accent-yellow-tint)] text-[var(--color-accent-yellow)] border-[var(--color-accent-yellow)]/25',
    gray: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)]',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400',
  };

  return (
    <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
      <div className="space-y-2.5">
        {chips.map((chip) => (
          <div
            key={chip.id}
            className="flex items-start gap-1.5"
            title={`${chip.label}: ${chip.value}`}
          >
            <span className="mt-0.5 flex-shrink-0 text-[var(--color-text-muted)]">{chip.icon}</span>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--color-text-muted)]">{chip.label}</div>
              <div className="text-xs font-medium text-[var(--color-text-primary)]">{chip.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
