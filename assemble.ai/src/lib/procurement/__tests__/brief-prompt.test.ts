import { resolveDomainTagsFromText } from '@/lib/constants/knowledge-domains';
import {
    buildProcurementFallbackHeadings,
    buildProcurementBriefKnowledgeTags,
    buildProcurementBriefPrompt,
    normalizeKnowledgeProjectType,
    resolveProcurementSeedDomainSlugs,
    resolveProcurementSeedSectionTitles,
    resolveProcurementRoute,
    type ProcurementBriefProjectContext,
} from '../brief-prompt';

const baseProjectContext: ProcurementBriefProjectContext = {
    factsText: [
        'Project Name: Parramatta Apartments',
        'Address: 568-572 Parramatta Rd',
        'Building Class: Class 2',
    ].join('\n'),
    profileText: [
        'Project Type: apartments',
        'Subclass: SOU, Mixed-tenure',
        'Procurement Method: Design and Construct',
    ].join('\n'),
    objectivesText: 'Compliance: Maintain NCC Class 2 compliance; Planning: Resolve DA conditions',
    projectType: 'apartments',
    procurementMethod: 'Design and Construct',
    state: 'NSW',
    profileTags: {
        buildingClass: 'Class 2',
        projectType: 'apartments',
        subclass: ['SOU', 'Mixed-tenure'],
        complexity: { procurement_route: 'Design and Construct' },
    },
    hasProjectFacts: true,
    hasProfiler: true,
    hasObjectives: true,
};

describe('procurement brief prompt helpers', () => {
    it('uses architect fee rows as authoritative service headings', () => {
        const prompt = buildProcurementBriefPrompt({
            fieldType: 'brief.service',
            inputMode: 'generate',
            userInput: '',
            contextName: 'Architect',
            stakeholderContext: 'Discipline/Trade: Architect',
            projectContext: baseProjectContext,
            feeItems: [
                { heading: 'Concept design and DA package', source: 'cost_line' },
                { heading: 'Construction documentation support', source: 'cost_line' },
            ],
            projectDocumentContext: '',
            domainContext: '',
            seedContext: '',
        });

        expect(prompt).toContain('Fee rows are available and are authoritative for structure.');
        expect(prompt).toContain('**Concept design and DA package**');
        expect(prompt).toContain('**Construction documentation support**');
        expect(prompt).toContain('explain the consultant services');
        expect(prompt).toContain('Use objectives only to tune the scope');
    });

    it('falls back to discipline- and route-specific headings when architect has no fee rows', () => {
        const prompt = buildProcurementBriefPrompt({
            fieldType: 'brief.service',
            inputMode: 'generate',
            userInput: '',
            contextName: 'Architect',
            stakeholderContext: 'Discipline/Trade: Architect',
            projectContext: baseProjectContext,
            feeItems: [],
            projectDocumentContext: '',
            domainContext: '',
            seedContext: '',
        });

        expect(prompt).toContain('No fee schedule rows are currently assigned');
        expect(prompt).toContain('discipline- and procurement-specific fallback headings');
        expect(prompt).toContain('**D&C Tender and Contractor Interface**');
        expect(prompt).toContain('Detected procurement route for fallback headings: Design and Construct');
        expect(prompt).not.toContain('**ECI Contractor Interface**');
        expect(prompt).not.toContain('Output must use these exact Markdown headings');
    });

    it('uses ECI fallback headings only when the selected procurement route is ECI', () => {
        const eciProjectContext: ProcurementBriefProjectContext = {
            ...baseProjectContext,
            profileText: [
                'Project Type: apartments',
                'Subclass: SOU, Mixed-tenure',
                'Procurement Method: Early Contractor Involvement',
            ].join('\n'),
            procurementMethod: 'Early Contractor Involvement',
            profileTags: {
                ...baseProjectContext.profileTags,
                complexity: { procurement_route: 'Early Contractor Involvement' },
            },
        };

        const headings = buildProcurementFallbackHeadings({
            contextName: 'Architect',
            projectContext: eciProjectContext,
        });

        expect(headings).toContain('ECI Contractor Interface');
        expect(headings).not.toContain('D&C Tender and Contractor Interface');
    });

    it('keeps long deliverables consistent with the short version structure', () => {
        const prompt = buildProcurementBriefPrompt({
            fieldType: 'brief.deliverables',
            inputMode: 'enhance',
            userInput: '**DA Package**\n- DA drawing set\n- Design statement',
            contextName: 'Architect',
            stakeholderContext: 'Discipline/Trade: Architect',
            projectContext: baseProjectContext,
            feeItems: [{ heading: 'DA Package', source: 'cost_line' }],
            projectDocumentContext: '',
            domainContext: '',
            seedContext: '',
        });

        expect(prompt).toContain('You are producing the long version.');
        expect(prompt).toContain('Expand each bullet to 10-15 words');
        expect(prompt).toContain('list the concrete outputs');
        expect(prompt).toContain('**DA Package**');
    });

    it('instructs architect deliverables to be issued artifacts rather than activities', () => {
        const prompt = buildProcurementBriefPrompt({
            fieldType: 'brief.deliverables',
            inputMode: 'generate',
            userInput: '',
            contextName: 'Architect',
            stakeholderContext: 'Discipline/Trade: Architect',
            projectContext: baseProjectContext,
            feeItems: [],
            projectDocumentContext: '',
            domainContext: '',
            seedContext: '',
        });

        expect(prompt).toContain('## Deliverable Artifact Rules');
        expect(prompt).toContain('Every deliverable bullet must name an artifact');
        expect(prompt).toContain('Write noun phrases, not service activities.');
        expect(prompt).toContain('Do not start deliverable bullets with service verbs');
        expect(prompt).toContain('Architectural drawing package');
        expect(prompt).toContain('Basement car park layout drawings');
        expect(prompt).toContain('BASIX coordination inputs');
        expect(prompt).toContain('must not own HVAC, electrical, hydraulic, plumbing, or fire services design deliverables');
    });

    it('includes raw discipline seed knowledge as catalogue and boundary context', () => {
        const prompt = buildProcurementBriefPrompt({
            fieldType: 'brief.service',
            inputMode: 'generate',
            userInput: '',
            contextName: 'Structural Engineer',
            stakeholderContext: 'Discipline/Trade: Structural Engineer',
            projectContext: baseProjectContext,
            feeItems: [],
            projectDocumentContext: '',
            disciplineSeedContext: [
                '[Discipline Seed 1 - Structural Engineering Guide: Procurement Brief Service Catalogue]',
                '- Establish structural design criteria',
                '[Discipline Seed 2 - Structural Engineering Guide: Discipline Boundaries]',
                '- Do not make the Structural Engineer responsible for BASIX',
            ].join('\n'),
            domainContext: '',
            seedContext: '',
        });

        expect(prompt).toContain('## Active Discipline Seed Knowledge - Authoritative Catalogue and Boundaries');
        expect(prompt).toContain('Establish structural design criteria');
        expect(prompt).toContain('Do not make the Structural Engineer responsible for BASIX');
        expect(prompt).toContain('Follow the Active Discipline Seed Knowledge catalogue, boundaries, and exclusions');
    });

    it.each([
        ['Architect', ['architectural', 'procurement', 'tendering', 'contracts', 'ncc', 'as-standards', 'residential', 'apartments']],
        ['Structural Engineer', ['structural', 'procurement', 'tendering', 'contracts', 'as-standards']],
        ['Town Planner', ['regulatory', 'procurement', 'tendering', 'contracts']],
        ['BCA Consultant', ['ncc', 'regulatory', 'as-standards', 'procurement']],
        ['Services Engineer', ['mechanical', 'electrical', 'hydraulic', 'fire', 'as-standards']],
    ])('resolves procurement seed tags for %s', (contextName, expectedTags) => {
        const tags = buildProcurementBriefKnowledgeTags({
            contextName,
            fieldType: 'brief.service',
            profile: baseProjectContext.profileTags,
        });

        expect(tags).toEqual(expect.arrayContaining(expectedTags));
    });

    it('maps services engineer to MEP knowledge domains', () => {
        expect(resolveDomainTagsFromText('Services Engineer')).toEqual([
            'mechanical',
            'electrical',
            'hydraulic',
            'fire',
            'as-standards',
        ]);
    });

    it('does not use building-subtype project types as knowledge applicability filters', () => {
        expect(normalizeKnowledgeProjectType('apartments')).toBeUndefined();
        expect(normalizeKnowledgeProjectType('new')).toBe('new');
    });

    it.each([
        ['Design and Construct', 'design-and-construct'],
        ['Design & Construct', 'design-and-construct'],
        ['D&C', 'design-and-construct'],
        ['D and C', 'design-and-construct'],
        ['Early Contractor Involvement', 'eci'],
        ['ECI', 'eci'],
        ['Traditional Lump Sum', 'construct-only'],
    ] as const)('resolves procurement route wording for %s', (method, expected) => {
        expect(resolveProcurementRoute(method)).toBe(expected);
    });

    it.each([
        ['Architect', ['domain-architectural-trades']],
        ['Structural Engineer', ['domain-structural-engineering']],
        ['Civil Engineer', ['domain-civil-earthworks']],
        ['Town Planner', ['domain-planning-approvals']],
        ['BCA Consultant', ['domain-ncc-reference']],
        ['Services Engineer', ['domain-mep-services']],
    ])('routes %s to the deterministic raw seed domain', (contextName, expectedSlugs) => {
        expect(resolveProcurementSeedDomainSlugs(contextName)).toEqual(expectedSlugs);
    });

    it('adds the mechanical-only focus section for Mechanical labels', () => {
        expect(resolveProcurementSeedSectionTitles('Mechanical')).toEqual([
            'Procurement Brief Service Catalogue',
            'Procurement Brief Deliverables',
            'Discipline Boundaries',
            'Common Exclusions',
            'Mechanical Procurement Brief Focus',
        ]);
        expect(resolveProcurementSeedSectionTitles('Services Engineer')).not.toContain('Mechanical Procurement Brief Focus');
        expect(resolveProcurementSeedSectionTitles('MEP Services')).not.toContain('Mechanical Procurement Brief Focus');
    });

    it('adds the electrical-only focus section for Electrical labels', () => {
        expect(resolveProcurementSeedSectionTitles('Electrical')).toEqual([
            'Procurement Brief Service Catalogue',
            'Procurement Brief Deliverables',
            'Discipline Boundaries',
            'Common Exclusions',
            'Electrical Procurement Brief Focus',
        ]);
        expect(resolveProcurementSeedSectionTitles('Services Engineer')).not.toContain('Electrical Procurement Brief Focus');
        expect(resolveProcurementSeedSectionTitles('MEP Services')).not.toContain('Electrical Procurement Brief Focus');
    });

    it('adds the hydraulic-only focus section for Hydraulic labels', () => {
        expect(resolveProcurementSeedSectionTitles('Hydraulic')).toEqual([
            'Procurement Brief Service Catalogue',
            'Procurement Brief Deliverables',
            'Discipline Boundaries',
            'Common Exclusions',
            'Hydraulic Procurement Brief Focus',
        ]);
        expect(resolveProcurementSeedSectionTitles('Plumbing Consultant')).toContain('Hydraulic Procurement Brief Focus');
        expect(resolveProcurementSeedSectionTitles('Services Engineer')).not.toContain('Hydraulic Procurement Brief Focus');
        expect(resolveProcurementSeedSectionTitles('MEP Services')).not.toContain('Hydraulic Procurement Brief Focus');
    });
});
