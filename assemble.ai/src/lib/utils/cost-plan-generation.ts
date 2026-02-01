/**
 * Cost Plan Generation Utility
 * Feature: 018-project-initiator Phase 12
 * Generates cost plan line items from templates based on project type and answers
 */

import costPlanTemplates from '@/lib/data/cost-plan-templates.json';
import projectTypesData from '@/lib/data/project-types.json';
import type { CostLineSection } from '@/types/cost-plan';
import type { MasterStageId } from '@/lib/types/project-initiator';

export interface CostPlanLineInput {
  description: string;
  section: CostLineSection;
  budgetedCost: number;
  masterStage?: MasterStageId;  // NEW: Links to one of 5 master stages
  categoryId?: string;
  notes?: string;
}

export interface CostPlanGenerationParams {
  projectType: string;
  answers: Record<string, string | string[]>;
}

export interface CalculateBudgetParams {
  basis: 'gfa' | 'units' | 'fixed';
  rate: number;
  gfa?: number;
  units?: number;
  fixedAmount?: number;
  qualityMultiplier?: number;
  locationMultiplier?: number;
}

/**
 * Calculate budget based on different calculation bases
 */
export function calculateBudget(params: CalculateBudgetParams): number {
  const { basis, rate, gfa, units, fixedAmount, qualityMultiplier = 1.0, locationMultiplier = 1.0 } = params;

  let baseCost = 0;

  switch (basis) {
    case 'gfa':
      if (!gfa) throw new Error('GFA is required for GFA-based calculation');
      baseCost = rate * gfa;
      break;
    case 'units':
      if (!units) throw new Error('Units is required for units-based calculation');
      baseCost = rate * units;
      break;
    case 'fixed':
      baseCost = fixedAmount || rate;
      break;
    default:
      throw new Error(`Unknown calculation basis: ${basis}`);
  }

  // Apply multipliers
  return Math.round(baseCost * qualityMultiplier * locationMultiplier);
}

/**
 * Get quality multiplier from answers
 */
function getQualityMultiplier(answers: Record<string, string | string[]>): number {
  const quality = answers.quality_level || answers.finish_quality;

  const multipliers: Record<string, number> = {
    'basic': 0.85,
    'standard': 1.0,
    'premium': 1.25,
    'luxury': 1.6,
    'ultra_luxury': 2.0,
  };

  if (typeof quality === 'string' && quality in multipliers) {
    return multipliers[quality];
  }

  return 1.0; // default
}

/**
 * Get location multiplier from answers or use default
 */
function getLocationMultiplier(answers: Record<string, string | string[]>): number {
  const location = answers.location;

  const factors = costPlanTemplates.costPlanTemplates.locationFactors.factors as Record<string, number>;

  if (typeof location === 'string' && location in factors) {
    return factors[location];
  }

  return 1.0; // default to sydney_metro
}

/**
 * Extract numeric value from answer (handles string and array)
 * Also handles common patterns like "5000sqm", "10000", "small" with defaults
 */
function getNumericAnswer(answers: Record<string, string | string[]>, key: string): number | undefined {
  const value = answers[key];
  if (typeof value === 'string') {
    // Try direct numeric parsing first
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num;
    }

    // Handle common size descriptors with default values
    const sizeDefaults: Record<string, number> = {
      'small': 2000,
      'medium': 5000,
      'large': 10000,
      'extra_large': 20000,
      'low_rise': 3000,
      'mid_rise': 8000,
      'high_rise': 15000,
      'tower': 25000,
    };

    const lowerValue = value.toLowerCase();
    if (lowerValue in sizeDefaults) {
      return sizeDefaults[lowerValue];
    }
  }
  return undefined;
}

/**
 * Format master stage name for display (convert snake_case to Title Case)
 *
 * @param stageId - Master stage ID in snake_case format
 * @returns Formatted stage name
 *
 * @example
 * formatStageName("schematic_design") // "Schematic Design"
 * formatStageName("initiation") // "Initiation"
 */
function formatStageName(stageId: string): string {
  return stageId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract GFA from answers by looking up question metadata
 */
function extractGfaFromAnswers(projectType: string, answers: Record<string, string | string[]>): number | undefined {
  // Find the project type definition
  const projectTypeDef = projectTypesData.projectTypes.types.find(t => t.id === projectType);
  if (!projectTypeDef) {
    return getNumericAnswer(answers, 'gfa') || getNumericAnswer(answers, 'building_scale');
  }

  // Look through questions for GFA-related data
  for (const question of projectTypeDef.quickSetupQuestions) {
    const answerValue = answers[question.id];
    if (!answerValue || typeof answerValue !== 'string') continue;

    // Find the selected option
    const selectedOption = question.options.find((opt: any) => opt.value === answerValue);
    if (!selectedOption) continue;

    // Extract GFA from option metadata
    if ('gfa' in selectedOption) {
      return (selectedOption as any).gfa;
    }

    // If question is building_scale or gfa, try to extract from costPerSqm or use defaults
    if (question.id === 'building_scale' || question.id === 'gfa') {
      if ('costPerSqm' in selectedOption) {
        // Use default GFA based on building type
        return getNumericAnswer(answers, question.id);
      }
    }
  }

  // Fallback to simple extraction
  return getNumericAnswer(answers, 'gfa') || getNumericAnswer(answers, 'building_scale');
}

/**
 * Generate cost plan line items for a project
 */
export function generateCostPlan(params: CostPlanGenerationParams): CostPlanLineInput[] {
  const { projectType, answers } = params;
  const lines: CostPlanLineInput[] = [];

  // Get multipliers
  const qualityMultiplier = getQualityMultiplier(answers);
  const locationMultiplier = getLocationMultiplier(answers);

  // Extract project parameters with smart GFA extraction
  const gfa = extractGfaFromAnswers(projectType, answers);
  const units = getNumericAnswer(answers, 'units') || getNumericAnswer(answers, 'dwellings');

  // Map project types to benchmark rate categories
  // Some project types don't have direct benchmark rates, so we map to similar types
  const projectTypeMapping: Record<string, string> = {
    'house': 'house',
    'apartments': 'apartments',
    'apartments-btr': 'apartments', // Build-to-Rent uses apartments rates
    'student-housing': 'apartments', // Student housing uses apartments rates
    'townhouses': 'house', // Townhouses use house rates
    'retirement-living': 'apartments', // Retirement living uses apartments rates
    'office': 'office',
    'retail': 'retail',
    'industrial': 'industrial',
    'fitout': 'retail', // Fitout defaults to retail rates
    'refurbishment': 'apartments', // Refurbishment defaults to apartments (could vary)
    // Note: due-diligence, feasibility, remediation don't typically have cost plans
  };

  // Get the mapped project type for benchmark rates
  const mappedType = projectTypeMapping[projectType] || projectType;

  // Get benchmark rates for this project type
  const benchmarkRates = costPlanTemplates.costPlanTemplates.categories.construction_costs.benchmarkRates as any;
  const projectRates = benchmarkRates[mappedType];

  console.log('Cost Plan Generation Debug:', {
    projectType,
    mappedType,
    hasProjectRates: !!projectRates,
    availableTypes: Object.keys(benchmarkRates),
    gfa,
    units,
    qualityMultiplier,
    locationMultiplier,
    answers: Object.keys(answers),
  });

  if (!projectRates) {
    console.warn(`No benchmark rates found for project type: ${projectType} (mapped to: ${mappedType})`);
    console.warn(`Available types: ${Object.keys(benchmarkRates).join(', ')}`);
    console.warn(`This project type may not support cost plan generation. Consider adding benchmark rates.`);
    return lines;
  }

  // 1. CONSTRUCTION COSTS
  // Use the mid-point of the range based on quality
  let constructionRate = 0;
  let selectedRateKey = '';
  const rateKeys = Object.keys(projectRates);

  if (rateKeys.length > 0) {
    // Select rate based on quality level
    const quality = answers.quality_level || answers.finish_quality || 'standard';
    selectedRateKey = rateKeys[0];

    if (typeof quality === 'string') {
      // Try to match quality to rate key
      const matchingKey = rateKeys.find(key => key.includes(quality));
      if (matchingKey) {
        selectedRateKey = matchingKey;
      } else if (quality === 'premium' || quality === 'luxury') {
        // Use higher end rate
        selectedRateKey = rateKeys[rateKeys.length - 1];
      }
    }

    const rateRange = projectRates[selectedRateKey];
    constructionRate = (rateRange.min + rateRange.max) / 2;
  }

  if (constructionRate > 0 && gfa) {
    const constructionCost = calculateBudget({
      basis: 'gfa',
      rate: constructionRate,
      gfa,
      qualityMultiplier,
      locationMultiplier,
    });

    lines.push({
      description: 'Construction Works',
      section: 'CONSTRUCTION',
      budgetedCost: constructionCost,
      notes: `Based on ${gfa} sqm GFA @ $${constructionRate}/sqm (${selectedRateKey || 'standard'})`,
    });
  } else {
    console.warn('Cannot generate cost plan:', {
      hasConstructionRate: constructionRate > 0,
      hasGFA: !!gfa,
      constructionRate,
      gfa,
    });
    // Return early if we can't calculate construction costs
    return lines;
  }

  // Continue with remaining sections only if we have construction cost
  if (lines.length > 0) {
    const constructionCost = lines[0].budgetedCost;

    // 2. CONSULTANT FEES (percentages of construction cost)
    const consultantCosts = costPlanTemplates.costPlanTemplates.categories.consultant_costs.items;
    const stageDistribution = (costPlanTemplates.costPlanTemplates.categories.consultant_costs as any).stageDistribution?.percentages;

    // Get applicable consultants for this project type
    const applicableConsultants = Object.entries(consultantCosts).filter(([_, consultant]) => {
      const types = (consultant as any).applicableProjectTypes;
      return types.includes('all') || types.includes(projectType);
    });

    // Sort consultants alphabetically by name
    applicableConsultants.sort(([, a], [, b]) =>
      ((a as any).name as string).localeCompare((b as any).name as string)
    );

    applicableConsultants.forEach(([key, consultant]: [string, any]) => {
      // Calculate total consultant fee
      let totalFee = 0;

      if (consultant.calculation === 'percentage' && consultant.percentageRange) {
        // Use mid-point of percentage range
        const percentage = (consultant.percentageRange.min + consultant.percentageRange.max) / 2;
        totalFee = Math.round((constructionCost * percentage) / 100);
      } else if (consultant.calculation === 'lump_sum' && consultant.typicalRange) {
        // Use mid-point of lump sum range
        totalFee = Math.round((consultant.typicalRange.min + consultant.typicalRange.max) / 2);
      }

      if (totalFee === 0) {
        return; // Skip if no fee calculated
      }

      // Check if this consultant has stage breakdown enabled
      if (consultant.stageBreakdown && stageDistribution) {
        // NEW: Generate 5 line items (one per master stage)
        const stages: MasterStageId[] = ['initiation', 'schematic_design', 'design_development', 'procurement', 'delivery'];

        stages.forEach(stageId => {
          const stagePercentage = stageDistribution[stageId];
          if (!stagePercentage) return; // Skip if stage percentage not defined

          const stageFee = Math.round(totalFee * stagePercentage / 100);
          const stageName = formatStageName(stageId);

          lines.push({
            description: `${consultant.name} - ${stageName}`,
            section: 'CONSULTANTS',
            budgetedCost: stageFee,
            masterStage: stageId,  // NEW: Link to master stage
            notes: `${stagePercentage}% of total ${consultant.name} fee`,
          });
        });
      } else {
        // Single line item (backward compatibility for consultants without stageBreakdown)
        lines.push({
          description: consultant.name,
          section: 'CONSULTANTS',
          budgetedCost: totalFee,
          notes: consultant.calculation === 'percentage'
            ? `${((consultant.percentageRange.min + consultant.percentageRange.max) / 2)}% of construction cost`
            : 'Lump sum estimate',
        });
      }
    });

    // 3. AUTHORITY COSTS
    const authorityCosts = costPlanTemplates.costPlanTemplates.categories.authority_costs.items;

    // Add mandatory authority costs
    Object.entries(authorityCosts).forEach(([key, item]: [string, any]) => {
      if (item.mandatory) {
        const types = item.applicableProjectTypes;
        if (types.includes('all') || types.includes(projectType)) {
          let cost = 0;

          if (item.calculation === 'percentage' && item.percentage) {
            cost = Math.round((constructionCost * item.percentage) / 100);
          } else if (item.typicalRange) {
            cost = Math.round((item.typicalRange.min + item.typicalRange.max) / 2);
          } else if (item.typicalRates) {
            // Use first available rate
            const firstRate = Object.values(item.typicalRates)[0];
            if (typeof firstRate === 'object' && 'min' in firstRate && 'max' in firstRate) {
              cost = Math.round((firstRate.min + firstRate.max) / 2);
            }
          }

          if (cost > 0) {
            lines.push({
              description: item.name,
              section: 'FEES',
              budgetedCost: cost,
              notes: item.notes || '',
            });
          }
        }
      }
    });

    // 4. CONTINGENCY
    const contingencyRates = costPlanTemplates.costPlanTemplates.categories.other_costs.items.contingency;
    const projectStage = 'feasibility'; // Default stage
    const contingencyPercentages = (contingencyRates as any).percentageByStage[projectStage];

    if (contingencyPercentages) {
      // Design contingency
      const designContingency = Math.round((constructionCost * contingencyPercentages.design) / 100);
      lines.push({
        description: 'Design Development Contingency',
        section: 'CONTINGENCY',
        budgetedCost: designContingency,
        notes: `${contingencyPercentages.design}% of construction cost`,
      });

      // Construction contingency
      const constructionContingency = Math.round((constructionCost * contingencyPercentages.construction) / 100);
      lines.push({
        description: 'Construction Contingency',
        section: 'CONTINGENCY',
        budgetedCost: constructionContingency,
        notes: `${contingencyPercentages.construction}% of construction cost`,
      });
    }

    // 5. ESCALATION ALLOWANCE
    const escalationRate = costPlanTemplates.costPlanTemplates.categories.other_costs.items.escalation.currentRate;
    const escalationCost = Math.round((constructionCost * escalationRate) / 100);

    lines.push({
      description: 'Escalation Allowance',
      section: 'CONTINGENCY',
      budgetedCost: escalationCost,
      notes: `${escalationRate}% per annum`,
    });
  }

  return lines;
}
