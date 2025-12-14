/**
 * Migration Script: 0021_tender_submissions.sql
 * Feature 011 - User Story 7: Full Price Schedule + Merge/Edit
 * Creates tender_submissions table and adds source columns to evaluation_rows
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'sqlite.db');
const MIGRATION_PATH = join(__dirname, '..', 'drizzle', '0021_tender_submissions.sql');

async function runMigration() {
    console.log('🚀 Running migration 0021_tender_submissions.sql...');
    console.log(`📁 Database path: ${DB_PATH}`);
    console.log(`📄 Migration path: ${MIGRATION_PATH}`);

    try {
        const db = new Database(DB_PATH);

        console.log(`\n📝 Executing migration SQL...`);

        // Execute statements manually in the correct order
        const statements = [
            // 1. Create tender_submissions table
            `CREATE TABLE IF NOT EXISTS tender_submissions (
                id TEXT PRIMARY KEY,
                evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
                firm_id TEXT NOT NULL,
                firm_type TEXT NOT NULL CHECK(firm_type IN ('consultant', 'contractor')),
                filename TEXT NOT NULL,
                file_asset_id TEXT REFERENCES file_assets(id),
                parsed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                parser_used TEXT DEFAULT 'claude',
                confidence REAL,
                raw_extracted_items TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            // 2. Create indexes
            `CREATE INDEX IF NOT EXISTS idx_tender_submissions_eval ON tender_submissions(evaluation_id)`,
            `CREATE INDEX IF NOT EXISTS idx_tender_submissions_firm ON tender_submissions(firm_id)`,
            // 3. Add source column to evaluation_rows
            `ALTER TABLE evaluation_rows ADD COLUMN source TEXT DEFAULT 'cost_plan' CHECK(source IN ('cost_plan', 'ai_parsed', 'manual'))`,
            // 4. Add source_submission_id column to evaluation_rows
            `ALTER TABLE evaluation_rows ADD COLUMN source_submission_id TEXT REFERENCES tender_submissions(id)`,
        ];

        for (const statement of statements) {
            try {
                const shortStmt = statement.replace(/\s+/g, ' ').substring(0, 60);
                console.log(`  Executing: ${shortStmt}...`);
                db.exec(statement + ';');
            } catch (stmtError) {
                // Check if it's a "column already exists" or "table already exists" error (idempotent migration)
                if (stmtError.message.includes('duplicate column name') ||
                    stmtError.message.includes('already exists') ||
                    stmtError.message.includes('table tender_submissions already exists')) {
                    console.log(`  ⚠️ Skipping (already exists): ${stmtError.message}`);
                } else {
                    throw stmtError;
                }
            }
        }

        // Verify tender_submissions table was created
        const tables = db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type='table' AND name = 'tender_submissions'
        `).all();

        // Verify new columns exist on evaluation_rows
        const columns = db.prepare(`PRAGMA table_info(evaluation_rows)`).all();
        const columnNames = columns.map(c => c.name);

        console.log(`\n✅ Migration complete!`);
        console.log(`   - tender_submissions table: ${tables.length > 0 ? 'created' : 'already exists'}`);
        console.log(`   - evaluation_rows.source column: ${columnNames.includes('source') ? 'exists' : 'NOT FOUND'}`);
        console.log(`   - evaluation_rows.source_submission_id column: ${columnNames.includes('source_submission_id') ? 'exists' : 'NOT FOUND'}`);

        db.close();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
