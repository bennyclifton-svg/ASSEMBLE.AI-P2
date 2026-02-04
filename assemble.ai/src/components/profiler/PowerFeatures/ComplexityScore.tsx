'use client';

import { useMemo } from 'react';
import { TrendingUp, AlertCircle, Info } from 'lucide-react';
import profileTemplates from '@/lib/data/profile-templates.json';
import type { BuildingClass, ProjectType, WorkScopeItem, WorkScopeCategory } from '@/types/profiler';

interface ComplexityScorecardProps {
  buildingClass: BuildingClass | null;
  projectType?: ProjectType | null;
  subclass: string[];
  scaleData: Record<string, number>;
  complexity: Record<string, string | string[]>;
  workScope?: string[];
}

interface ContributingFactor {
  label: string;
  impact: 'low' | 'medium' | 'high';
  points: number;
  description: string;
}

// Complexity multipliers by selection value
const COMPLEXITY_MULTIPLIERS: Record<string, number> = {
  // Quality tiers
  project_home: 1.0,
  standard: 1.15,
  premium: 1.4,
  luxury: 1.8,
  ultra_premium: 2.5,
  // Site conditions
  greenfield: 0,
  infill: 1,
  sloping: 2,
  bushfire: 3,
  flood: 2,
  coastal: 2,
  // Heritage
  none: 0,
  overlay: 1,
  conservation: 2,
  listed: 3,
  // Approval pathway
  cdc_exempt: 0,
  low_rise_code: 0.5,
  standard_da: 1,
  complex_da: 2,
  state_significant: 4,
  // Office/Commercial grades
  b_grade: 0,
  a_grade: 1,
  trophy: 3,
  // Sustainability
  minimum: 0,
  '5_star': 1,
  '6_star': 2,
  triple_cert: 3,
  net_zero: 4,
  // Healthcare complexity
  primary: 1,
  secondary: 2,
  tertiary: 3,
  quaternary: 4,
  // Data centre tiers
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
  tier_4: 4,
  // Integration levels
  separate: 0,
  shared_podium: 1,
  fully_integrated: 2,
  // Transfer structures
  single: 1,
  multiple: 3,
  // Global: Contamination level
  nil: 0,
  minor: 1,
  significant: 2,
  heavily_contaminated: 3,
  // Global: Access constraints
  unrestricted: 0,
  urban_constrained: 1,
  restricted_hours: 2,
  remote: 3,
  // Global: Operational constraints
  vacant: 0,
  partial_occupation: 1,
  live_environment: 2,
  '24_7_occupied': 3,
  // Global: Procurement route
  traditional: 0,
  design_construct: 0,
  eci: 1,
  managing_contractor: 1,
  alliance: 2,
  ppp: 2,
  // Global: Stakeholder complexity
  single_owner: 0,
  strata: 1,
  government: 2,
  multiple_agencies: 3,
  // Global: Environmental sensitivity
  // standard: 0, // Already defined above
  sensitive: 1,
  protected_habitat: 2,
  aboriginal_heritage: 3,
};

// Scale-based complexity thresholds
const SCALE_THRESHOLDS: Record<string, { medium: number; high: number }> = {
  gfa_sqm: { medium: 5000, high: 20000 },
  units: { medium: 50, high: 200 },
  beds: { medium: 100, high: 300 },
  storeys: { medium: 10, high: 30 },
  it_load_mw: { medium: 5, high: 20 },
  rooms: { medium: 100, high: 300 },
};

// Work scope complexity points
const SCOPE_COMPLEXITY_POINTS: Record<string, { points: number; label: string }> = {
  // High complexity remediation scopes
  pfas_remediation: { points: 3, label: 'PFAS Remediation' },
  asbestos_acm: { points: 2, label: 'Asbestos/ACM Removal' },
  soil_contamination: { points: 2, label: 'Soil Contamination' },
  groundwater_contamination: { points: 2, label: 'Groundwater Contamination' },
  lead_paint: { points: 1, label: 'Lead Paint Removal' },
  // High complexity upgrade scopes
  lift_replacement: { points: 2, label: 'Lift Replacement' },
  smart_building: { points: 2, label: 'Smart Building Integration' },
  chiller_replacement: { points: 1, label: 'Chiller Replacement' },
  switchboard_upgrade: { points: 1, label: 'Switchboard Upgrade' },
  cladding_replacement: { points: 2, label: 'Cladding Replacement' },
  fire_pump_room: { points: 1, label: 'Fire Pump Room' },
  sprinkler_upgrade: { points: 1, label: 'Sprinkler Upgrade' },
  post_tension_repair: { points: 2, label: 'Post-Tension Cable Repair' },
  carbon_fibre: { points: 1, label: 'Carbon Fibre Strengthening' },
  cooling_tower: { points: 1, label: 'Cooling Tower Upgrade' },
  bms_upgrade: { points: 1, label: 'BMS Upgrade' },
};

// Helper to find work scope item by value
function findWorkScopeItem(scopeValue: string, projectType: ProjectType | null): WorkScopeItem | null {
  if (!projectType) return null;
  const workScopeOptions = (profileTemplates as any).workScopeOptions;
  const typeConfig = workScopeOptions?.[projectType];
  if (!typeConfig) return null;

  for (const category of Object.values(typeConfig) as WorkScopeCategory[]) {
    const item = category.items.find((i: WorkScopeItem) => i.value === scopeValue);
    if (item) return item;
  }
  return null;
}

export function ComplexityScore({
  buildingClass,
  projectType,
  subclass,
  scaleData,
  complexity,
  workScope = [],
}: ComplexityScorecardProps) {
  const { score, factors, contingencyRange } = useMemo(() => {
    let totalPoints = 0;
    const contributingFactors: ContributingFactor[] = [];

    // Base score from complexity selections
    Object.entries(complexity).forEach(([dimension, value]) => {
      // Handle array values (site_conditions supports multi-select)
      const values = Array.isArray(value) ? value : [value];

      values.forEach((v) => {
        const multiplier = COMPLEXITY_MULTIPLIERS[v] ?? 0;
        const points = Math.round(multiplier * 10) / 10;

        if (points > 0) {
          let impact: 'low' | 'medium' | 'high' = 'low';
          if (points >= 2) impact = 'high';
          else if (points >= 1) impact = 'medium';

          const dimensionLabel = dimension.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
          const valueLabel = v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

          contributingFactors.push({
            label: dimensionLabel,
            impact,
            points,
            description: valueLabel,
          });
          totalPoints += points;
        }
      });
    });

    // Scale-based complexity
    Object.entries(scaleData).forEach(([key, value]) => {
      const threshold = SCALE_THRESHOLDS[key];
      if (threshold) {
        let points = 0;
        let impact: 'low' | 'medium' | 'high' = 'low';

        if (value >= threshold.high) {
          points = 2;
          impact = 'high';
        } else if (value >= threshold.medium) {
          points = 1;
          impact = 'medium';
        }

        if (points > 0) {
          const label = key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
          contributingFactors.push({
            label: `Scale (${label})`,
            impact,
            points,
            description: `${value.toLocaleString()} exceeds typical`,
          });
          totalPoints += points;
        }
      }
    });

    // Work scope-based complexity
    workScope.forEach((scopeValue) => {
      // Check static complexity points first
      const scopeComplexity = SCOPE_COMPLEXITY_POINTS[scopeValue];
      if (scopeComplexity) {
        const points = scopeComplexity.points;
        let impact: 'low' | 'medium' | 'high' = 'low';
        if (points >= 2) impact = 'high';
        else if (points >= 1) impact = 'medium';

        contributingFactors.push({
          label: 'Work Scope',
          impact,
          points,
          description: scopeComplexity.label,
        });
        totalPoints += points;
      } else {
        // Check dynamic complexity from profile templates
        const scopeItem = findWorkScopeItem(scopeValue, projectType ?? null);
        if (scopeItem?.complexityPoints && scopeItem.complexityPoints > 0) {
          const points = scopeItem.complexityPoints;
          let impact: 'low' | 'medium' | 'high' = 'low';
          if (points >= 2) impact = 'high';
          else if (points >= 1) impact = 'medium';

          contributingFactors.push({
            label: 'Work Scope',
            impact,
            points,
            description: scopeItem.label,
          });
          totalPoints += points;
        }
      }
    });

    // Normalize to 1-10 scale
    const normalizedScore = Math.min(10, Math.max(1, Math.round(totalPoints)));

    // Calculate contingency range based on score
    let contingencyLow: number;
    let contingencyHigh: number;

    if (normalizedScore <= 3) {
      contingencyLow = 5;
      contingencyHigh = 10;
    } else if (normalizedScore <= 6) {
      contingencyLow = 10;
      contingencyHigh = 15;
    } else if (normalizedScore <= 8) {
      contingencyLow = 15;
      contingencyHigh = 25;
    } else {
      contingencyLow = 20;
      contingencyHigh = 35;
    }

    return {
      score: normalizedScore,
      factors: contributingFactors.sort((a, b) => b.points - a.points).slice(0, 5),
      contingencyRange: { low: contingencyLow, high: contingencyHigh },
    };
  }, [complexity, scaleData, workScope, projectType]);

  if (!buildingClass || subclass.length === 0 || Object.keys(complexity).length === 0) {
    return null;
  }

  const getScoreColor = () => {
    if (score <= 3) return 'text-green-500';
    if (score <= 6) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreLabel = () => {
    if (score <= 3) return 'Low';
    if (score <= 6) return 'Medium';
    if (score <= 8) return 'High';
    return 'Very High';
  };

  const impactColors: Record<string, string> = {
    low: 'bg-green-500/20 text-green-500',
    medium: 'bg-amber-500/20 text-amber-500',
    high: 'bg-red-500/20 text-red-500',
  };

  return (
    <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--color-accent-teal)]" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            Complexity Score
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${getScoreColor()}`}>{score}</span>
          <span className="text-xs text-[var(--color-text-muted)]">/10</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${getScoreColor()} bg-current/10`}>
            {getScoreLabel()}
          </span>
        </div>
      </div>

      {/* Contributing Factors */}
      {factors.length > 0 && (
        <div className="space-y-2 mb-3">
          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <Info className="w-3 h-3" />
            Contributing Factors
          </span>
          <div className="space-y-1">
            {factors.map((factor, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded ${impactColors[factor.impact]}`}>
                    +{factor.points}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">{factor.label}</span>
                </div>
                <span className="text-[var(--color-text-muted)] truncate max-w-[120px]">
                  {factor.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contingency Recommendation */}
      <div className="pt-3 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">
            Suggested Contingency
          </span>
          <span className="text-sm font-medium text-[var(--color-accent-purple)]">
            {contingencyRange.low}% - {contingencyRange.high}%
          </span>
        </div>
      </div>
    </div>
  );
}
