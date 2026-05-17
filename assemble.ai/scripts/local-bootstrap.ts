import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { loadAppEnv } from '../src/lib/env/load-app-env';

loadAppEnv();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function npmCommand(): string {
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
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

    let host = '';
    try {
        host = new URL(rawUrl).hostname;
    } catch {
        throw new Error(`${label} is not a valid URL.`);
    }

    if (!LOCAL_HOSTS.has(host)) {
        throw new Error(
            `${label} points at "${host}". Local bootstrap refuses remote services. ` +
            'Use localhost defaults or set SITEWISE_ALLOW_REMOTE_BOOTSTRAP=1 intentionally.'
        );
    }
}

function runNpmScript(script: string, extraEnv: NodeJS.ProcessEnv = {}): void {
    const result = spawnSync(npmCommand(), ['run', script], {
        cwd: process.cwd(),
        env: childEnv(extraEnv),
        shell: process.platform === 'win32',
        stdio: 'inherit',
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`npm run ${script} failed.`);
    }
}

async function waitFor(label: string, probe: () => Promise<void>, timeoutMs = 60_000): Promise<void> {
    const startedAt = Date.now();
    let lastError: unknown;

    while (Date.now() - startedAt < timeoutMs) {
        try {
            await probe();
            return;
        } catch (error) {
            lastError = error;
            await sleep(1_000);
        }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`${label} did not become ready within ${timeoutMs / 1000}s. Last error: ${message}`);
}

async function isReady(probe: () => Promise<void>): Promise<boolean> {
    try {
        await probe();
        return true;
    } catch {
        return false;
    }
}

async function checkPostgres(databaseUrl: string): Promise<void> {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
        await pool.query('SELECT 1');
    } finally {
        await pool.end();
    }
}

async function ensureVectorExtension(databaseUrl: string): Promise<void> {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    } finally {
        await pool.end();
    }
}

async function preserveLegacyRagReportSections(databaseUrl: string): Promise<void> {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
        const result = await pool.query(`
            SELECT
                EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'report_sections'
                      AND column_name = 'section_index'
                ) AS has_legacy_rag_column,
                EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'report_sections'
                      AND column_name = 'section_key'
                ) AS has_main_report_column,
                to_regclass('public.legacy_rag_report_sections') IS NOT NULL AS legacy_name_taken
        `);

        const row = result.rows[0];
        if (row?.has_legacy_rag_column && !row?.has_main_report_column) {
            const targetName = row.legacy_name_taken
                ? `legacy_rag_report_sections_${Date.now()}`
                : 'legacy_rag_report_sections';

            await pool.query(`ALTER TABLE report_sections RENAME TO ${targetName}`);
            console.log(`Renamed old RAG-shaped report_sections table to ${targetName}.`);
        }
    } finally {
        await pool.end();
    }
}

async function checkRedis(redisUrl: string): Promise<void> {
    const redis = new IORedis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    });

    try {
        await redis.connect();
        await redis.ping();
    } finally {
        await redis.quit();
    }
}

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
    const redisUrl = process.env.REDIS_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL or SUPABASE_POSTGRES_URL is required for local bootstrap.');
    }
    if (!redisUrl) {
        throw new Error('REDIS_URL is required for local bootstrap.');
    }

    assertLocalUrl('DATABASE_URL', databaseUrl);
    assertLocalUrl('REDIS_URL', redisUrl);

    await mkdir('uploads', { recursive: true });

    const postgresReady = await isReady(() => checkPostgres(databaseUrl));
    const redisReady = await isReady(() => checkRedis(redisUrl));

    if (!postgresReady || !redisReady) {
        runNpmScript('db:up');
    } else {
        console.log('PostgreSQL and Redis are already reachable; skipping docker-compose startup.');
    }

    await waitFor('PostgreSQL', () => checkPostgres(databaseUrl));
    await ensureVectorExtension(databaseUrl);
    await preserveLegacyRagReportSections(databaseUrl);
    await waitFor('Redis', () => checkRedis(redisUrl));

    runNpmScript('db:push', { DRIZZLE_STRICT: 'false' });
    runNpmScript('db:objectives:push');
    runNpmScript('db:auth:push', { DRIZZLE_STRICT: 'false' });
    runNpmScript('db:rag:push');

    console.log('Local bootstrap complete. Start the app with npm run dev, then run npm run local:smoke.');
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
