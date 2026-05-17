import type { FieldType, InputInterpretation } from '@/lib/constants/field-types';
import type { DomainTag, ProfileTagInput } from '@/lib/constants/knowledge-domains';
import { resolveRftKnowledgeTags } from '@/lib/rag/rft-knowledge';

export type ProcurementBriefFieldType = Extract<FieldType, 'brief.service' | 'brief.deliverables'>;

export interface ProcurementBriefFeeItem {
    id?: string;
    heading: string;
    section?: string | null;
    masterStage?: string | null;
    reference?: string | null;
    sortOrder?: number | null;
    source?: 'cost_line' | 'discipline_fee_item';
}

export interface ProcurementBriefProjectContext {
    factsText: string;
    profileText: string;
    objectivesText: string;
    projectType?: string;
    procurementMethod?: string;
    state?: string;
    profileTags: ProfileTagInput;
    hasProjectFacts: boolean;
    hasProfiler: boolean;
    hasObjectives: boolean;
}

export interface ProcurementBriefPromptArgs {
    fieldType: ProcurementBriefFieldType;
    inputMode: InputInterpretation;
    userInput: string;
    contextName: string;
    stakeholderContext: string;
    projectContext: ProcurementBriefProjectContext;
    feeItems: ProcurementBriefFeeItem[];
    projectDocumentContext: string;
    disciplineSeedContext?: string;
    domainContext: string;
    seedContext: string;
    additionalContext?: {
        firmName?: string;
        evaluationData?: object;
        sectionTitle?: string;
    };
}

const KNOWLEDGE_PROJECT_TYPES = new Set(['new', 'refurb', 'extend', 'remediation', 'advisory']);

export type ProcurementRoute =
    | 'design-and-construct'
    | 'eci'
    | 'construct-only'
    | 'construction-management'
    | 'managing-contractor'
    | 'unknown';

export function isProcurementBriefField(fieldType: FieldType): fieldType is ProcurementBriefFieldType {
    return fieldType === 'brief.service' || fieldType === 'brief.deliverables';
}

export function normalizeKnowledgeProjectType(projectType: string | undefined): string | undefined {
    if (!projectType) return undefined;
    const normalized = projectType.trim().toLowerCase();
    return KNOWLEDGE_PROJECT_TYPES.has(normalized) ? normalized : undefined;
}

function uniqueTags(tags: DomainTag[]): DomainTag[] {
    return [...new Set(tags)];
}

function maybeAdd(tags: DomainTag[], tag: DomainTag, condition: boolean): void {
    if (condition) tags.push(tag);
}

export function buildProcurementBriefKnowledgeTags(args: {
    contextName: string;
    fieldType: ProcurementBriefFieldType;
    profile?: ProfileTagInput;
}): DomainTag[] {
    const tags = resolveRftKnowledgeTags(args);
    const profile = args.profile ?? {};
    const buildingClass = (profile.buildingClass ?? '').toLowerCase();
    const projectType = (profile.projectType ?? '').toLowerCase();
    const subclassText = (profile.subclass ?? []).join(' ').toLowerCase();

    maybeAdd(tags, 'residential', /class\s*1|class\s*2|residential|apartment|housing/.test(`${buildingClass} ${projectType} ${subclassText}`));
    maybeAdd(tags, 'apartments', /class\s*2|apartment|multi[-\s]?residential|sou/.test(`${buildingClass} ${projectType} ${subclassText}`));
    maybeAdd(tags, 'ncc', args.fieldType.startsWith('brief.'));
    maybeAdd(tags, 'as-standards', args.fieldType.startsWith('brief.'));

    return uniqueTags(tags);
}

function compactJoin(parts: Array<string | undefined | null>, separator = '\n'): string {
    return parts
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join(separator);
}

function formatFeeScheduleForPrompt(feeItems: ProcurementBriefFeeItem[]): string {
    if (feeItems.length === 0) {
        return 'No fee schedule rows are currently assigned to this stakeholder.';
    }

    return feeItems
        .map((item, index) => {
            const details = compactJoin([
                item.section ? `Section: ${item.section}` : undefined,
                item.masterStage ? `Stage: ${item.masterStage.replace(/_/g, ' ')}` : undefined,
                item.reference ? `Reference: ${item.reference}` : undefined,
            ], '; ');
            return `${index + 1}. ${item.heading}${details ? ` (${details})` : ''}`;
        })
        .join('\n');
}

function formatAdditionalContext(args: ProcurementBriefPromptArgs): string {
    const extras: string[] = [];
    const additional = args.additionalContext;
    if (!additional) return '';

    if (additional.firmName) extras.push(`Firm/Company: ${additional.firmName}`);
    if (additional.sectionTitle) extras.push(`Section: ${additional.sectionTitle}`);
    if (additional.evaluationData) extras.push(`Evaluation Data: ${JSON.stringify(additional.evaluationData)}`);

    return extras.length > 0 ? extras.join('\n') : '';
}

function fieldLabel(fieldType: ProcurementBriefFieldType): string {
    return fieldType === 'brief.service' ? 'services' : 'deliverables';
}

function fieldIntent(fieldType: ProcurementBriefFieldType): string {
    return fieldType === 'brief.service'
        ? 'explain the consultant services, responsibilities, coordination tasks, reviews, advice, and project support covered by each item'
        : 'list the concrete outputs, submissions, drawings, schedules, reports, certificates, or review records expected under each item';
}

function deliverableExamplesForDiscipline(contextName: string): string[] {
    switch (disciplineKey(contextName)) {
        case 'architect':
            return [
                'Architectural drawing package',
                'Apartment layout plans',
                'Basement car park layout drawings',
                'Facade, glazing, and roofing detail drawings',
                'Door, hardware, access, and intercom schedules',
                'Finishes and materials schedule',
                'DA condition response matrix',
                'Construction Certificate architectural package',
                'NCC/BCA design compliance response',
                'BASIX coordination inputs',
                'Acoustic coordination markups',
                'Architectural defects inspection report',
                'Architectural handover drawing pack',
            ];

        case 'structural':
            return [
                'Structural drawing package',
                'Structural design report',
                'Footing, slab, column, and transfer structure drawings',
                'Structural specifications',
                'Structural certification records',
                'Structural site inspection reports',
                'Structural defects register',
            ];

        case 'civil':
            return [
                'Civil design criteria report',
                'Site grading and finished levels drawings',
                'Bulk earthworks drawings',
                'Stormwater drainage drawings',
                'On-site detention calculations and drawings',
                'Pavement and driveway design drawings',
                'Erosion and sediment control plans',
                'Civil inspection reports',
                'Civil certification records',
            ];

        case 'planner':
            return [
                'Planning approval strategy note',
                'Development Application submission package',
                'Statement of Environmental Effects inputs',
                'Consent condition response matrix',
                'Authority correspondence register',
                'Post-approval planning advice memorandum',
            ];

        case 'bca':
            return [
                'NCC/BCA compliance report',
                'Fire safety schedule inputs',
                'Certification pathway checklist',
                'Construction Certificate compliance matrix',
                'Occupation Certificate compliance records',
                'BCA inspection reports',
            ];

        case 'services':
            return [
                'Mechanical services drawings',
                'Electrical services drawings',
                'Hydraulic services drawings',
                'Fire services drawings',
                'Services design report',
                'Authority and utility applications',
                'Commissioning records',
                'Services handover manuals',
            ];

        case 'generic':
        default:
            return [
                'Discipline drawing package',
                'Technical report',
                'Compliance matrix',
                'Submission package',
                'Coordination register',
                'Inspection report',
                'Handover records',
            ];
    }
}

function disciplineBoundaryRules(contextName: string): string[] {
    switch (disciplineKey(contextName)) {
        case 'architect':
            return [
                'Architect may include architectural services coordination drawings or markups, but must not own HVAC, electrical, hydraulic, plumbing, or fire services design deliverables.',
                'Architect may support DA, CC, and OC documentation, but must not imply it is solely responsible for obtaining statutory approvals unless the context says so.',
            ];

        case 'planner':
            return [
                'Planner owns planning advice, applications, authority responses, and consent condition outputs; do not assign architectural, engineering, or certification design deliverables.',
            ];

        case 'bca':
            return [
                'BCA consultant owns code assessment, certification inputs, and compliance reporting; do not assign architectural, structural, or services design deliverables.',
            ];

        case 'services':
            return [
                'Services Engineer owns building services design deliverables; do not assign architectural layouts, planning approvals, or BCA certification outputs except as coordination inputs.',
            ];

        case 'structural':
            return [
                'Structural Engineer owns structural design and certification outputs; do not assign architectural, services, planning, or BCA certification deliverables except as coordination inputs.',
            ];

        case 'civil':
            return [
                'Civil Engineer owns civil design, authority interfaces, external works, stormwater, and site levels; do not assign structural frame, building services, BCA certification, or architectural deliverables except as coordination inputs.',
            ];

        case 'generic':
        default:
            return [
                'Keep deliverables inside the active discipline and describe other disciplines only as coordination interfaces.',
            ];
    }
}

function deliverableArtifactRules(args: ProcurementBriefPromptArgs): string {
    if (args.fieldType !== 'brief.deliverables') return '';

    const examples = deliverableExamplesForDiscipline(args.contextName)
        .map((example) => `- ${example}`)
        .join('\n');
    const boundaries = disciplineBoundaryRules(args.contextName)
        .map((rule) => `- ${rule}`)
        .join('\n');

    return [
        '## Deliverable Artifact Rules',
        'Every deliverable bullet must name an artifact that can be issued, uploaded, reviewed, signed off, or appended to the RFT.',
        'Write noun phrases, not service activities.',
        'Do not start deliverable bullets with service verbs such as Design, Coordinate, Ensure, Manage, Assist, Oversee, Integrate, Collaborate, Review, Develop, Prepare, Provide, or Deliver.',
        'Rewrite activity wording into artifact wording. For example: "Coordinate services" becomes "Services coordination markups"; "Ensure BASIX compliance" becomes "BASIX compliance inputs"; "Manage planning approvals" becomes "Architectural approval documentation package".',
        'Use artifacts like drawing packages, plans, schedules, registers, reports, certificates, matrices, markups, submissions, specifications, inspection records, and handover packages.',
        'Suitable examples for this active discipline include:',
        examples,
        'Discipline boundary rules:',
        boundaries,
    ].join('\n');
}

function normalizeLabel(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function resolveProcurementRoute(method: string | undefined): ProcurementRoute {
    const normalized = normalizeLabel(method ?? '');
    const compact = normalized.replace(/-/g, '');
    if (!normalized) return 'unknown';

    if (
        /\beci\b/.test(normalized)
        || normalized.includes('early-contractor-involvement')
        || normalized.includes('early-contractor')
    ) {
        return 'eci';
    }

    if (
        normalized.includes('design-and-construct')
        || normalized.includes('design-construct')
        || normalized.includes('d-and-c')
        || normalized.includes('d-c')
        || /\bdc\b/.test(normalized)
        || compact === 'dc'
        || compact === 'dandc'
        || compact === 'dnc'
    ) {
        return 'design-and-construct';
    }

    if (
        normalized.includes('construct-only')
        || normalized.includes('construction-only')
        || normalized.includes('traditional')
        || normalized.includes('lump-sum')
    ) {
        return 'construct-only';
    }

    if (normalized.includes('construction-management')) {
        return 'construction-management';
    }

    if (normalized.includes('managing-contractor')) {
        return 'managing-contractor';
    }

    return 'unknown';
}

function resolveProcurementRouteFromCandidates(candidates: Array<string | undefined>): ProcurementRoute {
    for (const candidate of candidates) {
        const route = resolveProcurementRoute(candidate);
        if (route !== 'unknown') return route;
    }

    return 'unknown';
}

function procurementRouteLabel(route: ProcurementRoute): string {
    switch (route) {
        case 'design-and-construct':
            return 'Design and Construct';
        case 'eci':
            return 'Early Contractor Involvement';
        case 'construct-only':
            return 'Construct-only / traditional tender';
        case 'construction-management':
            return 'Construction Management';
        case 'managing-contractor':
            return 'Managing Contractor';
        case 'unknown':
        default:
            return 'Unknown / neutral procurement route';
    }
}

function procurementInterfaceHeading(route: ProcurementRoute): string {
    switch (route) {
        case 'design-and-construct':
            return 'D&C Tender and Contractor Interface';
        case 'eci':
            return 'ECI Contractor Interface';
        case 'construct-only':
            return 'Construct-only Tender Support';
        case 'construction-management':
            return 'Trade Package Coordination';
        case 'managing-contractor':
            return 'Managing Contractor Interface';
        case 'unknown':
        default:
            return 'Tender and Procurement Support';
    }
}

function disciplineKey(contextName: string): string {
    const normalized = normalizeLabel(contextName);
    if (normalized.includes('architect')) return 'architect';
    if (normalized.includes('structural') || normalized.includes('structure')) return 'structural';
    if (normalized.includes('planner') || normalized.includes('planning') || normalized.includes('town-planner')) return 'planner';
    if (
        normalized.includes('bca')
        || normalized.includes('certifier')
        || normalized.includes('building-surveyor')
        || normalized.includes('building-certification')
        || normalized.includes('access-consultant')
    ) {
        return 'bca';
    }
    if (
        normalized.includes('civil')
        || normalized.includes('traffic')
        || normalized.includes('geotech')
        || (normalized.includes('surveyor') && !normalized.includes('quantity-surveyor') && !normalized.includes('building-surveyor'))
    ) {
        return 'civil';
    }
    if (
        normalized.includes('services')
        || normalized.includes('mep')
        || normalized.includes('mechanical')
        || normalized.includes('electrical')
        || normalized.includes('hydraulic')
        || normalized.includes('fire')
    ) {
        return 'services';
    }
    return 'generic';
}

export function resolveProcurementSeedDomainSlugs(contextName: string): string[] {
    switch (disciplineKey(contextName)) {
        case 'architect':
            return ['domain-architectural-trades'];
        case 'structural':
            return ['domain-structural-engineering'];
        case 'civil':
            return ['domain-civil-earthworks'];
        case 'planner':
            return ['domain-planning-approvals'];
        case 'bca':
            return ['domain-ncc-reference'];
        case 'services':
            return ['domain-mep-services'];
        case 'generic':
        default:
            return [];
    }
}

export const BASE_PROCUREMENT_BRIEF_SEED_SECTION_TITLES = [
    'Procurement Brief Service Catalogue',
    'Procurement Brief Deliverables',
    'Discipline Boundaries',
    'Common Exclusions',
];

function isMechanicalOnlyServicesContext(contextName: string): boolean {
    const normalized = normalizeLabel(contextName);
    return (normalized.includes('mechanical') || normalized.includes('hvac'))
        && !normalized.includes('mep')
        && !normalized.includes('electrical')
        && !normalized.includes('hydraulic')
        && !normalized.includes('fire');
}

function isElectricalOnlyServicesContext(contextName: string): boolean {
    const normalized = normalizeLabel(contextName);
    return normalized.includes('electrical')
        && !normalized.includes('mep')
        && !normalized.includes('mechanical')
        && !normalized.includes('hydraulic')
        && !normalized.includes('fire');
}

function isHydraulicOnlyServicesContext(contextName: string): boolean {
    const normalized = normalizeLabel(contextName);
    return (normalized.includes('hydraulic') || normalized.includes('plumbing'))
        && !normalized.includes('mep')
        && !normalized.includes('mechanical')
        && !normalized.includes('electrical')
        && !normalized.includes('fire');
}

export function resolveProcurementSeedSectionTitles(contextName: string): string[] {
    const titles = [...BASE_PROCUREMENT_BRIEF_SEED_SECTION_TITLES];

    if (isMechanicalOnlyServicesContext(contextName)) {
        titles.push('Mechanical Procurement Brief Focus');
    }
    if (isElectricalOnlyServicesContext(contextName)) {
        titles.push('Electrical Procurement Brief Focus');
    }
    if (isHydraulicOnlyServicesContext(contextName)) {
        titles.push('Hydraulic Procurement Brief Focus');
    }

    return titles;
}

export function buildProcurementFallbackHeadings(args: {
    contextName: string;
    procurementMethod?: string;
    projectContext?: ProcurementBriefProjectContext;
    userInput?: string;
}): string[] {
    const route = resolveProcurementRouteFromCandidates([
        args.procurementMethod,
        args.projectContext?.procurementMethod,
        args.projectContext?.profileText,
        args.projectContext?.factsText,
        args.userInput,
    ]);
    const routeHeading = procurementInterfaceHeading(route);

    switch (disciplineKey(args.contextName)) {
        case 'architect':
            return [
                'Design Development',
                'Authority and Compliance',
                'Construction Documentation',
                'Consultant Coordination',
                routeHeading,
                'Construction Phase Support',
                'Handover and Defects Support',
            ];

        case 'structural':
            return [
                'Structural Design Development',
                'Authority and Certification Support',
                'Structural Documentation',
                'Consultant Coordination',
                routeHeading,
                'Construction Phase Support',
                'Handover and Defects Support',
            ];

        case 'civil':
            return [
                'Civil Design Development',
                'Authority and Utility Coordination',
                'Civil Documentation',
                'Consultant Coordination',
                routeHeading,
                'Construction Phase Support',
                'Handover and Defects Support',
            ];

        case 'planner':
            return [
                'Planning Strategy',
                'Authority Liaison',
                'Approval Documentation',
                'Consent Condition Review',
                routeHeading,
                'Post-approval Support',
            ];

        case 'bca':
            return [
                'Compliance Strategy',
                'NCC/BCA Assessment',
                'Certification Pathway',
                'Fire and Life Safety Coordination',
                'Authority and Certifier Liaison',
                'Construction Phase Compliance Support',
            ];

        case 'services':
            return [
                'Services Design Development',
                'Authority and Utility Coordination',
                'Services Documentation',
                'Consultant Coordination',
                routeHeading,
                'Commissioning and Handover Support',
            ];

        case 'generic':
        default:
            return [
                'Scope Definition',
                'Authority and Compliance',
                'Design Documentation',
                'Consultant Coordination',
                routeHeading,
                'Construction Phase Support',
                'Handover Support',
            ];
    }
}

function lengthRules(inputMode: InputInterpretation, feeItems: ProcurementBriefFeeItem[]): string {
    if (inputMode === 'enhance') {
        return [
            'You are producing the long version.',
            'Expand each bullet to 10-15 words while keeping the same headings and ordering where possible.',
            'Do not add unrelated headings or generic project-objective prose.',
        ].join('\n');
    }

    const minBullets = feeItems.length > 0
        ? Math.max(8, feeItems.length * 2)
        : 10;

    return [
        'You are producing the short version.',
        'Use concise bullets of 2-7 words each.',
        `Return at least ${minBullets} bullets unless the user's instruction explicitly asks for fewer.`,
        'Do not write paragraphs, introductions, conclusions, or generic project-objective prose.',
    ].join('\n');
}

function feeRules(args: ProcurementBriefPromptArgs): string {
    const { fieldType, feeItems } = args;
    if (feeItems.length === 0) {
        const route = resolveProcurementRouteFromCandidates([
            args.projectContext.procurementMethod,
            args.projectContext.profileText,
            args.projectContext.factsText,
            args.userInput,
        ]);
        const headings = buildProcurementFallbackHeadings({
            contextName: args.contextName,
            procurementMethod: args.projectContext.procurementMethod,
            projectContext: args.projectContext,
            userInput: args.userInput,
        });
        const headingList = headings.map((heading) => `**${heading}**`).join('\n');

        return [
            'No fee rows are available, so use these discipline- and procurement-specific fallback headings in this order:',
            headingList,
            `Detected procurement route for fallback headings: ${procurementRouteLabel(route)}.`,
            'Use 1-3 bullets under each relevant heading.',
            'Use the procurement-route heading exactly as provided above; it was selected from the active project/profile context.',
            'If the procurement route is unknown or ambiguous, keep procurement wording neutral and do not infer D&C, ECI, managing contractor, or construction management.',
            'Do not mention D&C, ECI, managing contractor, or construction management unless it appears in the provided heading, fee schedule, project profile, project facts, project documents, or user input.',
            'Keep the output focused on the active discipline only.',
        ].join('\n');
    }

    const headingExamples = feeItems.map((item) => `**${item.heading}**`).join('\n');
    const bulletCount = fieldType === 'brief.service' ? '1-3 service bullets' : '1-3 deliverable bullets';

    return [
        'Fee rows are available and are authoritative for structure.',
        'Output must use these exact Markdown headings, in this exact order:',
        headingExamples,
        `Under each heading, write ${bulletCount} that ${fieldIntent(fieldType)}.`,
        'Do not create headings that are not in the fee schedule.',
    ].join('\n');
}

export function buildProcurementBriefPrompt(args: ProcurementBriefPromptArgs): string {
    const knowledgeContext = compactJoin([
        args.disciplineSeedContext
            ? `## Active Discipline Seed Knowledge - Authoritative Catalogue and Boundaries\n${args.disciplineSeedContext}`
            : undefined,
        args.domainContext
            ? `## Domain RAG Knowledge\n${args.domainContext}`
            : undefined,
        args.seedContext
            ? `## Local Seed Knowledge\n${args.seedContext}`
            : undefined,
    ], '\n\n');

    const userInput = args.userInput.trim() || '(no user input provided)';
    const projectFacts = compactJoin([
        args.projectContext.factsText ? `## Project Facts\n${args.projectContext.factsText}` : undefined,
        args.projectContext.profileText ? `## Project Profile\n${args.projectContext.profileText}` : undefined,
        args.projectContext.objectivesText ? `## Project Objectives\n${args.projectContext.objectivesText}` : undefined,
    ], '\n\n') || '## Project Context\nNo project context available.';

    const projectDocuments = args.projectDocumentContext
        ? `## Project/RFT/PPR Documents - Authoritative Where Relevant\n${args.projectDocumentContext}`
        : '## Project/RFT/PPR Documents\nNo synced project documents were available for this generation.';

    const additionalContext = formatAdditionalContext(args);

    return compactJoin([
        `You are generating procurement brief ${fieldLabel(args.fieldType)} for the active consultant discipline: ${args.contextName}.`,
        'Focus only on this active discipline. Do not produce whole-project objectives or scopes for other consultants.',
        '',
        `## User Input\n${userInput}`,
        projectFacts,
        args.stakeholderContext ? `## Stakeholder Context\n${args.stakeholderContext}` : undefined,
        `## Fee Schedule\n${formatFeeScheduleForPrompt(args.feeItems)}`,
        projectDocuments,
        knowledgeContext || '## Domain/Seed Knowledge\nNo domain or seed knowledge snippets were available.',
        additionalContext ? `## Additional Context\n${additionalContext}` : undefined,
        '## Structure Rules',
        lengthRules(args.inputMode, args.feeItems),
        feeRules(args),
        deliverableArtifactRules(args),
        'Follow the Active Discipline Seed Knowledge catalogue, boundaries, and exclusions where provided. Do not override those boundaries with generic project objectives.',
        'Map the output to project constraints, procurement route, statutory approvals, coordination duties, and deliverables where those are present in the context.',
        'For this project, actively look for and use concrete constraints such as apartment count, storeys, building class, DA/CC/OC pathway, NCC/BCA, BASIX, acoustic, facade, basement, services coordination, handover, and defects obligations when available.',
        'Use objectives only to tune the scope; do not restate objectives as services.',
        'Return Markdown content only. Do not include JSON, source labels, explanations, or code fences.',
    ], '\n\n');
}

export function buildProcurementBriefQuery(args: {
    fieldType: ProcurementBriefFieldType;
    inputMode: InputInterpretation;
    userInput: string;
    contextName: string;
    projectContext: ProcurementBriefProjectContext;
    feeItems: ProcurementBriefFeeItem[];
}): string {
    const label = args.fieldType === 'brief.service'
        ? 'consultant services scope responsibilities'
        : 'consultant deliverables drawings reports submissions certificates';

    return compactJoin([
        args.contextName,
        label,
        args.projectContext.projectType,
        args.projectContext.procurementMethod ? `procurement method ${args.projectContext.procurementMethod}` : undefined,
        args.feeItems.map((item) => item.heading).join(' '),
        args.inputMode === 'enhance'
            ? args.userInput.slice(0, 600)
            : args.userInput,
        args.projectContext.objectivesText.slice(0, 800),
    ], ' ');
}
