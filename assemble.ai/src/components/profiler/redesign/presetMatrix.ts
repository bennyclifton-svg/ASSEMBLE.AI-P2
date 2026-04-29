import type { BuildingClass, ProjectType } from '@/types/profiler';
import type { RiskLevel } from './profilerReducer';

export interface PresetEntry {
  subclass: string[];
  scaleData: Record<string, number>;
  riskLevel: RiskLevel;
  /** Extra complexity dimensions stamped on top of the risk mapping. */
  complexityOverrides?: Record<string, string | string[]>;
  /** Standard scope items (referencing real workScopeOptions[type][cat].items[*].value strings). */
  standardScopeItems: string[];
}

type Matrix = Partial<Record<BuildingClass, Partial<Record<ProjectType, PresetEntry>>>>;

export const presetMatrix: Matrix = {
  residential: {
    new: {
      subclass: ['house'],
      scaleData: { storeys: 2, gfa_sqm: 220, units: 1, bedrooms: 4, garage_spaces: 2 },
      riskLevel: 'low',
      complexityOverrides: { site_conditions: ['infill'] },
      standardScopeItems: [
        'demolition',
        'site_clearance',
        'bulk_earthworks',
        'site_drainage',
        'stormwater_management',
        'substructure',
        'superstructure',
        'facade_system',
        'roofing',
        'glazing',
        'waterproofing',
        'mechanical_hvac',
        'electrical_power',
      ],
    },
    refurb: {
      subclass: ['house'],
      scaleData: { storeys: 1, gfa_sqm: 120, bedrooms: 3 },
      riskLevel: 'medium',
      complexityOverrides: { operational_constraints: 'partial_occupation' },
      standardScopeItems: [
        'lobby_refurbishment',
        'amenities_upgrade',
        'lighting_upgrade',
        'plumbing_upgrade',
        'hot_water_system',
        'access_control',
      ],
    },
    extend: {
      subclass: ['house'],
      scaleData: { storeys: 2, gfa_sqm: 80 },
      riskLevel: 'medium',
      standardScopeItems: ['horizontal_extension', 'services_reticulation'],
    },
  },
  commercial: {
    new: {
      subclass: ['office'],
      scaleData: { storeys: 6, gfa_sqm: 8000 },
      riskLevel: 'medium',
      standardScopeItems: [
        'demolition',
        'bulk_earthworks',
        'temporary_works',
        'substructure',
        'superstructure',
        'steel_frame',
        'curtain_wall',
        'glazing',
        'mechanical_hvac',
        'electrical_power',
      ],
    },
    refurb: {
      subclass: ['office'],
      scaleData: { storeys: 4, gfa_sqm: 3500 },
      riskLevel: 'medium',
      complexityOverrides: { operational_constraints: 'live_environment' },
      standardScopeItems: [
        'hvac_upgrade',
        'switchboard_upgrade',
        'lighting_upgrade',
        'lift_modernisation',
        'lobby_refurbishment',
        'amenities_upgrade',
        'bms_upgrade',
        'access_control',
      ],
    },
  },
};

export function getPreset(
  buildingClass: BuildingClass | null,
  projectType: ProjectType | null
): PresetEntry | null {
  if (!buildingClass || !projectType) return null;
  return presetMatrix[buildingClass]?.[projectType] ?? null;
}
