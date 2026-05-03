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
function renderJsonShape(requestedBuckets: ObjectiveBucket[]): string {
  const lines = requestedBuckets.map(
    (bucket, idx) =>
      `  "${bucket}": ["bullet 1", "bullet 2"]${idx < requestedBuckets.length - 1 ? ',' : ''}`,
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

// ---------------------------------------------------------------------------
// Inference rules path (no documents attached)
// ---------------------------------------------------------------------------

export interface InferencePromptInput {
  projectType: ProjectType;
  buildingClass: string;
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
  /** Optional — restrict generation to a single section. */
  section?: ObjectiveBucket;
}

export function buildInferencePrompt(input: InferencePromptInput): string {
  const {
    projectType,
    buildingClass,
    subclass,
    scaleData,
    complexity,
    workScopeLabels,
    functionalRulesFormatted,
    planningRulesFormatted,
    domainContextSection,
    section,
  } = input;

  const config = getSectionConfig(projectType);
  const requestedBuckets = resolveRequestedBuckets(section);
  const sectionDefinitions = renderSectionDefinitions(config);
  const jsonShape = renderJsonShape(requestedBuckets);

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

  return `You are an expert construction project manager in Australia.

PROJECT PROFILE:
- Building Class: ${buildingClass}
- Project Type: ${projectType}
- Subclass: ${subclass.join(', ') || 'Not specified'}
- Scale: ${Object.entries(scaleData).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Not specified'}
- Complexity: ${Object.entries(complexity).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(', ') || 'Not specified'}
${hasSpecificScope ? `- ${scopeFieldLabel}: ${workScopeLabels.join(', ')}` : ''}
${scopeConstraint}${advisoryDraftNote}
${domainContextSection ? `${domainContextSection}\n` : ''}SECTION DEFINITIONS — CRITICAL:
The four sections have DIFFERENT purposes. DO NOT mix content between them. The JSON keys below are fixed (functional/quality/planning/compliance) but each represents the labelled concept for this project type.

${sectionDefinitions}

SUGGESTED ITEMS FROM PROJECT ANALYSIS:
${suggestedItemsBlock}

INSTRUCTIONS:
Generate SHORT bullet points only (${lengthPhrase} each).
1. Include suggested items ONLY in their correct section
2. Add other relevant objectives appropriate to a ${buildingClass} ${projectType} project
3. Each bullet: ${shortMax} words MAXIMUM
4. NO prose, NO sentences, NO detailed explanations
5. Output ${expectedCountPhrase} bullets per section
6. OUTPUT FORMAT: plain text arrays in JSON (no HTML)

Respond in JSON format with only the sections requested:
${jsonShape}`;
}

// ---------------------------------------------------------------------------
// Document extraction path (documents attached) — Phase 1 keeps the existing
// shape; Phase 2 will add scope-derived queries and source-hierarchy framing.
// ---------------------------------------------------------------------------

export interface ExtractionPromptInput {
  projectType: ProjectType;
  buildingClass: string;
  domainContextSection: string;
  /** Per-section retrieved-content blocks. */
  retrievedFunctional: string;
  retrievedPlanning: string;
  /** Optional — restrict generation to a single section. */
  section?: ObjectiveBucket;
}

export function buildExtractionPrompt(input: ExtractionPromptInput): string {
  const {
    projectType,
    buildingClass,
    domainContextSection,
    retrievedFunctional,
    retrievedPlanning,
    section,
  } = input;

  const config = getSectionConfig(projectType);
  const requestedBuckets = resolveRequestedBuckets(section);
  const sectionDefinitions = renderSectionDefinitions(config);
  const jsonShape = renderJsonShape(requestedBuckets);
  const advisory = isAdvisory(projectType);
  const [bulletsMin, bulletsMax] = config.bulletsPerSection;
  const [shortMin, shortMax] = config.shortWordRange;

  const sourceAuthorityNote = advisory
    ? '\n## Source hierarchy (advisory):\n1. Attached documents are AUTHORITATIVE — extract scope and engagement terms verbatim where present.\n2. Project profile (building class, scale) is FRAMING — describes the asset under advice but does not invent objectives.\n3. Knowledge library is REFERENCE for phrasing only — never the source of project facts.\n'
    : '';

  return `You are an expert construction project manager in Australia.

You have been given excerpts from project documents (briefs, Statements of Environmental Effects, client design objectives, engagement letters, etc.). Extract project objectives from these documents and sort them into four categories.

Project Type: ${projectType}
Building Class: ${buildingClass}
${sourceAuthorityNote}
${domainContextSection ? `${domainContextSection}\n` : ''}## Retrieved Content — ${config.sections.functional.label} & ${config.sections.quality.label}
${retrievedFunctional || '(No relevant content found)'}

## Retrieved Content — ${config.sections.planning.label} & ${config.sections.compliance.label}
${retrievedPlanning || '(No relevant content found)'}

## Section Definitions — CRITICAL:
The JSON keys below are fixed (functional/quality/planning/compliance) but each represents the labelled concept for this project type.

${sectionDefinitions}

## Instructions:
1. Extract ONLY objectives/requirements that are explicitly stated or clearly implied in the source documents
2. DO NOT invent or hallucinate any objectives not supported by the documents
3. Sort each item into the correct section
4. Format as SHORT bullet points (${shortMin}-${shortMax} words each)
5. Output ${bulletsMin}-${bulletsMax} bullets per section where the documents support it
6. OUTPUT FORMAT: JSON arrays of plain text bullet strings (no HTML)

Respond in JSON format with only the sections requested:
${jsonShape}`;
}
