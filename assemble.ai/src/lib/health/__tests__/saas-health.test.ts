import { buildSaasHealth } from '../saas-health';
import type { ApplianceHealthResponse } from '../appliance-health';

function appliance(): ApplianceHealthResponse {
    const checkedAt = '2026-05-17T10:00:00.000Z';
    const healthy = (id: string, label: string) => ({
        id,
        label,
        status: 'healthy' as const,
        message: `${label} ready.`,
        checkedAt,
    });

    return {
        status: 'healthy',
        version: 'test',
        environment: 'production',
        checkedAt,
        summary: { healthy: 8, degraded: 0, unhealthy: 0 },
        components: {
            app: healthy('app', 'App'),
            database: healthy('database', 'PostgreSQL'),
            rag: healthy('rag', 'RAG'),
            redis: healthy('redis', 'Redis'),
            workers: healthy('workers', 'Workers'),
            storage: healthy('storage', 'Storage'),
            migrations: healthy('migrations', 'Migrations'),
            modelProviders: healthy('modelProviders', 'Model keys'),
        },
    };
}

const validEnv = {
    NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    BETTER_AUTH_SECRET: 'secret',
    DATABASE_URL: 'postgres://user:pass@db:5432/app',
    REDIS_URL: 'redis://redis:6379',
    SUPABASE_URL: 'https://supabase.example.com',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    VOYAGE_API_KEY: 'voyage-key',
    ANTHROPIC_API_KEY: 'anthropic-key',
    POLAR_ACCESS_TOKEN: 'polar-token',
    POLAR_WEBHOOK_SECRET: 'polar-webhook',
    POLAR_STARTER_PRODUCT_ID: 'prod-starter',
    POLAR_PROFESSIONAL_PRODUCT_ID: 'prod-professional',
    RESEND_API_KEY: 'resend-key',
    RESEND_FROM_EMAIL: 'Sitewise <support@example.com>',
} as NodeJS.ProcessEnv;

describe('SaaS health', () => {
    it('reports healthy when appliance checks and SaaS config are ready', () => {
        const health = buildSaasHealth({ appliance: appliance(), env: validEnv });

        expect(health.status).toBe('healthy');
        expect(health.components.billing.status).toBe('healthy');
        expect(health.components.email.status).toBe('healthy');
        expect(health.components.runtimeConfig.status).toBe('healthy');
    });

    it('reports missing billing, email, and runtime config as unhealthy', () => {
        const health = buildSaasHealth({
            appliance: appliance(),
            env: { NODE_ENV: 'production' } as NodeJS.ProcessEnv,
        });

        expect(health.status).toBe('unhealthy');
        expect(health.components.billing.message).toContain('POLAR_ACCESS_TOKEN');
        expect(health.components.email.message).toContain('RESEND_API_KEY');
        expect(health.components.runtimeConfig.message).toContain('NEXT_PUBLIC_APP_URL');
    });

    it('reports billing and email as healthy when explicitly disabled', () => {
        const env = {
            NODE_ENV: 'production',
            NEXT_PUBLIC_APP_URL: 'https://app.example.com',
            BETTER_AUTH_SECRET: 'secret',
            DATABASE_URL: 'postgres://user:pass@db:5432/app',
            REDIS_URL: 'redis://redis:6379',
            SUPABASE_URL: 'https://supabase.example.com',
            SUPABASE_SERVICE_ROLE_KEY: 'service-key',
            VOYAGE_API_KEY: 'voyage-key',
            ANTHROPIC_API_KEY: 'anthropic-key',
            POLAR_ENABLED: 'false',
            TRANSACTIONAL_EMAILS_ENABLED: 'false',
        } as NodeJS.ProcessEnv;

        const health = buildSaasHealth({ appliance: appliance(), env });

        expect(health.components.billing.status).toBe('healthy');
        expect(health.components.email.status).toBe('healthy');
        expect(health.components.runtimeConfig.status).toBe('healthy');
    });
});
