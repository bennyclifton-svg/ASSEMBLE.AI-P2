/**
 * Objectives Generate API
 * Generate AI objectives based on project profile — writes individual rows to projectObjectives
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectProfiles, briefAttachments } from '@/lib/db/pg-schema';
import {
  projectObjectives,
  objectiveGenerationSessions,
  type ObjectiveType,
  type ObjectiveSource,
  VALID_OBJECTIVE_TYPES,
} from '@/lib/db/objectives-schema';
import { aiComplete } from '@/lib/ai/client';
import { getCurrentUser } from '@/lib/auth/get-user';
import profileTemplates from '@/lib/data/profile-templates.json';
import { evaluateRules, formatRulesForPrompt, type MatchedRule, type ProjectData } from '@/lib/services/inference-engine';
import {
  retrieveFromDomains,
  type DomainRetrievalResult,
} from '@/lib/rag/retrieval';
import {
  resolveDomainTagsFromText,
  resolveProfileDomainTags,
  buildProfileSearchQuery,
  type DomainTag,
} from '@/lib/constants/knowledge-domains';
import {
  retrieveSeedKnowledgeFallback,
  type SeedKnowledgeResult,
} from '@/lib/rag/seed-knowledge-retrieval';
import {
  buildAttachedObjectiveDocumentContext,
} from '@/lib/services/objective-document-context';
import { isAdvisory } from '@/lib/constants/objective-section-config';
import {
  buildInferencePrompt,
  buildFullDocumentObjectivesPrompt,
} from './prompt-builders';
import { filterUnsupportedNoDocumentObjectives } from './quality-guards';
import { strengthenNoDocumentGeneratedObjectives } from './no-document-profile-objectives';
import type { ProjectType } from '@/types/profiler';

interface WorkScopeOption {
  value: string;
  label: string;
}

interface WorkScopeCategory {
  items?: WorkScopeOption[];
}

interface BuildingCodeMappingEntry {
  className?: string;
  description?: string;
}

interface ProfileTemplatesShape {
  workScopeOptions?: Record<string, Record<string, WorkScopeCategory | string | string[]>>;
  buildingCodeMappings?: Record<string, Record<string, Record<string, BuildingCodeMappingEntry>>>;
}

const PROFILE_TEMPLATES = profileTemplates as unknown as ProfileTemplatesShape;
const FULL_DOCUMENT_OBJECTIVES_TOKEN_BUDGET = 100_000;

/**
 * Resolve work scope value IDs to human-readable labels
 * e.g., "hydrant_system" -> "Hydrant System Upgrade"
 */
function resolveWorkScopeLabels(values: string[], projectType: string): string[] {
  if (!values || values.length === 0) return [];

  const workScopeOptions = PROFILE_TEMPLATES.workScopeOptions?.[projectType];
  if (!workScopeOptions) return values;

  const labels: string[] = [];
  for (const categoryKey of Object.keys(workScopeOptions)) {
    // Skip metadata keys
    if (categoryKey === 'description' || categoryKey === 'applicableProjectTypes') continue;
    const category = workScopeOptions[categoryKey];
    if (typeof category === 'object' && !Array.isArray(category) && category?.items) {
      for (const item of category.items) {
        if (values.includes(item.value)) {
          labels.push(item.label);
        }
      }
    }
  }
  return labels.length > 0 ? labels : values;
}

function isMissingGenerationSessionsTableError(error: unknown): boolean {
  const cause = typeof error === 'object' && error !== null && 'cause' in error
    ? (error as { cause?: unknown }).cause
    : undefined;

  return (
    (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === '42P01'
    ) ||
    (
      typeof cause === 'object' &&
      cause !== null &&
      'code' in cause &&
      (cause as { code?: unknown }).code === '42P01'
    )
  );
}

async function insertGenerationSessionAudit(
  values: typeof objectiveGenerationSessions.$inferInsert
): Promise<void> {
  try {
    await db.insert(objectiveGenerationSessions).values(values);
  } catch (error) {
    if (isMissingGenerationSessionsTableError(error)) {
      console.warn(
        '[objectives-generate] objective_generation_sessions table is missing; ' +
        'skipping generation audit write. Run db migrations to restore audit history.'
      );
      return;
    }
    throw error;
  }
}

type GeneratedObjectiveSource = Extract<
  ObjectiveSource,
  'profile_fact' | 'inference_rule' | 'seed_knowledge' | 'llm_common'
>;

interface GeneratedObjectiveItem {
  text: string;
  source: ObjectiveSource;
  sourceDetail?: string;
}

interface ParsedProfileContext {
  buildingClass: string;
  projectType: ProjectType;
  subclass: string[];
  scaleData: Record<string, number | string>;
  complexity: Record<string, string | string[]>;
  workScope: string[];
  region: string;
}

interface KnowledgeSourceAudit {
  source: 'domain_rag' | 'local_seed';
  domainName: string;
  sectionTitle: string | null;
  relevanceScore: number;
  sourceVersion?: string;
}

const GENERATED_OBJECTIVE_SOURCES: GeneratedObjectiveSource[] = [
  'profile_fact',
  'inference_rule',
  'seed_knowledge',
  'llm_common',
];

const OBJECTIVE_SECTION_DOMAIN_TAGS: Record<ObjectiveType, DomainTag[]> = {
  functional: ['construction', 'apartments', 'architectural', 'mechanical', 'electrical', 'hydraulic'],
  quality: ['architectural', 'structural', 'mechanical', 'sustainability', 'construction'],
  planning: ['regulatory', 'construction', 'civil'],
  compliance: ['ncc', 'as-standards', 'regulatory', 'fire', 'basix', 'nathers'],
};

const OBJECTIVE_SECTION_QUERY_FOCUS: Record<ObjectiveType, string> = {
  functional:
    'functional requirements, physical provisions, apartment amenity, car parking, vertical transport, access, services',
  quality:
    'quality standards, acoustic separation, facade performance, waterproofing, durability, commissioning, maintainability',
  planning:
    'planning approval, DA pathway, infill constraints, stormwater, traffic, waste, overshadowing, authority requirements',
  compliance:
    'NCC classification, fire resistance, egress, accessibility, BASIX, NatHERS, Australian Standards, certification',
};

const MIXED_SUBCLASS_COMPONENTS: Record<string, Array<{ buildingClass: string; subclass: string }>> = {
  residential_retail: [
    { buildingClass: 'residential', subclass: 'apartments' },
    { buildingClass: 'commercial', subclass: 'retail_shopping' },
  ],
  residential_commercial: [
    { buildingClass: 'residential', subclass: 'apartments' },
    { buildingClass: 'commercial', subclass: 'office' },
  ],
  hotel_residential: [
    { buildingClass: 'commercial', subclass: 'hotel' },
    { buildingClass: 'residential', subclass: 'apartments' },
  ],
  retail_office: [
    { buildingClass: 'commercial', subclass: 'retail_shopping' },
    { buildingClass: 'commercial', subclass: 'office' },
  ],
  btr_retail: [
    { buildingClass: 'residential', subclass: 'btr' },
    { buildingClass: 'commercial', subclass: 'retail_shopping' },
  ],
  vertical_village: [
    { buildingClass: 'residential', subclass: 'retirement_living_ilu' },
    { buildingClass: 'residential', subclass: 'aged_care_9c' },
  ],
};

function parseJsonArray(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseJsonObject(raw: string | null | undefined): Record<string, number | string> {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseComplexity(raw: string | null | undefined): Record<string, string | string[]> {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseProfileContext(profile: typeof projectProfiles.$inferSelect): ParsedProfileContext {
  return {
    buildingClass: profile.buildingClass,
    projectType: profile.projectType as ProjectType,
    subclass: parseJsonArray(profile.subclass),
    scaleData: parseJsonObject(profile.scaleData),
    complexity: parseComplexity(profile.complexity),
    workScope: parseJsonArray(profile.workScope),
    region: profile.region ?? 'AU',
  };
}

function formatProfileValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatProfileValue).filter(Boolean).join(', ');
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace(/_/g, ' ');
}

function buildDocumentPathProfileSummary(
  profile: ParsedProfileContext | null,
  workScopeLabels: string[],
  classDescriptors: string[],
): string {
  if (!profile) return '';

  const lines = [
    `- Building Class: ${profile.buildingClass}`,
    `- Project Type: ${profile.projectType}`,
  ];

  if (profile.subclass.length > 0) {
    lines.push(`- Subclass(es): ${profile.subclass.map(formatProfileValue).join(', ')}`);
  }
  if (classDescriptors.length > 0) {
    lines.push(`- Building Code / Class Signals: ${classDescriptors.join('; ')}`);
  }
  const scale = Object.entries(profile.scaleData)
    .map(([key, value]) => `${key}: ${formatProfileValue(value)}`)
    .join(', ');
  if (scale) lines.push(`- Scale: ${scale}`);

  const complexity = Object.entries(profile.complexity)
    .map(([key, value]) => `${key}: ${formatProfileValue(value)}`)
    .join(', ');
  if (complexity) lines.push(`- Complexity: ${complexity}`);
  if (workScopeLabels.length > 0) {
    lines.push(`- Work Scope: ${workScopeLabels.join(', ')}`);
  }

  return lines.join('\n');
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function resolveMappingDescriptor(
  region: string,
  buildingClass: string,
  subclass: string,
): string | null {
  const mappings = PROFILE_TEMPLATES.buildingCodeMappings?.[region]
    ?? PROFILE_TEMPLATES.buildingCodeMappings?.AU;
  const entry = mappings?.[buildingClass]?.[subclass] ?? mappings?.[buildingClass]?.default;
  if (!entry?.className) return null;
  return `${entry.className}: ${entry.description ?? subclass}`;
}

function resolveClassDescriptors(profile: ParsedProfileContext): string[] {
  const descriptors: string[] = [];
  const subclasses = profile.subclass.length > 0 ? profile.subclass : ['default'];

  for (const subclass of subclasses) {
    const direct = resolveMappingDescriptor(profile.region, profile.buildingClass, subclass);
    if (direct) descriptors.push(direct);

    if (profile.buildingClass === 'mixed') {
      for (const component of MIXED_SUBCLASS_COMPONENTS[subclass] ?? []) {
        const componentDescriptor = resolveMappingDescriptor(
          profile.region,
          component.buildingClass,
          component.subclass,
        );
        if (componentDescriptor) descriptors.push(componentDescriptor);
      }
    }
  }

  return unique(descriptors);
}

function buildDomainTags(
  profile: ParsedProfileContext,
  workScopeLabels: string[],
  classDescriptors: string[],
  section: ObjectiveType,
): DomainTag[] {
  return unique([
    ...resolveProfileDomainTags({
      buildingClass: profile.buildingClass,
      projectType: profile.projectType,
      subclass: profile.subclass,
      complexity: profile.complexity,
    }),
    ...OBJECTIVE_SECTION_DOMAIN_TAGS[section],
    ...workScopeLabels.flatMap(resolveDomainTagsFromText),
    ...classDescriptors.flatMap(resolveDomainTagsFromText),
  ]);
}

function buildSectionSearchQuery(
  profile: ParsedProfileContext,
  workScopeLabels: string[],
  classDescriptors: string[],
  section: ObjectiveType,
): string {
  const baseQuery = buildProfileSearchQuery({
    buildingClass: profile.buildingClass,
    projectType: profile.projectType,
    subclass: profile.subclass,
    scaleData: profile.scaleData,
    complexity: profile.complexity,
    workScopeLabels,
    region: profile.region,
  });

  return [
    baseQuery,
    classDescriptors.length ? `building class signals: ${classDescriptors.join('; ')}` : '',
    `objective section: ${section}`,
    OBJECTIVE_SECTION_QUERY_FOCUS[section],
  ].filter(Boolean).join(' | ');
}

function formatKnowledgeContext(
  section: ObjectiveType,
  results: Array<DomainRetrievalResult | SeedKnowledgeResult>,
  source: 'domain_rag' | 'local_seed',
): string {
  const sourceLabel = source === 'domain_rag' ? 'RAG domain retrieval' : 'local seed guide fallback';
  const lines = [
    `## KNOWLEDGE DOMAIN CONTEXT — ${section.toUpperCase()}`,
    `Use these ${sourceLabel} snippets as reference for ${section} objectives.`,
    'Treat conditional examples as conditional only; do not convert them into project facts unless the profile or rules also support them.',
    '',
  ];

  for (const result of results) {
    const domainName = result.domainName || ('domainSlug' in result ? result.domainSlug : 'Unknown Domain');
    const sectionTitle = result.sectionTitle ? ` — ${result.sectionTitle}` : '';
    lines.push(`### ${domainName}${sectionTitle} (relevance: ${result.relevanceScore.toFixed(2)})`);
    lines.push(result.content);
    lines.push('');
  }

  return lines.join('\n');
}

function knowledgeAudit(
  results: Array<DomainRetrievalResult | SeedKnowledgeResult>,
  source: 'domain_rag' | 'local_seed',
): KnowledgeSourceAudit[] {
  return results.map((result) => ({
    source,
    domainName: result.domainName || ('domainSlug' in result ? result.domainSlug : 'Unknown Domain'),
    sectionTitle: result.sectionTitle ?? null,
    relevanceScore: result.relevanceScore,
    sourceVersion: 'sourceVersion' in result ? result.sourceVersion : undefined,
  }));
}

async function retrieveKnowledgeContextBySection(
  profile: ParsedProfileContext,
  workScopeLabels: string[],
  classDescriptors: string[],
  sections: ObjectiveType[],
): Promise<{
  contextBySection: Partial<Record<ObjectiveType, string>>;
  sourcesBySection: Partial<Record<ObjectiveType, KnowledgeSourceAudit[]>>;
}> {
  const contextBySection: Partial<Record<ObjectiveType, string>> = {};
  const sourcesBySection: Partial<Record<ObjectiveType, KnowledgeSourceAudit[]>> = {};

  await Promise.all(sections.map(async (objectiveSection) => {
    const domainTags = buildDomainTags(profile, workScopeLabels, classDescriptors, objectiveSection);
    const searchQuery = buildSectionSearchQuery(profile, workScopeLabels, classDescriptors, objectiveSection);

    console.log(
      `[objectives-generate] Domain retrieval (${objectiveSection}): ${domainTags.length} tags, query="${searchQuery.substring(0, 80)}..."`
    );

    const domainResults = await retrieveFromDomains(searchQuery, {
      domainTags,
      projectType: profile.projectType,
      topK: 10,
      rerankTopK: 4,
      minRelevanceScore: 0.2,
    });

    if (domainResults.length > 0) {
      contextBySection[objectiveSection] = formatKnowledgeContext(objectiveSection, domainResults, 'domain_rag');
      sourcesBySection[objectiveSection] = knowledgeAudit(domainResults, 'domain_rag');
      console.log(`[objectives-generate] Domain context (${objectiveSection}): ${domainResults.length} RAG chunks`);
      return;
    }

    const seedResults = retrieveSeedKnowledgeFallback(searchQuery, {
      domainTags,
      projectType: profile.projectType,
      section: objectiveSection,
      topK: 4,
    });

    if (seedResults.length > 0) {
      contextBySection[objectiveSection] = formatKnowledgeContext(objectiveSection, seedResults, 'local_seed');
      sourcesBySection[objectiveSection] = knowledgeAudit(seedResults, 'local_seed');
      console.log(`[objectives-generate] Domain context (${objectiveSection}): ${seedResults.length} local seed chunks`);
    } else {
      console.log(`[objectives-generate] Domain retrieval (${objectiveSection}) returned no results`);
    }
  }));

  return { contextBySection, sourcesBySection };
}

function extractJsonPayload(aiText: string): string {
  const jsonMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1] : aiText;
  return raw.trim().replace(/,\s*\n?\s*}/g, '\n}').replace(/,\s*\n?\s*]/g, '\n]');
}

function getErrorProperty(error: unknown, key: string): unknown {
  if (typeof error !== 'object' || error === null || !(key in error)) return undefined;
  return (error as Record<string, unknown>)[key];
}

function getErrorStatus(error: unknown): number | undefined {
  const status = getErrorProperty(error, 'status');
  if (typeof status === 'number') return status;

  const causeStatus = getErrorStatus(getErrorProperty(error, 'cause'));
  if (causeStatus !== undefined) return causeStatus;

  return getErrorStatus(getErrorProperty(error, 'error'));
}

function getErrorMessages(error: unknown, seen = new Set<unknown>()): string[] {
  if (error === null || error === undefined || seen.has(error)) return [];
  seen.add(error);

  if (error instanceof Error) {
    return [
      error.message,
      ...getErrorMessages(error.cause, seen),
      ...getErrorMessages(getErrorProperty(error, 'error'), seen),
    ].filter(Boolean);
  }

  if (typeof error === 'string') return [error];

  if (typeof error !== 'object') return [];

  const direct = ['message', 'code', 'type']
    .map((key) => getErrorProperty(error, key))
    .filter((value): value is string => typeof value === 'string');

  return [
    ...direct,
    ...getErrorMessages(getErrorProperty(error, 'cause'), seen),
    ...getErrorMessages(getErrorProperty(error, 'error'), seen),
  ];
}

function isAiOverloaded(error: unknown): boolean {
  return getErrorStatus(error) === 529;
}

function isModelContextLimitError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 413) return true;

  const message = getErrorMessages(error).join(' ').toLowerCase();
  return /context(?:_| |-)length|context window|maximum context|too many tokens|token limit|prompt(?: is)? too long|input(?: is)? too long|exceeds? .{0,60}context|larger than the model can process/.test(message);
}

function isAiRateLimitError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 429) return true;

  const message = getErrorMessages(error).join(' ').toLowerCase();
  return /rate.?limit|tokens per min|\btpm\b|requests per min|\brpm\b/.test(message);
}

function normalizeGeneratedSource(value: unknown, fallback: ObjectiveSource): ObjectiveSource {
  if (typeof value !== 'string') return fallback;
  if ((GENERATED_OBJECTIVE_SOURCES as string[]).includes(value)) return value as GeneratedObjectiveSource;
  if (value === 'explicit' || value === 'inferred' || value === 'ai_added') return value;
  return fallback;
}

function parseGeneratedObjectives(
  aiText: string,
  hasAttachedDocuments: boolean,
): Partial<Record<ObjectiveType, GeneratedObjectiveItem[]>> {
  const fallbackSource: ObjectiveSource = hasAttachedDocuments ? 'explicit' : 'llm_common';
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonPayload(aiText));
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {};
  }

  if (!parsed || typeof parsed !== 'object') return {};

  const generated: Partial<Record<ObjectiveType, GeneratedObjectiveItem[]>> = {};
  for (const section of VALID_OBJECTIVE_TYPES) {
    const value = (parsed as Partial<Record<ObjectiveType, unknown>>)[section];
    if (!Array.isArray(value)) continue;

    const items = value
      .map((entry): GeneratedObjectiveItem | null => {
        if (typeof entry === 'string') {
          const text = entry.trim();
          return text ? { text, source: fallbackSource } : null;
        }
        if (!entry || typeof entry !== 'object') return null;

        const text = 'text' in entry ? String((entry as { text?: unknown }).text ?? '').trim() : '';
        if (!text) return null;

        const source = hasAttachedDocuments
          ? 'explicit'
          : normalizeGeneratedSource((entry as { source?: unknown }).source, fallbackSource);
        const sourceDetail = 'sourceDetail' in entry
          ? String((entry as { sourceDetail?: unknown }).sourceDetail ?? '').trim()
          : '';

        return {
          text,
          source,
          ...(sourceDetail ? { sourceDetail } : {}),
        };
      })
      .filter((item): item is GeneratedObjectiveItem => Boolean(item));

    if (items.length > 0) generated[section] = items;
  }

  return generated;
}

function buildGeneratedItemsAudit(
  items: GeneratedObjectiveItem[],
  hasAttachedDocuments: boolean,
) {
  const texts = items.map((item) => item.text);
  return {
    explicit: hasAttachedDocuments ? texts : [],
    inferred: [],
    ai_added: hasAttachedDocuments ? [] : texts,
    profile_fact: items.filter((item) => item.source === 'profile_fact').map((item) => item.text),
    inference_rule: items.filter((item) => item.source === 'inference_rule').map((item) => item.text),
    seed_knowledge: items.filter((item) => item.source === 'seed_knowledge').map((item) => item.text),
    llm_common: items.filter((item) => item.source === 'llm_common').map((item) => item.text),
    source_details: items.map((item) => ({
      text: item.text,
      source: item.source,
      ...(item.sourceDetail ? { sourceDetail: item.sourceDetail } : {}),
    })),
  };
}

function buildMatchedRulesAudit(
  section: ObjectiveType,
  functionalRules: MatchedRule[],
  planningRules: MatchedRule[],
  knowledgeSources: KnowledgeSourceAudit[],
) {
  const relevantRules = section === 'functional' || section === 'quality'
    ? functionalRules
    : planningRules;

  return {
    ruleIds: relevantRules.map((rule) => rule.id),
    resolvedItems: relevantRules.flatMap((rule) =>
      rule.resolvedItems.map((item) => ({
        ruleId: rule.id,
        text: 'text' in item ? item.text : item.name,
        source: rule.source,
      }))
    ),
    knowledgeSources,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const section = body.section as ObjectiveType | undefined;

    // Validate section if provided
    if (section && !VALID_OBJECTIVE_TYPES.includes(section)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `section must be one of: ${VALID_OBJECTIVE_TYPES.join(', ')}` } },
        { status: 400 }
      );
    }

    // Fetch profile
    const [profile] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    // The Brief screen's "Attach Documents" panel is the source of truth for
    // document-backed objective generation. When populated, generation uses the
    // full indexed document text. When empty, generation falls back to the
    // profile/inference workflow below.
    const briefAttached = await db
      .select({ documentId: briefAttachments.documentId })
      .from(briefAttachments)
      .where(eq(briefAttachments.projectId, projectId));
    const attachedDocumentIds: string[] = unique(briefAttached.map((attachment) => attachment.documentId));
    const hasAttachedDocuments = attachedDocumentIds.length > 0;
    const sectionsToWrite: ObjectiveType[] = section
      ? [section]
      : VALID_OBJECTIVE_TYPES;
    const profileContext = profile ? parseProfileContext(profile) : null;
    const workScopeLabels = profileContext
      ? resolveWorkScopeLabels(profileContext.workScope, profileContext.projectType)
      : [];
    const classDescriptors = profileContext ? resolveClassDescriptors(profileContext) : [];
    let functionalRulesForAudit: MatchedRule[] = [];
    let planningRulesForAudit: MatchedRule[] = [];

    // === DOMAIN KNOWLEDGE RETRIEVAL ===
    let domainContextSection = '';
    let domainContextBySection: Partial<Record<ObjectiveType, string>> = {};
    let knowledgeSourcesBySection: Partial<Record<ObjectiveType, KnowledgeSourceAudit[]>> = {};

    if (!hasAttachedDocuments && profileContext === null && profile) {
      try {
        const profBuildingClass = profile.buildingClass;
        const profProjectType = profile.projectType;
        const profSubclass = JSON.parse(profile.subclass || '[]');
        const profScaleData = JSON.parse(profile.scaleData || '{}');
        const profComplexity = JSON.parse(profile.complexity || '{}');
        const profWorkScope = JSON.parse(profile.workScope || '[]');
        const profRegion = profile.region ?? 'AU';

        // Work scope flows for ALL project types — including advisory and new builds.
        // The previous filter (refurb/remediation only) silently dropped scope from
        // the prompt, breaking profile→prompt propagation for new and advisory work.
        const wsLabels = resolveWorkScopeLabels(profWorkScope, profProjectType);

        const domainTags = resolveProfileDomainTags({
          buildingClass: profBuildingClass,
          projectType: profProjectType,
          subclass: profSubclass,
          complexity: profComplexity,
        });

        const searchQuery = buildProfileSearchQuery({
          buildingClass: profBuildingClass,
          projectType: profProjectType,
          subclass: profSubclass,
          scaleData: profScaleData,
          complexity: profComplexity,
          workScopeLabels: wsLabels,
          region: profRegion,
        });

        console.log(`[objectives-generate] Domain retrieval: ${domainTags.length} tags, query="${searchQuery.substring(0, 80)}..."`);

        const domainResults = await retrieveFromDomains(searchQuery, {
          domainTags,
          projectType: profProjectType,
          topK: 15,
          rerankTopK: 5,
          minRelevanceScore: 0.2,
        });

        if (domainResults.length > 0) {
          const lines: string[] = [
            '## KNOWLEDGE DOMAIN CONTEXT',
            'The following best-practice and regulatory guidance is relevant to this project type:',
            '',
          ];

          const byDomain = new Map<string, DomainRetrievalResult[]>();
          for (const r of domainResults) {
            const key = r.domainName || 'Unknown Domain';
            const group = byDomain.get(key) || [];
            group.push(r);
            byDomain.set(key, group);
          }

          for (const [domainName, results] of byDomain) {
            for (const r of results) {
              lines.push(`### ${domainName} (relevance: ${r.relevanceScore.toFixed(2)})`);
              lines.push(r.content);
              lines.push('');
            }
          }

          domainContextSection = lines.join('\n');
          console.log(`[objectives-generate] Domain context: ${domainResults.length} chunks from ${byDomain.size} domain(s)`);
        } else {
          console.log('[objectives-generate] Domain retrieval returned no results');
        }
      } catch (error) {
        console.warn('[objectives-generate] Domain retrieval failed, continuing without:', error);
      }
    }

    if (!hasAttachedDocuments && profileContext) {
      try {
        const knowledge = await retrieveKnowledgeContextBySection(
          profileContext,
          workScopeLabels,
          classDescriptors,
          sectionsToWrite,
        );
        domainContextBySection = knowledge.contextBySection;
        knowledgeSourcesBySection = knowledge.sourcesBySection;
        domainContextSection = Object.values(domainContextBySection).filter(Boolean).join('\n\n');
      } catch (error) {
        console.warn('[objectives-generate] Section-specific domain retrieval failed, continuing without:', error);
      }
    }

    let aiText: string;

    if (hasAttachedDocuments) {
      // === FULL-DOCUMENT OBJECTIVES PATH ===
      console.log(`[objectives-generate] Generating from ${attachedDocumentIds.length} Brief attached documents`);

      const attachedDocumentContext = await buildAttachedObjectiveDocumentContext(attachedDocumentIds, {
        allowStagedSummary: false,
        directDocumentTokenBudget: FULL_DOCUMENT_OBJECTIVES_TOKEN_BUDGET,
      });
      console.log(
        `[objectives-generate] Indexed document context: ${attachedDocumentContext.documentChunkCount} chunks, ` +
        `${attachedDocumentContext.estimatedDocumentTokens} estimated tokens, ` +
        `requiresSummary=${attachedDocumentContext.usedStagedSummary}`
      );

      if (attachedDocumentContext.documentChunkCount === 0 || !attachedDocumentContext.context.trim()) {
        const status = attachedDocumentContext.usedStagedSummary ? 413 : 409;
        const message = attachedDocumentContext.usedStagedSummary
          ? `Attached documents are too large to send in full to the selected generation model (${attachedDocumentContext.estimatedDocumentTokens.toLocaleString()} estimated tokens). Split the source material, attach fewer documents, or switch generation to a longer-context model.`
          : 'Attached documents are not ready for AI generation yet. Wait for ingestion to finish, then generate again.';
        return NextResponse.json(
          {
            success: false,
            error: {
              code: attachedDocumentContext.usedStagedSummary
                ? 'ATTACHED_DOCUMENT_TOO_LARGE'
                : 'ATTACHED_DOCUMENT_CONTEXT_UNAVAILABLE',
              message,
            },
          },
          { status }
        );
      }

      const prompt = buildFullDocumentObjectivesPrompt({
        projectType: (profile?.projectType ?? 'new') as ProjectType,
        buildingClass: profile?.buildingClass ?? 'residential',
        profileSummary: buildDocumentPathProfileSummary(profileContext, workScopeLabels, classDescriptors),
        attachedDocumentContext: attachedDocumentContext.context,
        section,
      });

      const result = await aiComplete({
        featureGroup: 'objectives_generation',
        maxTokens: 4500,
        messages: [{ role: 'user', content: prompt }],
      });
      aiText = result.text;
    } else {
      // === INFERENCE RULES PATH (existing behaviour) ===

      if (!profileContext) {
        return NextResponse.json(
          { success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Project profile not found. Please complete the profile first.' } },
          { status: 404 }
        );
      }

      // Parse profile data
      const {
        buildingClass,
        projectType,
        subclass,
        scaleData,
        complexity,
        workScope,
      } = profileContext;

      // Resolve work scope IDs to human-readable labels for ALL project types.
      // The previous filter (refurb/remediation only) silently dropped scope from
      // the prompt for new and advisory work, breaking profile→prompt propagation.
      // Skip the inference rule corpus for advisory engagements.
      // The existing 175 rules are all build-shaped (no project_type conditions),
      // so running them for advisory contaminates output with build-flavoured
      // suggestions. Advisory generation in the no-documents path relies on the
      // profile + workScope (Scope of Advice) selections instead.
      let functionalRulesFormatted = '';
      let planningRulesFormatted = '';

      if (isAdvisory(projectType)) {
        console.log('[objectives-generate] Skipping inference rules for advisory project');
      } else {
        const projectData: ProjectData = {
          projectDetails: {
            projectName: 'Project',
            jurisdiction: undefined,
          },
          profiler: {
            buildingClass,
            subclass,
            projectType,
            scaleData,
            complexity,
            workScope,
          }
        };

        const functionalRules = evaluateRules('objectives_functional_quality', projectData);
        const planningRules = evaluateRules('objectives_planning_compliance', projectData);
        functionalRulesForAudit = functionalRules;
        planningRulesForAudit = planningRules;

        functionalRulesFormatted = formatRulesForPrompt(functionalRules, { includeConfidence: true, groupBySource: false });
        planningRulesFormatted = formatRulesForPrompt(planningRules, { includeConfidence: true, groupBySource: false });

        console.log(`[objectives-generate] Matched ${functionalRules.length} functional rules, ${planningRules.length} planning rules`);
      }

      // Drop suggested-items blocks for sections we're not generating.
      const generateFunctional = !section || section === 'functional';
      const generateQuality = !section || section === 'quality';
      const generatePlanning = !section || section === 'planning';
      const generateCompliance = !section || section === 'compliance';

      if (!generateFunctional && !generateQuality) functionalRulesFormatted = '';
      if (!generatePlanning && !generateCompliance) planningRulesFormatted = '';

      const prompt = buildInferencePrompt({
        projectType,
        buildingClass,
        classDescriptors,
        subclass,
        scaleData,
        complexity,
        workScopeLabels,
        functionalRulesFormatted,
        planningRulesFormatted,
        domainContextSection,
        domainContextBySection,
        section,
      });

      const result = await aiComplete({
        featureGroup: 'objectives_generation',
        maxTokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });
      aiText = result.text;
    }

    const generated = parseGeneratedObjectives(aiText, hasAttachedDocuments);

    if (!hasAttachedDocuments && profileContext) {
      for (const sec of sectionsToWrite) {
        const items = generated[sec];
        if (!items || items.length === 0) continue;

        const { kept, rejected } = filterUnsupportedNoDocumentObjectives(items, {
          projectType: profileContext.projectType,
          subclass: profileContext.subclass,
          scaleData: profileContext.scaleData,
          complexity: profileContext.complexity,
          workScopeLabels,
          classDescriptors,
        });

        if (rejected.length > 0) {
          console.warn(
            `[objectives-generate] Removed ${rejected.length} unsupported no-document objective(s) for ${sec}: ` +
            rejected.map(({ item, reason }) => `"${item.text}" (${reason})`).join('; ')
          );
          generated[sec] = kept;
        }
      }

      const strengthened = strengthenNoDocumentGeneratedObjectives(
        generated as Partial<Record<ObjectiveType, GeneratedObjectiveItem[]>>,
        {
          buildingClass: profileContext.buildingClass,
          projectType: profileContext.projectType,
          subclass: profileContext.subclass,
          scaleData: profileContext.scaleData,
          complexity: profileContext.complexity,
          workScopeLabels,
          classDescriptors,
        },
        sectionsToWrite,
      );

      for (const sec of sectionsToWrite) {
        generated[sec] = strengthened[sec];
      }
    }

    // Create profile context snapshot
    const profilerSnapshot = profileContext ? {
      buildingClass: profileContext.buildingClass,
      projectType: profileContext.projectType,
      subclass: profileContext.subclass,
      scale: profileContext.scaleData,
      complexity: profileContext.complexity,
      workScope: profileContext.workScope,
      classDescriptors,
    } : null;

    // For each requested section: soft-delete existing rows, then insert new ones
    const insertedBySection: Partial<Record<ObjectiveType, typeof projectObjectives.$inferSelect[]>> = {};

    for (const sec of sectionsToWrite) {
      const items = generated[sec];
      if (!items || items.length === 0) continue;

      // Soft-delete existing rows for this project+type
      await db
        .update(projectObjectives)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(
          and(
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.objectiveType, sec),
            eq(projectObjectives.isDeleted, false)
          )
        );

      // Insert one row per generated objective
      const toInsert = items.map((item, idx) => ({
        projectId,
        objectiveType: sec,
        text: item.text,
        source: item.source,
        status: 'draft' as const,
        sortOrder: idx,
      }));

      const inserted = await db
        .insert(projectObjectives)
        .values(toInsert)
        .returning();

      insertedBySection[sec] = inserted;

      // Write generation session audit record
      await insertGenerationSessionAudit({
        projectId,
        objectiveType: sec,
        iteration: 1,
        profilerSnapshot: profilerSnapshot as unknown as Record<string, unknown>,
        matchedRules: buildMatchedRulesAudit(
          sec,
          functionalRulesForAudit,
          planningRulesForAudit,
          knowledgeSourcesBySection[sec] ?? [],
        ),
        generatedItems: buildGeneratedItemsAudit(items, hasAttachedDocuments),
      });
    }

    return NextResponse.json({
      success: true,
      data: insertedBySection,
    });
  } catch (error: unknown) {
    // Unwrap Anthropic/OpenAI SDK errors so the API response body (which
    // explains *why* it was a 400) shows in deployment logs instead of
    // collapsing to "[Object]" under depth-limited loggers.
    const status = getErrorStatus(error);
    const apiBody = getErrorProperty(error, 'error');
    const requestId = getErrorProperty(error, 'request_id') ?? getErrorProperty(error, 'requestID');
    console.error('Failed to generate objectives:', {
      message: error instanceof Error ? error.message : String(error),
      status,
      requestId,
      apiBody: apiBody ? JSON.stringify(apiBody) : undefined,
    });

    if (isAiOverloaded(error)) {
      return NextResponse.json(
        { success: false, error: { code: 'AI_OVERLOADED', message: 'AI service is temporarily busy. Please try again in a moment.' } },
        { status: 503 }
      );
    }

    if (isModelContextLimitError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MODEL_CONTEXT_LIMIT',
            message: 'The attached document text is too large for the selected generation model to process in one request. Attach fewer documents or switch generation to a longer-context frontier model.',
          },
        },
        { status: 413 }
      );
    }

    if (isAiRateLimitError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_RATE_LIMIT',
            message: 'The selected objectives model rejected this request because it exceeds the current token rate limit. Use the Objectives generation model setting with a higher token allowance, such as Claude Sonnet or Claude Opus, then try again.',
          },
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'GENERATION_ERROR', message: error instanceof Error ? error.message : 'Failed to generate objectives' } },
      { status: 500 }
    );
  }
}
