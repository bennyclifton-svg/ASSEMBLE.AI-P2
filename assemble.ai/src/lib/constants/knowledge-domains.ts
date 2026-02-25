/**
 * Knowledge Domain System - Constants and Definitions
 *
 * Ten pre-built knowledge domains with domain types, tags, and descriptions.
 * Tag taxonomy organized into 5 categories for targeted retrieval.
 * Section-to-domain tag mapping for automatic context resolution.
 */

// ============================================
// Domain Types
// ============================================

export const DOMAIN_TYPES = [
    'reference',         // Regulatory and standards references
    'regulatory',        // Jurisdiction-specific regulatory content
    'best_practices',    // Industry best-practice guidance
    'templates',         // Document and process templates
    'project_history',   // Past project lessons learned
    'custom',            // User-defined custom domains
] as const;

export type DomainType = (typeof DOMAIN_TYPES)[number];

// ============================================
// Tag Taxonomy
// ============================================

/** Building type classification tags */
export const BUILDING_TYPE_TAGS = [
    'residential',    // Class 1, 10
    'apartments',     // Class 2
    'commercial',     // Class 5-9
    'industrial',     // Class 7, 8
    'mixed-use',      // Multiple classes
] as const;

/** Discipline-specific tags */
export const DISCIPLINE_TAGS = [
    'architectural',
    'structural',
    'mechanical',
    'electrical',
    'hydraulic',
    'fire',
    'civil',
    'landscape',
    'interior',
    'sustainability',
] as const;

/** Functional area tags */
export const FUNCTION_TAGS = [
    'cost-management',
    'budgeting',
    'variations',
    'progress-claims',
    'procurement',
    'tendering',
    'contracts',
    'programming',
    'milestones',
    'critical-path',
    'construction',
    'defects',
    'eot',              // Extension of time
    'remediation',
    'due-diligence',
    'environmental',
] as const;

/** Regulatory framework tags */
export const REGULATORY_TAGS = [
    'ncc',
    'as-standards',
    'regulatory',
    'basix',            // NSW energy/water
    'nathers',
    'nabers',
    'green-star',
] as const;

/** Contract form tags */
export const CONTRACT_TAGS = [
    'as2124',
    'as4000',
    'as4902',
    'abic',
    'hia',
    'mba',
] as const;

/** Master tag list — union of all tag categories */
export const ALL_DOMAIN_TAGS = [
    ...BUILDING_TYPE_TAGS,
    ...DISCIPLINE_TAGS,
    ...FUNCTION_TAGS,
    ...REGULATORY_TAGS,
    ...CONTRACT_TAGS,
] as const;

export type DomainTag = (typeof ALL_DOMAIN_TAGS)[number];

// ============================================
// Tag Category Labels
// ============================================

export const TAG_CATEGORIES = {
    'Building Type': BUILDING_TYPE_TAGS,
    'Discipline': DISCIPLINE_TAGS,
    'Function': FUNCTION_TAGS,
    'Regulatory': REGULATORY_TAGS,
    'Contract': CONTRACT_TAGS,
} as const;

// ============================================
// Pre-Built Domain Definitions
// ============================================

export interface KnowledgeDomainDefinition {
    id: string;
    name: string;
    domainType: DomainType;
    tags: DomainTag[];
    description: string;
    applicableProjectTypes: string[];
    applicableStates: string[];
}

export const PREBUILT_DOMAINS: KnowledgeDomainDefinition[] = [
    {
        id: 'domain-ncc-reference',
        name: 'NCC Reference Guide',
        domainType: 'reference',
        tags: ['ncc', 'regulatory'],
        description: 'National Construction Code clause index, building classifications, performance requirements',
        applicableProjectTypes: ['refurb', 'extend', 'new', 'remediation', 'advisory'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-as-standards',
        name: 'AS Standards Reference',
        domainType: 'reference',
        tags: ['as-standards', 'regulatory'],
        description: 'Australian Standards catalog, scope descriptions, NCC cross-references',
        applicableProjectTypes: ['refurb', 'extend', 'new', 'remediation', 'advisory'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-residential-guide',
        name: 'Residential Construction Guide',
        domainType: 'best_practices',
        tags: ['residential', 'construction'],
        description: 'Best practices for Class 1/10 residential projects',
        applicableProjectTypes: ['refurb', 'extend', 'new'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-multi-residential-guide',
        name: 'Multi-Residential/Apartments Guide',
        domainType: 'best_practices',
        tags: ['residential', 'commercial', 'apartments'],
        description: 'Best practices for Class 2-4 multi-residential projects',
        applicableProjectTypes: ['refurb', 'new'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-commercial-guide',
        name: 'Commercial Construction Guide',
        domainType: 'best_practices',
        tags: ['commercial', 'construction'],
        description: 'Best practices for Class 5-9 commercial and institutional projects',
        applicableProjectTypes: ['refurb', 'extend', 'new'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-cost-management',
        name: 'Cost Management Principles',
        domainType: 'best_practices',
        tags: ['cost-management', 'budgeting', 'variations'],
        description: 'Cost planning, contingency, progress claims, forecast management',
        applicableProjectTypes: ['refurb', 'extend', 'new', 'remediation', 'advisory'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-procurement-tendering',
        name: 'Procurement & Tendering Guide',
        domainType: 'best_practices',
        tags: ['procurement', 'contracts', 'tendering'],
        description: 'Tender process, evaluation criteria, RFT preparation',
        applicableProjectTypes: ['refurb', 'extend', 'new', 'remediation', 'advisory'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-contract-administration',
        name: 'Contract Administration Guide',
        domainType: 'best_practices',
        tags: ['contracts', 'as2124', 'as4000', 'variations', 'eot', 'defects'],
        description: 'Contract management, variations, extensions of time, defect liability',
        applicableProjectTypes: ['refurb', 'extend', 'new', 'remediation', 'advisory'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-program-scheduling',
        name: 'Program & Scheduling Guide',
        domainType: 'best_practices',
        tags: ['programming', 'milestones', 'critical-path'],
        description: 'Construction programming, milestone tracking, delay analysis',
        applicableProjectTypes: ['refurb', 'extend', 'new', 'remediation', 'advisory'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
    {
        id: 'domain-remediation-dd',
        name: 'Remediation & Due Diligence Guide',
        domainType: 'best_practices',
        tags: ['remediation', 'due-diligence', 'environmental'],
        description: 'Site investigation, contamination assessment, remediation action plans',
        applicableProjectTypes: ['remediation', 'advisory'],
        applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    },
];

// ============================================
// Domain Display Labels
// ============================================

export const DOMAIN_TYPE_LABELS: Record<DomainType, string> = {
    reference: 'Reference',
    regulatory: 'Regulatory',
    best_practices: 'Best Practices',
    templates: 'Templates',
    project_history: 'Project History',
    custom: 'Custom',
};

// ============================================
// Section-to-Domain Tag Mapping
// ============================================

/**
 * Maps report sections and module contexts to relevant knowledge domain tags.
 * Used by the Context Orchestrator to automatically determine
 * which domains to query.
 */
export const SECTION_TO_DOMAIN_TAGS: Record<string, DomainTag[]> = {
    // Report sections
    'brief': ['cost-management', 'programming'],
    'procurement': ['procurement', 'contracts', 'tendering'],
    'cost_planning': ['cost-management', 'variations', 'progress-claims'],
    'programme': ['programming', 'milestones', 'critical-path'],
    'planning_authorities': ['ncc', 'regulatory'],
    'design': ['architectural', 'ncc'],
    'construction': ['construction', 'contracts', 'defects'],

    // Module contexts
    'cost_plan': ['cost-management', 'budgeting', 'variations', 'progress-claims'],
    'variations': ['variations', 'contracts', 'eot'],
    'invoices': ['progress-claims', 'cost-management'],
    'payment_schedule': ['progress-claims', 'contracts'],
    'program': ['programming', 'milestones', 'critical-path'],
    'stakeholders': ['procurement', 'contracts'],
    'documents': ['procurement', 'tendering'],
    'reports': ['cost-management', 'programming', 'procurement'],
};

// ============================================
// Tag Normalization Utility
// ============================================

/**
 * Normalize a tag string to the canonical format: lowercase, hyphenated, trimmed.
 * Ensures consistent tag storage regardless of user input format.
 */
export function normalizeTag(tag: string): string {
    return tag
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')     // Underscores and spaces to hyphens
        .replace(/[^a-z0-9-]/g, '')  // Remove non-alphanumeric except hyphens
        .replace(/-+/g, '-')         // Collapse multiple hyphens
        .replace(/^-|-$/g, '');      // Trim leading/trailing hyphens
}

/**
 * Check if a tag is part of the curated tag catalog.
 * Returns true for known tags, false for custom tags.
 */
export function isKnownTag(tag: string): boolean {
    return (ALL_DOMAIN_TAGS as readonly string[]).includes(normalizeTag(tag));
}

// ============================================
// Profile-Based Domain Tag Resolution
// ============================================

export interface ProfileTagInput {
    buildingClass?: string;
    projectType?: string;
    subclass?: string[];
    complexity?: Record<string, string | string[]>;
}

const BUILDING_CLASS_TAG_MAP: Record<string, DomainTag[]> = {
    residential: ['residential', 'construction'],
    commercial: ['commercial', 'construction'],
    industrial: ['industrial', 'construction'],
    institution: ['commercial', 'construction'],
    mixed: ['mixed-use', 'commercial', 'residential'],
    infrastructure: ['construction'],
    agricultural: ['construction'],
    defense_secure: ['commercial', 'construction'],
};

/**
 * Resolve profile attributes to domain tags for knowledge retrieval.
 * Used by objectives generation to determine which knowledge bases to search.
 *
 * Three-layer architecture:
 *   Layer 1 (this function): Coarse tag selection → which domains to search
 *   Layer 2 (retrieveFromDomains): applicableProjectTypes/States filtering
 *   Layer 3 (buildProfileSearchQuery): Semantic query for vector similarity
 */
export function resolveProfileDomainTags(profile: ProfileTagInput): DomainTag[] {
    const tags: DomainTag[] = ['ncc', 'regulatory', 'as-standards'];

    if (profile.buildingClass && BUILDING_CLASS_TAG_MAP[profile.buildingClass]) {
        tags.push(...BUILDING_CLASS_TAG_MAP[profile.buildingClass]);
    }

    if (profile.subclass?.some(s => s.includes('apartments'))) {
        tags.push('apartments');
    }

    if (profile.projectType === 'remediation') {
        tags.push('remediation', 'due-diligence', 'environmental');
    }

    const complexity = profile.complexity || {};
    const contamination = (complexity.contamination_level ?? complexity.contaminationLevel) as string | undefined;
    if (contamination === 'significant' || contamination === 'heavily_contaminated') {
        tags.push('remediation', 'environmental');
    }

    const procurementRoute = complexity.procurement_route ?? complexity.procurementRoute;
    if (procurementRoute) {
        tags.push('procurement', 'contracts');
    }

    return [...new Set(tags)];
}

// ============================================
// Profile Search Query Builder
// ============================================

export interface ProfileSearchInput {
    buildingClass?: string;
    projectType?: string;
    subclass?: string[];
    scaleData?: Record<string, number | string>;
    complexity?: Record<string, string | string[]>;
    workScopeLabels?: string[];
    region?: string;
}

/**
 * Build a semantic search query from profile attributes for vector similarity
 * search within selected knowledge domains.
 */
export function buildProfileSearchQuery(profile: ProfileSearchInput): string {
    const parts: string[] = [];

    if (profile.buildingClass) {
        parts.push(`${profile.buildingClass} building`);
    }
    if (profile.projectType) {
        parts.push(`${profile.projectType} project`);
    }
    if (profile.subclass && profile.subclass.length > 0) {
        parts.push(profile.subclass.join(', '));
    }

    if (profile.scaleData) {
        const scaleEntries = Object.entries(profile.scaleData)
            .filter(([, v]) => v && v !== 0 && v !== '0')
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
        if (scaleEntries.length > 0) {
            parts.push(scaleEntries.join(', '));
        }
    }

    if (profile.complexity) {
        const complexityEntries = Object.entries(profile.complexity)
            .filter(([, v]) => v && (!Array.isArray(v) || v.length > 0))
            .map(([k, v]) => {
                const key = k.replace(/_/g, ' ');
                const val = Array.isArray(v) ? v.join(', ') : v;
                return `${key}: ${val}`;
            });
        if (complexityEntries.length > 0) {
            parts.push(complexityEntries.join(', '));
        }
    }

    if (profile.workScopeLabels && profile.workScopeLabels.length > 0) {
        parts.push(`work scope: ${profile.workScopeLabels.join(', ')}`);
    }

    if (profile.region) {
        parts.push(`region: ${profile.region}`);
    }

    return parts.join(' | ');
}
