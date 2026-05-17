import type { SeedKnowledgeResult } from '@/lib/rag/seed-knowledge-retrieval';

export type ServicesSubdiscipline =
    | 'mechanical'
    | 'electrical'
    | 'hydraulic'
    | 'fire'
    | 'combined-services'
    | 'other';

const MEP_DOMAIN_SLUG = 'domain-mep-services';

const SERVICES_DISCIPLINE_PATTERNS: Record<Exclude<ServicesSubdiscipline, 'combined-services' | 'other'>, RegExp[]> = {
    mechanical: [
        /\bmechanical\b/i,
        /\bhvac\b/i,
        /\bventilation\b/i,
        /\bair[\s-]?conditioning\b/i,
        /\bcar\s*park\s*exhaust\b/i,
    ],
    electrical: [
        /\belectrical\b/i,
        /\blighting\b/i,
        /\bpower\b/i,
        /\bswitchboards?\b/i,
        /\bmetering\b/i,
        /\bsingle\s*line\b/i,
        /\bcommunications?\b/i,
        /\bsecurity\b/i,
    ],
    hydraulic: [
        /\bhydraulic\b/i,
        /\bplumbing\b/i,
        /\bwater\b/i,
        /\bsanitary\b/i,
        /\bdrainage\b/i,
        /\bsewer\b/i,
        /\bstormwater\b/i,
        /\bgas\b/i,
        /\brainwater\b/i,
        /\bhot\s*water\b/i,
    ],
    fire: [
        /\bfire\b/i,
        /\bsprinklers?\b/i,
        /\bhydrants?\b/i,
        /\bhose\s*reels?\b/i,
        /\bessential\s+safety\b/i,
    ],
};

const ANY_SERVICES_DISCIPLINE_PATTERN = new RegExp(
    [
        'mechanical',
        'hvac',
        'ventilation',
        'air\\s*-?conditioning',
        'electrical',
        'lighting',
        'power',
        'switchboards?',
        'metering',
        'communications?',
        'security',
        'hydraulic',
        'plumbing',
        'water',
        'sanitary',
        'drainage',
        'sewer',
        'stormwater',
        'gas',
        'rainwater',
        'fire',
        'sprinklers?',
        'hydrants?',
        'hose\\s*reels?',
        'essential\\s+safety',
    ].join('|'),
    'i',
);

function normalizeLabel(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function matchesAny(value: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(value));
}

export function resolveServicesSubdiscipline(contextName: string): ServicesSubdiscipline {
    const normalized = normalizeLabel(contextName);
    const hasCombinedServicesLabel =
        normalized.includes('mep')
        || normalized.includes('building services')
        || normalized === 'services'
        || normalized.includes('services engineer')
        || normalized.includes('m and e');

    const matches = (Object.keys(SERVICES_DISCIPLINE_PATTERNS) as Array<Exclude<ServicesSubdiscipline, 'combined-services' | 'other'>>)
        .filter((discipline) => matchesAny(normalized, SERVICES_DISCIPLINE_PATTERNS[discipline]));

    if (matches.length > 1) return 'combined-services';
    if (matches.length === 1) return matches[0];
    if (hasCombinedServicesLabel) return 'combined-services';
    return 'other';
}

function serviceComparisonText(result: SeedKnowledgeResult): string {
    const title = result.sectionTitle?.trim();
    if (title) return title;
    return result.content.slice(0, 400);
}

function isRelevantToServicesSubdiscipline(
    result: SeedKnowledgeResult,
    subdiscipline: Exclude<ServicesSubdiscipline, 'combined-services' | 'other'>,
): boolean {
    const comparisonText = serviceComparisonText(result);
    if (!ANY_SERVICES_DISCIPLINE_PATTERN.test(comparisonText)) return true;
    return matchesAny(comparisonText, SERVICES_DISCIPLINE_PATTERNS[subdiscipline]);
}

export function filterProcurementFallbackSeedResultsForContext(
    results: SeedKnowledgeResult[],
    contextName: string,
): SeedKnowledgeResult[] {
    const subdiscipline = resolveServicesSubdiscipline(contextName);
    if (subdiscipline === 'combined-services' || subdiscipline === 'other') return results;

    return results.filter((result) => {
        if (result.domainSlug !== MEP_DOMAIN_SLUG) return true;
        return isRelevantToServicesSubdiscipline(result, subdiscipline);
    });
}
