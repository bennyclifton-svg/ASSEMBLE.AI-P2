// src/lib/context/strategies.ts
// Task-type to module-requirements mapping and auto-mode keyword resolution

import type {
  ContextRequest,
  ModuleRequirements,
  ModuleRequirement,
  ModuleName,
  RequirementLevel,
} from './types';

/**
 * Strategy map: contextType:sectionKey -> module requirements.
 */
export const CONTEXT_STRATEGIES: Record<string, ModuleRequirements> = {
  // ── Report Section Strategies ──────────────────────────────────────

  'report-section:brief': {
    modules: [
      { module: 'profile', level: 'required', priority: 9 },
      { module: 'costPlan', level: 'required', priority: 8 },
      { module: 'program', level: 'required', priority: 7 },
      { module: 'risks', level: 'required', priority: 7 },
      { module: 'projectInfo', level: 'required', priority: 6 },
      { module: 'procurement', level: 'required', priority: 6 },
      { module: 'stakeholders', level: 'relevant', priority: 4 },
    ],
  },

  'report-section:summary': {
    modules: [
      { module: 'profile', level: 'required', priority: 9 },
      { module: 'costPlan', level: 'required', priority: 8 },
      { module: 'program', level: 'required', priority: 7 },
      { module: 'risks', level: 'required', priority: 7 },
      { module: 'projectInfo', level: 'required', priority: 6 },
      { module: 'procurement', level: 'required', priority: 6 },
      { module: 'stakeholders', level: 'relevant', priority: 4 },
    ],
  },

  'report-section:procurement': {
    modules: [
      { module: 'procurement', level: 'required', priority: 10 },
      { module: 'procurementDocs', level: 'required', priority: 9 },
      { module: 'costPlan', level: 'required', priority: 7 },
      { module: 'stakeholders', level: 'required', priority: 6 },
      { module: 'projectInfo', level: 'relevant', priority: 4 },
      { module: 'risks', level: 'relevant', priority: 3 },
      { module: 'milestones', level: 'relevant', priority: 3 },
    ],
  },

  'report-section:cost_planning': {
    modules: [
      { module: 'costPlan', level: 'required', priority: 10 },
      { module: 'invoices', level: 'required', priority: 8 },
      { module: 'variations', level: 'required', priority: 8 },
      { module: 'program', level: 'relevant', priority: 4 },
      { module: 'profile', level: 'relevant', priority: 3 },
      { module: 'projectInfo', level: 'relevant', priority: 3 },
    ],
  },

  'report-section:programme': {
    modules: [
      { module: 'program', level: 'required', priority: 10 },
      { module: 'milestones', level: 'required', priority: 9 },
      { module: 'risks', level: 'relevant', priority: 5 },
      { module: 'procurement', level: 'relevant', priority: 3 },
      { module: 'projectInfo', level: 'relevant', priority: 3 },
    ],
  },

  'report-section:design': {
    modules: [
      { module: 'stakeholders', level: 'required', priority: 9 },
      { module: 'milestones', level: 'required', priority: 7 },
      { module: 'procurement', level: 'relevant', priority: 5 },
      { module: 'projectInfo', level: 'relevant', priority: 5 },
      { module: 'profile', level: 'relevant', priority: 4 },
    ],
  },

  'report-section:construction': {
    modules: [
      { module: 'procurement', level: 'required', priority: 9 },
      { module: 'invoices', level: 'required', priority: 8 },
      { module: 'variations', level: 'required', priority: 8 },
      { module: 'program', level: 'required', priority: 7 },
      { module: 'milestones', level: 'relevant', priority: 5 },
      { module: 'risks', level: 'relevant', priority: 4 },
      { module: 'projectInfo', level: 'relevant', priority: 3 },
    ],
  },

  'report-section:planning_authorities': {
    modules: [
      { module: 'stakeholders', level: 'required', priority: 10 },
      { module: 'projectInfo', level: 'required', priority: 8 },
      { module: 'profile', level: 'required', priority: 7 },
      { module: 'milestones', level: 'relevant', priority: 5 },
    ],
  },

  // ── Standalone AI Feature Strategies ───────────────────────────────

  trr: {
    modules: [
      { module: 'procurement', level: 'required', priority: 10 },
      { module: 'procurementDocs', level: 'required', priority: 9 },
      { module: 'costPlan', level: 'required', priority: 8 },
      { module: 'risks', level: 'relevant', priority: 5 },
      { module: 'projectInfo', level: 'relevant', priority: 5 },
      { module: 'program', level: 'relevant', priority: 4 },
      { module: 'profile', level: 'relevant', priority: 3 },
    ],
  },

  rft: {
    modules: [
      { module: 'planningCard', level: 'required', priority: 10 },
      { module: 'procurementDocs', level: 'required', priority: 8 },
      { module: 'projectInfo', level: 'required', priority: 7 },
      { module: 'costPlan', level: 'relevant', priority: 5 },
      { module: 'program', level: 'relevant', priority: 4 },
      { module: 'procurement', level: 'relevant', priority: 3 },
    ],
  },

  note: {
    modules: [
      { module: 'starredNotes', level: 'required', priority: 8 },
      { module: 'attachedDocuments', level: 'required', priority: 7 },
      { module: 'profile', level: 'required', priority: 6 },
      { module: 'ragDocuments', level: 'relevant', priority: 5 },
      { module: 'projectInfo', level: 'relevant', priority: 5 },
    ],
  },

  'meeting-section': {
    modules: [
      { module: 'profile', level: 'required', priority: 8 },
      { module: 'projectInfo', level: 'required', priority: 7 },
      { module: 'starredNotes', level: 'required', priority: 7 },
      { module: 'stakeholders', level: 'required', priority: 6 },
      { module: 'costPlan', level: 'relevant', priority: 4 },
      { module: 'program', level: 'relevant', priority: 4 },
      { module: 'risks', level: 'relevant', priority: 3 },
      { module: 'procurement', level: 'relevant', priority: 3 },
    ],
  },

  // ── Pillar 3 & 4 Strategies ────────────────────────────────────────

  'inline-instruction': {
    autoMode: true,
    modules: [{ module: 'profile', level: 'required', priority: 5 }],
  },
};

/**
 * Resolve which strategy to use for a given context request.
 */
export function resolveStrategy(request: ContextRequest): {
  strategyKey: string;
  requirements: ModuleRequirements;
} {
  const key = request.sectionKey
    ? `${request.contextType}:${request.sectionKey}`
    : request.contextType;

  const strategy =
    CONTEXT_STRATEGIES[key] ?? CONTEXT_STRATEGIES[request.contextType];

  if (!strategy) {
    return {
      strategyKey: key,
      requirements: {
        modules: [{ module: 'profile', level: 'required', priority: 5 }],
      },
    };
  }

  return { strategyKey: key, requirements: strategy };
}

/**
 * Keyword groups that trigger specific module inclusion in auto mode.
 */
const AUTO_MODE_KEYWORDS: Array<{
  keywords: string[];
  modules: Array<{ module: ModuleName; priority: number }>;
}> = [
  {
    keywords: [
      'cost',
      'budget',
      'spend',
      'expenditure',
      'forecast',
      'contingency',
      'allowance',
    ],
    modules: [
      { module: 'costPlan', priority: 9 },
      { module: 'invoices', priority: 6 },
      { module: 'variations', priority: 6 },
    ],
  },
  {
    keywords: [
      'risk',
      'issue',
      'concern',
      'mitigation',
      'likelihood',
      'impact',
    ],
    modules: [{ module: 'risks', priority: 9 }],
  },
  {
    keywords: [
      'schedule',
      'timeline',
      'milestone',
      'programme',
      'program',
      'duration',
      'delay',
      'critical path',
      'gantt',
    ],
    modules: [
      { module: 'program', priority: 9 },
      { module: 'milestones', priority: 7 },
    ],
  },
  {
    keywords: [
      'tender',
      'procurement',
      'contractor',
      'consultant',
      'rft',
      'evaluation',
      'award',
      'shortlist',
      'firm',
    ],
    modules: [
      { module: 'procurement', priority: 9 },
      { module: 'stakeholders', priority: 5 },
    ],
  },
  {
    keywords: [
      'invoice',
      'claim',
      'payment',
      'certification',
      'progress claim',
    ],
    modules: [
      { module: 'invoices', priority: 9 },
      { module: 'costPlan', priority: 5 },
    ],
  },
  {
    keywords: [
      'variation',
      'change order',
      'scope change',
      'vo',
      'variation order',
    ],
    modules: [
      { module: 'variations', priority: 9 },
      { module: 'costPlan', priority: 5 },
    ],
  },
  {
    keywords: ['stakeholder', 'team', 'discipline', 'trade', 'authority'],
    modules: [{ module: 'stakeholders', priority: 9 }],
  },
  {
    keywords: ['note', 'minutes', 'meeting', 'action', 'decision'],
    modules: [{ module: 'starredNotes', priority: 8 }],
  },
  {
    keywords: [
      'objective',
      'compliance',
      'quality',
      'functional',
      'jurisdiction',
      'address',
      'project name',
    ],
    modules: [{ module: 'projectInfo', priority: 8 }],
  },
  {
    keywords: [
      'rft',
      'addendum',
      'addenda',
      'trr',
      'tender document',
      'request for tender',
      'tender report',
    ],
    modules: [
      { module: 'procurementDocs', priority: 9 },
      { module: 'procurement', priority: 5 },
    ],
  },
  {
    keywords: ['attachment', 'transmittal', 'attached document', 'enclosure'],
    modules: [{ module: 'attachedDocuments', priority: 9 }],
  },
];

/**
 * Resolve auto-mode modules based on task keyword matching.
 * Always includes profile. Returns deduplicated module list with highest priority wins.
 */
export function resolveAutoModeModules(task: string): ModuleRequirement[] {
  const taskLower = task.toLowerCase();
  const moduleMap = new Map<
    ModuleName,
    { level: RequirementLevel; priority: number }
  >();

  // Always include profile at base priority
  moduleMap.set('profile', { level: 'required', priority: 5 });

  for (const group of AUTO_MODE_KEYWORDS) {
    const matched = group.keywords.some((kw) => taskLower.includes(kw));
    if (matched) {
      for (const mod of group.modules) {
        const existing = moduleMap.get(mod.module);
        if (!existing || existing.priority < mod.priority) {
          moduleMap.set(mod.module, {
            level: 'required',
            priority: mod.priority,
          });
        }
      }
    }
  }

  // If no keywords matched beyond profile, include a broad set at low priority
  if (moduleMap.size === 1) {
    moduleMap.set('projectInfo', { level: 'relevant', priority: 4 });
    moduleMap.set('costPlan', { level: 'relevant', priority: 3 });
    moduleMap.set('program', { level: 'relevant', priority: 3 });
    moduleMap.set('risks', { level: 'relevant', priority: 3 });
    moduleMap.set('procurement', { level: 'relevant', priority: 3 });
  }

  return Array.from(moduleMap.entries()).map(([module, req]) => ({
    module,
    level: req.level,
    priority: req.priority,
  }));
}
