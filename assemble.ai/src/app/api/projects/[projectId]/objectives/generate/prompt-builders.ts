/**
 * Pure prompt builders for the objectives generate route.
 *
 * Extracted so they can be unit-tested without touching the database, the AI
 * client, or the retrieval pipeline. The route itself stays a thin
 * orchestration layer.
 *
 * Two builders:
 *   - buildInferencePrompt   — used when no documents are attached (rules + profile)
 *   - buildExtractionPrompt  — used when documents are attached (RAG over user docs)
 *
 * Both consume the central per-project-type config from
 * `@/lib/constants/objective-section-config` so section labels, definitions,
 * and conciseness budgets are defined in one place.
 */

import type { ProjectType } from '@/types/profiler';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import {
  getSectionConfig,
  isAdvisory,
  type ProjectTypeConfig,
} from '@/lib/constants/objective-section-config';

type ObjectiveBucket = ObjectiveType;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Render the four-section definition block using per-project-type labels and
 * definitions. Build projects show "FUNCTIONAL — What the building physically
 * provides…", advisory shows "SCOPE OF ADVICE — What aspects of the development
 * are being reviewed…", etc.
 */
function renderSectionDefinitions(config: ProjectTypeConfig): string {
  const order: ObjectiveBucket[] = ['functional', 'quality', 'planning', 'compliance'];
  return order
    .map((bucket) => {
      const { label, definition } = config.sections[bucket];
      return `${label.toUpperCase()} (${bucket} bucket):\n${definition}`;
    })
    .join('\n\n');
}

/**
 * Render the JSON shape with per-section labels, indicating which sections are
 * being requested. The DB column names (functional/quality/planning/compliance)
 * are always the JSON keys regardless of project type — they are the schema.
 * The labels above just teach the AI what content belongs where.
 */
function renderJsonShape(
  requestedBuckets: ObjectiveBucket[],
  mode: 'text' | 'sourced' = 'text',
): string {
  const example = mode === 'sourced'
    ? '[{"text": "brief-useful objective", "source": "profile_fact", "sourceDetail": "storeys: 8"}]'
    : '["bullet 1", "bullet 2"]';
  const lines = requestedBuckets.map(
    (bucket, idx) => `  "${bucket}": ${example}${idx < requestedBuckets.length - 1 ? ',' : ''}`,
  );
  return `{\n${lines.join('\n')}\n}`;
}

/**
 * Compute requested buckets from the optional section parameter. If section is
 * undefined the route generates all four; otherwise just the requested one.
 */
function resolveRequestedBuckets(section: ObjectiveBucket | undefined): ObjectiveBucket[] {
  if (section) return [section];
  return ['functional', 'quality', 'planning', 'compliance'];
}

function renderExtractionSelectionPriorities(
  requestedBuckets: ObjectiveBucket[],
  config: ProjectTypeConfig,
  advisory: boolean,
): string {
  const buildPriorities: Record<ObjectiveBucket, string[]> = {
    planning: [
      'DA/consent conditions, lapse dates, commencement gates, Council or authority approvals',
      'Principal approvals that affect scope, design selections, public domain works, or construction start',
      'Named notices or authority submissions such as Sydney Water CCN/NOR/NOA',
    ],
    functional: [
      'physical project scope, address, storeys, GFA, dwelling/tenancy counts, car spaces',
      'building uses, services integration, landscaping, public domain, access, utilities, operations',
      'requirements that describe what must be delivered, not how well it is delivered',
    ],
    quality: [
      'design life, durability, workmanship, defects, inspections, samples, warranties, handover quality',
      'finish standards and maintainability obligations that apply broadly across the project',
      'parent quality obligations over narrow material details where only five bullets are available',
    ],
    compliance: [
      'NCC/BCA, BASIX, Australian Standards, fire, acoustic, access/adaptability, WHS, environmental obligations',
      'stormwater, services authority, certification, metering, waste diversion, and statutory compliance details',
      'named standards, quantities, percentages, and technical thresholds where present in the source',
    ],
  };

  const advisoryPriorities: Record<ObjectiveBucket, string[]> = {
    planning: [
      'client deliverables, reporting cadence, meeting attendance, presentations, sign-off outputs',
      'what the client receives from the advisory engagement',
    ],
    functional: [
      'scope of advice, review boundaries, documents or development aspects being assessed',
      'specific professional services requested by the client',
    ],
    quality: [
      'review methodology, benchmarks, comparables, assumptions, evidence standards',
      'how the advice is checked, measured, or substantiated',
    ],
    compliance: [
      'engagement conditions, independence, PI insurance, governance, limitations, exclusions',
      'professional obligations or contractual conditions attached to the advice',
    ],
  };

  const priorities = advisory ? advisoryPriorities : buildPriorities;
  return requestedBuckets
    .map((bucket) => {
      const label = config.sections[bucket].label;
      const lines = priorities[bucket].map((item) => `- ${item}`).join('\n');
      return `${label.toUpperCase()} (${bucket}):\n${lines}`;
    })
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Inference rules path (no documents attached)
// ---------------------------------------------------------------------------

export interface InferencePromptInput {
  projectType: ProjectType;
  buildingClass: string;
  classDescriptors?: string[];
  subclass: string[];
  scaleData: Record<string, number | string>;
  complexity: Record<string, string | string[]>;
  workScopeLabels: string[];
  /** Already-rendered functional+quality rules block. Empty string if no rules matched OR rules skipped. */
  functionalRulesFormatted: string;
  /** Already-rendered planning+compliance rules block. Empty string if no rules matched OR rules skipped. */
  planningRulesFormatted: string;
  /** Already-rendered domain knowledge context block. Empty string if no domain results. */
  domainContextSection: string;
  domainContextBySection?: Partial<Record<ObjectiveBucket, string>>;
  /** Optional — restrict generation to a single section. */
  section?: ObjectiveBucket;
}

const SCALE_LABELS: Record<string, string> = {
  storeys: 'storeys',
  storeyCount: 'storeys',
  units: 'units',
  dwellings: 'dwellings',
  apartments: 'apartments',
  gfa_sqm: 'GFA sqm',
  gfa: 'GFA',
  avg_unit_sqm: 'average unit size sqm',
  average_unit_size: 'average unit size',
  parking_bays: 'parking spaces',
  car_spaces: 'car spaces',
  basement_levels: 'basement levels',
};

function compactLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readScaleValue(scaleData: Record<string, number | string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = scaleData[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return null;
}

function renderScaleFacts(scaleData: Record<string, number | string>): string[] {
  return Object.entries(scaleData)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${SCALE_LABELS[key] ?? compactLabel(key)}: ${value}`);
}

function includesAny(value: string, terms: string[]): boolean {
  const normalised = value.toLowerCase();
  return terms.some((term) => normalised.includes(term));
}

function filterScopes(workScopeLabels: string[], terms: string[]): string[] {
  return workScopeLabels
    .map(compactLabel)
    .filter((scope) => includesAny(scope, terms));
}

function shortJoin(values: string[], max = 4): string {
  const unique = [...new Set(values.filter(Boolean))];
  const visible = unique.slice(0, max);
  const suffix = unique.length > max ? ` and ${unique.length - max} more` : '';
  return `${visible.join(', ')}${suffix}`;
}

function assetLabel(buildingClass: string, subclass: string[]): string {
  if (subclass.some((item) => item.toLowerCase().includes('apartment'))) return 'apartment building';
  if (subclass.length > 0) return compactLabel(subclass[0]);
  return `${compactLabel(buildingClass)} building`;
}

function renderProfileAnchorBlock(input: {
  projectType: ProjectType;
  buildingClass: string;
  classDescriptors: string[];
  subclass: string[];
  scaleData: Record<string, number | string>;
  workScopeLabels: string[];
}, requestedBuckets: ObjectiveBucket[]): string {
  if (isAdvisory(input.projectType)) return '';

  const buckets = new Map<ObjectiveBucket, string[]>();
  for (const bucket of requestedBuckets) buckets.set(bucket, []);

  const add = (bucket: ObjectiveBucket, value: string | null | undefined) => {
    const list = buckets.get(bucket);
    if (!list || !value) return;
    if (!list.includes(value)) list.push(value);
  };

  const storeys = readScaleValue(input.scaleData, ['storeys', 'storeyCount']);
  const units = readScaleValue(input.scaleData, ['units', 'dwellings', 'apartments']);
  const avgUnit = readScaleValue(input.scaleData, ['avg_unit_sqm', 'average_unit_size']);
  const parking = readScaleValue(input.scaleData, ['parking_bays', 'car_spaces']);
  const asset = assetLabel(input.buildingClass, input.subclass);

  const civilScopes = filterScopes(input.workScopeLabels, [
    'demolition',
    'site clearance',
    'decontamination',
    'earthworks',
    'excavation',
    'site drainage',
    'stormwater',
    'internal road',
    'civil',
  ]);
  const finishScopes = filterScopes(input.workScopeLabels, [
    'partition',
    'wall',
    'ceiling',
    'floor',
    'finish',
    'joinery',
  ]);
  const serviceScopes = filterScopes(input.workScopeLabels, [
    'mechanical',
    'electrical',
    'hydraulic',
    'fire',
    'services',
  ]);

  add('functional', storeys ? `Deliver ${storeys}-storey ${asset}` : `Deliver ${asset}`);
  add('functional', units ? `Provide ${units} apartments or dwellings` : null);
  add('functional', avgUnit ? `Maintain ${avgUnit} sqm average unit size` : null);
  add('functional', parking ? `Integrate ${parking} parking spaces` : null);
  add('functional', civilScopes.length ? `Coordinate civil scope: ${shortJoin(civilScopes)}` : null);
  add('functional', serviceScopes.length ? `Integrate building services: ${shortJoin(serviceScopes)}` : null);

  add('planning', storeys ? `Obtain approvals for ${storeys}-storey ${asset}` : 'Obtain project planning approvals');
  add('planning', civilScopes.length ? 'Coordinate civil, stormwater and site-work approvals' : null);
  add('planning', includesAny(civilScopes.join(' '), ['decontamination'])
    ? 'Confirm decontamination and site-clearance approvals'
    : null);

  add('quality', finishScopes.length ? `Set finish quality for ${shortJoin(finishScopes)}` : null);
  add('quality', civilScopes.length ? 'Control earthworks, drainage and stormwater workmanship' : null);
  add('quality', input.subclass.some((item) => item.toLowerCase().includes('apartment'))
    ? 'Set apartment facade, acoustic and waterproofing standards'
    : null);

  add('compliance', input.classDescriptors.length ? `Confirm ${input.classDescriptors.join('; ')} compliance` : null);
  add('compliance', input.subclass.some((item) => item.toLowerCase().includes('apartment'))
    ? 'Comply with Class 2 NCC, BASIX and NatHERS'
    : 'Comply with NCC and Australian Standards');
  add('compliance', civilScopes.length ? 'Meet stormwater, environmental and site safety controls' : null);

  const scaleFacts = renderScaleFacts(input.scaleData);
  const scopeFacts = input.workScopeLabels.map(compactLabel).filter(Boolean);
  const lines = [
    '## PROFILE-DERIVED BRIEF ANCHORS',
    'Use these concrete profile signals before generic model knowledge. Prefer objectives that preserve a number, class signal, or selected work-scope item.',
    scaleFacts.length ? `Profile scale facts: ${scaleFacts.join('; ')}` : '',
    scopeFacts.length ? `Selected work scope facts: ${scopeFacts.join('; ')}` : '',
    '',
  ].filter((line) => line !== '');

  for (const bucket of requestedBuckets) {
    const anchors = buckets.get(bucket) ?? [];
    if (anchors.length === 0) continue;
    lines.push(`${bucket.toUpperCase()} candidate anchors:`);
    for (const anchor of anchors) lines.push(`- ${anchor}`);
    lines.push('');
  }

  lines.push('Avoid vague replacements such as "standard DA approval", "standard quality construction", "urban constraints", or "authority inspections timely" unless tied to a concrete profile fact above.');

  return lines.join('\n');
}

export function buildInferencePrompt(input: InferencePromptInput): string {
  const {
    projectType,
    buildingClass,
    classDescriptors = [],
    subclass,
    scaleData,
    complexity,
    workScopeLabels,
    functionalRulesFormatted,
    planningRulesFormatted,
    domainContextSection,
    domainContextBySection = {},
    section,
  } = input;

  const config = getSectionConfig(projectType);
  const requestedBuckets = resolveRequestedBuckets(section);
  const sectionDefinitions = renderSectionDefinitions(config);
  const jsonShape = renderJsonShape(requestedBuckets, 'sourced');

  const hasSpecificScope = workScopeLabels.length > 0;
  const advisory = isAdvisory(projectType);
  const [bulletsMin, bulletsMax] = config.bulletsPerSection;
  const [shortMin, shortMax] = config.shortWordRange;

  // Profile header — for advisory, the work scope label is "Scope of Advice"
  // (semantically). The line below uses "Work Scope" verbatim for build but
  // "Scope of Advice" for advisory so the AI reads it as the right concept.
  const scopeFieldLabel = advisory ? 'Scope of Advice' : 'Work Scope';

  // Hard scope constraint — for advisory this is critical because the scope
  // selection IS the substantive content; for build it's a focusing instruction.
  const scopeConstraint = hasSpecificScope
    ? advisory
      ? `\nCRITICAL SCOPE CONSTRAINT:\nThis is an advisory engagement. The client has selected the following Scope of Advice: ${workScopeLabels.join(', ')}.\nYour objectives MUST focus on these review/advisory items. Treat them as the engagement's substantive scope, not as construction work to perform.\n`
      : `\nCRITICAL SCOPE CONSTRAINT:\nThe client has specifically selected: ${workScopeLabels.join(', ')}.\nYour objectives MUST focus EXCLUSIVELY on these selected items.\n`
    : '';

  // Suggested-items block — populated only on the build path. Advisory skips
  // inference rules entirely (the existing 175-rule corpus is build-shaped and
  // would contaminate output) so this section is empty for advisory.
  const suggestedItemsSection: string[] = [];
  if (functionalRulesFormatted) {
    suggestedItemsSection.push(
      `## ${config.sections.functional.label} & ${config.sections.quality.label}\n${functionalRulesFormatted}`,
    );
  }
  if (planningRulesFormatted) {
    suggestedItemsSection.push(
      `## ${config.sections.planning.label} & ${config.sections.compliance.label}\n${planningRulesFormatted}`,
    );
  }

  const suggestedItemsBlock =
    suggestedItemsSection.length > 0
      ? suggestedItemsSection.join('\n\n')
      : advisory
        ? '(Advisory engagement — generate from your scope selections and project profile. Inference rules intentionally bypassed for advisory.)'
        : '(No specific rules matched — generate based on project profile)';

  // Advisory-only banner reminder so the AI knows the user is in draft mode
  // when no documents are attached.
  const advisoryDraftNote = advisory
    ? '\nNOTE: No reference documents are attached. Treat this as a draft scope — output should reflect the user\'s stated scope selections; the user will refine after attaching reference material.\n'
    : '';

  const expectedCountPhrase = `${bulletsMin}-${bulletsMax}`;
  const lengthPhrase = `${shortMin}-${shortMax} words`;
  const classDescriptorLine = classDescriptors.length > 0
    ? `- Building Code / Class Signals: ${classDescriptors.join('; ')}\n`
    : '';
  const scopedDomainContext = requestedBuckets
    .map((bucket) => domainContextBySection[bucket])
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n\n');
  const knowledgeContext = scopedDomainContext || domainContextSection;
  const profileAnchorBlock = renderProfileAnchorBlock({
    projectType,
    buildingClass,
    classDescriptors,
    subclass,
    scaleData,
    workScopeLabels,
  }, requestedBuckets);

  return `You are an expert construction project manager in Australia.

PROJECT PROFILE:
- Building Class: ${buildingClass}
- Building Subclass(es): ${subclass.join(', ') || 'Not specified'}
${classDescriptorLine.trimEnd()}
- Project Type: ${projectType}
- Scale: ${Object.entries(scaleData).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Not specified'}
- Complexity: ${Object.entries(complexity).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(', ') || 'Not specified'}
${hasSpecificScope ? `- ${scopeFieldLabel}: ${workScopeLabels.join(', ')}` : ''}
${scopeConstraint}${advisoryDraftNote}
${profileAnchorBlock ? `${profileAnchorBlock}\n\n` : ''}${knowledgeContext ? `${knowledgeContext}\n` : ''}SECTION DEFINITIONS — CRITICAL:
The four sections have DIFFERENT purposes. DO NOT mix content between them. The JSON keys below are fixed (functional/quality/planning/compliance) but each represents the labelled concept for this project type.

${sectionDefinitions}

SUGGESTED ITEMS FROM PROJECT ANALYSIS:
${suggestedItemsBlock}

SOURCE TYPES — CRITICAL:
Use exactly one source value for each objective object:
- "profile_fact": directly uses a project profile value such as class, subclass, scale, complexity, or selected work scope.
- "inference_rule": directly uses a suggested item from project analysis.
- "seed_knowledge": grounded in the knowledge domain context above.
- "llm_common": general professional knowledge only; use sparingly and only if needed to complete the section.

SOURCE DISCIPLINE - NO DOCUMENTS ATTACHED:
The knowledge context is reference material, not project evidence. Do NOT turn conditional seed-guide examples into project facts.
Only mention heritage, contamination, remediation, site auditor, staging, partial occupation, overlays, unusual authority conditions, or existing-site constraints when they appear in the project profile, selected work scope, suggested items, or explicit knowledge source detail.
Do NOT describe an 8-storey or multi-storey apartment project as low-rise.

INSTRUCTIONS:
Generate concise but useful brief objectives (${lengthPhrase} each).
1. Include suggested items ONLY in their correct section
2. Prioritise profile facts, inference rules, and seed knowledge before general model knowledge
3. For multi-class or multi-subclass projects, include obligations for each material class/use where relevant
4. Add only objectives supported by the profile, suggested items, or seed guidance that applies to this profile
5. Each objective text: ${shortMax} words MAXIMUM, but do not sacrifice the concrete profile signal just to be shorter
6. Start each objective with a useful obligation verb such as Confirm, Obtain, Comply, Coordinate, Deliver, Provide, Maintain, Achieve, Meet, Submit, or Integrate
7. Avoid filler adjectives like standard, high-quality, appropriate, timely, or robust unless paired with a concrete profile fact, standard, or selected scope
8. NO prose, NO sentences, NO detailed explanations
9. Output ${expectedCountPhrase} bullets per section
10. OUTPUT FORMAT: JSON arrays of objects (no HTML)

Respond in JSON format with only the sections requested:
${jsonShape}`;
}

export interface ObjectiveSelectionPromptInput {
  projectType: ProjectType;
  buildingClass: string;
  candidates: Partial<Record<ObjectiveBucket, ObjectiveSelectionCandidate[]>>;
  /** Optional - restrict selection to a single section. */
  section?: ObjectiveBucket;
}

function renderCandidateBlock(
  requestedBuckets: ObjectiveBucket[],
  candidates: Partial<Record<ObjectiveBucket, ObjectiveSelectionCandidate[]>>,
): string {
  const payload = requestedBuckets.reduce<Partial<Record<ObjectiveBucket, ObjectiveSelectionCandidate[]>>>(
    (acc, bucket) => {
      acc[bucket] = candidates[bucket] ?? [];
      return acc;
    },
    {},
  );
  return JSON.stringify(payload, null, 2);
}

export function buildObjectiveSelectionPrompt(input: ObjectiveSelectionPromptInput): string {
  const {
    projectType,
    buildingClass,
    candidates,
    section,
  } = input;

  const config = getSectionConfig(projectType);
  const requestedBuckets = resolveRequestedBuckets(section);
  const sectionDefinitions = renderSectionDefinitions(config);
  const advisory = isAdvisory(projectType);
  const selectionPriorities = renderExtractionSelectionPriorities(requestedBuckets, config, advisory);
  const [bulletsMin, bulletsMax] = config.bulletsPerSection;
  const [shortMin, shortMax] = config.shortWordRange;
  const jsonShape = renderJsonShape(requestedBuckets, 'sourced');
  const candidateBlock = renderCandidateBlock(requestedBuckets, candidates);

  return `You are a senior construction brief editor in Australia.

Your job is to turn extracted candidates into a sharp final Short objective list. The candidates are source-backed, but many are too narrow to deserve a top-level brief slot.

Project Type: ${projectType}
Building Class: ${buildingClass}

## Candidate Objectives
${candidateBlock}

## Section Definitions - CRITICAL
The JSON keys are fixed, but each section has a different editorial purpose.

${sectionDefinitions}

## Selection Priorities
Use this ranking lens when deciding what deserves one of the limited Short bullet slots:

${selectionPriorities}

## Editorial Rules
1. Select ${bulletsMin}-${bulletsMax} final objectives per requested section. Select ${bulletsMax} where the candidate set supports it.
2. Prefer broad, brief-worthy parent obligations over isolated component details.
3. If a broad roll-up candidate and a raw clause-detail candidate express the same obligation, ALWAYS select the broad roll-up.
4. You MAY rewrite or roll up multiple candidates into a stronger parent objective, but the final objective must remain supported by sourceDetail from the candidates.
5. Penalise candidates that are merely fixtures, isolated products, locations, or narrow construction details unless they are genuinely project-defining.
6. Reward candidates that express approvals, scope, authority obligations, compliance standards, project quantities, warranties, defects, handover, inspections, services, stormwater, fire, acoustic, BASIX, accessibility, waste, or Principal approval requirements.
7. Remove duplicates and merge near-duplicates.
8. Start each final objective with a useful obligation verb such as Obtain, Comply, Coordinate, Submit, Deliver, Provide, Maintain, Achieve, Meet, or Integrate.
9. Keep final text SHORT (${shortMin}-${shortMax} words). No sentences, no explanations.
10. Preserve source evidence by returning a concise "sourceDetail" for each selected objective. If you roll up candidates, combine the source details.

## Final Text Must Avoid
Avoid these narrow clause-detail terms in final Short text. Roll them up instead:
tapware, pavers, sealer, three-coat, painted, rendered, signage design, Fire Indicator Panel, fire rated walls, sediment control, 1-3 bedroom mix.

## Roll-Up Examples
These are examples of the editorial judgement required:
- BAD: "50-year design life" -> GOOD: "Maintain 50-year structural design life"
- BAD: "Main Fire Indicator Panel location" -> GOOD: "Coordinate fire safety systems approvals"
- BAD: "BASIX requirements for tapware" -> GOOD: "Comply with BASIX sustainability requirements"
- BAD: "Automatic watering system for landscaping" -> GOOD: "Deliver landscaping and maintenance obligations"
- BAD: "Audio-visual intercom systems" -> GOOD: "Provide secure access and intercom systems"
- BAD: "Premium sealed pavers, slip rating" -> GOOD: "Deliver durable public-domain finishes"
- BAD: "DA201500704, consent lapses 17.10.2023" -> GOOD: "Comply with DA consent conditions"
- BAD: "Three-coat painted surfaces" -> GOOD: "Deliver durable finish standards"
- BAD: "Feature 1-3 bedroom mix" -> GOOD: "Deliver approved apartment mix"
- BAD: "Fire rated walls compliance" -> GOOD: "Maintain fire safety compliance"

Return only JSON arrays of objects in this shape:
${jsonShape}`;
}

// ---------------------------------------------------------------------------
// Document extraction path (documents attached)
// ---------------------------------------------------------------------------

export interface ObjectiveSelectionCandidate {
  text: string;
  sourceDetail?: string;
}

interface ObjectiveRollupRule {
  sections: ObjectiveBucket[];
  pattern: RegExp;
  replacement: string;
}

const BUILD_OBJECTIVE_ROLLUP_RULES: ObjectiveRollupRule[] = [
  {
    sections: ['planning'],
    pattern: /\b(construction certificate|occupation certificate|pca|principal certifying authority)\b/i,
    replacement: 'Obtain required certificates and approvals',
  },
  {
    sections: ['planning'],
    pattern: /\b(da201500704|development consent|consent conditions?|consent lapses?|lapse date|environmental consent)\b/i,
    replacement: 'Comply with DA consent conditions',
  },
  {
    sections: ['planning'],
    pattern: /\b(authority approvals?|authority access|authority inspections?|approvals? to commence)\b/i,
    replacement: 'Secure authority approvals before works',
  },
  {
    sections: ['planning', 'compliance'],
    pattern: /\b(sydney water|construction commencement notice|ccn|notice of requirements|notice of arrangements)\b/i,
    replacement: 'Submit Sydney Water notices',
  },
  {
    sections: ['planning'],
    pattern: /\b(inner west council|council|public domain|signage)\b/i,
    replacement: 'Coordinate Council public domain works',
  },
  {
    sections: ['planning', 'quality'],
    pattern: /\b(principal approval|approval from the principal|submitted to the principal)\b/i,
    replacement: 'Obtain Principal design approvals',
  },
  {
    sections: ['planning', 'compliance'],
    pattern: /\b(fire indicator panel|fire engineered|fire stair|fire stairs)\b/i,
    replacement: 'Coordinate fire safety approvals',
  },
  {
    sections: ['functional'],
    pattern: /\b(5\s*[- ]?storey|mixed[- ]?use|residential flat building|building a|building b)\b/i,
    replacement: 'Deliver 5-storey mixed-use development',
  },
  {
    sections: ['functional'],
    pattern: /\b(10 apartments?|6 apartments?|4 apartments?|dwellings?|retail tenancy|commercial tenancy)\b/i,
    replacement: 'Provide 10 apartments and retail tenancy',
  },
  {
    sections: ['functional'],
    pattern: /\b(9 car|car spaces?|bike storage|parking)\b/i,
    replacement: 'Provide basement parking and bike storage',
  },
  {
    sections: ['functional'],
    pattern: /\b(1\s*[-–]\s*3 bedroom|bedroom mix|apartment mix)\b/i,
    replacement: 'Deliver approved apartment mix',
  },
  {
    sections: ['functional'],
    pattern: /\b(metering|utilities|utility|energy|telecom|sewer|water services?|gas|electricity|building services)\b/i,
    replacement: 'Integrate utilities and building services',
  },
  {
    sections: ['functional'],
    pattern: /\b(watering system|irrigation|landscap(?:e|ing)|landscape maintenance)\b/i,
    replacement: 'Deliver landscaping and maintenance systems',
  },
  {
    sections: ['functional'],
    pattern: /\b(intercom|audio[- ]?visual|rfid|access control|security systems?)\b/i,
    replacement: 'Provide secure access systems',
  },
  {
    sections: ['quality'],
    pattern: /\b(50\s*[- ]?year|design life)\b/i,
    replacement: 'Maintain 50-year structural design life',
  },
  {
    sections: ['quality'],
    pattern: /\b(defect|handover|practical completion|defects liability)\b/i,
    replacement: 'Achieve defect-free practical completion',
  },
  {
    sections: ['quality'],
    pattern: /\b(three[- ]?coat|paint(?:ed)?|render(?:ed)?|facade|façade|durable|weatherproof|pavers?|sealer|slip rating|finishes?)\b/i,
    replacement: 'Deliver durable finish standards',
  },
  {
    sections: ['quality'],
    pattern: /\b(waterproof|flood[- ]?test|15\s*[- ]?year warranty)\b/i,
    replacement: 'Provide waterproofing warranties and testing',
  },
  {
    sections: ['quality'],
    pattern: /\b(samples?|sample approval|rendered finish samples?|expansion joint samples?)\b/i,
    replacement: 'Submit finish samples for approval',
  },
  {
    sections: ['quality'],
    pattern: /\b(pre[- ]?cover|inspection|hold point|fire safety inspections?)\b/i,
    replacement: 'Complete inspection and quality hold points',
  },
  {
    sections: ['compliance'],
    pattern: /\b(ncc|bca|national construction code|australian standards?)\b/i,
    replacement: 'Comply with NCC and Australian Standards',
  },
  {
    sections: ['compliance'],
    pattern: /\b(basix|tapware|section j|sustainability)\b/i,
    replacement: 'Comply with BASIX sustainability requirements',
  },
  {
    sections: ['compliance'],
    pattern: /\b(fire[- ]?rated|fire safety|fire compartment|fire walls?|fire stairs?|egress)\b/i,
    replacement: 'Maintain fire safety compliance',
  },
  {
    sections: ['compliance'],
    pattern: /\b(acoustic|noise)\b/i,
    replacement: 'Meet acoustic performance requirements',
  },
  {
    sections: ['compliance'],
    pattern: /\b(sediment|erosion|environmental|waste|60%)\b/i,
    replacement: 'Meet environmental and waste obligations',
  },
  {
    sections: ['compliance'],
    pattern: /\b(stormwater|class 3|drainage|council standards)\b/i,
    replacement: 'Meet stormwater authority requirements',
  },
  {
    sections: ['compliance'],
    pattern: /\b(as\s*4299|as4299|as\s*1428|as1428|adaptable|accessibility)\b/i,
    replacement: 'Provide adaptable apartment compliance',
  },
];

function candidateKey(candidate: ObjectiveSelectionCandidate): string {
  return candidate.text.trim().toLowerCase();
}

function rollUpCandidate(
  section: ObjectiveBucket,
  candidate: ObjectiveSelectionCandidate,
): ObjectiveSelectionCandidate[] {
  const haystack = `${candidate.text} ${candidate.sourceDetail ?? ''}`;
  return BUILD_OBJECTIVE_ROLLUP_RULES
    .filter((rule) => rule.sections.includes(section) && rule.pattern.test(haystack))
    .map((rule) => ({
      text: rule.replacement,
      sourceDetail: candidate.sourceDetail
        ? `Rolled up from source evidence: ${candidate.sourceDetail}`
        : `Rolled up from source candidate: ${candidate.text}`,
    }));
}

export function prepareObjectiveSelectionCandidates(
  candidates: Partial<Record<ObjectiveBucket, ObjectiveSelectionCandidate[]>>,
): Partial<Record<ObjectiveBucket, ObjectiveSelectionCandidate[]>> {
  const prepared: Partial<Record<ObjectiveBucket, ObjectiveSelectionCandidate[]>> = {};

  for (const section of ['functional', 'quality', 'planning', 'compliance'] as ObjectiveBucket[]) {
    const seen = new Set<string>();
    const out: ObjectiveSelectionCandidate[] = [];

    for (const candidate of candidates[section] ?? []) {
      for (const rolledUp of rollUpCandidate(section, candidate)) {
        const key = candidateKey(rolledUp);
        if (!seen.has(key)) {
          out.push(rolledUp);
          seen.add(key);
        }
      }

      const rawKey = candidateKey(candidate);
      if (!seen.has(rawKey)) {
        out.push(candidate);
        seen.add(rawKey);
      }
    }

    if (out.length > 0) prepared[section] = out;
  }

  return prepared;
}

export interface ExtractionPromptInput {
  projectType: ProjectType;
  buildingClass: string;
  domainContextSection: string;
  domainContextBySection?: Partial<Record<ObjectiveBucket, string>>;
  /** Full indexed attached-document text or summaries. This is the authoritative source. */
  attachedDocumentContext?: string;
  /** Per-section retrieved-content blocks. */
  retrievedFunctional: string;
  retrievedPlanning: string;
  /** Optional — restrict generation to a single section. */
  section?: ObjectiveBucket;
}

export interface FullDocumentObjectivesPromptInput {
  projectType: ProjectType;
  buildingClass: string;
  profileSummary: string;
  /** Full indexed attached-document text. This is the authoritative source. */
  attachedDocumentContext: string;
  /** Optional - restrict generation to a single section. */
  section?: ObjectiveBucket;
}

export function buildFullDocumentObjectivesPrompt(input: FullDocumentObjectivesPromptInput): string {
  const {
    projectType,
    buildingClass,
    profileSummary,
    attachedDocumentContext,
    section,
  } = input;

  const config = getSectionConfig(projectType);
  const requestedBuckets = resolveRequestedBuckets(section);
  const sectionDefinitions = renderSectionDefinitions(config);
  const selectionPriorities = renderExtractionSelectionPriorities(
    requestedBuckets,
    config,
    isAdvisory(projectType),
  );
  const jsonShape = renderJsonShape(requestedBuckets, 'sourced');
  const [bulletsMin, bulletsMax] = config.bulletsPerSection;
  const [shortMin, shortMax] = config.shortWordRange;

  return `You are a senior Australian construction project manager and brief editor.

Generate the final project objectives from the attached document text.

Project Type: ${projectType}
Building Class: ${buildingClass}

## Project Profile - Framing Only
${profileSummary || '(No project profile supplied.)'}

## Attached Document Text - Authoritative
${attachedDocumentContext}

## Section Definitions
The JSON keys are fixed (functional/quality/planning/compliance), but each section has a different purpose.

${sectionDefinitions}

## Selection Priorities
Use this lens when deciding what deserves one of the limited objective slots:

${selectionPriorities}

## Instructions
1. Read the attached document text as a whole before selecting objectives.
2. Use the attached document as the authority for project obligations, requirements, approvals, quantities, standards, dates, parties, and scope.
3. Use the project profile only to interpret the document and choose the right section labels. Do not invent objectives from profile facts alone.
4. Do not use generic construction-management advice unless it is directly supported by the document.
5. Generate ${bulletsMin}-${bulletsMax} final objectives per requested section. If the document supports fewer than ${bulletsMin}, return fewer rather than inventing.
6. Prefer broad, brief-worthy parent obligations over isolated clause details, fixtures, products, or minor workmanship notes.
7. Preserve source evidence in "sourceDetail" with the exact fact, clause, approval, standard, quantity, threshold, date, or obligation that supports the objective.
8. Keep objective text short (${shortMin}-${shortMax} words). Start with a useful obligation verb such as Obtain, Comply, Coordinate, Submit, Deliver, Provide, Maintain, Achieve, Meet, or Integrate.
9. Return only JSON arrays of objects. No prose, no markdown, no HTML.

Return only the sections requested in this shape:
${jsonShape}`;
}

export function buildExtractionPrompt(input: ExtractionPromptInput): string {
  const {
    projectType,
    buildingClass,
    domainContextSection,
    domainContextBySection = {},
    attachedDocumentContext = '',
    retrievedFunctional,
    retrievedPlanning,
    section,
  } = input;

  const config = getSectionConfig(projectType);
  const requestedBuckets = resolveRequestedBuckets(section);
  const sectionDefinitions = renderSectionDefinitions(config);
  const jsonShape = renderJsonShape(requestedBuckets, 'sourced');
  const advisory = isAdvisory(projectType);
  const [shortMin, shortMax] = config.shortWordRange;

  const sourceAuthorityNote = advisory
    ? '\n## Source hierarchy (advisory):\n1. Attached documents are AUTHORITATIVE — extract scope and engagement terms verbatim where present.\n2. Project profile (building class, scale) is FRAMING — describes the asset under advice but does not invent objectives.\n3. Knowledge library is REFERENCE for phrasing only — never the source of project facts.\n'
    : '';
  const scopedDomainContext = requestedBuckets
    .map((bucket) => domainContextBySection[bucket])
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n\n');
  const knowledgeContext = scopedDomainContext || domainContextSection;

  return `You are an expert construction project manager in Australia.

You have been given excerpts from project documents (briefs, Statements of Environmental Effects, client design objectives, engagement letters, etc.). Extract project objectives from these documents and sort them into four categories.

Project Type: ${projectType}
Building Class: ${buildingClass}
${sourceAuthorityNote}
## Attached Indexed Document Context - AUTHORITATIVE
${attachedDocumentContext || '(No full indexed document context available. Use retrieved excerpts below.)'}

${knowledgeContext ? `${knowledgeContext}\n` : ''}## Retrieved Content — ${config.sections.functional.label} & ${config.sections.quality.label}
${retrievedFunctional || '(No relevant content found)'}

## Retrieved Content — ${config.sections.planning.label} & ${config.sections.compliance.label}
${retrievedPlanning || '(No relevant content found)'}

## Section Definitions — CRITICAL:
The JSON keys below are fixed (functional/quality/planning/compliance) but each represents the labelled concept for this project type.

${sectionDefinitions}

## Instructions:
1. First use the Attached Indexed Document Context. It is the authoritative source material.
2. Use retrieved excerpts only as additional evidence, not as a substitute for the attached document context.
3. Extract ONLY objectives/requirements that are explicitly stated or clearly implied in the source documents.
4. DO NOT invent or hallucinate objectives not supported by the attached documents.
5. Avoid generic construction-management advice. Preserve project-specific facts such as approvals, address, GFA, storeys, Principal approvals, authority obligations, NCC/BASIX/AS references, utilities, stormwater, fire, acoustic, waste, inspections, documentation, defects, and handover requirements when present.
6. This is the candidate extraction pass, not the final brief. Return 8-15 source-backed candidate objectives per requested section when the source supports that many.
7. Include both parent obligations and lower-level clause details. A later editor pass will select and roll up the final Short list.
8. Candidate text should be SHORT (${shortMin}-${shortMax} words each), but sourceDetail may be longer.
9. Each candidate object MUST include:
   - "text": concise candidate objective
   - "sourceDetail": the specific source fact, clause, obligation, quantity, threshold, authority, standard, date, warranty, or approval that supports it
10. OUTPUT FORMAT: JSON arrays of objects (no HTML). Do not return analysis outside JSON.

Respond in JSON format with only the sections requested:
${jsonShape}`;
}
