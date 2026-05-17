import {
    evaluateModelProviderHealth,
    getApplianceHealth,
    type ApplianceHealthCheckers,
    type ComponentCheckResult,
} from '../appliance-health';

const checkedAt = new Date('2026-05-14T00:00:00.000Z');

function healthy(message = 'ok'): ComponentCheckResult {
    return { status: 'healthy', message };
}

function healthyCheckers(overrides: Partial<ApplianceHealthCheckers> = {}): Partial<ApplianceHealthCheckers> {
    return {
        database: async () => healthy('PostgreSQL ready.'),
        rag: async () => healthy('RAG ready.'),
        redis: async () => healthy('Redis ready.'),
        workers: async () => healthy('Workers ready.'),
        storage: async () => healthy('Storage ready.'),
        migrations: async () => healthy('Migrations ready.'),
        modelProviders: async () => healthy('Model keys ready.'),
        ...overrides,
    };
}

describe('getApplianceHealth', () => {
    it('reports healthy when every component is ready', async () => {
        const health = await getApplianceHealth({
            checkers: healthyCheckers(),
            now: () => checkedAt,
            version: 'test-version',
            env: { NODE_ENV: 'test' },
        });

        expect(health.status).toBe('healthy');
        expect(health.version).toBe('test-version');
        expect(health.summary).toEqual({ healthy: 8, degraded: 0, unhealthy: 0 });
        expect(health.components.database.status).toBe('healthy');
    });

    it('reports missing Redis as an unhealthy setup issue', async () => {
        const health = await getApplianceHealth({
            checkers: healthyCheckers({
                redis: async () => ({
                    status: 'unhealthy',
                    message: 'Redis URL is missing. Set REDIS_URL before starting the appliance.',
                }),
                workers: async () => ({
                    status: 'unhealthy',
                    message: 'Worker queues cannot be checked because REDIS_URL is missing.',
                }),
            }),
            now: () => checkedAt,
            env: { NODE_ENV: 'test' },
        });

        expect(health.status).toBe('unhealthy');
        expect(health.components.redis.status).toBe('unhealthy');
        expect(health.components.redis.message).toContain('REDIS_URL');
        expect(health.components.workers.status).toBe('unhealthy');
    });

    it('reports unavailable pgvector/RAG as unhealthy', async () => {
        const health = await getApplianceHealth({
            checkers: healthyCheckers({
                rag: async () => ({
                    status: 'unhealthy',
                    message: 'RAG is not ready. Missing pgvector extension.',
                    details: { missing: ['pgvector extension'] },
                }),
            }),
            now: () => checkedAt,
            env: { NODE_ENV: 'test' },
        });

        expect(health.status).toBe('unhealthy');
        expect(health.components.rag.status).toBe('unhealthy');
        expect(health.components.rag.message).toContain('pgvector');
    });
});

describe('evaluateModelProviderHealth', () => {
    it('reports missing selected model keys as degraded setup issues', () => {
        const result = evaluateModelProviderHealth(
            { NODE_ENV: 'test', ANTHROPIC_API_KEY: 'present', VOYAGE_API_KEY: 'present' },
            {
                source: 'database',
                rows: [
                    { featureGroup: 'chat', provider: 'openai', modelId: 'gpt-test' },
                ],
            }
        );

        expect(result.status).toBe('degraded');
        expect(result.message).toContain('OPENAI_API_KEY');
        expect(result.details?.missingKeys).toEqual(['OPENAI_API_KEY']);
    });

    it('reports model providers healthy when selected and required keys are present', () => {
        const result = evaluateModelProviderHealth(
            {
                NODE_ENV: 'test',
                ANTHROPIC_API_KEY: 'present',
                OPENAI_API_KEY: 'present',
                VOYAGE_API_KEY: 'present',
            },
            {
                source: 'database',
                rows: [
                    { featureGroup: 'chat', provider: 'openai', modelId: 'gpt-test' },
                ],
            }
        );

        expect(result.status).toBe('healthy');
        expect(result.details?.configuredKeys).toEqual(
            expect.arrayContaining(['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'VOYAGE_API_KEY'])
        );
    });
});
