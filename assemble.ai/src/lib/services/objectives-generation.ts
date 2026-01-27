/**
 * Objectives Generation Service
 * Orchestrates rule evaluation, prompt building, and AI generation
 */

import {
  evaluateRules,
  formatRulesForPrompt,
  getStakeholders,
  type ProjectData,
  type MatchedRule
} from './inference-engine';

import {
  buildObjectivesGeneratePrompt,
  buildObjectivesPolishPrompt,
  buildStakeholderGeneratePrompt,
  type ObjectivesPromptContext,
  type PolishPromptContext,
  type StakeholderPromptContext
} from '@/lib/prompts/objectives-prompts';

// Types
export interface GeneratedObjectives {
  explicit: string[];
  inferred: string[];
  ai_added: string[];
}

export interface PolishedObjectives {
  explicit: string[];
  inferred: string[];
  user_added: string[];
}

export interface GeneratedStakeholder {
  name: string;
  subgroup: string;
  reason: string;
  source: 'rule' | 'work_scope' | 'inferred';
}

export interface GeneratedStakeholders {
  client: GeneratedStakeholder[];
  authority: GeneratedStakeholder[];
  consultant: GeneratedStakeholder[];
  contractor: GeneratedStakeholder[];
}

// Helper: Format scale data for prompt
function formatScaleData(scaleData?: Record<string, number | string>): string {
  if (!scaleData) return 'Not specified';
  return Object.entries(scaleData)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

// Helper: Format complexity for prompt
function formatComplexity(complexity?: Record<string, string>): string {
  if (!complexity) return 'Not specified';
  return Object.entries(complexity)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

// Helper: Format stakeholder rules for prompt
function formatStakeholderRules(rules: MatchedRule[]): string {
  if (rules.length === 0) return '';

  return rules.flatMap(rule =>
    rule.resolvedItems.map(item => {
      if ('name' in item) {
        return `- ${item.name} (${item.subgroup || 'General'}) - ${item.reason}`;
      }
      return '';
    })
  ).filter(Boolean).join('\n');
}

// Build context for objectives generation
function buildObjectivesContext(
  projectData: ProjectData,
  objectiveType: 'functional_quality' | 'planning_compliance'
): ObjectivesPromptContext {
  const contentType = objectiveType === 'functional_quality'
    ? 'objectives_functional_quality'
    : 'objectives_planning_compliance';

  const matchedRules = evaluateRules(contentType, projectData);
  const explicitRules = matchedRules.filter(r => r.source === 'explicit');
  const inferredRules = matchedRules.filter(r => r.source === 'inferred');

  return {
    objectiveType,
    projectName: projectData.projectDetails.projectName || 'Unnamed Project',
    projectAddress: projectData.projectDetails.projectAddress || 'Not specified',
    jurisdiction: projectData.projectDetails.jurisdiction || 'Not specified',
    buildingClass: projectData.profiler.buildingClass || 'Not specified',
    buildingCodeLabel: projectData.profiler.buildingClass || '', // TODO: lookup
    projectType: projectData.profiler.projectType || 'Not specified',
    subclass: projectData.profiler.subclass || [],
    scaleDataFormatted: formatScaleData(projectData.profiler.scaleData),
    complexityFormatted: formatComplexity(projectData.profiler.complexity),
    explicitRules: formatRulesForPrompt(explicitRules, { groupBySource: false }),
    inferredRules: formatRulesForPrompt(inferredRules, {
      groupBySource: false,
      includeConfidence: true
    })
  };
}

// Build context for stakeholder generation
function buildStakeholderContext(projectData: ProjectData): StakeholderPromptContext {
  const stakeholderRules = getStakeholders(projectData);

  const projectSummary = `
- Building Class: ${projectData.profiler.buildingClass}
- Project Type: ${projectData.profiler.projectType}
- Subclass: ${projectData.profiler.subclass?.join(', ') || 'Not specified'}
- Scale: ${formatScaleData(projectData.profiler.scaleData)}
- Complexity: ${formatComplexity(projectData.profiler.complexity)}
  `.trim();

  const workScopeItems = projectData.profiler.workScope
    ?.map(item => `- ${item}`)
    .join('\n') || '';

  return {
    projectSummary,
    workScopeItems,
    clientRules: formatStakeholderRules(stakeholderRules.client),
    authorityRules: formatStakeholderRules(stakeholderRules.authority),
    consultantRules: formatStakeholderRules(stakeholderRules.consultant),
    contractorRules: formatStakeholderRules(stakeholderRules.contractor)
  };
}

// Main generation functions
export async function generateObjectives(
  projectData: ProjectData,
  objectiveType: 'functional_quality' | 'planning_compliance',
  aiClient: { generate: (prompt: string) => Promise<string> }
): Promise<GeneratedObjectives> {
  const context = buildObjectivesContext(projectData, objectiveType);
  const prompt = buildObjectivesGeneratePrompt(context);

  const response = await aiClient.generate(prompt);

  try {
    return JSON.parse(response) as GeneratedObjectives;
  } catch {
    // Fallback: extract from matched rules
    const matchedRules = evaluateRules(
      objectiveType === 'functional_quality'
        ? 'objectives_functional_quality'
        : 'objectives_planning_compliance',
      projectData
    );

    return {
      explicit: matchedRules
        .filter(r => r.source === 'explicit')
        .flatMap(r => r.resolvedItems.map(i => 'text' in i ? i.text : '')),
      inferred: matchedRules
        .filter(r => r.source === 'inferred')
        .flatMap(r => r.resolvedItems.map(i => 'text' in i ? i.text : '')),
      ai_added: []
    };
  }
}

export async function polishObjectives(
  projectData: ProjectData,
  objectiveType: 'functional_quality' | 'planning_compliance',
  originalObjectives: GeneratedObjectives,
  userEditedObjectives: string[],
  aiClient: { generate: (prompt: string) => Promise<string> }
): Promise<PolishedObjectives> {
  const baseContext = buildObjectivesContext(projectData, objectiveType);

  const context: PolishPromptContext = {
    ...baseContext,
    originalObjectives: JSON.stringify(originalObjectives, null, 2),
    userEditedObjectives: userEditedObjectives.map(o => `- ${o}`).join('\n')
  };

  const prompt = buildObjectivesPolishPrompt(context);
  const response = await aiClient.generate(prompt);

  try {
    return JSON.parse(response) as PolishedObjectives;
  } catch {
    // Fallback: return user edits as-is
    return {
      explicit: [],
      inferred: [],
      user_added: userEditedObjectives
    };
  }
}

export async function generateStakeholders(
  projectData: ProjectData,
  aiClient: { generate: (prompt: string) => Promise<string> }
): Promise<GeneratedStakeholders> {
  const context = buildStakeholderContext(projectData);
  const prompt = buildStakeholderGeneratePrompt(context);

  const response = await aiClient.generate(prompt);

  try {
    return JSON.parse(response) as GeneratedStakeholders;
  } catch {
    // Fallback: return rule-based stakeholders only
    const stakeholderRules = getStakeholders(projectData);

    const mapRules = (rules: MatchedRule[]): GeneratedStakeholder[] =>
      rules.flatMap(r => r.resolvedItems.map(i => ({
        name: 'name' in i ? i.name : '',
        subgroup: 'subgroup' in i ? i.subgroup || 'Other' : 'Other',
        reason: 'reason' in i ? i.reason : '',
        source: 'rule' as const
      })));

    return {
      client: mapRules(stakeholderRules.client),
      authority: mapRules(stakeholderRules.authority),
      consultant: mapRules(stakeholderRules.consultant),
      contractor: mapRules(stakeholderRules.contractor)
    };
  }
}

// Export context builders for testing
export { buildObjectivesContext, buildStakeholderContext };
