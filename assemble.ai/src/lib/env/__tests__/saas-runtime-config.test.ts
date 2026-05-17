import { validateSaasRuntimeConfig } from '../saas-runtime-config';

const completeEnv = {
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

describe('SaaS runtime config validation', () => {
    it('requires web auth, billing, email, storage, database, Redis, and model env', () => {
        const result = validateSaasRuntimeConfig('web', {} as NodeJS.ProcessEnv);

        expect(result.ok).toBe(false);
        expect(result.missing).toEqual(expect.arrayContaining([
            'NEXT_PUBLIC_APP_URL',
            'BETTER_AUTH_SECRET or SESSION_SECRET',
            'DATABASE_URL or SUPABASE_POSTGRES_URL',
            'REDIS_URL',
            'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL',
            'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'POLAR_ACCESS_TOKEN',
            'RESEND_API_KEY',
        ]));
    });

    it('allows complete web configuration', () => {
        expect(validateSaasRuntimeConfig('web', completeEnv)).toMatchObject({
            service: 'web',
            ok: true,
            missing: [],
        });
    });

    it('requires worker database, Redis, storage, and model/provider env but not billing email env', () => {
        const workerEnv = {
            DATABASE_URL: completeEnv.DATABASE_URL,
            REDIS_URL: completeEnv.REDIS_URL,
            SUPABASE_URL: completeEnv.SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: completeEnv.SUPABASE_SERVICE_ROLE_KEY,
            VOYAGE_API_KEY: completeEnv.VOYAGE_API_KEY,
            ANTHROPIC_API_KEY: completeEnv.ANTHROPIC_API_KEY,
        } as NodeJS.ProcessEnv;

        expect(validateSaasRuntimeConfig('worker', workerEnv)).toMatchObject({
            service: 'worker',
            ok: true,
            missing: [],
        });
    });
});
