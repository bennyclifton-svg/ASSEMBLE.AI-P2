/**
 * Rule Evaluation Service
 * Spec 025: Intelligent Report Generation
 *
 * This service evaluates inference rules against project profiler data
 * to generate context-aware recommendations for objectives, planning requirements,
 * and stakeholders.
 */

import inferenceRulesData from '../data/inference-rules.json';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Profiler data structure from project profiles
 */
export interface ProfilerData {
    building_class?: string;
    buildingClass?: string;
    project_type?: string;
    projectType?: string;
    subclass?: string | string[];
    region?: string;
    scale?: {
        gfa_sqm?: number;
        storeys?: number;
        bedrooms?: number;
        car_spaces?: number;
        basement_levels?: number;
        site_area_sqm?: number;
        levels?: number;
    };
    complexity?: {
        quality_tier?: string;
        qualityTier?: string;
        quality?: string;
        site_conditions?: string | string[];
        siteConditions?: string | string[];
        heritage?: string;
        bushfire?: string | string[];
        contamination_level?: string | string[];
        contaminationLevel?: string | string[];
        flood_overlay?: boolean;
        floodOverlay?: boolean;
        approval_pathway?: string | string[];
        approvalPathway?: string | string[];
        procurement_route?: string;
        procurementRoute?: string;
        sustainability?: string | string[];
        operational_constraints?: string | string[];
        operationalConstraints?: string | string[];
    };
    work_scope_includes?: string[];
    workScopeIncludes?: string[];
}

/**
 * Normalized profiler data with consistent field names
 */
interface NormalizedProfiler {
    building_class: string | null;
    project_type: string | null;
    subclass: string[];
    region: string;
    scale: {
        gfa_sqm: number | null;
        storeys: number | null;
        bedrooms: number | null;
        car_spaces: number | null;
        basement_levels: number | null;
        site_area_sqm: number | null;
    };
    complexity: {
        quality_tier: string | null;
        site_conditions: string[];
        heritage: string | null;
        bushfire: string[];
        contamination_level: string[];
        flood_overlay: boolean;
        approval_pathway: string[];
        procurement_route: string | null;
        sustainability: string[];
        operational_constraints: string[];
    };
    work_scope_includes: string[];
}

/**
 * Inference rule condition types
 */
interface NumericCondition {
    min?: number;
    max?: number;
}

interface ProfilerCondition {
    profiler: {
        building_class?: string | string[];
        project_type?: string | string[];
        subclass?: string | string[];
        region?: string | string[];
        scale?: {
            gfa_sqm?: NumericCondition;
            storeys?: NumericCondition;
            bedrooms?: NumericCondition;
            car_spaces?: NumericCondition;
            basement_levels?: NumericCondition;
            site_area_sqm?: NumericCondition;
        };
        complexity?: {
            quality_tier?: string | string[];
            site_conditions?: string | string[];
            heritage?: string | string[];
            bushfire?: string | string[];
            contamination_level?: string | string[];
            flood_overlay?: boolean;
            approval_pathway?: string | string[];
            procurement_route?: string | string[];
            sustainability?: string | string[];
            operational_constraints?: string | string[];
        };
        work_scope_includes?: string[];
    };
}

interface AndCondition {
    and: RuleCondition[];
}

interface OrCondition {
    or: RuleCondition[];
}

type RuleCondition = ProfilerCondition | AndCondition | OrCondition | Record<string, never>;

/**
 * Inferred objective item
 */
export interface InferredObjective {
    text: string;
    category?: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Inferred stakeholder item
 */
export interface InferredStakeholder {
    name: string;
    subgroup: string;
    role?: string;
    reason?: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Base inference rule structure
 */
interface BaseInferenceRule {
    id: string;
    description: string;
    condition: RuleCondition;
    priority: number;
    source: 'explicit' | 'inferred';
}

/**
 * Objective inference rule
 */
interface ObjectiveRule extends BaseInferenceRule {
    infer: InferredObjective[];
}

/**
 * Stakeholder inference rule
 */
interface StakeholderRule extends BaseInferenceRule {
    infer: InferredStakeholder[];
}

/**
 * Inference rules data structure
 */
interface InferenceRulesJson {
    metadata: {
        version: string;
        lastUpdated: string;
        totalRules: number;
        ruleCategories: Record<string, number>;
    };
    objectives_functional_quality: ObjectiveRule[];
    objectives_planning_compliance: ObjectiveRule[];
    stakeholders: {
        client: StakeholderRule[];
        authority: StakeholderRule[];
        consultant: StakeholderRule[];
        contractor: StakeholderRule[];
    };
}

/**
 * Matched rule result with applied rule and inferred items
 */
export interface MatchedObjectiveRule {
    ruleId: string;
    description: string;
    priority: number;
    source: 'explicit' | 'inferred';
    objectives: InferredObjective[];
}

export interface MatchedStakeholderRule {
    ruleId: string;
    description: string;
    priority: number;
    source: 'explicit' | 'inferred';
    group: 'client' | 'authority' | 'consultant' | 'contractor';
    stakeholders: InferredStakeholder[];
}

/**
 * Complete evaluation result
 */
export interface RuleEvaluationResult {
    projectId: string;
    evaluatedAt: string;
    profilerSnapshot: ProfilerData;
    matchedRules: {
        functionalQuality: MatchedObjectiveRule[];
        planningCompliance: MatchedObjectiveRule[];
        clientStakeholders: MatchedStakeholderRule[];
        authorityStakeholders: MatchedStakeholderRule[];
        consultantStakeholders: MatchedStakeholderRule[];
        contractorStakeholders: MatchedStakeholderRule[];
    };
    statistics: {
        totalRulesEvaluated: number;
        totalRulesMatched: number;
        objectivesInferred: number;
        stakeholdersInferred: number;
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Type guard for inference rules JSON
 */
const inferenceRules = inferenceRulesData as InferenceRulesJson;

/**
 * Normalize profiler data to consistent structure
 */
function normalizeProfiler(data: ProfilerData): NormalizedProfiler {
    const toArray = (val: string | string[] | undefined | null): string[] => {
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
    };

    return {
        building_class: data.building_class ?? data.buildingClass ?? null,
        project_type: data.project_type ?? data.projectType ?? null,
        subclass: toArray(data.subclass),
        region: data.region ?? 'AU',
        scale: {
            gfa_sqm: data.scale?.gfa_sqm ?? null,
            storeys: data.scale?.storeys ?? data.scale?.levels ?? null,
            bedrooms: data.scale?.bedrooms ?? null,
            car_spaces: data.scale?.car_spaces ?? null,
            basement_levels: data.scale?.basement_levels ?? null,
            site_area_sqm: data.scale?.site_area_sqm ?? null,
        },
        complexity: {
            quality_tier: data.complexity?.quality_tier ?? data.complexity?.qualityTier ?? data.complexity?.quality ?? null,
            site_conditions: toArray(data.complexity?.site_conditions ?? data.complexity?.siteConditions),
            heritage: data.complexity?.heritage ?? null,
            bushfire: toArray(data.complexity?.bushfire),
            contamination_level: toArray(data.complexity?.contamination_level ?? data.complexity?.contaminationLevel),
            flood_overlay: data.complexity?.flood_overlay ?? data.complexity?.floodOverlay ?? false,
            approval_pathway: toArray(data.complexity?.approval_pathway ?? data.complexity?.approvalPathway),
            procurement_route: data.complexity?.procurement_route ?? data.complexity?.procurementRoute ?? null,
            sustainability: toArray(data.complexity?.sustainability),
            operational_constraints: toArray(data.complexity?.operational_constraints ?? data.complexity?.operationalConstraints),
        },
        work_scope_includes: data.work_scope_includes ?? data.workScopeIncludes ?? [],
    };
}

/**
 * Check if a value matches a condition value (single or array)
 */
function matchesValue(actual: string | null, expected: string | string[] | undefined): boolean {
    if (expected === undefined) return true;
    if (actual === null) return false;

    const expectedArray = Array.isArray(expected) ? expected : [expected];
    return expectedArray.includes(actual);
}

/**
 * Check if any actual values match any expected values
 */
function matchesArrayValue(actual: string[], expected: string | string[] | undefined): boolean {
    if (expected === undefined) return true;
    if (actual.length === 0) return false;

    const expectedArray = Array.isArray(expected) ? expected : [expected];
    return actual.some(a => expectedArray.includes(a));
}

/**
 * Check if a numeric value satisfies min/max conditions
 */
function matchesNumeric(actual: number | null, condition: NumericCondition | undefined): boolean {
    if (condition === undefined) return true;
    if (actual === null) return false;

    if (condition.min !== undefined && actual < condition.min) return false;
    if (condition.max !== undefined && actual > condition.max) return false;
    return true;
}

/**
 * Check if a boolean value matches
 */
function matchesBoolean(actual: boolean, expected: boolean | undefined): boolean {
    if (expected === undefined) return true;
    return actual === expected;
}

/**
 * Evaluate a profiler condition against normalized data
 */
function evaluateProfilerCondition(condition: ProfilerCondition['profiler'], profiler: NormalizedProfiler): boolean {
    // Building class
    if (!matchesValue(profiler.building_class, condition.building_class)) return false;

    // Project type
    if (!matchesValue(profiler.project_type, condition.project_type)) return false;

    // Subclass
    if (condition.subclass !== undefined) {
        if (!matchesArrayValue(profiler.subclass, condition.subclass)) return false;
    }

    // Region
    if (!matchesValue(profiler.region, condition.region)) return false;

    // Scale conditions
    if (condition.scale) {
        if (!matchesNumeric(profiler.scale.gfa_sqm, condition.scale.gfa_sqm)) return false;
        if (!matchesNumeric(profiler.scale.storeys, condition.scale.storeys)) return false;
        if (!matchesNumeric(profiler.scale.bedrooms, condition.scale.bedrooms)) return false;
        if (!matchesNumeric(profiler.scale.car_spaces, condition.scale.car_spaces)) return false;
        if (!matchesNumeric(profiler.scale.basement_levels, condition.scale.basement_levels)) return false;
        if (!matchesNumeric(profiler.scale.site_area_sqm, condition.scale.site_area_sqm)) return false;
    }

    // Complexity conditions
    if (condition.complexity) {
        if (!matchesValue(profiler.complexity.quality_tier, condition.complexity.quality_tier)) return false;
        if (!matchesArrayValue(profiler.complexity.site_conditions, condition.complexity.site_conditions)) return false;
        if (!matchesValue(profiler.complexity.heritage, condition.complexity.heritage)) return false;
        if (!matchesArrayValue(profiler.complexity.bushfire, condition.complexity.bushfire)) return false;
        if (!matchesArrayValue(profiler.complexity.contamination_level, condition.complexity.contamination_level)) return false;
        if (!matchesBoolean(profiler.complexity.flood_overlay, condition.complexity.flood_overlay)) return false;
        if (!matchesArrayValue(profiler.complexity.approval_pathway, condition.complexity.approval_pathway)) return false;
        if (!matchesValue(profiler.complexity.procurement_route, condition.complexity.procurement_route)) return false;
        if (!matchesArrayValue(profiler.complexity.sustainability, condition.complexity.sustainability)) return false;
        if (!matchesArrayValue(profiler.complexity.operational_constraints, condition.complexity.operational_constraints)) return false;
    }

    // Work scope includes
    if (condition.work_scope_includes !== undefined) {
        if (!matchesArrayValue(profiler.work_scope_includes, condition.work_scope_includes)) return false;
    }

    return true;
}

/**
 * Evaluate a rule condition (supports AND, OR, nested conditions)
 */
function evaluateCondition(condition: RuleCondition, profiler: NormalizedProfiler): boolean {
    // Empty condition always matches
    if (Object.keys(condition).length === 0) return true;

    // AND condition
    if ('and' in condition) {
        return (condition as AndCondition).and.every(c => evaluateCondition(c, profiler));
    }

    // OR condition
    if ('or' in condition) {
        return (condition as OrCondition).or.some(c => evaluateCondition(c, profiler));
    }

    // Profiler condition
    if ('profiler' in condition) {
        return evaluateProfilerCondition((condition as ProfilerCondition).profiler, profiler);
    }

    return true;
}

/**
 * Interpolate template variables in text
 * e.g., "{{scale.bedrooms}} bedroom" -> "3 bedroom"
 */
function interpolateTemplate(text: string, profiler: NormalizedProfiler): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const parts = path.trim().split('.');
        let value: unknown = profiler;

        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = (value as Record<string, unknown>)[part];
            } else {
                return match; // Keep original if path not found
            }
        }

        if (value === null || value === undefined) return match;
        return String(value);
    });
}

/**
 * Process inferred objectives with template interpolation
 */
function processObjectives(objectives: InferredObjective[], profiler: NormalizedProfiler): InferredObjective[] {
    return objectives.map(obj => ({
        ...obj,
        text: interpolateTemplate(obj.text, profiler),
    }));
}

// ============================================================================
// MAIN EVALUATION FUNCTIONS
// ============================================================================

/**
 * Evaluate all objective rules against profiler data
 */
function evaluateObjectiveRules(
    rules: ObjectiveRule[],
    profiler: NormalizedProfiler
): MatchedObjectiveRule[] {
    const matched: MatchedObjectiveRule[] = [];

    for (const rule of rules) {
        if (evaluateCondition(rule.condition, profiler)) {
            matched.push({
                ruleId: rule.id,
                description: rule.description,
                priority: rule.priority,
                source: rule.source,
                objectives: processObjectives(rule.infer, profiler),
            });
        }
    }

    // Sort by priority (highest first)
    return matched.sort((a, b) => b.priority - a.priority);
}

/**
 * Evaluate all stakeholder rules against profiler data
 */
function evaluateStakeholderRules(
    rules: StakeholderRule[],
    profiler: NormalizedProfiler,
    group: 'client' | 'authority' | 'consultant' | 'contractor'
): MatchedStakeholderRule[] {
    const matched: MatchedStakeholderRule[] = [];

    for (const rule of rules) {
        if (evaluateCondition(rule.condition, profiler)) {
            matched.push({
                ruleId: rule.id,
                description: rule.description,
                priority: rule.priority,
                source: rule.source,
                group,
                stakeholders: rule.infer,
            });
        }
    }

    // Sort by priority (highest first)
    return matched.sort((a, b) => b.priority - a.priority);
}

/**
 * Main function: Evaluate all inference rules against project profiler data
 *
 * @param projectId - Project ID for tracking
 * @param profilerData - Project profiler data from database
 * @returns Complete evaluation result with matched rules and inferred items
 */
export function evaluateInferenceRules(
    projectId: string,
    profilerData: ProfilerData
): RuleEvaluationResult {
    const normalizedProfiler = normalizeProfiler(profilerData);

    // Evaluate all rule categories
    const functionalQuality = evaluateObjectiveRules(
        inferenceRules.objectives_functional_quality,
        normalizedProfiler
    );

    const planningCompliance = evaluateObjectiveRules(
        inferenceRules.objectives_planning_compliance,
        normalizedProfiler
    );

    const clientStakeholders = evaluateStakeholderRules(
        inferenceRules.stakeholders.client,
        normalizedProfiler,
        'client'
    );

    const authorityStakeholders = evaluateStakeholderRules(
        inferenceRules.stakeholders.authority,
        normalizedProfiler,
        'authority'
    );

    const consultantStakeholders = evaluateStakeholderRules(
        inferenceRules.stakeholders.consultant,
        normalizedProfiler,
        'consultant'
    );

    const contractorStakeholders = evaluateStakeholderRules(
        inferenceRules.stakeholders.contractor,
        normalizedProfiler,
        'contractor'
    );

    // Calculate statistics
    const totalRulesEvaluated =
        inferenceRules.objectives_functional_quality.length +
        inferenceRules.objectives_planning_compliance.length +
        inferenceRules.stakeholders.client.length +
        inferenceRules.stakeholders.authority.length +
        inferenceRules.stakeholders.consultant.length +
        inferenceRules.stakeholders.contractor.length;

    const totalRulesMatched =
        functionalQuality.length +
        planningCompliance.length +
        clientStakeholders.length +
        authorityStakeholders.length +
        consultantStakeholders.length +
        contractorStakeholders.length;

    const objectivesInferred =
        functionalQuality.reduce((sum, r) => sum + r.objectives.length, 0) +
        planningCompliance.reduce((sum, r) => sum + r.objectives.length, 0);

    const stakeholdersInferred =
        clientStakeholders.reduce((sum, r) => sum + r.stakeholders.length, 0) +
        authorityStakeholders.reduce((sum, r) => sum + r.stakeholders.length, 0) +
        consultantStakeholders.reduce((sum, r) => sum + r.stakeholders.length, 0) +
        contractorStakeholders.reduce((sum, r) => sum + r.stakeholders.length, 0);

    return {
        projectId,
        evaluatedAt: new Date().toISOString(),
        profilerSnapshot: profilerData,
        matchedRules: {
            functionalQuality,
            planningCompliance,
            clientStakeholders,
            authorityStakeholders,
            consultantStakeholders,
            contractorStakeholders,
        },
        statistics: {
            totalRulesEvaluated,
            totalRulesMatched,
            objectivesInferred,
            stakeholdersInferred,
        },
    };
}

/**
 * Format evaluation result as markdown for AI prompt inclusion
 */
export function formatEvaluationResultForPrompt(result: RuleEvaluationResult): string {
    const sections: string[] = [];

    sections.push(`# Inference Rule Evaluation Results
**Project ID:** ${result.projectId}
**Evaluated:** ${new Date(result.evaluatedAt).toLocaleDateString()}
**Rules Matched:** ${result.statistics.totalRulesMatched} of ${result.statistics.totalRulesEvaluated}`);

    // Functional & Quality Objectives
    if (result.matchedRules.functionalQuality.length > 0) {
        sections.push(`\n## Functional & Quality Objectives`);
        for (const rule of result.matchedRules.functionalQuality) {
            for (const obj of rule.objectives) {
                const category = obj.category ? ` [${obj.category}]` : '';
                const confidence = obj.confidence !== 'high' ? ` (${obj.confidence})` : '';
                sections.push(`- ${obj.text}${category}${confidence}`);
            }
        }
    }

    // Planning & Compliance Objectives
    if (result.matchedRules.planningCompliance.length > 0) {
        sections.push(`\n## Planning & Compliance Requirements`);
        for (const rule of result.matchedRules.planningCompliance) {
            for (const obj of rule.objectives) {
                const category = obj.category ? ` [${obj.category}]` : '';
                const confidence = obj.confidence !== 'high' ? ` (${obj.confidence})` : '';
                sections.push(`- ${obj.text}${category}${confidence}`);
            }
        }
    }

    // Stakeholders by group
    const stakeholderGroups = [
        { key: 'clientStakeholders', title: 'Client Team' },
        { key: 'authorityStakeholders', title: 'Authorities' },
        { key: 'consultantStakeholders', title: 'Consultants' },
        { key: 'contractorStakeholders', title: 'Contractors' },
    ] as const;

    for (const group of stakeholderGroups) {
        const rules = result.matchedRules[group.key];
        if (rules.length > 0) {
            sections.push(`\n## Recommended ${group.title}`);
            for (const rule of rules) {
                for (const stakeholder of rule.stakeholders) {
                    const role = stakeholder.role ? ` (${stakeholder.role})` : '';
                    const reason = stakeholder.reason ? ` - ${stakeholder.reason}` : '';
                    const confidence = stakeholder.confidence !== 'high' ? ` [${stakeholder.confidence}]` : '';
                    sections.push(`- **${stakeholder.name}**${role}${reason}${confidence}`);
                }
            }
        }
    }

    return sections.join('\n');
}

/**
 * Get inference rules metadata
 */
export function getInferenceRulesMetadata() {
    return inferenceRules.metadata;
}

/**
 * Get all unique objectives from matched rules (deduplicated by text)
 */
export function getUniqueObjectives(result: RuleEvaluationResult): InferredObjective[] {
    const allObjectives: InferredObjective[] = [];
    const seenTexts = new Set<string>();

    // Collect from functional quality
    for (const rule of result.matchedRules.functionalQuality) {
        for (const obj of rule.objectives) {
            if (!seenTexts.has(obj.text)) {
                seenTexts.add(obj.text);
                allObjectives.push(obj);
            }
        }
    }

    // Collect from planning compliance
    for (const rule of result.matchedRules.planningCompliance) {
        for (const obj of rule.objectives) {
            if (!seenTexts.has(obj.text)) {
                seenTexts.add(obj.text);
                allObjectives.push(obj);
            }
        }
    }

    return allObjectives;
}

/**
 * Get all unique stakeholders from matched rules (deduplicated by name)
 */
export function getUniqueStakeholders(
    result: RuleEvaluationResult,
    group?: 'client' | 'authority' | 'consultant' | 'contractor'
): InferredStakeholder[] {
    const allStakeholders: InferredStakeholder[] = [];
    const seenNames = new Set<string>();

    const groups = group
        ? [group]
        : ['client', 'authority', 'consultant', 'contractor'] as const;

    for (const g of groups) {
        const key = `${g}Stakeholders` as keyof typeof result.matchedRules;
        const rules = result.matchedRules[key] as MatchedStakeholderRule[];

        for (const rule of rules) {
            for (const stakeholder of rule.stakeholders) {
                if (!seenNames.has(stakeholder.name)) {
                    seenNames.add(stakeholder.name);
                    allStakeholders.push(stakeholder);
                }
            }
        }
    }

    return allStakeholders;
}
