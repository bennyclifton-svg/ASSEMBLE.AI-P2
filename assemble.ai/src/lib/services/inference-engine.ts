/**
 * Inference Engine
 * Evaluates inference rules against project data and returns matched rules
 */

import inferenceRules from '@/lib/data/inference-rules.json';

// Types
export interface ProjectDetails {
  projectName?: string;
  projectAddress?: string;
  jurisdiction?: string;
  lotAreaSqm?: number;
}

export interface ProfilerData {
  buildingClass?: string;
  subclass?: string[];
  projectType?: string;
  region?: string;
  scaleData?: Record<string, number | string>;
  complexity?: Record<string, string>;
  workScope?: string[];
}

export interface ProjectData {
  projectDetails: ProjectDetails;
  profiler: ProfilerData;
}

export interface Condition {
  project_details?: {
    jurisdiction?: string | string[];
    lot_area_sqm?: { min?: number; max?: number };
  };
  profiler?: {
    building_class?: string | string[];
    subclass?: string | string[];
    project_type?: string | string[];
    region?: string | string[];
    scale?: Record<string, { min?: number; max?: number }>;
    complexity?: Record<string, string | string[]>;
    work_scope_includes?: string[];
    work_scope_excludes?: string[];
  };
  and?: Condition[];
  or?: Condition[];
  not?: Condition;
}

export interface InferredItem {
  text: string;
  category?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface StakeholderInferredItem {
  name: string;
  subgroup?: string;
  role?: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface InferenceRule {
  id: string;
  description: string;
  condition: Condition;
  infer: InferredItem[] | StakeholderInferredItem[];
  priority: number;
  source: 'explicit' | 'inferred';
}

export interface MatchedRule extends InferenceRule {
  resolvedItems: (InferredItem | StakeholderInferredItem)[];
}

export type ContentType =
  | 'objectives_functional_quality'
  | 'objectives_planning_compliance'
  | 'stakeholders_client'
  | 'stakeholders_authority'
  | 'stakeholders_consultant'
  | 'stakeholders_contractor';

// Condition Evaluation
function matchesValue(expected: string | string[], actual: string | undefined): boolean {
  if (!actual) return false;
  if (Array.isArray(expected)) {
    return expected.includes(actual);
  }
  return expected === actual;
}

function matchesRange(range: { min?: number; max?: number }, value: number | undefined): boolean {
  if (value === undefined) return false;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

function matchesArray(expected: string[], actual: string[] | undefined): boolean {
  if (!actual || actual.length === 0) return false;
  return expected.some(e => actual.includes(e));
}

function evaluateCondition(condition: Condition, data: ProjectData): boolean {
  // Handle logical operators
  if (condition.and) {
    return condition.and.every(c => evaluateCondition(c, data));
  }
  if (condition.or) {
    return condition.or.some(c => evaluateCondition(c, data));
  }
  if (condition.not) {
    return !evaluateCondition(condition.not, data);
  }

  // Evaluate project_details
  if (condition.project_details) {
    const pd = condition.project_details;
    const details = data.projectDetails;

    if (pd.jurisdiction && !matchesValue(pd.jurisdiction, details.jurisdiction)) {
      return false;
    }
    if (pd.lot_area_sqm && !matchesRange(pd.lot_area_sqm, details.lotAreaSqm)) {
      return false;
    }
  }

  // Evaluate profiler
  if (condition.profiler) {
    const pc = condition.profiler;
    const profiler = data.profiler;

    if (pc.building_class && !matchesValue(pc.building_class, profiler.buildingClass)) {
      return false;
    }
    if (pc.subclass && !matchesArray(
      Array.isArray(pc.subclass) ? pc.subclass : [pc.subclass],
      profiler.subclass
    )) {
      return false;
    }
    if (pc.project_type && !matchesValue(pc.project_type, profiler.projectType)) {
      return false;
    }
    if (pc.region && !matchesValue(pc.region, profiler.region)) {
      return false;
    }

    // Scale conditions
    if (pc.scale && profiler.scaleData) {
      for (const [key, range] of Object.entries(pc.scale)) {
        const value = profiler.scaleData[key];
        if (typeof value === 'number' && !matchesRange(range, value)) {
          return false;
        }
      }
    }

    // Complexity conditions
    if (pc.complexity && profiler.complexity) {
      for (const [key, expected] of Object.entries(pc.complexity)) {
        const actual = profiler.complexity[key];
        if (!matchesValue(expected, actual)) {
          return false;
        }
      }
    }

    // Work scope includes
    if (pc.work_scope_includes && !matchesArray(pc.work_scope_includes, profiler.workScope)) {
      return false;
    }

    // Work scope excludes
    if (pc.work_scope_excludes && profiler.workScope) {
      if (pc.work_scope_excludes.some(e => profiler.workScope!.includes(e))) {
        return false;
      }
    }
  }

  return true;
}

// Template Resolution
function resolveTemplate(text: string, data: ProjectData): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const parts = path.trim().split('.');
    let value: unknown = data;

    // Handle special cases
    if (parts[0] === 'scale') {
      value = data.profiler.scaleData?.[parts[1]];
    } else if (parts[0] === 'complexity') {
      value = data.profiler.complexity?.[parts[1]];
    } else if (parts[0] === 'buildingCodeLabel') {
      // TODO: Look up from buildingCodeMappings
      value = data.profiler.buildingClass;
    } else {
      // Navigate nested path
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[part];
        } else {
          value = undefined;
          break;
        }
      }
    }

    return value !== undefined ? String(value) : `{{${path}}}`;
  });
}

function resolveItems(
  items: InferredItem[] | StakeholderInferredItem[],
  data: ProjectData
): (InferredItem | StakeholderInferredItem)[] {
  return items.map(item => {
    if ('text' in item) {
      return { ...item, text: resolveTemplate(item.text, data) };
    }
    return item;
  });
}

// Main API
export function evaluateRules(
  contentType: ContentType,
  data: ProjectData
): MatchedRule[] {
  let rules: InferenceRule[];

  // Get rules for content type
  if (contentType.startsWith('stakeholders_')) {
    const group = contentType.replace('stakeholders_', '') as keyof typeof inferenceRules.stakeholders;
    rules = inferenceRules.stakeholders[group] as InferenceRule[];
  } else {
    rules = inferenceRules[contentType as 'objectives_functional_quality' | 'objectives_planning_compliance'] as InferenceRule[];
  }

  // Evaluate and collect matching rules
  const matched: MatchedRule[] = [];

  for (const rule of rules) {
    if (evaluateCondition(rule.condition, data)) {
      matched.push({
        ...rule,
        resolvedItems: resolveItems(rule.infer, data)
      });
    }
  }

  // Sort by priority (highest first)
  matched.sort((a, b) => b.priority - a.priority);

  return matched;
}

// Convenience functions
export function getObjectivesFunctionalQuality(data: ProjectData): MatchedRule[] {
  return evaluateRules('objectives_functional_quality', data);
}

export function getObjectivesPlanningCompliance(data: ProjectData): MatchedRule[] {
  return evaluateRules('objectives_planning_compliance', data);
}

export function getStakeholders(data: ProjectData): {
  client: MatchedRule[];
  authority: MatchedRule[];
  consultant: MatchedRule[];
  contractor: MatchedRule[];
} {
  return {
    client: evaluateRules('stakeholders_client', data),
    authority: evaluateRules('stakeholders_authority', data),
    consultant: evaluateRules('stakeholders_consultant', data),
    contractor: evaluateRules('stakeholders_contractor', data)
  };
}

// Format for prompt injection
export function formatRulesForPrompt(
  rules: MatchedRule[],
  options: { includeConfidence?: boolean; groupBySource?: boolean } = {}
): string {
  const { includeConfidence = false, groupBySource = true } = options;

  if (groupBySource) {
    const explicit = rules.filter(r => r.source === 'explicit');
    const inferred = rules.filter(r => r.source === 'inferred');

    let output = '';

    if (explicit.length > 0) {
      output += '## From Your Selections\n';
      for (const rule of explicit) {
        for (const item of rule.resolvedItems) {
          const text = 'text' in item ? item.text : item.name;
          output += `- ${text}\n`;
        }
      }
      output += '\n';
    }

    if (inferred.length > 0) {
      output += '## Recommended for This Project\n';
      for (const rule of inferred) {
        for (const item of rule.resolvedItems) {
          const text = 'text' in item ? item.text : item.name;
          const conf = includeConfidence ? ` [${item.confidence}]` : '';
          output += `- ${text}${conf}\n`;
        }
      }
    }

    return output.trim();
  }

  // Flat list
  let output = '';
  for (const rule of rules) {
    for (const item of rule.resolvedItems) {
      const text = 'text' in item ? item.text : item.name;
      const conf = includeConfidence ? ` [${item.confidence}]` : '';
      output += `- ${text}${conf}\n`;
    }
  }

  return output.trim();
}
