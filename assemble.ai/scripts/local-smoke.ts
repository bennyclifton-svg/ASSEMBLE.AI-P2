import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { loadAppEnv } from '../src/lib/env/load-app-env';

loadAppEnv();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const require = createRequire(import.meta.url);

type CheckResult = {
    name: string;
    ok: boolean;
    detail?: string;
};

function tsxCliPath(): string {
    return path.join(path.dirname(require.resolve('tsx')), 'cli.mjs');
}

function childEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (typeof value === 'string' && !key.includes('=')) {
            env[key] = value;
        }
    }
    return { ...env, ...extra };
}

function assertLocalUrl(label: string, rawUrl: string): void {
    if (process.env.SITEWISE_ALLOW_REMOTE_BOOTSTRAP === '1') return;

    const host = new URL(rawUrl).hostname;
    if (!LOCAL_HOSTS.has(host)) {
        throw new Error(`${label} points at "${host}", not a local service.`);
    }
}

async function withPool<T>(fn: (pool: Pool) => Promise<T>): Promise<T> {
    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL or SUPABASE_POSTGRES_URL is not set.');
    assertLocalUrl('DATABASE_URL', databaseUrl);

    const pool = new Pool({ connectionString: databaseUrl });
    try {
        return await fn(pool);
    } finally {
        await pool.end();
    }
}

async function checkTable(tableName: string): Promise<void> {
    await withPool(async (pool) => {
        const result = await pool.query(
            `
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = $1
            ) AS exists
            `,
            [tableName]
        );

        if (!result.rows[0]?.exists) {
            throw new Error(`Missing table ${tableName}.`);
        }
    });
}

async function checkRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL is not set.');
    assertLocalUrl('REDIS_URL', redisUrl);

    const redis = new IORedis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    });

    try {
        await redis.connect();
        const pong = await redis.ping();
        if (pong !== 'PONG') throw new Error(`Unexpected Redis response: ${pong}`);
    } finally {
        await redis.quit();
    }
}

async function checkPgvector(): Promise<void> {
    await withPool(async (pool) => {
        const result = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
        if (!result.rowCount) throw new Error('pgvector extension is not installed.');
    });
}

async function checkLocalStorage(): Promise<void> {
    const hasSupabaseConfig = !!(
        process.env.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (hasSupabaseConfig && process.env.USE_SUPABASE_STORAGE !== 'false') {
        throw new Error('Supabase storage is configured. Set USE_SUPABASE_STORAGE=false for local appliance smoke checks.');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const smokeFile = path.join(uploadsDir, '.sitewise-storage-smoke.txt');

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(smokeFile, 'sitewise local storage smoke\n', 'utf8');

    const content = await readFile(smokeFile, 'utf8');
    if (content !== 'sitewise local storage smoke\n') {
        throw new Error('Local storage readback did not match written content.');
    }

    await rm(smokeFile, { force: true });
}

async function checkApp(): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const healthUrl = new URL('/api/health', appUrl);
    const response = await fetch(healthUrl);

    if (!response.ok) {
        throw new Error(`App health returned HTTP ${response.status}.`);
    }

    const body = await response.json() as { status?: string };
    if (body.status === 'unhealthy') {
        throw new Error(`App health status is ${body.status ?? 'unknown'}.`);
    }

    if (body.status !== 'healthy' && body.status !== 'degraded') {
        throw new Error(`App health status is ${body.status ?? 'unknown'}.`);
    }
}

function checkWorker(name: string, entrypoint: string): void {
    const result = spawnSync(process.execPath, [tsxCliPath(), entrypoint], {
        cwd: process.cwd(),
        env: childEnv({
            SITEWISE_WORKER_SMOKE: '1',
        }),
        encoding: 'utf8',
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
        throw new Error(`${name} failed to load. ${output}`);
    }
}

async function runCheck(results: CheckResult[], name: string, fn: () => Promise<void> | void): Promise<void> {
    try {
        await fn();
        results.push({ name, ok: true });
    } catch (error) {
        results.push({
            name,
            ok: false,
            detail: error instanceof Error ? error.message : String(error),
        });
    }
}

async function main(): Promise<void> {
    const results: CheckResult[] = [];

    await runCheck(results, 'PostgreSQL connection', () => withPool((pool) => pool.query('SELECT 1').then(() => undefined)));
    await runCheck(results, 'pgvector extension', checkPgvector);
    await runCheck(results, 'main schema', () => checkTable('projects'));
    await runCheck(results, 'auth schema', () => checkTable('user'));
    await runCheck(results, 'RAG schema', () => checkTable('document_chunks'));
    await runCheck(results, 'Redis connection', checkRedis);
    await runCheck(results, 'local file storage', checkLocalStorage);
    await runCheck(results, 'document worker env', () => checkWorker('document worker', 'workers/document-processor/index.ts'));
    await runCheck(results, 'drawing worker env', () => checkWorker('drawing worker', 'workers/drawing-extractor/index.ts'));
    await runCheck(results, 'app health endpoint', checkApp);

    for (const result of results) {
        const status = result.ok ? 'ok' : 'failed';
        console.log(`${status.padEnd(7)} ${result.name}${result.detail ? ` - ${result.detail}` : ''}`);
    }

    if (results.some((result) => !result.ok)) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
