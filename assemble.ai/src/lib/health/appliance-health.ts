import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type ApplianceStatus = 'healthy' | 'degraded' | 'unhealthy';

export type ApplianceComponentId =
    | 'app'
    | 'database'
    | 'rag'
    | 'redis'
    | 'workers'
    | 'storage'
    | 'migrations'
    | 'modelProviders';

export const APPLIANCE_COMPONENT_ORDER: ApplianceComponentId[] = [
    'app',
    'database',
    'rag',
    'redis',
    'workers',
    'storage',
    'migrations',
    'modelProviders',
];

export interface ApplianceComponentHealth {
    id: ApplianceComponentId;
    label: string;
    status: ApplianceStatus;
    message: string;
    checkedAt: string;
    latencyMs?: number;
    details?: Record<string, unknown>;
}

export interface ApplianceHealthResponse {
    status: ApplianceStatus;
    version: string;
    environment: string;
    checkedAt: string;
    summary: Record<ApplianceStatus, number>;
    components: Record<ApplianceComponentId, ApplianceComponentHealth>;
}

export type ComponentCheckResult = Omit<ApplianceComponentHealth, 'id' | 'label' | 'checkedAt'>;
type ComponentCheck = () => Promise<ComponentCheckResult>;

export interface ApplianceHealthCheckers {
    database: ComponentCheck;
    rag: ComponentCheck;
    redis: ComponentCheck;
    workers: ComponentCheck;
    storage: ComponentCheck;
    migrations: ComponentCheck;
    modelProviders: ComponentCheck;
}

export interface ApplianceHealthOptions {
    checkers?: Partial<ApplianceHealthCheckers>;
    env?: NodeJS.ProcessEnv;
    now?: () => Date;
    version?: string;
}

export interface ModelSettingRow {
    featureGroup: string;
    provider: 'anthropic' | 'openai' | 'openrouter';
    modelId: string;
}

export interface ModelSettingsReadResult {
    rows: ModelSettingRow[];
    source: 'database' | 'fallback';
    warning?: string;
}

const COMPONENT_LABELS: Record<ApplianceComponentId, string> = {
    app: 'App',
    database: 'PostgreSQL',
    rag: 'pgvector / RAG',
    redis: 'Redis',
    workers: 'Workers',
    storage: 'Storage',
    migrations: 'Migrations',
    modelProviders: 'Model keys',
};

const FEATURE_GROUPS = ['extraction', 'generation', 'objectives_generation', 'chat'] as const;

const FALLBACK_MODEL_SETTINGS: ModelSettingRow[] = FEATURE_GROUPS.map((featureGroup) => ({
    featureGroup,
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
}));

const PROVIDER_KEY_ENV: Record<ModelSettingRow['provider'], string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
};

function databaseUrl(env: NodeJS.ProcessEnv): string | undefined {
    return env.DATABASE_URL || env.SUPABASE_POSTGRES_URL;
}

function elapsedMs(start: number): number {
    return Date.now() - start;
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isConfigured(value: string | undefined): boolean {
    return !!value?.trim();
}

async function withPgPool<T>(env: NodeJS.ProcessEnv, fn: (pool: import('pg').Pool) => Promise<T>): Promise<T> {
    const connectionString = databaseUrl(env);
    if (!connectionString) {
        throw new Error('DATABASE_URL or SUPABASE_POSTGRES_URL is not configured.');
    }

    const { Pool } = await import('pg');
    const pool = new Pool({
        connectionString,
        max: 1,
        idleTimeoutMillis: 1000,
        connectionTimeoutMillis: 1500,
        ssl: env.NODE_ENV === 'production' || connectionString.includes('supabase')
            ? { rejectUnauthorized: false }
            : false,
    });

    try {
        return await fn(pool);
    } finally {
        await pool.end().catch(() => undefined);
    }
}

function redisOptions(redisUrl: string) {
    return {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        connectTimeout: 1500,
        commandTimeout: 1500,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    };
}

function createDefaultCheckers(env: NodeJS.ProcessEnv): ApplianceHealthCheckers {
    return {
        database: () => checkDatabase(env),
        rag: () => checkRag(env),
        redis: () => checkRedis(env),
        workers: () => checkWorkers(env),
        storage: () => checkStorage(env),
        migrations: () => checkMigrations(env),
        modelProviders: () => checkModelProviders(env),
    };
}

async function checkDatabase(env: NodeJS.ProcessEnv): Promise<ComponentCheckResult> {
    const start = Date.now();

    if (!databaseUrl(env)) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: 'Database URL is missing. Set DATABASE_URL for the local PostgreSQL appliance.',
        };
    }

    try {
        await withPgPool(env, (pool) => pool.query('SELECT 1').then(() => undefined));
        return {
            status: 'healthy',
            latencyMs: elapsedMs(start),
            message: 'PostgreSQL is accepting connections.',
            details: { type: 'postgresql' },
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: `PostgreSQL is not reachable: ${errorMessage(error)}`,
            details: { type: 'postgresql' },
        };
    }
}

async function checkRag(env: NodeJS.ProcessEnv): Promise<ComponentCheckResult> {
    const start = Date.now();

    try {
        const result = await withPgPool(env, (pool) =>
            pool.query<{
                vector_installed: boolean;
                document_chunks: string | null;
                document_sets: string | null;
                document_set_members: string | null;
            }>(`
                SELECT
                    EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector_installed,
                    to_regclass('public.document_chunks')::text AS document_chunks,
                    to_regclass('public.document_sets')::text AS document_sets,
                    to_regclass('public.document_set_members')::text AS document_set_members
            `)
        );

        const row = result.rows[0];
        const missing = [
            row?.vector_installed ? null : 'pgvector extension',
            row?.document_chunks ? null : 'document_chunks table',
            row?.document_sets ? null : 'document_sets table',
            row?.document_set_members ? null : 'document_set_members table',
        ].filter((value): value is string => Boolean(value));

        if (missing.length > 0) {
            return {
                status: 'unhealthy',
                latencyMs: elapsedMs(start),
                message: `RAG is not ready. Missing ${missing.join(', ')}.`,
                details: { missing },
            };
        }

        return {
            status: 'healthy',
            latencyMs: elapsedMs(start),
            message: 'pgvector and the RAG tables are ready.',
            details: { vectorInstalled: true },
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: `RAG readiness could not be checked: ${errorMessage(error)}`,
        };
    }
}

async function checkRedis(env: NodeJS.ProcessEnv): Promise<ComponentCheckResult> {
    const start = Date.now();
    const redisUrl = env.REDIS_URL;

    if (!redisUrl) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: 'Redis URL is missing. Set REDIS_URL before starting the appliance.',
        };
    }

    const Redis = (await import('ioredis')).default;
    const redis = new Redis(redisUrl, redisOptions(redisUrl));

    try {
        await redis.connect();
        const pong = await redis.ping();
        if (pong !== 'PONG') {
            throw new Error(`Unexpected Redis response: ${pong}`);
        }

        return {
            status: 'healthy',
            latencyMs: elapsedMs(start),
            message: 'Redis is accepting queue connections.',
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: `Redis is not reachable: ${errorMessage(error)}`,
        };
    } finally {
        redis.disconnect();
    }
}

async function checkWorkers(env: NodeJS.ProcessEnv): Promise<ComponentCheckResult> {
    const start = Date.now();
    const redisUrl = env.REDIS_URL;

    if (!redisUrl) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: 'Worker queues cannot be checked because REDIS_URL is missing.',
        };
    }

    const Redis = (await import('ioredis')).default;
    const { Queue } = await import('bullmq');
    const connection = new Redis(redisUrl, redisOptions(redisUrl));
    const queues: import('bullmq').Queue[] = [];

    const queueDefinitions = [
        { id: 'documentProcessing', label: 'Document worker', name: 'document-processing' },
        { id: 'chunkEmbedding', label: 'Embedding worker', name: 'chunk-embedding' },
        { id: 'drawingExtraction', label: 'Drawing worker', name: 'drawing-extraction' },
    ];

    try {
        await connection.connect();

        const queueDetails = await Promise.all(queueDefinitions.map(async (definition) => {
            const queue = new Queue(definition.name, { connection });
            queues.push(queue);
            const [workers, counts, paused] = await Promise.all([
                queue.getWorkersCount(),
                queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'paused'),
                queue.isPaused(),
            ]);

            return {
                ...definition,
                workers,
                paused,
                counts,
            };
        }));

        const unavailable = queueDetails.filter((queue) => queue.workers === 0);
        const paused = queueDetails.filter((queue) => queue.paused);
        const failed = queueDetails.filter((queue) => Number(queue.counts.failed ?? 0) > 0);
        const status: ApplianceStatus = unavailable.length || paused.length || failed.length ? 'degraded' : 'healthy';

        const messages: string[] = [];
        if (unavailable.length) {
            messages.push(`no active ${unavailable.map((queue) => queue.label.toLowerCase()).join(', ')}`);
        }
        if (paused.length) {
            messages.push(`paused ${paused.map((queue) => queue.label.toLowerCase()).join(', ')}`);
        }
        if (failed.length) {
            messages.push(`failed jobs in ${failed.map((queue) => queue.label.toLowerCase()).join(', ')}`);
        }

        return {
            status,
            latencyMs: elapsedMs(start),
            message: status === 'healthy'
                ? 'Document, embedding, and drawing workers are registered with Redis.'
                : `Worker queues are reachable, but need attention: ${messages.join('; ')}.`,
            details: { queues: queueDetails },
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: `Worker queue readiness could not be checked: ${errorMessage(error)}`,
        };
    } finally {
        await Promise.all(queues.map((queue) => queue.close().catch(() => undefined)));
        connection.disconnect();
    }
}

function supabaseStorageSelection(env: NodeJS.ProcessEnv) {
    const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasAnySupabaseStorageConfig = !!(url || serviceKey || anonKey);
    const selected = hasAnySupabaseStorageConfig && env.USE_SUPABASE_STORAGE !== 'false';

    return { selected, url, serviceKey, anonKey };
}

async function checkStorage(env: NodeJS.ProcessEnv): Promise<ComponentCheckResult> {
    const start = Date.now();
    const supabase = supabaseStorageSelection(env);

    if (supabase.selected) {
        const missing = [
            supabase.url ? null : 'SUPABASE_URL',
            supabase.serviceKey || supabase.anonKey ? null : 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY',
        ].filter((value): value is string => Boolean(value));

        if (missing.length) {
            return {
                status: 'unhealthy',
                latencyMs: elapsedMs(start),
                message: `Supabase storage is selected but missing ${missing.join(', ')}.`,
                details: { mode: 'supabase', missing },
            };
        }

        return {
            status: 'healthy',
            latencyMs: elapsedMs(start),
            message: 'Supabase storage is selected and credentials are present.',
            details: { mode: 'supabase' },
        };
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const smokeFile = path.join(uploadsDir, `.sitewise-health-${Date.now()}.txt`);

    try {
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(smokeFile, 'sitewise storage health\n', 'utf8');
        const content = await readFile(smokeFile, 'utf8');
        if (content !== 'sitewise storage health\n') {
            throw new Error('Local storage readback did not match written content.');
        }

        return {
            status: 'healthy',
            latencyMs: elapsedMs(start),
            message: 'Local file storage is writable and readable.',
            details: { mode: 'local', directory: uploadsDir },
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: `Local file storage is not ready: ${errorMessage(error)}`,
            details: { mode: 'local', directory: uploadsDir },
        };
    } finally {
        await rm(smokeFile, { force: true }).catch(() => undefined);
    }
}

async function checkMigrations(env: NodeJS.ProcessEnv): Promise<ComponentCheckResult> {
    const start = Date.now();

    try {
        const result = await withPgPool(env, (pool) =>
            pool.query<{
                projects: string | null;
                auth_user: string | null;
                document_chunks: string | null;
                model_settings: string | null;
            }>(`
                SELECT
                    to_regclass('public.projects')::text AS projects,
                    to_regclass('public."user"')::text AS auth_user,
                    to_regclass('public.document_chunks')::text AS document_chunks,
                    to_regclass('public.model_settings')::text AS model_settings
            `)
        );

        const row = result.rows[0];
        const missing = [
            row?.projects ? null : 'main schema',
            row?.auth_user ? null : 'auth schema',
            row?.document_chunks ? null : 'RAG schema',
            row?.model_settings ? null : 'model settings schema',
        ].filter((value): value is string => Boolean(value));

        if (missing.length) {
            return {
                status: 'unhealthy',
                latencyMs: elapsedMs(start),
                message: `Database schema is incomplete. Missing ${missing.join(', ')}.`,
                details: { missing },
            };
        }

        return {
            status: 'healthy',
            latencyMs: elapsedMs(start),
            message: 'Main, auth, RAG, and model settings schemas are present.',
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: elapsedMs(start),
            message: `Migration readiness could not be checked: ${errorMessage(error)}`,
        };
    }
}

async function readModelSettings(env: NodeJS.ProcessEnv): Promise<ModelSettingsReadResult> {
    if (!databaseUrl(env)) {
        return {
            rows: FALLBACK_MODEL_SETTINGS,
            source: 'fallback',
            warning: 'Database URL is missing, so runtime model settings could not be read.',
        };
    }

    try {
        const result = await withPgPool(env, (pool) =>
            pool.query<{
                feature_group: string;
                provider: ModelSettingRow['provider'];
                model_id: string;
            }>('SELECT feature_group, provider, model_id FROM model_settings')
        );

        if (!result.rowCount) {
            return {
                rows: FALLBACK_MODEL_SETTINGS,
                source: 'fallback',
                warning: 'No model settings rows exist yet; the runtime fallback is in effect.',
            };
        }

        return {
            rows: result.rows.map((row) => ({
                featureGroup: row.feature_group,
                provider: row.provider,
                modelId: row.model_id,
            })),
            source: 'database',
        };
    } catch (error) {
        return {
            rows: FALLBACK_MODEL_SETTINGS,
            source: 'fallback',
            warning: `Model settings could not be read: ${errorMessage(error)}`,
        };
    }
}

export function evaluateModelProviderHealth(
    env: NodeJS.ProcessEnv,
    settings: ModelSettingsReadResult,
    latencyMs = 0
): ComponentCheckResult {
    const requirements = new Map<string, string[]>();

    for (const row of settings.rows) {
        const envVar = PROVIDER_KEY_ENV[row.provider];
        const reasons = requirements.get(envVar) ?? [];
        reasons.push(`${row.featureGroup} model provider`);
        requirements.set(envVar, reasons);
    }

    const voyageReasons = requirements.get('VOYAGE_API_KEY') ?? [];
    voyageReasons.push('document embeddings');
    requirements.set('VOYAGE_API_KEY', voyageReasons);

    const anthropicReasons = requirements.get('ANTHROPIC_API_KEY') ?? [];
    anthropicReasons.push('drawing and legacy document extraction');
    requirements.set('ANTHROPIC_API_KEY', anthropicReasons);

    const missing = Array.from(requirements.keys()).filter((envVar) => !isConfigured(env[envVar]));
    const configured = Array.from(requirements.keys()).filter((envVar) => isConfigured(env[envVar]));
    const degraded = missing.length > 0 || settings.source === 'fallback';

    if (degraded) {
        const parts = [];
        if (missing.length) parts.push(`missing ${missing.join(', ')}`);
        if (settings.warning) parts.push(settings.warning);
        const messageParts = parts.map((part) => part.replace(/[.]+$/, ''));

        return {
            status: 'degraded',
            latencyMs,
            message: `Model setup needs attention: ${messageParts.join('; ')}.`,
            details: {
                missingKeys: missing,
                configuredKeys: configured,
                modelSettingsSource: settings.source,
                selectedProviders: settings.rows.map((row) => ({
                    featureGroup: row.featureGroup,
                    provider: row.provider,
                    modelId: row.modelId,
                })),
                requirements: Object.fromEntries(requirements),
            },
        };
    }

    return {
        status: 'healthy',
        latencyMs,
        message: 'Configured model providers and embedding keys are present.',
        details: {
            configuredKeys: configured,
            modelSettingsSource: settings.source,
            selectedProviders: settings.rows.map((row) => ({
                featureGroup: row.featureGroup,
                provider: row.provider,
                modelId: row.modelId,
            })),
            requirements: Object.fromEntries(requirements),
        },
    };
}

async function checkModelProviders(env: NodeJS.ProcessEnv): Promise<ComponentCheckResult> {
    const start = Date.now();
    const settings = await readModelSettings(env);
    return evaluateModelProviderHealth(env, settings, elapsedMs(start));
}

async function runComponentCheck(
    id: ApplianceComponentId,
    check: ComponentCheck,
    checkedAt: string
): Promise<ApplianceComponentHealth> {
    try {
        const result = await check();
        return {
            id,
            label: COMPONENT_LABELS[id],
            checkedAt,
            ...result,
        };
    } catch (error) {
        return {
            id,
            label: COMPONENT_LABELS[id],
            status: 'unhealthy',
            checkedAt,
            message: `${COMPONENT_LABELS[id]} readiness failed: ${errorMessage(error)}`,
        };
    }
}

function overallStatus(components: Record<ApplianceComponentId, ApplianceComponentHealth>): ApplianceStatus {
    const statuses = Object.values(components).map((component) => component.status);
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
}

function summarize(components: Record<ApplianceComponentId, ApplianceComponentHealth>): Record<ApplianceStatus, number> {
    return Object.values(components).reduce<Record<ApplianceStatus, number>>(
        (summary, component) => {
            summary[component.status] += 1;
            return summary;
        },
        { healthy: 0, degraded: 0, unhealthy: 0 }
    );
}

export async function getApplianceHealth(options: ApplianceHealthOptions = {}): Promise<ApplianceHealthResponse> {
    const env = options.env ?? process.env;
    const checkedAt = (options.now ?? (() => new Date()))().toISOString();
    const defaultCheckers = createDefaultCheckers(env);
    const checkers: ApplianceHealthCheckers = {
        ...defaultCheckers,
        ...options.checkers,
    };

    const entries = await Promise.all([
        runComponentCheck('app', async () => ({
            status: 'healthy',
            message: 'The Sitewise application process is responding.',
        }), checkedAt),
        runComponentCheck('database', checkers.database, checkedAt),
        runComponentCheck('rag', checkers.rag, checkedAt),
        runComponentCheck('redis', checkers.redis, checkedAt),
        runComponentCheck('workers', checkers.workers, checkedAt),
        runComponentCheck('storage', checkers.storage, checkedAt),
        runComponentCheck('migrations', checkers.migrations, checkedAt),
        runComponentCheck('modelProviders', checkers.modelProviders, checkedAt),
    ]);

    const components = Object.fromEntries(
        entries.map((component) => [component.id, component])
    ) as Record<ApplianceComponentId, ApplianceComponentHealth>;

    return {
        status: overallStatus(components),
        version: options.version ?? process.env.npm_package_version ?? '0.1.0',
        environment: env.NODE_ENV === 'production' ? 'production' : 'development',
        checkedAt,
        summary: summarize(components),
        components,
    };
}
