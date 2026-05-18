import type { SeedKnowledgeResult } from '@/lib/rag/seed-knowledge-retrieval';
import {
    filterProcurementFallbackSeedResultsForContext,
    resolveServicesSubdiscipline,
} from '../seed-filter';

function seed(sectionTitle: string, domainSlug = 'domain-mep-services'): SeedKnowledgeResult {
    return {
        id: `${domainSlug}:${sectionTitle}`,
        content: `## ${sectionTitle}\nSeed content`,
        sectionTitle,
        domainSlug,
        domainName: domainSlug === 'domain-mep-services' ? 'MEP Services Guide' : 'Other Guide',
        domainTags: ['procurement'],
        sourceVersion: 'test',
        relevanceScore: 0.8,
    };
}

describe('procurement fallback seed filtering', () => {
    it.each([
        ['Mechanical', 'mechanical'],
        ['HVAC Consultant', 'mechanical'],
        ['Electrical Engineer', 'electrical'],
        ['Hydraulic', 'hydraulic'],
        ['Plumbing Consultant', 'hydraulic'],
        ['Fire Services Engineer', 'fire'],
        ['Services Engineer', 'combined-services'],
        ['MEP Services', 'combined-services'],
        ['Architect', 'other'],
    ])('resolves %s to %s', (contextName, expected) => {
        expect(resolveServicesSubdiscipline(contextName)).toBe(expected);
    });

    it('keeps hydraulic fallback snippets focused on hydraulic scope', () => {
        const results = [
            seed('Mechanical Procurement Brief Focus'),
            seed('Electrical Procurement Brief Focus'),
            seed('Hydraulic Procurement Brief Focus'),
            seed('Hydraulic Supply - Cold Water, Hot Water, and Gas Reticulation'),
            seed('Fire Sprinkler Systems - Design Responsibility'),
            seed('Residential Services - Hydraulic, Electrical, and Mechanical'),
            seed('Trade Interfaces and Coordination Guide', 'domain-trade-interfaces'),
        ];

        expect(filterProcurementFallbackSeedResultsForContext(results, 'Hydraulic').map((result) => result.sectionTitle)).toEqual([
            'Hydraulic Procurement Brief Focus',
            'Hydraulic Supply - Cold Water, Hot Water, and Gas Reticulation',
            'Residential Services - Hydraulic, Electrical, and Mechanical',
            'Trade Interfaces and Coordination Guide',
        ]);
    });

    it('keeps electrical fallback snippets focused on electrical scope', () => {
        const results = [
            seed('Mechanical Procurement Brief Focus'),
            seed('Electrical Procurement Brief Focus'),
            seed('Hydraulic Procurement Brief Focus'),
            seed('Lighting and Power Distribution'),
            seed('Fire Sprinkler Systems - Design Responsibility'),
            seed('Residential Services - Hydraulic, Electrical, and Mechanical'),
        ];

        expect(filterProcurementFallbackSeedResultsForContext(results, 'Electrical Engineer').map((result) => result.sectionTitle)).toEqual([
            'Electrical Procurement Brief Focus',
            'Lighting and Power Distribution',
            'Residential Services - Hydraulic, Electrical, and Mechanical',
        ]);
    });

    it('keeps mechanical fallback snippets focused on mechanical scope', () => {
        const results = [
            seed('Mechanical Procurement Brief Focus'),
            seed('Electrical Procurement Brief Focus'),
            seed('Hydraulic Procurement Brief Focus'),
            seed('HVAC Systems Overview - Selection by Project Type and Scale'),
            seed('Fire Sprinkler Systems - Design Responsibility'),
            seed('Residential Services - Hydraulic, Electrical, and Mechanical'),
        ];

        expect(filterProcurementFallbackSeedResultsForContext(results, 'Mechanical').map((result) => result.sectionTitle)).toEqual([
            'Mechanical Procurement Brief Focus',
            'HVAC Systems Overview - Selection by Project Type and Scale',
            'Residential Services - Hydraulic, Electrical, and Mechanical',
        ]);
    });

    it('does not narrow combined services fallback snippets', () => {
        const results = [
            seed('Mechanical Procurement Brief Focus'),
            seed('Electrical Procurement Brief Focus'),
            seed('Hydraulic Procurement Brief Focus'),
            seed('Fire Sprinkler Systems - Design Responsibility'),
        ];

        expect(filterProcurementFallbackSeedResultsForContext(results, 'Services Engineer')).toEqual(results);
    });
});
