/**
 * Objectives API
 * GET/POST row-oriented objectives for a project
 * Feature: 019-profiler (row model)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc, desc, max } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  projectObjectives,
  objectiveGenerationSessions,
  type ObjectiveType,
  type ObjectiveSource,
  type GeneratedItemsJson,
  type MatchedRulesJson,
  VALID_OBJECTIVE_TYPES,
} from '@/lib/db/objectives-schema';
import { briefAttachments, projectProfiles } from '@/lib/db/pg-schema';
import { getCurrentUser } from '@/lib/auth/get-user';

type TraceKnowledgeSource = NonNullable<MatchedRulesJson['knowledgeSources']>[number];
type TraceGeneratedItem = { text: string; source: ObjectiveSource; sourceDetail?: string };
type GenerationTraceSection = {
  createdAt: string | null;
  profileFacts: string[];
  rules: MatchedRulesJson['resolvedItems'];
  knowledgeSources: TraceKnowledgeSource[];
  items: TraceGeneratedItem[];
};
type GenerationTrace = {
  counts: {
    sections: number;
    inferenceRules: number;
    knowledgeSources: number;
    seedKnowledgeSources: number;
    domainKnowledgeSources: number;
    objectivesBySource: Partial<Record<ObjectiveSource, number>>;
  };
  sections: Record<ObjectiveType, GenerationTraceSection | null>;
};

const OBJECTIVE_SOURCES: ObjectiveSource[] = [
  'explicit',
  'inferred',
  'ai_added',
  'profile_fact',
  'inference_rule',
  'seed_knowledge',
  'llm_common',
  'user_added',
  'manual',
  'inference',
  'briefing',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isObjectiveSource(value: unknown): value is ObjectiveSource {
  return typeof value === 'string' && OBJECTIVE_SOURCES.includes(value as ObjectiveSource);
}

function formatTraceValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatTraceValue).filter(Boolean).join(', ');
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace(/_/g, ' ');
}

function recordFacts(prefix: string, value: unknown): string[] {
  if (!isRecord(value)) return [];
  return Object.entries(value)
    .map(([key, entry]) => {
      const formatted = formatTraceValue(entry);
      return formatted ? `${prefix}.${key}: ${formatted}` : null;
    })
    .filter((entry): entry is string => Boolean(entry));
}

function extractProfileFacts(snapshot: unknown): string[] {
  if (!isRecord(snapshot)) return [];

  const facts: string[] = [];
  for (const key of ['buildingClass', 'projectType', 'subclass', 'workScope', 'classDescriptors']) {
    const formatted = formatTraceValue(snapshot[key]);
    if (formatted) facts.push(`${key}: ${formatted}`);
  }

  facts.push(...recordFacts('scale', snapshot.scale));
  facts.push(...recordFacts('complexity', snapshot.complexity));
  return facts;
}

function normalizeGeneratedItems(items: GeneratedItemsJson | null): TraceGeneratedItem[] {
  if (!items || !isRecord(items)) return [];

  if (Array.isArray(items.source_details)) {
    return items.source_details
      .map((entry): TraceGeneratedItem | null => {
        if (!isRecord(entry)) return null;
        const text = typeof entry.text === 'string' ? entry.text.trim() : '';
        if (!text) return null;
        const source = isObjectiveSource(entry.source) ? entry.source : 'ai_added';
        const sourceDetail = typeof entry.sourceDetail === 'string' ? entry.sourceDetail.trim() : '';
        return {
          text,
          source,
          ...(sourceDetail ? { sourceDetail } : {}),
        };
      })
      .filter((entry): entry is TraceGeneratedItem => Boolean(entry));
  }

  const fallbackSources: ObjectiveSource[] = [
    'profile_fact',
    'inference_rule',
    'seed_knowledge',
    'llm_common',
    'explicit',
    'inferred',
    'ai_added',
    'user_added',
  ];
  return fallbackSources.flatMap((source) => {
    const values = items[source as keyof GeneratedItemsJson];
    return Array.isArray(values)
      ? values
        .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
        .map((text) => ({ text, source }))
      : [];
  });
}

function normalizeMatchedRules(value: unknown): MatchedRulesJson {
  if (!isRecord(value)) return { ruleIds: [], resolvedItems: [], knowledgeSources: [] };

  const ruleIds = Array.isArray(value.ruleIds)
    ? value.ruleIds.filter((id): id is string => typeof id === 'string')
    : [];

  const resolvedItems = Array.isArray(value.resolvedItems)
    ? value.resolvedItems
      .map((entry): MatchedRulesJson['resolvedItems'][number] | null => {
        if (!isRecord(entry)) return null;
        const ruleId = typeof entry.ruleId === 'string' ? entry.ruleId : '';
        const text = typeof entry.text === 'string' ? entry.text : '';
        const source = typeof entry.source === 'string' ? entry.source : '';
        return ruleId && text ? { ruleId, text, source } : null;
      })
      .filter((entry): entry is MatchedRulesJson['resolvedItems'][number] => Boolean(entry))
    : [];

  const knowledgeSources = Array.isArray(value.knowledgeSources)
    ? value.knowledgeSources
      .map((entry): TraceKnowledgeSource | null => {
        if (!isRecord(entry)) return null;
        const source = entry.source === 'domain_rag' || entry.source === 'local_seed'
          ? entry.source
          : null;
        const domainName = typeof entry.domainName === 'string' ? entry.domainName : '';
        if (!source || !domainName) return null;
        return {
          source,
          domainName,
          sectionTitle: typeof entry.sectionTitle === 'string' ? entry.sectionTitle : null,
          relevanceScore: typeof entry.relevanceScore === 'number' ? entry.relevanceScore : 0,
          ...(typeof entry.sourceVersion === 'string' ? { sourceVersion: entry.sourceVersion } : {}),
        };
      })
      .filter((entry): entry is TraceKnowledgeSource => Boolean(entry))
    : [];

  return { ruleIds, resolvedItems, knowledgeSources };
}

function buildGenerationTrace(
  sessions: typeof objectiveGenerationSessions.$inferSelect[],
): GenerationTrace {
  const sections: GenerationTrace['sections'] = {
    planning: null,
    functional: null,
    quality: null,
    compliance: null,
  };
  const ruleIds = new Set<string>();
  const knowledgeSourceKeys = new Set<string>();
  const seedSourceKeys = new Set<string>();
  const domainSourceKeys = new Set<string>();
  const objectivesBySource: Partial<Record<ObjectiveSource, number>> = {};

  for (const session of sessions) {
    const sec = session.objectiveType as ObjectiveType;
    if (sections[sec] !== null) continue;

    const matchedRules = normalizeMatchedRules(session.matchedRules);
    const items = normalizeGeneratedItems(session.generatedItems as GeneratedItemsJson | null);
    const knowledgeSources = matchedRules.knowledgeSources ?? [];

    sections[sec] = {
      createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : null,
      profileFacts: extractProfileFacts(session.profilerSnapshot),
      rules: matchedRules.resolvedItems,
      knowledgeSources,
      items,
    };

    for (const id of matchedRules.ruleIds) ruleIds.add(id);
    for (const item of items) {
      objectivesBySource[item.source] = (objectivesBySource[item.source] ?? 0) + 1;
    }
    for (const source of knowledgeSources) {
      const key = `${source.source}:${source.domainName}:${source.sectionTitle ?? ''}:${source.sourceVersion ?? ''}`;
      knowledgeSourceKeys.add(key);
      if (source.source === 'local_seed') seedSourceKeys.add(key);
      if (source.source === 'domain_rag') domainSourceKeys.add(key);
    }
  }

  return {
    counts: {
      sections: Object.values(sections).filter(Boolean).length,
      inferenceRules: ruleIds.size,
      knowledgeSources: knowledgeSourceKeys.size,
      seedKnowledgeSources: seedSourceKeys.size,
      domainKnowledgeSources: domainSourceKeys.size,
      objectivesBySource,
    },
    sections,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { projectId } = await params;

    const rows = await db
      .select()
      .from(projectObjectives)
      .where(
        and(
          eq(projectObjectives.projectId, projectId),
          eq(projectObjectives.isDeleted, false)
        )
      )
      .orderBy(asc(projectObjectives.objectiveType), asc(projectObjectives.sortOrder));

    const grouped: Record<ObjectiveType, typeof rows> = {
      planning: [],
      functional: [],
      quality: [],
      compliance: [],
    };

    for (const row of rows) {
      const t = row.objectiveType as ObjectiveType;
      if (grouped[t]) {
        grouped[t].push(row);
      }
    }

    // Pull the latest generation snapshot per section so the frontend can
    // detect manual edits before showing the destructive-regenerate confirmation.
    const sessions = await db
      .select()
      .from(objectiveGenerationSessions)
      .where(eq(objectiveGenerationSessions.projectId, projectId))
      .orderBy(desc(objectiveGenerationSessions.createdAt));

    const snapshots: Record<ObjectiveType, string[] | null> = {
      planning: null,
      functional: null,
      quality: null,
      compliance: null,
    };
    const generationTrace = buildGenerationTrace(sessions);

    for (const session of sessions) {
      const sec = session.objectiveType as ObjectiveType;
      if (snapshots[sec] !== null) continue;
      const items =
        (session.generatedItems as {
          explicit?: string[];
          inferred?: string[];
          ai_added?: string[];
          profile_fact?: string[];
          inference_rule?: string[];
          seed_knowledge?: string[];
          llm_common?: string[];
        } | null) || {};
      snapshots[sec] = [
        ...(items.explicit ?? []),
        ...(items.inferred ?? []),
        ...(items.ai_added ?? []),
        ...(items.profile_fact ?? []),
        ...(items.inference_rule ?? []),
        ...(items.seed_knowledge ?? []),
        ...(items.llm_common ?? []),
      ];
    }

    // Surface projectType and hasAttachedDocuments so the UI can render
    // per-project-type section labels and the advisory draft-mode banner
    // without needing a separate profile fetch.
    const [profileRow] = await db
      .select({ projectType: projectProfiles.projectType })
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    const attachedDocuments = await db
      .select({ id: briefAttachments.documentId })
      .from(briefAttachments)
      .where(eq(briefAttachments.projectId, projectId));
    const attachedDocumentCount = attachedDocuments.length;
    const hasAttachedDocuments = attachedDocumentCount > 0;

    return NextResponse.json({
      success: true,
      data: grouped,
      snapshots,
      generationTrace,
      projectType: profileRow?.projectType ?? null,
      hasAttachedDocuments,
      attachedDocumentCount,
    });
  } catch (error) {
    console.error('Failed to fetch objectives:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch objectives' } },
      { status: 500 }
    );
  }
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
    const body = await request.json();

    const { type, text, sortOrder } = body as {
      type?: unknown;
      text?: unknown;
      sortOrder?: unknown;
    };

    // Validate type
    if (!type || !VALID_OBJECTIVE_TYPES.includes(type as ObjectiveType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `type must be one of: ${VALID_OBJECTIVE_TYPES.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'text is required' } },
        { status: 400 }
      );
    }

    // Resolve sortOrder
    let resolvedSortOrder: number;
    if (typeof sortOrder === 'number') {
      resolvedSortOrder = sortOrder;
    } else {
      // Compute MAX(sort_order) + 1 for this project+type, or 0 if no rows
      const [result] = await db
        .select({ maxOrder: max(projectObjectives.sortOrder) })
        .from(projectObjectives)
        .where(
          and(
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.objectiveType, type as ObjectiveType),
            eq(projectObjectives.isDeleted, false)
          )
        );
      resolvedSortOrder = result?.maxOrder != null ? result.maxOrder + 1 : 0;
    }

    const [newRow] = await db
      .insert(projectObjectives)
      .values({
        projectId,
        objectiveType: type as ObjectiveType,
        text: text.trim(),
        source: 'user_added',
        status: 'draft',
        sortOrder: resolvedSortOrder,
      })
      .returning();

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (error) {
    console.error('Failed to create objective:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create objective' } },
      { status: 500 }
    );
  }
}
