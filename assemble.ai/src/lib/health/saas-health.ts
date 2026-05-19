import {
    getApplianceHealth,
    type ApplianceComponentHealth,
    type ApplianceHealthResponse,
    type ApplianceStatus,
} from './appliance-health';
import { isPolarEnabled, validateSaasRuntimeConfig, type RuntimeConfigValidation } from '@/lib/env/saas-runtime-config';
import { validateTransactionalEmailConfig } from '@/lib/email/transactional';

export type SaasHealthComponentId =
    | 'web'
    | 'database'
    | 'redis'
    | 'storage'
    | 'workers'
    | 'billing'
    | 'email'
    | 'runtimeConfig';

export interface SaasComponentHealth {
    id: SaasHealthComponentId;
    label: string;
    status: ApplianceStatus;
    message: string;
    details?: Record<string, unknown>;
}

export interface SaasHealthResponse {
    status: ApplianceStatus;
    checkedAt: string;
    summary: Record<ApplianceStatus, number>;
    components: Record<SaasHealthComponentId, SaasComponentHealth>;
}

function summarize(components: Record<SaasHealthComponentId, SaasComponentHealth>): Record<ApplianceStatus, number> {
    return Object.values(components).reduce<Record<ApplianceStatus, number>>(
        (summary, component) => {
            summary[component.status] += 1;
            return summary;
        },
        { healthy: 0, degraded: 0, unhealthy: 0 }
    );
}

function overallStatus(components: Record<SaasHealthComponentId, SaasComponentHealth>): ApplianceStatus {
    const statuses = Object.values(components).map((component) => component.status);
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
}

function fromAppliance(
    id: SaasHealthComponentId,
    component: ApplianceComponentHealth
): SaasComponentHealth {
    return {
        id,
        label: component.label,
        status: component.status,
        message: component.message,
        details: component.details,
    };
}

function billingHealth(env: NodeJS.ProcessEnv): SaasComponentHealth {
    if (!isPolarEnabled(env)) {
        return {
            id: 'billing',
            label: 'Billing',
            status: 'healthy',
            message: 'Polar billing is disabled (POLAR_ENABLED=false).',
            details: { enabled: false },
        };
    }

    const missing = [
        env.POLAR_ACCESS_TOKEN?.trim() ? null : 'POLAR_ACCESS_TOKEN',
        env.POLAR_WEBHOOK_SECRET?.trim() ? null : 'POLAR_WEBHOOK_SECRET',
        env.POLAR_STARTER_PRODUCT_ID?.trim() ? null : 'POLAR_STARTER_PRODUCT_ID',
        env.POLAR_PROFESSIONAL_PRODUCT_ID?.trim() ? null : 'POLAR_PROFESSIONAL_PRODUCT_ID',
    ].filter((value): value is string => Boolean(value));

    return {
        id: 'billing',
        label: 'Billing',
        status: missing.length ? 'unhealthy' : 'healthy',
        message: missing.length
            ? `Billing configuration is missing ${missing.join(', ')}.`
            : 'Polar billing configuration is present.',
        details: { missing },
    };
}

function emailHealth(env: NodeJS.ProcessEnv): SaasComponentHealth {
    const validation = validateTransactionalEmailConfig({
        ...env,
        NODE_ENV: 'production',
        TRANSACTIONAL_EMAILS_ENABLED: env.TRANSACTIONAL_EMAILS_ENABLED ?? 'true',
    });

    return {
        id: 'email',
        label: 'Transactional email',
        status: validation.valid ? 'healthy' : 'unhealthy',
        message: validation.valid
            ? 'Resend transactional email configuration is present.'
            : `Email configuration is missing ${validation.missing.join(', ')}.`,
        details: { missing: validation.missing },
    };
}

function runtimeConfigHealth(validation: RuntimeConfigValidation): SaasComponentHealth {
    return {
        id: 'runtimeConfig',
        label: 'Runtime config',
        status: validation.ok ? 'healthy' : 'unhealthy',
        message: validation.ok
            ? 'Required web runtime configuration is present.'
            : `Required web runtime configuration is missing ${validation.missing.join(', ')}.`,
        details: {
            service: validation.service,
            missing: validation.missing,
        },
    };
}

export function buildSaasHealth(args: {
    appliance: ApplianceHealthResponse;
    env?: NodeJS.ProcessEnv;
    checkedAt?: string;
}): SaasHealthResponse {
    const env = args.env ?? process.env;
    const runtimeValidation = validateSaasRuntimeConfig('web', env);
    const components = {
        web: {
            id: 'web',
            label: 'Web',
            status: 'healthy',
            message: 'The public SaaS web process is responding.',
        },
        database: fromAppliance('database', args.appliance.components.database),
        redis: fromAppliance('redis', args.appliance.components.redis),
        storage: fromAppliance('storage', args.appliance.components.storage),
        workers: fromAppliance('workers', args.appliance.components.workers),
        billing: billingHealth(env),
        email: emailHealth(env),
        runtimeConfig: runtimeConfigHealth(runtimeValidation),
    } as Record<SaasHealthComponentId, SaasComponentHealth>;

    return {
        status: overallStatus(components),
        checkedAt: args.checkedAt ?? args.appliance.checkedAt,
        summary: summarize(components),
        components,
    };
}

export async function getSaasHealth(env: NodeJS.ProcessEnv = process.env): Promise<SaasHealthResponse> {
    const appliance = await getApplianceHealth({ env });
    return buildSaasHealth({ appliance, env });
}
