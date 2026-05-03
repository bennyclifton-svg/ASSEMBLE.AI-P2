/**
 * Per-project-type configuration for the objectives module.
 *
 * Single source of truth for section labels, section definitions, conciseness
 * budgets, and polish prompt instructions. Consumed by both the UI
 * (ObjectivesWorkspace, SectionGroup) and the prompt builders (generate, polish,
 * polish-fresh) so labels and prompt semantics never drift apart.
 *
 * Adding a new project type: add a new entry to OBJECTIVE_SECTION_CONFIG.
 * Existing 'build' (new/refurb/extend/remediation) project types share BUILD_CONFIG.
 */

import type { ProjectType } from '@/types/profiler';
import type { ObjectiveType } from '@/lib/db/objectives-schema';

export interface SectionConfig {
  label: string;
  definition: string;
}

export interface ProjectTypeConfig {
  sections: Record<ObjectiveType, SectionConfig>;
  shortWordRange: [number, number];
  longWordRange: [number, number];
  bulletsPerSection: [number, number];
  polishCitationGuidance: string;
  polishMeasurableGuidance: string;
  polishVoice: string;
}

const BUILD_SECTIONS: Record<ObjectiveType, SectionConfig> = {
  functional: {
    label: 'Functional',
    definition:
      'What the building physically provides and how it operates (physical attributes, design features, operational requirements).',
  },
  quality: {
    label: 'Quality',
    definition:
      'How well the building performs and materials/finish standards (quality, performance, user experience).',
  },
  planning: {
    label: 'Planning',
    definition:
      'Planning approvals and regulatory compliance (DA/CDC, environmental, council/authority requirements).',
  },
  compliance: {
    label: 'Compliance',
    definition:
      'Building codes and certification requirements (NCC/BCA, Australian Standards, certifications).',
  },
};

const ADVISORY_SECTIONS: Record<ObjectiveType, SectionConfig> = {
  functional: {
    label: 'Scope of Advice',
    definition:
      'What aspects of the development are being reviewed or advised on (e.g. cost plan review, programme review, technical due diligence, design review).',
  },
  quality: {
    label: 'Review Standards & Methodology',
    definition:
      'Benchmarks and criteria against which the advice is given (e.g. AIQS rates for cost benchmarking, comparable project sampling, NCC compliance check basis).',
  },
  planning: {
    label: 'Deliverables',
    definition:
      'Physical outputs the client receives (e.g. written reports, PCG attendance, monthly status updates, sign-off letters, presentations).',
  },
  compliance: {
    label: 'Engagement Conditions',
    definition:
      'Cadence, PI insurance, independence, governance reporting line, scope limitations and assumptions.',
  },
};

const BUILD_CONFIG: ProjectTypeConfig = {
  sections: BUILD_SECTIONS,
  shortWordRange: [2, 4],
  longWordRange: [8, 12],
  bulletsPerSection: [3, 5],
  polishCitationGuidance:
    'cite NCC 2022, BCA, AS standards present in the domain context — do NOT invent standards',
  polishMeasurableGuidance:
    'make measurable where possible (quantities, percentages, ratings, timeframes)',
  polishVoice: 'professional, formal, suitable for tender documentation',
};

const ADVISORY_CONFIG: ProjectTypeConfig = {
  sections: ADVISORY_SECTIONS,
  shortWordRange: [4, 7],
  longWordRange: [12, 18],
  bulletsPerSection: [3, 5],
  polishCitationGuidance:
    'cite engagement-letter or data-room clauses where present in the domain context; otherwise reference AIQS or applicable professional services standards — do NOT invent citations',
  polishMeasurableGuidance:
    'make scope-bounded where possible (areas reviewed, comparables sampled, cadence) — avoid implying construction performance metrics',
  polishVoice: 'professional, formal, suitable for an engagement letter or scope of services',
};

export const OBJECTIVE_SECTION_CONFIG: Record<ProjectType, ProjectTypeConfig> = {
  new: BUILD_CONFIG,
  refurb: BUILD_CONFIG,
  extend: BUILD_CONFIG,
  remediation: BUILD_CONFIG,
  advisory: ADVISORY_CONFIG,
};

export function getSectionConfig(
  projectType: ProjectType | string | undefined | null,
): ProjectTypeConfig {
  if (projectType && projectType in OBJECTIVE_SECTION_CONFIG) {
    return OBJECTIVE_SECTION_CONFIG[projectType as ProjectType];
  }
  return BUILD_CONFIG;
}

export function isAdvisory(projectType: ProjectType | string | undefined | null): boolean {
  return projectType === 'advisory';
}
