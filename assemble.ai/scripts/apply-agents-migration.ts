/**
 * Apply drizzle-pg/0039_agents_chat_tables.sql directly via the same
 * node-postgres connection the app uses.
 *
 * Why not `npm run db:push`? The drizzle.pg.config.ts only sees
 * pg-schema.ts, so drizzle-kit gets confused by the auth/rag tables in
 * the same database and tries to rename or drop them. This script
 * sidesteps that by applying the explicit SQL file.
 *
 * Usage:
 *   npx tsx scripts/apply-agents-migration.ts
 *
 * Idempotent — uses CREATE TABLE IF NOT EXISTS, safe to re-run.
 */

import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

const url = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
if (!url) {
    console.error('DATABASE_URL or SUPABASE_POSTGRES_URL must be set.');
    process.exit(1);
}

const SQL_PATH = resolve(process.cwd(), 'drizzle-pg/0039_agents_chat_tables.sql');

async function main() {
    const sql = readFileSync(SQL_PATH, 'utf8');
    const pool = new Pool({
        connectionString: url,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log(`Applying ${SQL_PATH}…`);
        await pool.query(sql);
        const tables = await pool.query(
            `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN
             ('chat_threads','chat_messages','agent_runs','tool_calls')
             ORDER BY tablename`
        );
        console.log('Tables present:');
        for (const r of tables.rows) console.log(`  ✓ ${r.tablename}`);
        if (tables.rowCount !== 4) {
            console.warn(`Expected 4 tables, got ${tables.rowCount}. Re-run if needed.`);
            process.exit(1);
        }
        console.log('Done.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
