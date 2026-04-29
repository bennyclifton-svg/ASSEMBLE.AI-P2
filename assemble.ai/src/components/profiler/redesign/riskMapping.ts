import type { BuildingClass, ComplexityOption } from '@/types/profiler';
import type { ComplexityValue, RiskLevel } from './profilerReducer';

type DimensionMap = Record<string, ComplexityValue>;

const BASE: Record<RiskLevel, DimensionMap> = {
  low: {
    quality_tier: 'project_home',
    heritage: 'none',
    approval_pathway: 'cdc_exempt',
    site_conditions: ['greenfield'],
    contamination_level: 'nil',
    access_constraints: 'unrestricted',
    operational_constraints: 'vacant',
    stakeholder_complexity: 'single_owner',
    environmental_sensitivity: 'standard',
    procurement_route: 'traditional',
  },
  medium: {
    quality_tier: 'premium',
    heritage: 'overlay',
    approval_pathway: 'standard_da',
    site_conditions: ['infill'],
    contamination_level: 'minor',
    access_constraints: 'urban_constrained',
    operational_constraints: 'partial_occupation',
    stakeholder_complexity: 'strata',
    environmental_sensitivity: 'sensitive',
    procurement_route: 'design_construct',
  },
  high: {
    quality_tier: 'luxury',
    heritage: 'listed',
    approval_pathway: 'complex_da',
    site_conditions: ['infill', 'sloping', 'bushfire'],
    contamination_level: 'significant',
    access_constraints: 'remote',
    operational_constraints: '24_7_occupied',
    stakeholder_complexity: 'multiple_agencies',
    environmental_sensitivity: 'aboriginal_heritage',
    procurement_route: 'eci',
  },
};

const COMMERCIAL_OVERRIDES: Record<RiskLevel, DimensionMap> = {
  low: { grade: 'b_grade', fitout_level: 'cat_a', sustainability: '5_star' },
  medium: { grade: 'a_grade', fitout_level: 'cat_b', sustainability: '5_star' },
  high: { grade: 'premium', fitout_level: 'turn_key', sustainability: '6_star' },
};

/**
 * Compute the complexity patch for a given risk level, filtered to only
 * include dimensions that exist in the active complexity options. Each
 * value is also validated against the option list — unknown values are
 * silently dropped so we never write bogus data to the DB.
 */
export function complexityPatchForRisk(
  level: RiskLevel,
  buildingClass: BuildingClass | null,
  options: Record<string, ComplexityOption[]>
): Record<string, ComplexityValue> {
  const candidate: DimensionMap = { ...BASE[level] };
  if (buildingClass === 'commercial') Object.assign(candidate, COMMERCIAL_OVERRIDES[level]);

  const patch: Record<string, ComplexityValue> = {};
  for (const [dim, value] of Object.entries(candidate)) {
    const dimOptions = options[dim];
    if (!dimOptions) continue;
    const allowed = new Set(dimOptions.map((o) => o.value));
    if (Array.isArray(value)) {
      const filtered = value.filter((v) => allowed.has(v));
      if (filtered.length > 0) patch[dim] = filtered;
    } else if (allowed.has(value)) {
      patch[dim] = value;
    }
  }
  return patch;
}
