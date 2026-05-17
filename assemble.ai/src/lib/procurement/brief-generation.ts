import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { aiComplete } from '@/lib/ai/client';
import {
    consultantDisciplines,
    costLines,
    db,
    disciplineFeeItems,
    documents,
    fileAssets,
    profilerObjectives,
    projectDetails,
    projectObjectives,
    projectProfiles,
    projects,
    projectStakeholders,
    versions,
} from '@/lib/db';
import { ragDb } from '@/lib/db/rag-client';
import type { InputInterpretation } from '@/lib/constants/field-types';
import type { DomainTag, ProfileTagInput } from '@/lib/constants/knowledge-domains';
import {
    PROJECT_KNOWLEDGE_SET_NAMES,
    RFT_DOMAIN_TYPES,
} from '@/lib/rag/rft-knowledge';
import {
    retrieve,
    retrieveFromDomains,
    type DomainRetrievalResult,
    type RetrievalResult,
} from '@/lib/rag/retrieval';
import {
    retrieveSeedKnowledgeFallback,
    retrieveSeedKnowledgeSections,
    type SeedKnowledgeResult,
    type SeedKnowledgeSectionResult,
} from '@/lib/rag/seed-knowledge-retrieval';
import {
    buildProcurementBriefKnowledgeTags,
    buildProcurementBriefPrompt,
    buildProcurementBriefQuery,
    isProcurementBriefField,
    normalizeKnowledgeProjectType,
    resolveProcurementSeedDomainSlugs,
    resolveProcurementSeedSectionTitles,
    type ProcurementBriefFeeItem,
    type ProcurementBriefFieldType,
    type ProcurementBriefProjectContext,
} from './brief-prompt';
import { filterProcurementFallbackSeedResultsForContext } from './seed-filter';

export { isProcurementBriefField };

interface GenerateProcurementBriefFieldInput {
    projectId: string;
    fieldType: ProcurementBriefFieldType;
    userInput: string;
    inputMode: InputInterpretation;
    stakeholderId?: string;
    disciplineId?: string;
    organizationId?: string;
    additionalContext?: {
        firmName?: string;
        evaluationData?: object;
        sectionTitle?: string;
    };
}

interface GenerationSource {
    chunkId: string;
    documentName: string;
    relevanceScore: number;
}

interface SourceTrace {
    usedProjectObjectives: boolean;
    usedFeeSchedule: boolean;
    usedProjectDocuments: boolean;
    usedDomainRAG: boolean;
    usedDisciplineSeedKnowledge: boolean;
    usedSeedKnowledge: boolean;
    usedStakeholderContext: boolean;
    feeScheduleCount: number;
    projectDocumentCount: number;
    projectDocumentChunkCount: number;
    domainKnowledgeCount: number;
    disciplineSeedSectionCount: number;
    seedKnowledgeCount: number;
    domainTags: DomainTag[];
    disciplineSeedSections: Array<{
        domainName: string;
        sectionTitle: string;
    }>;
    seedKnowledgeSources: Array<{
        domainName: string;
        sectionTitle: string | null;
        relevanceScore: number;
    }>;
}

interface BriefQualityGateMetadata {
    passed: boolean;
    retried: boolean;
    issues: string[];
    initialIssues?: string[];
    bulletCount: number;
    headingCount: number;
    projectSignalMatches: number;
    projectSignalsAvailable: number;
}

export interface ProcurementBriefGenerationResponse {
    content: string;
    sources: GenerationSource[];
    inputInterpretation: InputInterpretation;
    metadata: {
        usedRAG: boolean;
        usedDomainKnowledge: boolean;
        usedProjectContext: boolean;
        usedProfiler: boolean;
        usedObjectives: boolean;
        usedProjectObjectives: boolean;
        usedFeeSchedule: boolean;
        usedProjectDocuments: boolean;
        usedDisciplineSeedKnowledge: boolean;
        usedSeedKnowledge: boolean;
        usedStakeholderContext: boolean;
        ragDocumentCount: number;
        ragChunkCount: number;
        feeScheduleCount: number;
        domainKnowledgeCount: number;
        disciplineSeedSectionCount: number;
        seedKnowledgeCount: number;
        qualityGate: BriefQualityGateMetadata;
        sourceTrace: SourceTrace;
    };
}

interface StakeholderBriefContext {
    contextName: string;
    contextText: string;
    stakeholderGroup?: string | null;
}

interface ProjectDocumentRetrieval {
    contextText: string;
    results: RetrievalResult[];
    documentNames: Map<string, string>;
}

interface DomainAndSeedRetrieval {
    disciplineSeedContext: string;
    domainContext: string;
    seedContext: string;
    disciplineSeedSections: SeedKnowledgeSectionResult[];
    domainResults: DomainRetrievalResult[];
    seedResults: SeedKnowledgeResult[];
    domainTags: DomainTag[];
}

function cleanupFormatting(content: string): string {
    return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => {
            if (line === '') return true;
            if (/^[\u2022\-\*]\s*$/.test(line)) return false;
            return true;
        })
        .join('\n')
        .replace(/\n{2,}/g, '\n\n')
        .trim();
}

function normalizeForMatch(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function countBulletLines(content: string): number {
    return extractBulletTexts(content).length;
}

function extractBulletTexts(content: string): string[] {
    const bulletPrefixPattern = /^([-*\u2022]\s+|\d+\.\s+)/;

    return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => bulletPrefixPattern.test(line))
        .map((line) => line.replace(bulletPrefixPattern, '').trim())
        .filter(Boolean);
}

function countHeadingLines(content: string): number {
    return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => {
            if (!line) return false;
            return /^#{1,6}\s+\S/.test(line)
                || /^\*\*[^*]{2,}\*\*:?\s*$/.test(line)
                || /^[A-Z][A-Za-z0-9&/(),'\-\s]{2,80}:$/.test(line);
        })
        .length;
}

const PROJECT_SIGNAL_RULES: Array<{
    label: string;
    sourcePatterns: RegExp[];
    outputPatterns: RegExp[];
}> = [
    {
        label: 'residential apartments',
        sourcePatterns: [/\bclass\s*2\b/i, /\bresidential\b/i, /\bapartments?\b/i],
        outputPatterns: [/\bclass\s*2\b/i, /\bresidential\b/i, /\bapartments?\b/i],
    },
    {
        label: 'storeys',
        sourcePatterns: [/\b\d+\s*[- ]?storey/i, /\bstoreys?:\s*\d+\b/i],
        outputPatterns: [/\b\d+\s*[- ]?storey/i, /\bstoreys?\b/i],
    },
    {
        label: 'unit count',
        sourcePatterns: [/\b\d+\s*[- ]?(unit|apartment)s?\b/i, /\b(unit|apartment)s?:?\s*\d+\b/i],
        outputPatterns: [/\b\d+\s*[- ]?(unit|apartment)s?\b/i, /\b(unit|apartment)s?:?\s*\d+\b/i],
    },
    {
        label: 'basement',
        sourcePatterns: [/\bbasement\b/i],
        outputPatterns: [/\bbasement\b/i],
    },
    {
        label: 'DA consent',
        sourcePatterns: [/\bDA\b/i, /\bdevelopment application\b/i],
        outputPatterns: [/\bDA\b/i, /\bdevelopment application\b/i],
    },
    {
        label: 'construction certificate',
        sourcePatterns: [/\bCC\b/i, /\bconstruction certificate\b/i],
        outputPatterns: [/\bCC\b/i, /\bconstruction certificate\b/i],
    },
    {
        label: 'occupancy certificate',
        sourcePatterns: [/\bOC\b/i, /\boccupancy certificate\b/i],
        outputPatterns: [/\bOC\b/i, /\boccupancy certificate\b/i],
    },
    {
        label: 'NCC/BCA',
        sourcePatterns: [/\bNCC\b/i, /\bBCA\b/i],
        outputPatterns: [/\bNCC\b/i, /\bBCA\b/i],
    },
    {
        label: 'BASIX',
        sourcePatterns: [/\bBASIX\b/i],
        outputPatterns: [/\bBASIX\b/i],
    },
    {
        label: 'acoustic',
        sourcePatterns: [/\bacoustic\b/i],
        outputPatterns: [/\bacoustic\b/i],
    },
    {
        label: 'facade',
        sourcePatterns: [/\bfacade\b/i, /\bcurtain wall\b/i],
        outputPatterns: [/\bfacade\b/i, /\bcurtain wall\b/i],
    },
    {
        label: 'services coordination',
        sourcePatterns: [/\bbuilding services\b/i, /\bservices infrastructure\b/i, /\bservices\b/i],
        outputPatterns: [/\bservices coordination\b/i, /\bservices infrastructure\b/i, /\bconsultant coordination\b/i],
    },
    {
        label: 'handover and defects',
        sourcePatterns: [/\bhandover\b/i, /\bdefects?\b/i, /\bDLP\b/i],
        outputPatterns: [/\bhandover\b/i, /\bdefects?\b/i, /\bDLP\b/i],
    },
    {
        label: 'design and construct',
        sourcePatterns: [/\bdesign\s*(and|&)\s*construct\b/i, /\bD\s*&\s*C\b/i],
        outputPatterns: [/\bdesign\s*(and|&)\s*construct\b/i, /\bD\s*&\s*C\b/i, /\bcontractor interface\b/i],
    },
];

function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

function collectProjectSignals(projectContext: ProcurementBriefProjectContext): Array<typeof PROJECT_SIGNAL_RULES[number]> {
    const sourceText = [
        projectContext.factsText,
        projectContext.profileText,
        projectContext.objectivesText,
    ].join('\n');

    return PROJECT_SIGNAL_RULES.filter((signal) => matchesAnyPattern(sourceText, signal.sourcePatterns));
}

function expectedMinimumBulletCount(input: GenerateProcurementBriefFieldInput, feeItems: ProcurementBriefFeeItem[]): number {
    if (input.inputMode === 'enhance') {
        return feeItems.length > 0
            ? Math.max(4, Math.min(12, feeItems.length * 2))
            : 8;
    }

    return feeItems.length > 0
        ? Math.max(4, Math.min(14, feeItems.length * 2))
        : 10;
}

function userExplicitlyRequestedSparseOutput(userInput: string): boolean {
    return /\b(only|just|exactly|limit(?:ed)?\s+to|no\s+more\s+than|max(?:imum)?\s+of)\s+(one|two|three|four|1|2|3|4)\s+(bullet|bullets|line|lines|item|items)\b/i.test(userInput);
}

function missingFeeHeadings(content: string, feeItems: ProcurementBriefFeeItem[]): string[] {
    const normalizedContent = normalizeForMatch(content);
    return feeItems
        .map((item) => item.heading)
        .filter((heading) => !normalizedContent.includes(normalizeForMatch(heading)));
}

const DELIVERABLE_ACTION_VERBS = [
    'assist',
    'collaborate',
    'coordinate',
    'develop',
    'design',
    'ensure',
    'integrate',
    'manage',
    'oversee',
    'prepare',
    'provide',
    'review',
    'advise',
    'support',
    'deliver',
    'monitor',
    'attend',
    'liaise',
];

const DELIVERABLE_ARTIFACT_TERMS = [
    'application',
    'brief',
    'certificate',
    'certification',
    'checklist',
    'diagram',
    'document',
    'documentation',
    'drawing',
    'drawings',
    'inputs',
    'layout',
    'layouts',
    'manual',
    'manuals',
    'markups',
    'matrix',
    'memorandum',
    'model',
    'models',
    'package',
    'pack',
    'plan',
    'plans',
    'record',
    'records',
    'register',
    'report',
    'reports',
    'response',
    'responses',
    'schedule',
    'schedules',
    'specification',
    'specifications',
    'submission',
    'submissions',
];

const ARTIFACT_START_ALLOW_LIST = [
    'design brief',
    'design report',
    'design statement',
    'design drawings',
    'design documentation',
    'design package',
    'review report',
    'review register',
    'review record',
];

function startsWithDeliverableActionVerb(text: string): boolean {
    const normalized = normalizeForMatch(text);
    if (!normalized) return false;
    if (ARTIFACT_START_ALLOW_LIST.some((phrase) => normalized.startsWith(phrase))) return false;
    const firstWord = normalized.split(' ')[0];
    if ((firstWord === 'design' || firstWord === 'review') && hasDeliverableArtifactTerm(text)) return false;
    return DELIVERABLE_ACTION_VERBS.includes(firstWord);
}

function hasDeliverableArtifactTerm(text: string): boolean {
    const normalized = ` ${normalizeForMatch(text)} `;
    return DELIVERABLE_ARTIFACT_TERMS.some((term) => normalized.includes(` ${term} `));
}

function findServiceLikeDeliverables(content: string): string[] {
    return extractBulletTexts(content)
        .filter((line) => startsWithDeliverableActionVerb(line))
        .slice(0, 8);
}

function findNonArtifactDeliverables(content: string): string[] {
    return extractBulletTexts(content)
        .filter((line) => !hasDeliverableArtifactTerm(line))
        .slice(0, 8);
}

function hasArchitectServicesOwnershipLeak(content: string): boolean {
    return /\b(HVAC|mechanical|electrical|plumbing|hydraulic|fire services)\b/i.test(content)
        && !/\b(coordination|markups?|interface|spatial|inputs?|services coordination)\b/i.test(content);
}

function isMechanicalOnlyContext(contextName: string): boolean {
    const normalized = normalizeForMatch(contextName);
    return (normalized.includes('mechanical') || normalized.includes('hvac'))
        && !normalized.includes('mep')
        && !normalized.includes('electrical')
        && !normalized.includes('hydraulic')
        && !normalized.includes('fire');
}

function isElectricalOnlyContext(contextName: string): boolean {
    const normalized = normalizeForMatch(contextName);
    return normalized.includes('electrical')
        && !normalized.includes('mep')
        && !normalized.includes('mechanical')
        && !normalized.includes('hydraulic')
        && !normalized.includes('fire');
}

function isHydraulicOnlyContext(contextName: string): boolean {
    const normalized = normalizeForMatch(contextName);
    return (normalized.includes('hydraulic') || normalized.includes('plumbing'))
        && !normalized.includes('mep')
        && !normalized.includes('mechanical')
        && !normalized.includes('electrical')
        && !normalized.includes('fire');
}

function hasMechanicalNonDisciplineDeliverable(content: string): boolean {
    return /\b(electrical|hydraulic|plumbing|fire services|communications?|security|access control|intercom|vertical transport|lift)\b/i.test(content)
        && !/\b(coordination|interface|inputs?|builder'?s work|penetrations?|plant loads?|services coordination)\b/i.test(content);
}

function hasMechanicalBasixOverreach(content: string): boolean {
    return /\bBASIX\b/i.test(content)
        && /\b(documentation|certification|compliance documentation|compliance certificate|compliance)\b/i.test(content)
        && !/\b(mechanical|services input|services inputs|input|inputs|Section J|coordination)\b/i.test(content);
}

function hasElectricalNonDisciplineDeliverable(content: string): boolean {
    return /\b(mechanical|HVAC|hydraulic|plumbing|fire services|lift|structural|architectural|BCA certification)\b/i.test(content)
        && !/\b(coordination|interface|inputs?|builder'?s work|penetrations?|plant power|services coordination|pathways?)\b/i.test(content);
}

function hasElectricalBasixOverreach(content: string): boolean {
    return /\bBASIX\b/i.test(content)
        && /\b(documentation|certification|compliance documentation|compliance certificate|compliance)\b/i.test(content)
        && !/\b(electrical|services input|services inputs|input|inputs|Section J|coordination)\b/i.test(content);
}

function hasHydraulicCivilScopeLeak(content: string): boolean {
    return /\b(erosion and sediment|sediment control|on-site detention|OSD|bulk earthworks|pavement drainage|external civil drainage|site stormwater|stormwater management)\b/i.test(content)
        && !/\b(roof drainage|internal stormwater|rainwater reuse|hydraulic drainage|coordination|interface|inputs?)\b/i.test(content);
}

function hasHydraulicNonDisciplineDeliverable(content: string): boolean {
    return /\b(mechanical|electrical|fire services|structural|architectural|BCA certification)\b/i.test(content)
        && !/\b(coordination|interface|inputs?|builder'?s work|penetrations?|plant power|services coordination)\b/i.test(content);
}

function hasHydraulicBasixOverreach(content: string): boolean {
    return /\bBASIX\b/i.test(content)
        && /\b(documentation|certification|compliance documentation|compliance certificate|compliance)\b/i.test(content)
        && !/\b(hydraulic|water services|services input|services inputs|input|inputs|coordination)\b/i.test(content);
}

function validateProcurementBriefContent(args: {
    content: string;
    input: GenerateProcurementBriefFieldInput;
    feeItems: ProcurementBriefFeeItem[];
    projectContext: ProcurementBriefProjectContext;
    contextName: string;
}): BriefQualityGateMetadata {
    const content = args.content.trim();
    const bulletCount = countBulletLines(content);
    const headingCount = countHeadingLines(content);
    const nonEmptyLineCount = content.split('\n').map((line) => line.trim()).filter(Boolean).length;
    const minBullets = expectedMinimumBulletCount(args.input, args.feeItems);
    const projectSignals = collectProjectSignals(args.projectContext);
    const projectSignalMatches = projectSignals
        .filter((signal) => matchesAnyPattern(content, signal.outputPatterns))
        .length;
    const allowSparseOutput = userExplicitlyRequestedSparseOutput(args.input.userInput);
    const issues: string[] = [];

    if (!content) {
        issues.push('Return non-empty Markdown content.');
    }
    if (!allowSparseOutput && nonEmptyLineCount <= 4) {
        issues.push('Expand beyond a generic stub; include structured headings and scoped bullets.');
    }
    if (!allowSparseOutput && bulletCount < minBullets) {
        issues.push(`Return at least ${minBullets} concise bullets.`);
    }
    if (args.feeItems.length === 0 && headingCount < 4) {
        issues.push('Use at least four fallback headings for the active discipline.');
    }

    const missingHeadings = missingFeeHeadings(content, args.feeItems);
    if (missingHeadings.length > 0) {
        issues.push(`Use the fee schedule headings exactly: ${missingHeadings.slice(0, 5).join(', ')}.`);
    }

    if (projectSignals.length >= 3 && projectSignalMatches === 0) {
        issues.push('Use concrete project signals from the facts/objectives instead of generic consultant wording.');
    }
    if (args.feeItems.length === 0 && projectSignals.length >= 5 && projectSignalMatches < 2) {
        issues.push('Reference at least two relevant project constraints such as approvals, apartments, NCC/BCA, BASIX, basement, handover, or procurement route.');
    }

    if (args.input.fieldType === 'brief.deliverables') {
        const serviceLikeDeliverables = findServiceLikeDeliverables(content);
        const nonArtifactDeliverables = findNonArtifactDeliverables(content);

        if (serviceLikeDeliverables.length > 0) {
            issues.push(`Rewrite deliverables as issued artifacts, not activities: ${serviceLikeDeliverables.slice(0, 5).join('; ')}.`);
        }
        if (nonArtifactDeliverables.length > 0) {
            issues.push(`Each deliverable must name a concrete artifact such as a drawing, schedule, report, matrix, register, submission, markup, certificate, or handover pack: ${nonArtifactDeliverables.slice(0, 5).join('; ')}.`);
        }
        if (/architect/i.test(args.contextName) && hasArchitectServicesOwnershipLeak(content)) {
            issues.push('Architect deliverables must not own HVAC, electrical, plumbing, hydraulic, mechanical, or fire services design outputs; rewrite these as architectural services coordination markups or interface records.');
        }
        if (isMechanicalOnlyContext(args.contextName)) {
            if (hasMechanicalNonDisciplineDeliverable(content)) {
                issues.push('Mechanical deliverables must stay within mechanical/HVAC scope; rewrite electrical, hydraulic, fire, security, intercom, lift, or communications items as coordination inputs only, or remove them.');
            }
            if (hasMechanicalBasixOverreach(content)) {
                issues.push('Mechanical deliverables must not claim BASIX ownership; rewrite BASIX wording as "Section J/BASIX mechanical services inputs" or "BASIX mechanical coordination inputs".');
            }
        }
        if (isElectricalOnlyContext(args.contextName)) {
            if (hasElectricalNonDisciplineDeliverable(content)) {
                issues.push('Electrical deliverables must stay within electrical scope; rewrite mechanical, hydraulic, fire, lift, structural, architectural, or BCA items as coordination inputs only, or remove them.');
            }
            if (hasElectricalBasixOverreach(content)) {
                issues.push('Electrical deliverables must not claim BASIX ownership; rewrite BASIX wording as "Section J/BASIX electrical services inputs" or "BASIX electrical coordination inputs".');
            }
        }
        if (isHydraulicOnlyContext(args.contextName)) {
            if (hasHydraulicCivilScopeLeak(content)) {
                issues.push('Hydraulic deliverables must not absorb civil stormwater, OSD, erosion/sediment, earthworks, pavement drainage, or external civil drainage scope unless explicitly assigned; rewrite as roof drainage/internal stormwater/rainwater reuse or remove it.');
            }
            if (hasHydraulicNonDisciplineDeliverable(content)) {
                issues.push('Hydraulic deliverables must stay within hydraulic scope; rewrite mechanical, electrical, fire, structural, architectural, or BCA items as coordination inputs only, or remove them.');
            }
            if (hasHydraulicBasixOverreach(content)) {
                issues.push('Hydraulic deliverables must not claim BASIX ownership; rewrite BASIX wording as "BASIX water services inputs" or "hydraulic BASIX coordination inputs".');
            }
        }
    }

    return {
        passed: issues.length === 0,
        retried: false,
        issues,
        bulletCount,
        headingCount,
        projectSignalMatches,
        projectSignalsAvailable: projectSignals.length,
    };
}

function buildQualityRepairPrompt(args: {
    basePrompt: string;
    failedContent: string;
    qualityGate: BriefQualityGateMetadata;
}): string {
    return [
        args.basePrompt,
        '## Quality Gate Feedback',
        'The previous draft was rejected for being too generic, too sparse, outside the active discipline, or not artifact-based.',
        ...args.qualityGate.issues.map((issue) => `- ${issue}`),
        '',
        'Regenerate the field from scratch. Keep the same active discipline, source hierarchy, fee headings or fallback headings, and short/long mode rules. Return Markdown content only.',
        '',
        '## Previous Draft To Replace',
        args.failedContent || '(empty)',
    ].join('\n');
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

function parseJsonArray(value: unknown): string[] {
    if (!value || typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
            ? parsed.map((item) => String(item)).filter(Boolean)
            : [];
    } catch {
        return [];
    }
}

function formatKey(key: string): string {
    return key
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeAustralianState(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const match = value.toUpperCase().match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/);
    return match?.[1];
}

function textFromObjectiveRow(row: {
    text: string;
    textPolished?: string | null;
}): string {
    return row.textPolished?.trim() || row.text.trim();
}

function addLine(lines: string[], label: string, value: unknown): void {
    if (value === null || value === undefined || value === '') return;
    lines.push(`${label}: ${value}`);
}

async function fetchProcurementProjectContext(projectId: string): Promise<ProcurementBriefProjectContext> {
    const [project] = await db
        .select({
            name: projects.name,
            code: projects.code,
            projectType: projects.projectType,
        })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    const [details] = await db
        .select()
        .from(projectDetails)
        .where(eq(projectDetails.projectId, projectId))
        .limit(1);

    const [profile] = await db
        .select()
        .from(projectProfiles)
        .where(eq(projectProfiles.projectId, projectId))
        .limit(1);

    const objectiveRows = await db
        .select({
            objectiveType: projectObjectives.objectiveType,
            text: projectObjectives.text,
            textPolished: projectObjectives.textPolished,
            sortOrder: projectObjectives.sortOrder,
        })
        .from(projectObjectives)
        .where(and(
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.isDeleted, false),
        ))
        .orderBy(asc(projectObjectives.objectiveType), asc(projectObjectives.sortOrder));

    const [legacyObjectives] = objectiveRows.length === 0
        ? await db
            .select()
            .from(profilerObjectives)
            .where(eq(profilerObjectives.projectId, projectId))
            .limit(1)
        : [null];

    const factLines: string[] = [];
    addLine(factLines, 'Project Name', details?.projectName || project?.name);
    addLine(factLines, 'Project Code', project?.code);
    addLine(factLines, 'Address', details?.address);
    addLine(factLines, 'Jurisdiction', details?.jurisdiction);
    addLine(factLines, 'Zoning', details?.zoning);
    addLine(factLines, 'Lot Area', details?.lotArea ? `${details.lotArea} sqm` : undefined);
    addLine(factLines, 'Storeys', details?.numberOfStories);
    addLine(factLines, 'Building Class', details?.buildingClass);
    addLine(factLines, 'Project Type', project?.projectType);

    const profileLines: string[] = [];
    const profileTags: ProfileTagInput = {};
    const complexity = parseJsonRecord(profile?.complexity);
    const scaleData = parseJsonRecord(profile?.scaleData);
    const subclass = parseJsonArray(profile?.subclass);
    const workScope = parseJsonArray(profile?.workScope);
    const procurementMethod = String(
        complexity.procurement_route
        ?? complexity.procurementRoute
        ?? complexity.procurement_method
        ?? complexity.procurementMethod
        ?? ''
    ).trim() || undefined;

    if (profile) {
        addLine(profileLines, 'Building Class', profile.buildingClass);
        addLine(profileLines, 'Project Type', profile.projectType);
        if (subclass.length > 0) profileLines.push(`Subclass: ${subclass.join(', ')}`);
        if (workScope.length > 0) profileLines.push(`Work Scope: ${workScope.join(', ')}`);
        const scaleText = Object.entries(scaleData)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `${formatKey(key)}: ${value}`)
            .join(', ');
        if (scaleText) profileLines.push(`Scale: ${scaleText}`);
        const complexityText = Object.entries(complexity)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `${formatKey(key)}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join(', ');
        if (complexityText) profileLines.push(`Complexity: ${complexityText}`);
        addLine(profileLines, 'Procurement Method', procurementMethod);
        addLine(profileLines, 'Complexity Score', profile.complexityScore ? `${profile.complexityScore}/10` : undefined);

        profileTags.buildingClass = profile.buildingClass;
        profileTags.projectType = profile.projectType;
        profileTags.subclass = subclass;
        profileTags.complexity = complexity as Record<string, string | string[]>;
    } else if (project?.projectType || details?.buildingClass) {
        profileTags.projectType = project?.projectType ?? undefined;
        profileTags.buildingClass = details?.buildingClass ?? undefined;
    }

    const groupedObjectives = new Map<string, string[]>();
    for (const row of objectiveRows) {
        const text = textFromObjectiveRow(row);
        if (!text) continue;
        const rows = groupedObjectives.get(row.objectiveType) ?? [];
        rows.push(text);
        groupedObjectives.set(row.objectiveType, rows);
    }

    const objectiveLines: string[] = [];
    for (const [type, rows] of groupedObjectives) {
        objectiveLines.push(`${formatKey(type)}: ${rows.join('; ')}`);
    }

    if (objectiveLines.length === 0 && legacyObjectives) {
        const functionalQuality = parseJsonRecord(legacyObjectives.functionalQuality);
        const planningCompliance = parseJsonRecord(legacyObjectives.planningCompliance);
        if (functionalQuality.content) {
            objectiveLines.push(`Functional & Quality: ${functionalQuality.content}`);
        }
        if (planningCompliance.content) {
            objectiveLines.push(`Planning & Compliance: ${planningCompliance.content}`);
        }
    }

    const profileProjectType = profile?.projectType ?? project?.projectType ?? undefined;

    return {
        factsText: factLines.join('\n'),
        profileText: profileLines.join('\n'),
        objectivesText: objectiveLines.join('\n'),
        projectType: profileProjectType ?? undefined,
        procurementMethod,
        state: normalizeAustralianState(details?.jurisdiction),
        profileTags,
        hasProjectFacts: factLines.length > 0,
        hasProfiler: profileLines.length > 0,
        hasObjectives: objectiveLines.length > 0,
    };
}

async function fetchStakeholderBriefContext(input: GenerateProcurementBriefFieldInput): Promise<StakeholderBriefContext | null> {
    if (input.stakeholderId) {
        const [stakeholder] = await db
            .select({
                name: projectStakeholders.name,
                disciplineOrTrade: projectStakeholders.disciplineOrTrade,
                stakeholderGroup: projectStakeholders.stakeholderGroup,
                role: projectStakeholders.role,
                organization: projectStakeholders.organization,
                notes: projectStakeholders.notes,
            })
            .from(projectStakeholders)
            .where(and(
                eq(projectStakeholders.id, input.stakeholderId),
                eq(projectStakeholders.projectId, input.projectId),
                isNull(projectStakeholders.deletedAt),
            ))
            .limit(1);

        if (!stakeholder) return null;

        const lines: string[] = [];
        addLine(lines, 'Discipline/Trade', stakeholder.disciplineOrTrade);
        addLine(lines, 'Stakeholder Name', stakeholder.name);
        addLine(lines, 'Role', stakeholder.role);
        addLine(lines, 'Organization', stakeholder.organization);
        addLine(lines, 'Stakeholder Type', stakeholder.stakeholderGroup);
        addLine(lines, 'Notes', stakeholder.notes);

        return {
            contextName: stakeholder.disciplineOrTrade || stakeholder.role || stakeholder.name || 'Unknown Discipline',
            contextText: lines.join('\n'),
            stakeholderGroup: stakeholder.stakeholderGroup,
        };
    }

    if (input.disciplineId) {
        const [discipline] = await db
            .select({
                disciplineName: consultantDisciplines.disciplineName,
            })
            .from(consultantDisciplines)
            .where(and(
                eq(consultantDisciplines.id, input.disciplineId),
                eq(consultantDisciplines.projectId, input.projectId),
            ))
            .limit(1);

        if (!discipline) return null;

        return {
            contextName: discipline.disciplineName,
            contextText: `Discipline/Trade: ${discipline.disciplineName}\nStakeholder Type: consultant`,
            stakeholderGroup: 'consultant',
        };
    }

    return null;
}

async function fetchDisciplineFeeSchedule(disciplineId: string): Promise<ProcurementBriefFeeItem[]> {
    const rows = await db
        .select({
            id: disciplineFeeItems.id,
            description: disciplineFeeItems.description,
            sortOrder: disciplineFeeItems.sortOrder,
        })
        .from(disciplineFeeItems)
        .where(eq(disciplineFeeItems.disciplineId, disciplineId))
        .orderBy(asc(disciplineFeeItems.sortOrder));

    return rows.map((row) => ({
        id: row.id,
        heading: row.description,
        sortOrder: row.sortOrder,
        source: 'discipline_fee_item',
    }));
}

async function fetchProcurementFeeItems(input: GenerateProcurementBriefFieldInput, contextName: string): Promise<ProcurementBriefFeeItem[]> {
    if (input.stakeholderId) {
        const rows = await db
            .select({
                id: costLines.id,
                section: costLines.section,
                activity: costLines.activity,
                reference: costLines.reference,
                masterStage: costLines.masterStage,
                sortOrder: costLines.sortOrder,
            })
            .from(costLines)
            .where(and(
                eq(costLines.projectId, input.projectId),
                eq(costLines.stakeholderId, input.stakeholderId),
                isNull(costLines.deletedAt),
            ))
            .orderBy(asc(costLines.sortOrder));

        if (rows.length > 0) {
            return rows.map((row) => ({
                id: row.id,
                heading: row.activity,
                section: row.section,
                masterStage: row.masterStage,
                reference: row.reference,
                sortOrder: row.sortOrder,
                source: 'cost_line',
            }));
        }
    }

    if (input.disciplineId) {
        const rows = await fetchDisciplineFeeSchedule(input.disciplineId);
        if (rows.length > 0) return rows;
    }

    const normalizedContextName = contextName.trim().toLowerCase();
    if (!normalizedContextName) return [];

    const [legacyDiscipline] = await db
        .select({ id: consultantDisciplines.id })
        .from(consultantDisciplines)
        .where(and(
            eq(consultantDisciplines.projectId, input.projectId),
            sql`lower(${consultantDisciplines.disciplineName}) = ${normalizedContextName}`,
        ))
        .limit(1);

    return legacyDiscipline ? fetchDisciplineFeeSchedule(legacyDiscipline.id) : [];
}

async function fetchProjectDocumentRetrieval(
    projectId: string,
    ragQuery: string,
): Promise<ProjectDocumentRetrieval> {
    try {
        const knowledgeSetNames = `{${PROJECT_KNOWLEDGE_SET_NAMES.join(',')}}`;
        const documentSetResult = await ragDb.execute(sql`
            SELECT id, name
            FROM document_sets
            WHERE project_id = ${projectId}
            AND (
                name = ANY(${knowledgeSetNames}::text[])
                OR repo_type = 'project'
            )
            ORDER BY
                CASE
                    WHEN name = 'Knowledge' THEN 1
                    WHEN name = 'Ingest' THEN 2
                    WHEN repo_type = 'project' THEN 3
                    ELSE 4
                END
        `);

        const documentSetIds = [
            ...new Set(((documentSetResult.rows || []) as Array<{ id: string }>).map((row) => row.id).filter(Boolean)),
        ];
        if (documentSetIds.length === 0) {
            return { contextText: '', results: [], documentNames: new Map() };
        }

        const documentSetIdsArray = `{${documentSetIds.join(',')}}`;
        const memberResults = await ragDb.execute(sql`
            SELECT DISTINCT document_id as "documentId"
            FROM document_set_members
            WHERE document_set_id = ANY(${documentSetIdsArray}::text[])
            AND sync_status = 'synced'
        `);

        const documentIds = ((memberResults.rows || []) as Array<{ documentId: string }>)
            .map((row) => row.documentId)
            .filter(Boolean);

        if (documentIds.length === 0) {
            return { contextText: '', results: [], documentNames: new Map() };
        }

        const results = await retrieve(ragQuery, {
            documentIds,
            topK: 10,
            rerankTopK: 5,
            includeParentContext: true,
        });

        const documentNames = await getDocumentNames(results.map((result) => result.documentId));
        const contextText = results
            .map((result, index) => {
                const docName = documentNames.get(result.documentId) || 'Project document';
                const section = result.sectionTitle ? ` - ${result.sectionTitle}` : '';
                return `[Project Document ${index + 1}: ${docName}${section}]\n${result.content}`;
            })
            .join('\n\n---\n\n');

        return { contextText, results, documentNames };
    } catch (error) {
        console.log('[procurement-brief-generator] Project document RAG unavailable:', error);
        return { contextText: '', results: [], documentNames: new Map() };
    }
}

async function fetchDomainAndSeedRetrieval(args: {
    ragQuery: string;
    contextName: string;
    fieldType: ProcurementBriefFieldType;
    profile: ProfileTagInput;
    projectType?: string;
    state?: string;
    organizationId?: string;
}): Promise<DomainAndSeedRetrieval> {
    const domainTags = buildProcurementBriefKnowledgeTags({
        contextName: args.contextName,
        fieldType: args.fieldType,
        profile: args.profile,
    });

    let domainResults: DomainRetrievalResult[] = [];
    let seedResults: SeedKnowledgeResult[] = [];
    const knowledgeProjectType = normalizeKnowledgeProjectType(args.projectType);
    const seedDomainSlugs = resolveProcurementSeedDomainSlugs(args.contextName);
    const seedSectionTitles = resolveProcurementSeedSectionTitles(args.contextName);
    const disciplineSeedSections = retrieveSeedKnowledgeSections({
        domainTags,
        sectionTitles: seedSectionTitles,
        domainSlugs: seedDomainSlugs,
        projectType: knowledgeProjectType,
        state: args.state,
        topK: seedSectionTitles.length,
    });

    try {
        domainResults = await retrieveFromDomains(args.ragQuery, {
            domainTags,
            domainTypes: RFT_DOMAIN_TYPES,
            organizationId: args.organizationId,
            projectType: knowledgeProjectType,
            state: args.state,
            includePrebuilt: true,
            includeOrganization: Boolean(args.organizationId),
            topK: 14,
            rerankTopK: 5,
            minRelevanceScore: 0.25,
        });
    } catch (error) {
        console.log('[procurement-brief-generator] Domain RAG unavailable:', error);
    }

    if (domainResults.length === 0) {
        const fallbackSeedResults = retrieveSeedKnowledgeFallback(args.ragQuery, {
            domainTags,
            domainSlugs: seedDomainSlugs,
            projectType: knowledgeProjectType,
            state: args.state,
            topK: 16,
        });
        seedResults = filterProcurementFallbackSeedResultsForContext(fallbackSeedResults, args.contextName).slice(0, 8);
        if (seedResults.length !== fallbackSeedResults.length) {
            console.log(
                `[procurement-brief-generator] Filtered fallback seed snippets for ${args.contextName}: ${fallbackSeedResults.length} -> ${seedResults.length}`
            );
        }
    }

    if (disciplineSeedSections.length > 0) {
        console.log(
            `[procurement-brief-generator] Using ${disciplineSeedSections.length} raw discipline seed section(s): ${disciplineSeedSections
                .map((section) => `${section.domainName} / ${section.sectionTitle}`)
                .join('; ')}`
        );
    }

    if (seedResults.length > 0) {
        console.log(
            `[procurement-brief-generator] Using ${seedResults.length} fallback seed snippet(s): ${seedResults
                .map((result) => `${result.domainName}${result.sectionTitle ? ` / ${result.sectionTitle}` : ''}`)
                .join('; ')}`
        );
    }

    const disciplineSeedContext = disciplineSeedSections
        .map((result, index) => `[Discipline Seed ${index + 1} - ${result.domainName}: ${result.sectionTitle}]\n${result.content}`)
        .join('\n\n---\n\n');

    const domainContext = domainResults
        .map((result, index) => {
            const section = result.sectionTitle ? `: ${result.sectionTitle}` : '';
            return `[Domain ${index + 1} - ${result.domainName ?? 'Knowledge'}${section}]\n${result.content}`;
        })
        .join('\n\n---\n\n');

    const seedContext = seedResults
        .map((result, index) => {
            const section = result.sectionTitle ? `: ${result.sectionTitle}` : '';
            return `[Seed ${index + 1} - ${result.domainName}${section}]\n${result.content}`;
        })
        .join('\n\n---\n\n');

    return {
        disciplineSeedContext,
        domainContext,
        seedContext,
        disciplineSeedSections,
        domainResults,
        seedResults,
        domainTags,
    };
}

async function getDocumentNames(documentIds: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    const uniqueIds = [...new Set(documentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return names;

    try {
        const results = await db
            .select({
                id: documents.id,
                originalName: fileAssets.originalName,
            })
            .from(documents)
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .where(sql`${documents.id} IN (${sql.join(uniqueIds.map((id) => sql`${id}`), sql`, `)})`);

        for (const row of results) {
            if (row.originalName) names.set(row.id, row.originalName);
        }
    } catch (error) {
        console.error('[procurement-brief-generator] Error fetching document names:', error);
    }

    return names;
}

function buildSourceTrace(args: {
    projectContext: ProcurementBriefProjectContext;
    stakeholderContext: StakeholderBriefContext | null;
    feeItems: ProcurementBriefFeeItem[];
    projectDocuments: ProjectDocumentRetrieval;
    knowledge: DomainAndSeedRetrieval;
}): SourceTrace {
    return {
        usedProjectObjectives: args.projectContext.hasObjectives,
        usedFeeSchedule: args.feeItems.length > 0,
        usedProjectDocuments: args.projectDocuments.results.length > 0,
        usedDomainRAG: args.knowledge.domainResults.length > 0,
        usedDisciplineSeedKnowledge: args.knowledge.disciplineSeedSections.length > 0,
        usedSeedKnowledge: args.knowledge.disciplineSeedSections.length > 0 || args.knowledge.seedResults.length > 0,
        usedStakeholderContext: Boolean(args.stakeholderContext?.contextText),
        feeScheduleCount: args.feeItems.length,
        projectDocumentCount: new Set(args.projectDocuments.results.map((result) => result.documentId)).size,
        projectDocumentChunkCount: args.projectDocuments.results.length,
        domainKnowledgeCount: args.knowledge.domainResults.length,
        disciplineSeedSectionCount: args.knowledge.disciplineSeedSections.length,
        seedKnowledgeCount: args.knowledge.disciplineSeedSections.length + args.knowledge.seedResults.length,
        domainTags: args.knowledge.domainTags,
        disciplineSeedSections: args.knowledge.disciplineSeedSections.map((section) => ({
            domainName: section.domainName,
            sectionTitle: section.sectionTitle,
        })),
        seedKnowledgeSources: args.knowledge.seedResults.map((result) => ({
            domainName: result.domainName,
            sectionTitle: result.sectionTitle,
            relevanceScore: Math.round(result.relevanceScore * 100),
        })),
    };
}

export async function generateProcurementBriefField(
    input: GenerateProcurementBriefFieldInput,
): Promise<ProcurementBriefGenerationResponse> {
    if (!isProcurementBriefField(input.fieldType)) {
        throw new Error(`Unsupported procurement brief field type: ${input.fieldType}`);
    }

    const projectContext = await fetchProcurementProjectContext(input.projectId);
    const stakeholderContext = await fetchStakeholderBriefContext(input);
    const contextName = stakeholderContext?.contextName || 'Unknown Discipline';
    const feeItems = await fetchProcurementFeeItems(input, contextName);

    const ragQuery = buildProcurementBriefQuery({
        fieldType: input.fieldType,
        inputMode: input.inputMode,
        userInput: input.userInput,
        contextName,
        projectContext,
        feeItems,
    });

    const [projectDocuments, knowledge] = await Promise.all([
        fetchProjectDocumentRetrieval(input.projectId, ragQuery),
        fetchDomainAndSeedRetrieval({
            ragQuery,
            contextName,
            fieldType: input.fieldType,
            profile: projectContext.profileTags,
            projectType: projectContext.projectType,
            state: projectContext.state,
            organizationId: input.organizationId,
        }),
    ]);

    const prompt = buildProcurementBriefPrompt({
        fieldType: input.fieldType,
        inputMode: input.inputMode,
        userInput: input.userInput,
        contextName,
        stakeholderContext: stakeholderContext?.contextText ?? '',
        projectContext,
        feeItems,
        projectDocumentContext: projectDocuments.contextText,
        disciplineSeedContext: knowledge.disciplineSeedContext,
        domainContext: knowledge.domainContext,
        seedContext: knowledge.seedContext,
        additionalContext: input.additionalContext,
    });

    const { text } = await aiComplete({
        featureGroup: 'extraction',
        maxTokens: 2200,
        messages: [{
            role: 'user',
            content: prompt,
        }],
    });
    let content = cleanupFormatting(text);
    const initialQualityGate = validateProcurementBriefContent({
        content,
        input,
        feeItems,
        projectContext,
        contextName,
    });
    let qualityGate = initialQualityGate;

    if (!initialQualityGate.passed) {
        const retryPrompt = buildQualityRepairPrompt({
            basePrompt: prompt,
            failedContent: content,
            qualityGate: initialQualityGate,
        });
        const retry = await aiComplete({
            featureGroup: 'extraction',
            maxTokens: 2600,
            messages: [{
                role: 'user',
                content: retryPrompt,
            }],
        });
        content = cleanupFormatting(retry.text);
        const retryQualityGate = validateProcurementBriefContent({
            content,
            input,
            feeItems,
            projectContext,
            contextName,
        });
        qualityGate = {
            ...retryQualityGate,
            retried: true,
            initialIssues: initialQualityGate.issues,
        };
    }

    const sourceTrace = buildSourceTrace({
        projectContext,
        stakeholderContext,
        feeItems,
        projectDocuments,
        knowledge,
    });

    console.log(
        `[procurement-brief-generator] Source trace: objectives=${sourceTrace.usedProjectObjectives}, feeRows=${sourceTrace.feeScheduleCount}, projectDocs=${sourceTrace.projectDocumentChunkCount}, disciplineSeed=${sourceTrace.disciplineSeedSectionCount}, fallbackSeed=${sourceTrace.seedKnowledgeSources.length}, domainRAG=${sourceTrace.domainKnowledgeCount}, stakeholder=${sourceTrace.usedStakeholderContext}`
    );
    console.log(
        `[procurement-brief-generator] Quality gate: passed=${qualityGate.passed}, retried=${qualityGate.retried}, bullets=${qualityGate.bulletCount}, headings=${qualityGate.headingCount}, issues=${qualityGate.issues.length}`
    );

    const sources = projectDocuments.results.map((result) => ({
        chunkId: result.chunkId,
        documentName: projectDocuments.documentNames.get(result.documentId) || 'Unknown Document',
        relevanceScore: Math.round(result.relevanceScore * 100),
    }));

    return {
        content,
        sources,
        inputInterpretation: input.inputMode,
        metadata: {
            usedRAG: sourceTrace.usedProjectDocuments,
            usedDomainKnowledge: sourceTrace.usedDomainRAG || sourceTrace.usedSeedKnowledge,
            usedProjectContext: projectContext.hasProjectFacts || projectContext.hasProfiler || projectContext.hasObjectives,
            usedProfiler: projectContext.hasProfiler,
            usedObjectives: projectContext.hasObjectives,
            usedProjectObjectives: projectContext.hasObjectives,
            usedFeeSchedule: sourceTrace.usedFeeSchedule,
            usedProjectDocuments: sourceTrace.usedProjectDocuments,
            usedDisciplineSeedKnowledge: sourceTrace.usedDisciplineSeedKnowledge,
            usedSeedKnowledge: sourceTrace.usedSeedKnowledge,
            usedStakeholderContext: sourceTrace.usedStakeholderContext,
            ragDocumentCount: sourceTrace.projectDocumentCount,
            ragChunkCount: sourceTrace.projectDocumentChunkCount,
            feeScheduleCount: sourceTrace.feeScheduleCount,
            domainKnowledgeCount: sourceTrace.domainKnowledgeCount,
            disciplineSeedSectionCount: sourceTrace.disciplineSeedSectionCount,
            seedKnowledgeCount: sourceTrace.seedKnowledgeCount,
            qualityGate,
            sourceTrace,
        },
    };
}
