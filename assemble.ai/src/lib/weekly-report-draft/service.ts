import { z } from 'zod';
import { aiComplete } from '@/lib/ai/client';
import { assembleContext } from '@/lib/context/orchestrator';
import type { AssembledContext } from '@/lib/context/types';
import { db, reports, reportSections } from '@/lib/db';
import { rfiService } from '@/lib/rfi/service';
import type { RfiListResponse, RfiRecord } from '@/types/rfi';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const WEEKLY_REPORT_SECTION_DEFS = [
    { key: 'status_summary', label: 'Project status summary' },
    { key: 'current_rfis', label: 'Current RFIs' },
    { key: 'programme_cost_risk', label: 'Programme, cost, and risk highlights' },
    { key: 'open_questions', label: 'Open questions' },
    { key: 'recommended_actions', label: 'Recommended actions' },
] as const;

const WEEKLY_REPORT_SECTION_KEYS = WEEKLY_REPORT_SECTION_DEFS.map((section) => section.key) as [
    WeeklyReportSectionKey,
    ...WeeklyReportSectionKey[],
];

export type WeeklyReportSectionKey = (typeof WEEKLY_REPORT_SECTION_DEFS)[number]['key'];

const claimSchema = z.object({
    text: z.string().trim().min(1),
    citationRefs: z.array(z.string().trim().min(1)).optional().default([]),
});

const modelSectionSchema = z.object({
    sectionKey: z.enum(WEEKLY_REPORT_SECTION_KEYS),
    facts: z.array(claimSchema).optional().default([]),
    assumptions: z.array(z.string().trim().min(1)).optional().default([]),
    recommendations: z.array(z.string().trim().min(1)).optional().default([]),
    openQuestions: z.array(z.string().trim().min(1)).optional().default([]),
});

const modelOutputSchema = z.object({
    sections: z.array(modelSectionSchema).min(1),
});

export type WeeklyReportDraftModelOutput = z.infer<typeof modelOutputSchema>;
export type WeeklyReportDraftClaim = z.infer<typeof claimSchema>;

export interface WeeklyReportDraftInput {
    title?: string;
    reportDate?: string;
    preparedFor?: string;
    preparedBy?: string;
    groupId?: string | null;
    reportingPeriodStart?: string;
    reportingPeriodEnd?: string;
}

export interface WeeklyReportDraftRequest extends WeeklyReportDraftInput {
    projectId: string;
    organizationId: string;
}

export interface WeeklyReportSource {
    id: string;
    kind: 'project_record' | 'rfi' | 'document' | 'memory';
    label: string;
    excerpt: string;
    canonical: boolean;
}

export interface WeeklyReportGeneratedSection {
    sectionKey: WeeklyReportSectionKey;
    sectionLabel: string;
    content: string;
}

export interface GeneratedWeeklyReportDraft {
    title: string;
    reportDate: string | null;
    preparedFor: string | null;
    preparedBy: string | null;
    groupId: string | null;
    reportingPeriodStart: string | null;
    reportingPeriodEnd: string | null;
    sections: WeeklyReportGeneratedSection[];
    sources: WeeklyReportSource[];
    rfiCount: number;
}

export interface CreatedWeeklyReportDraft extends GeneratedWeeklyReportDraft {
    id: string;
    projectId: string;
    organizationId: string;
    contentsType: 'custom';
    sectionCount: number;
    transmittalCount: 0;
}

export interface WeeklyReportDraftModelClient {
    generate(prompt: string): Promise<WeeklyReportDraftModelOutput>;
}

export interface WeeklyReportDraftDeps {
    assembleContextFn?: typeof assembleContext;
    listRfis?: typeof rfiService.list;
    modelClient?: WeeklyReportDraftModelClient;
    now?: () => Date;
}

function toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function newId(): string {
    return crypto.randomUUID();
}

function defaultPeriod(now: Date): { start: string; end: string } {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { start: toIsoDate(start), end: toIsoDate(end) };
}

function assertIsoDate(value: string | undefined, field: string): void {
    if (value !== undefined && !ISO_DATE.test(value)) {
        throw new Error(`${field} must be an ISO date in YYYY-MM-DD format.`);
    }
}

function truncate(value: string, max = 1800): string {
    const compact = value.trim();
    return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function compactLines(value: string): string {
    return value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');
}

function rfiSource(rfi: RfiRecord): WeeklyReportSource {
    const evidence = rfi.evidenceLinks.map((link) => link.label).join('; ');
    const response = rfi.responseText ? ` Response: ${rfi.responseText}` : '';
    return {
        id: `rfi:${rfi.reference}`,
        kind: 'rfi',
        label: `${rfi.reference} - ${rfi.title}`,
        canonical: true,
        excerpt: truncate(
            [
                `Status: ${rfi.status}. Priority: ${rfi.priority}. Responsible: ${rfi.responsiblePartyLabel}.`,
                rfi.dueDate ? `Due: ${rfi.dueDate}.` : null,
                rfi.isOverdue ? 'Display state: overdue.' : null,
                `Question: ${rfi.question}`,
                response || null,
                evidence ? `Evidence: ${evidence}` : null,
            ]
                .filter(Boolean)
                .join(' ')
        ),
    };
}

function buildSources(assembled: AssembledContext, rfis: RfiRecord[]): WeeklyReportSource[] {
    const sources: WeeklyReportSource[] = [];

    if (assembled.projectSummary.trim()) {
        sources.push({
            id: 'record:project-summary',
            kind: 'project_record',
            label: 'Project summary',
            excerpt: truncate(compactLines(assembled.projectSummary)),
            canonical: true,
        });
    }

    if (assembled.moduleContext.trim()) {
        sources.push({
            id: 'record:project-context',
            kind: 'project_record',
            label: 'Structured project records',
            excerpt: truncate(compactLines(assembled.moduleContext), 3600),
            canonical: true,
        });
    }

    if (assembled.crossModuleInsights?.trim()) {
        sources.push({
            id: 'record:cross-module-insights',
            kind: 'project_record',
            label: 'Cross-module insights',
            excerpt: truncate(compactLines(assembled.crossModuleInsights)),
            canonical: true,
        });
    }

    if (assembled.ragContext.trim()) {
        sources.push({
            id: 'document:rag-excerpts',
            kind: 'document',
            label: 'Document/RAG excerpts',
            excerpt: truncate(compactLines(assembled.ragContext), 3600),
            canonical: true,
        });
    }

    for (const rfi of rfis) {
        sources.push(rfiSource(rfi));
    }

    if (assembled.aiMemoryContext.trim()) {
        sources.push({
            id: 'memory:approved-context',
            kind: 'memory',
            label: 'Approved AI memory (advisory only)',
            excerpt: truncate(compactLines(assembled.aiMemoryContext)),
            canonical: false,
        });
    }

    return sources;
}

function formatSourceRegister(sources: WeeklyReportSource[]): string {
    if (sources.length === 0) return '- No project sources available.';
    return sources
        .map((source) =>
            [
                `- ${source.id} (${source.kind}${source.canonical ? '' : ', advisory only'}): ${source.label}`,
                `  ${source.excerpt}`,
            ].join('\n')
        )
        .join('\n');
}

export function buildWeeklyReportDraftPrompt(args: {
    periodStart: string;
    periodEnd: string;
    sources: WeeklyReportSource[];
}): string {
    return [
        'Draft a weekly project report for a senior project manager.',
        `Reporting period: ${args.periodStart} to ${args.periodEnd}.`,
        '',
        'Truth hierarchy:',
        '- Structured project records, typed RFIs, issued/export records, and stored document excerpts are canonical project truth.',
        '- Approved AI memory is advisory only. It may affect tone or recurring preferences, but it must not override records or documents.',
        '- Chat transcript is interaction history, not project truth.',
        '',
        'Return strict JSON only. Do not wrap it in Markdown.',
        'Shape:',
        '{ "sections": [{ "sectionKey": "status_summary", "facts": [{ "text": "...", "citationRefs": ["record:project-summary"] }], "assumptions": [], "recommendations": [], "openQuestions": [] }] }',
        '',
        `Use exactly these sectionKey values: ${WEEKLY_REPORT_SECTION_DEFS.map((section) => section.key).join(', ')}.`,
        'Every material factual claim should include citationRefs from the source ids below where available.',
        'If something is inferred, put it under assumptions or recommendations rather than facts.',
        'If PM judgement is required, put one concise item under openQuestions.',
        '',
        'Source register:',
        formatSourceRegister(args.sources),
    ].join('\n');
}

function extractJsonObject(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) throw new Error('Model did not return JSON.');
        return JSON.parse(text.slice(start, end + 1));
    }
}

const defaultModelClient: WeeklyReportDraftModelClient = {
    async generate(prompt) {
        const { text } = await aiComplete({
            featureGroup: 'generation',
            maxTokens: 3200,
            temperature: 0.1,
            system:
                'You draft grounded construction project reports. Return valid JSON only and cite provided source ids for factual claims.',
            messages: [{ role: 'user', content: prompt }],
        });
        const parsed = modelOutputSchema.safeParse(extractJsonObject(text));
        if (!parsed.success) {
            throw new Error(`Weekly report draft output was invalid: ${parsed.error.message}`);
        }
        return parsed.data;
    },
};

function isCanonicalCitation(ref: string, sourceIds: Set<string>): boolean {
    if (!sourceIds.has(ref)) return false;
    return !ref.startsWith('memory:');
}

function normalizeSection(
    sectionKey: WeeklyReportSectionKey,
    modelOutput: WeeklyReportDraftModelOutput,
    sourceIds: Set<string>
): WeeklyReportGeneratedSection {
    const def = WEEKLY_REPORT_SECTION_DEFS.find((candidate) => candidate.key === sectionKey)!;
    const raw = modelOutput.sections.find((section) => section.sectionKey === sectionKey);
    const facts: WeeklyReportDraftClaim[] = [];
    const assumptions = [...(raw?.assumptions ?? [])];

    for (const claim of raw?.facts ?? []) {
        const refs = claim.citationRefs.filter((ref) => sourceIds.has(ref));
        const hasCanonicalRef = refs.some((ref) => isCanonicalCitation(ref, sourceIds));
        if (refs.length > 0 && !hasCanonicalRef) {
            assumptions.push(`${claim.text} (from advisory memory only; verify against project records before treating as fact)`);
            continue;
        }
        facts.push({ ...claim, citationRefs: refs });
    }

    const content = [
        '## Facts',
        ...(facts.length > 0
            ? facts.map((claim) => {
                  const refs = claim.citationRefs.length
                      ? ` [${claim.citationRefs.join('; ')}]`
                      : ' [Needs evidence]';
                  return `- ${claim.text}${refs}`;
              })
            : ['- No current record-backed facts were drafted for this section.']),
        '',
        '## Assumptions',
        ...(assumptions.length > 0 ? assumptions.map((item) => `- ${item}`) : ['- None recorded.']),
        '',
        '## Recommendations',
        ...(raw?.recommendations.length
            ? raw.recommendations.map((item) => `- ${item}`)
            : ['- None recorded.']),
        '',
        '## Open Questions',
        ...(raw?.openQuestions.length
            ? raw.openQuestions.map((item) => `- ${item}`)
            : ['- None recorded.']),
    ].join('\n');

    return {
        sectionKey,
        sectionLabel: def.label,
        content,
    };
}

function normalizeModelOutput(
    output: WeeklyReportDraftModelOutput,
    sources: WeeklyReportSource[]
): WeeklyReportGeneratedSection[] {
    const sourceIds = new Set(sources.map((source) => source.id));
    return WEEKLY_REPORT_SECTION_DEFS.map((def) => normalizeSection(def.key, output, sourceIds));
}

export async function generateWeeklyReportDraft(
    request: WeeklyReportDraftRequest,
    deps: WeeklyReportDraftDeps = {}
): Promise<GeneratedWeeklyReportDraft> {
    assertIsoDate(request.reportDate, 'reportDate');
    assertIsoDate(request.reportingPeriodStart, 'reportingPeriodStart');
    assertIsoDate(request.reportingPeriodEnd, 'reportingPeriodEnd');

    const now = deps.now?.() ?? new Date();
    const period = request.reportingPeriodStart && request.reportingPeriodEnd
        ? { start: request.reportingPeriodStart, end: request.reportingPeriodEnd }
        : defaultPeriod(now);

    const [assembled, rfiList] = await Promise.all([
        (deps.assembleContextFn ?? assembleContext)({
            projectId: request.projectId,
            contextType: 'report-section',
            sectionKey: 'weekly_project_report',
            task: 'Draft a weekly project report from current project records, RFIs, cost, programme, risks, documents, and approved memory.',
            reportingPeriod: period,
            includeKnowledgeDomains: false,
            includeAiMemory: true,
            forceModules: [
                'projectInfo',
                'profile',
                'costPlan',
                'program',
                'risks',
                'stakeholders',
                'starredNotes',
                'ragDocuments',
            ],
        }),
        (deps.listRfis ?? rfiService.list)({
            projectId: request.projectId,
            organizationId: request.organizationId,
            filter: 'all',
        }) as Promise<RfiListResponse>,
    ]);

    const sources = buildSources(assembled, rfiList.rfis);
    const prompt = buildWeeklyReportDraftPrompt({
        periodStart: period.start,
        periodEnd: period.end,
        sources,
    });
    const modelOutput = await (deps.modelClient ?? defaultModelClient).generate(prompt);
    const parsed = modelOutputSchema.parse(modelOutput);

    return {
        title: request.title ?? `Weekly Project Report - ${period.start} to ${period.end}`,
        reportDate: request.reportDate ?? period.end,
        preparedFor: request.preparedFor ?? null,
        preparedBy: request.preparedBy ?? null,
        groupId: request.groupId ?? null,
        reportingPeriodStart: period.start,
        reportingPeriodEnd: period.end,
        sections: normalizeModelOutput(parsed, sources),
        sources,
        rfiCount: rfiList.rfis.length,
    };
}

export async function createWeeklyReportDraft(
    request: WeeklyReportDraftRequest,
    deps: WeeklyReportDraftDeps = {}
): Promise<CreatedWeeklyReportDraft> {
    const draft = await generateWeeklyReportDraft(request, deps);
    const id = newId();
    const now = new Date().toISOString();
    const sectionRows = draft.sections.map((section, index) => ({
        id: newId(),
        reportId: id,
        sectionKey: section.sectionKey,
        sectionLabel: section.sectionLabel,
        content: section.content,
        sortOrder: index,
        parentSectionId: null,
        stakeholderId: null,
        createdAt: now,
        updatedAt: now,
    }));

    await db.transaction(async (tx) => {
        await tx.insert(reports).values({
            id,
            projectId: request.projectId,
            organizationId: request.organizationId,
            groupId: draft.groupId,
            title: draft.title,
            reportDate: draft.reportDate,
            preparedFor: draft.preparedFor,
            preparedBy: draft.preparedBy,
            contentsType: 'custom',
            reportingPeriodStart: draft.reportingPeriodStart,
            reportingPeriodEnd: draft.reportingPeriodEnd,
            createdAt: now,
            updatedAt: now,
        });
        if (sectionRows.length > 0) {
            await tx.insert(reportSections).values(sectionRows);
        }
    });

    return {
        ...draft,
        id,
        projectId: request.projectId,
        organizationId: request.organizationId,
        contentsType: 'custom',
        sectionCount: sectionRows.length,
        transmittalCount: 0,
    };
}
