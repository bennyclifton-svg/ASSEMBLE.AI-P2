import { retrieveSeedKnowledgeFallback, retrieveSeedKnowledgeSections } from '../seed-knowledge-retrieval';
import type { DomainTag } from '@/lib/constants/knowledge-domains';

const PROCUREMENT_BRIEF_SECTIONS = [
    'Procurement Brief Service Catalogue',
    'Procurement Brief Deliverables',
    'Discipline Boundaries',
    'Common Exclusions',
];

describe('seed knowledge deterministic section retrieval', () => {
    it('extracts structural procurement brief sections from the raw seed markdown', () => {
        const sections = retrieveSeedKnowledgeSections({
            domainTags: ['structural'],
            domainSlugs: ['domain-structural-engineering'],
            sectionTitles: PROCUREMENT_BRIEF_SECTIONS,
            projectType: 'new',
            state: 'NSW',
        });

        expect(sections.map((section) => section.sectionTitle)).toEqual(PROCUREMENT_BRIEF_SECTIONS);
        expect(sections[0].domainName).toBe('Structural Engineering Guide');
        expect(sections[0].content).toContain('Establish structural design criteria');
        expect(sections[1].content).toContain('Structural design criteria report');
        expect(sections[2].content).toContain('Do not make the Structural Engineer responsible for BASIX');
        expect(sections[3].content).toContain('Post-tensioning');
    });

    it('extracts civil procurement brief sections from the raw seed markdown', () => {
        const sections = retrieveSeedKnowledgeSections({
            domainTags: ['civil'],
            domainSlugs: ['domain-civil-earthworks'],
            sectionTitles: PROCUREMENT_BRIEF_SECTIONS,
            projectType: 'new',
            state: 'NSW',
        });

        expect(sections.map((section) => section.sectionTitle)).toEqual(PROCUREMENT_BRIEF_SECTIONS);
        expect(sections[0].domainName).toBe('Civil Engineering & Earthworks Guide');
        expect(sections[0].content).toContain('Establish civil design criteria');
        expect(sections[1].content).toContain('Stormwater drainage drawings');
        expect(sections[2].content).toContain('Civil Engineer scope must stay inside civil design');
        expect(sections[3].content).toContain('Detailed structural retaining wall design');
    });

    it.each([
        {
            discipline: 'Architect',
            domainTags: ['architectural'],
            domainSlugs: ['domain-architectural-trades'],
            domainName: 'Architectural Trades Guide',
            serviceText: 'Develop the architectural design response',
            deliverableText: 'Architectural drawing package',
            boundaryText: 'Architect scope must stay inside architectural design',
            exclusionText: 'Structural engineering design',
        },
        {
            discipline: 'Town Planner',
            domainTags: ['regulatory', 'procurement'],
            domainSlugs: ['domain-planning-approvals'],
            domainName: 'Planning Approvals Guide',
            serviceText: 'Establish the planning approval pathway',
            deliverableText: 'DA consent condition review matrix',
            boundaryText: 'Town Planner scope must stay inside planning strategy',
            exclusionText: 'BCA certification or NCC assessment',
        },
        {
            discipline: 'BCA Consultant',
            domainTags: ['ncc', 'regulatory', 'as-standards'],
            domainSlugs: ['domain-ncc-reference'],
            domainName: 'NCC Reference Guide',
            serviceText: 'Establish the NCC/BCA compliance strategy',
            deliverableText: 'BCA assessment report',
            boundaryText: 'BCA Consultant scope must stay inside NCC/BCA assessment',
            exclusionText: 'Town planning advice',
        },
        {
            discipline: 'Services Engineer',
            domainTags: ['mechanical', 'electrical', 'hydraulic', 'fire'],
            domainSlugs: ['domain-mep-services'],
            domainName: 'MEP Services Guide',
            serviceText: 'Establish services design criteria',
            deliverableText: 'Mechanical services drawings and schedules',
            boundaryText: 'Services Engineer scope must stay inside building services design',
            exclusionText: 'Structural engineering design',
        },
    ] satisfies Array<{
        discipline: string;
        domainTags: DomainTag[];
        domainSlugs: string[];
        domainName: string;
        serviceText: string;
        deliverableText: string;
        boundaryText: string;
        exclusionText: string;
    }>)('extracts $discipline procurement brief sections from the active raw seed markdown', (fixture) => {
        const sections = retrieveSeedKnowledgeSections({
            domainTags: fixture.domainTags,
            domainSlugs: fixture.domainSlugs,
            sectionTitles: PROCUREMENT_BRIEF_SECTIONS,
            projectType: 'new',
            state: 'NSW',
        });

        expect(sections.map((section) => section.sectionTitle)).toEqual(PROCUREMENT_BRIEF_SECTIONS);
        expect(new Set(sections.map((section) => section.domainName))).toEqual(new Set([fixture.domainName]));
        expect(sections[0].content).toContain(fixture.serviceText);
        expect(sections[1].content).toContain(fixture.deliverableText);
        expect(sections[2].content).toContain(fixture.boundaryText);
        expect(sections[3].content).toContain(fixture.exclusionText);
    });

    it('extracts the mechanical-only procurement focus section from the MEP seed markdown', () => {
        const sections = retrieveSeedKnowledgeSections({
            domainTags: ['mechanical'],
            domainSlugs: ['domain-mep-services'],
            sectionTitles: [
                ...PROCUREMENT_BRIEF_SECTIONS,
                'Mechanical Procurement Brief Focus',
            ],
            projectType: 'new',
            state: 'NSW',
        });

        expect(sections.map((section) => section.sectionTitle)).toEqual([
            ...PROCUREMENT_BRIEF_SECTIONS,
            'Mechanical Procurement Brief Focus',
        ]);
        expect(sections[4].domainName).toBe('MEP Services Guide');
        expect(sections[4].content).toContain('apartment ventilation');
        expect(sections[4].content).toContain('Basement car park ventilation drawings');
        expect(sections[4].content).toContain('Section J and BASIX mechanical services inputs');
        expect(sections[4].content).toContain('Do not include electrical, hydraulic, fire');
    });

    it('extracts the electrical-only procurement focus section from the MEP seed markdown', () => {
        const sections = retrieveSeedKnowledgeSections({
            domainTags: ['electrical'],
            domainSlugs: ['domain-mep-services'],
            sectionTitles: [
                ...PROCUREMENT_BRIEF_SECTIONS,
                'Electrical Procurement Brief Focus',
            ],
            projectType: 'new',
            state: 'NSW',
        });

        expect(sections.map((section) => section.sectionTitle)).toEqual([
            ...PROCUREMENT_BRIEF_SECTIONS,
            'Electrical Procurement Brief Focus',
        ]);
        expect(sections[4].domainName).toBe('MEP Services Guide');
        expect(sections[4].content).toContain('main switchboards');
        expect(sections[4].content).toContain('Single line diagrams');
        expect(sections[4].content).toContain('Section J and BASIX electrical services inputs');
        expect(sections[4].content).toContain('Do not include mechanical, hydraulic, fire');
    });

    it('extracts the hydraulic-only procurement focus section from the MEP seed markdown', () => {
        const sections = retrieveSeedKnowledgeSections({
            domainTags: ['hydraulic'],
            domainSlugs: ['domain-mep-services'],
            sectionTitles: [
                ...PROCUREMENT_BRIEF_SECTIONS,
                'Hydraulic Procurement Brief Focus',
            ],
            projectType: 'new',
            state: 'NSW',
        });

        expect(sections.map((section) => section.sectionTitle)).toEqual([
            ...PROCUREMENT_BRIEF_SECTIONS,
            'Hydraulic Procurement Brief Focus',
        ]);
        expect(sections[4].domainName).toBe('MEP Services Guide');
        expect(sections[4].content).toContain('potable water');
        expect(sections[4].content).toContain('Sanitary drainage schematic');
        expect(sections[4].content).toContain('BASIX water services inputs');
        expect(sections[4].content).toContain('Do not include civil stormwater');
    });

    it('limits fallback snippets to the requested seed domains', () => {
        const results = retrieveSeedKnowledgeFallback('basement structure slabs columns facade coordination', {
            domainTags: ['structural'],
            domainSlugs: ['domain-structural-engineering'],
            projectType: 'new',
            state: 'NSW',
            topK: 8,
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results.every((result) => result.domainSlug === 'domain-structural-engineering')).toBe(true);
    });
});
