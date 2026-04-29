/**
 * Apply drizzle-pg/0041_objectives_row_model.sql directly via the same
 * node-postgres connection the app uses.
 *
 * Why not `npm run db:push`? drizzle-kit reads pg-schema.ts and gets confused
 * by the auth/rag tables in the same database. This script applies the
 * explicit SQL file with idempotent guards so it is safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/apply-objectives-migration.ts
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

const SQL_PATH = resolve(process.cwd(), 'drizzle-pg/0041_objectives_row_model.sql');

async function main() {
    const sql = readFileSync(SQL_PATH, 'utf8');
    const pool = new Pool({
        connectionString: url,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log(`Applying ${SQL_PATH}…`);
        await pool.query(sql);

        const cols = await pool.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema='public' AND table_name='project_objectives'
             ORDER BY ordinal_position`,
        );
        const expected = [
            'id', 'project_id', 'objective_type', 'source', 'text', 'text_polished',
            'category', 'status', 'is_deleted', 'sort_order', 'rule_id', 'confidence',
            'created_at', 'updated_at',
        ];
        const actual = cols.rows.map((r) => r.column_name);
        const missing = expected.filter((c) => !actual.includes(c));
        const unexpected = actual.filter((c) => !expected.includes(c));

        console.log('project_objectives columns:');
        for (const c of actual) console.log(`  ✓ ${c}`);
        if (missing.length) console.error(`Missing: ${missing.join(', ')}`);
        if (unexpected.length) console.warn(`Unexpected: ${unexpected.join(', ')}`);

        const qa = await pool.query(
            `SELECT to_regclass('public.project_question_answers') AS reg`,
        );
        console.log(`project_question_answers: ${qa.rows[0].reg ?? 'MISSING'}`);

        const sess = await pool.query(
            `SELECT to_regclass('public.objective_generation_sessions') AS reg`,
        );
        console.log(`objective_generation_sessions: ${sess.rows[0].reg ?? 'MISSING'}`);

        if (missing.length) process.exit(1);
        console.log('Done.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
