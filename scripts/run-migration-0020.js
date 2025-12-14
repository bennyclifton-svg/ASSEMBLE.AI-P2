/**
 * Migration Script: 0020_evaluation.sql
 * Creates evaluation tables for Feature 011-evaluation-report
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'sqlite.db');
const MIGRATION_PATH = join(__dirname, '..', 'drizzle', '0020_evaluation.sql');

async function runMigration() {
    console.log('🚀 Running migration 0020_evaluation.sql...');
    console.log(`📁 Database path: ${DB_PATH}`);
    console.log(`📄 Migration path: ${MIGRATION_PATH}`);

    try {
        const db = new Database(DB_PATH);

        // Read and execute migration as a single batch
        const sql = readFileSync(MIGRATION_PATH, 'utf-8');

        console.log(`\n📝 Executing migration SQL...`);

        // Execute all SQL at once to maintain proper order
        db.exec(sql);

        // Verify tables were created
        const tables = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('evaluations', 'evaluation_rows', 'evaluation_cells')
        `).all();

        console.log(`\n✅ Migration complete! Created tables: ${tables.map(t => t.name).join(', ')}`);

        db.close();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
