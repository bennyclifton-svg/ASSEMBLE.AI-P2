export type SaasServiceKind = 'web' | 'worker';

export interface RuntimeRequirement {
    key: string;
    label: string;
    alternatives?: string[];
}

export interface RuntimeConfigValidation {
    service: SaasServiceKind;
    ok: boolean;
    missing: string[];
    required: RuntimeRequirement[];
}

function hasValue(env: NodeJS.ProcessEnv, key: string): boolean {
    return Boolean(env[key]?.trim());
}

const STORAGE_REQUIREMENTS: RuntimeRequirement[] = [
    { key: 'SUPABASE_URL', alternatives: ['NEXT_PUBLIC_SUPABASE_URL'], label: 'Supabase Storage URL' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', alternatives: ['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'], label: 'Supabase Storage key' },
];

const MODEL_REQUIREMENTS: RuntimeRequirement[] = [
    { key: 'VOYAGE_API_KEY', label: 'Embeddings provider key' },
    { key: 'ANTHROPIC_API_KEY', label: 'Default AI/document extraction provider key' },
];

const BILLING_REQUIREMENTS: RuntimeRequirement[] = [
    { key: 'POLAR_ACCESS_TOKEN', label: 'Polar API access token' },
    { key: 'POLAR_WEBHOOK_SECRET', label: 'Polar webhook secret' },
    { key: 'POLAR_STARTER_PRODUCT_ID', label: 'Polar Starter product id' },
    { key: 'POLAR_PROFESSIONAL_PRODUCT_ID', label: 'Polar Professional product id' },
];

const EMAIL_REQUIREMENTS: RuntimeRequirement[] = [
    { key: 'RESEND_API_KEY', label: 'Resend API key' },
    { key: 'RESEND_FROM_EMAIL', label: 'Resend from address' },
];

function databaseRequirement(): RuntimeRequirement {
    return {
        key: 'DATABASE_URL',
        alternatives: ['SUPABASE_POSTGRES_URL'],
        label: 'PostgreSQL database connection',
    };
}

function authSecretRequirement(): RuntimeRequirement {
    return {
        key: 'BETTER_AUTH_SECRET',
        alternatives: ['SESSION_SECRET'],
        label: 'Better Auth/session secret',
    };
}

export function getSaasRuntimeRequirements(service: SaasServiceKind): RuntimeRequirement[] {
    const shared: RuntimeRequirement[] = [
        databaseRequirement(),
        { key: 'REDIS_URL', label: 'Redis queue connection' },
        ...STORAGE_REQUIREMENTS,
        ...MODEL_REQUIREMENTS,
    ];

    if (service === 'worker') {
        return shared;
    }

    return [
        { key: 'NEXT_PUBLIC_APP_URL', label: 'Public application URL' },
        authSecretRequirement(),
        ...shared,
        ...BILLING_REQUIREMENTS,
        ...EMAIL_REQUIREMENTS,
    ];
}

export function validateSaasRuntimeConfig(
    service: SaasServiceKind,
    env: NodeJS.ProcessEnv = process.env
): RuntimeConfigValidation {
    const required = getSaasRuntimeRequirements(service);
    const missing = required
        .filter((requirement) => {
            const keys = [requirement.key, ...(requirement.alternatives ?? [])];
            return !keys.some((key) => hasValue(env, key));
        })
        .map((requirement) => requirement.alternatives?.length
            ? `${requirement.key} or ${requirement.alternatives.join(' or ')}`
            : requirement.key
        );

    return {
        service,
        ok: missing.length === 0,
        missing,
        required,
    };
}

export function assertSaasRuntimeConfig(
    service: SaasServiceKind,
    env: NodeJS.ProcessEnv = process.env
): RuntimeConfigValidation {
    const validation = validateSaasRuntimeConfig(service, env);
    if (!validation.ok) {
        throw new Error(`Missing ${service} runtime configuration: ${validation.missing.join(', ')}`);
    }
    return validation;
}
