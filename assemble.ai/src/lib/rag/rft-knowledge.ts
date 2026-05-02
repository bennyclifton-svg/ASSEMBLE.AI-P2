import {
    resolveDomainTagsFromText,
    resolveProfileDomainTags,
    type DomainTag,
    type DomainType,
    type ProfileTagInput,
} from '@/lib/constants/knowledge-domains';
import type { FieldType } from '@/lib/constants/field-types';

export const PROJECT_KNOWLEDGE_SET_NAMES = ['Knowledge', 'Ingest'] as const;

export const RFT_DOMAIN_TYPES: DomainType[] = ['best_practices', 'reference', 'regulatory'];

export const RFT_FALLBACK_DOMAIN_TAGS: DomainTag[] = [
    'procurement',
    'tendering',
    'contracts',
    'construction',
];

const RFT_BASE_DOMAIN_TAGS: DomainTag[] = [
    'procurement',
    'tendering',
    'contracts',
    'construction',
];

const PROFILE_TAGS_FOR_RFT = new Set<DomainTag>([
    'residential',
    'apartments',
    'commercial',
    'industrial',
    'mixed-use',
    'remediation',
    'due-diligence',
    'environmental',
    'ncc',
    'regulatory',
    'as-standards',
]);

function uniqueTags(tags: DomainTag[]): DomainTag[] {
    return [...new Set(tags)];
}

export function resolveRftKnowledgeTags(args: {
    contextName: string;
    fieldType: FieldType;
    profile?: ProfileTagInput;
}): DomainTag[] {
    const tags: DomainTag[] = [
        ...resolveDomainTagsFromText(args.contextName),
        ...RFT_BASE_DOMAIN_TAGS,
    ];

    if (args.fieldType.startsWith('brief.') || args.fieldType.startsWith('scope.')) {
        tags.push('as-standards');
    }

    if (args.profile) {
        tags.push(
            ...resolveProfileDomainTags(args.profile).filter((tag) =>
                PROFILE_TAGS_FOR_RFT.has(tag)
            )
        );
    }

    return uniqueTags(tags);
}
