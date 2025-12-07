/**
 * Migration: PC_ITEMS → CONSTRUCTION Section Rename
 * Feature 009 - Default Financial Data
 *
 * SQLite doesn't support ALTER TABLE for CHECK constraints, so we need to:
 * 1. Create a new table with the updated CHECK constraint
 * 2. Copy data, transforming PC_ITEMS to CONSTRUCTION
 * 3. Drop the old table
 * 4. Rename the new table
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'sqlite.db');

function runMigration() {
    console.log('Running migration: PC_ITEMS → CONSTRUCTION...');
    console.log(`Database path: ${DB_PATH}`);

    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
        console.log('Database does not exist yet. Skipping migration.');
        console.log('Migration will be applied when database is created.');
        return;
    }

    const db = new Database(DB_PATH);

    try {
        // Check how many rows need updating
        const countBefore = db.prepare(`
            SELECT COUNT(*) as count FROM cost_lines WHERE section = 'PC_ITEMS'
        `).get();

        console.log(`Found ${countBefore.count} rows with section = 'PC_ITEMS'`);

        // Check if migration is needed (either rows to update OR old constraint still exists)
        const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='cost_lines'`).get();
        const hasOldConstraint = tableInfo && tableInfo.sql.includes('PC_ITEMS');

        if (countBefore.count === 0 && !hasOldConstraint) {
            console.log('No rows to update and constraint already updated. Migration complete.');
            db.close();
            return;
        }

        console.log('Recreating table with updated CHECK constraint...');

        // Disable foreign key checks during migration
        db.exec('PRAGMA foreign_keys = OFF');

        // Run in a transaction for atomicity
        db.exec('BEGIN TRANSACTION');

        try {
            // Step 1: Create new table with updated CHECK constraint
            db.exec(`
                CREATE TABLE IF NOT EXISTS cost_lines_new (
                    id TEXT PRIMARY KEY NOT NULL,
                    project_id TEXT NOT NULL REFERENCES projects(id),
                    company_id TEXT REFERENCES companies(id),
                    section TEXT NOT NULL CHECK(section IN ('FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY')),
                    cost_code TEXT,
                    description TEXT NOT NULL,
                    reference TEXT,
                    budget_cents INTEGER DEFAULT 0,
                    approved_contract_cents INTEGER DEFAULT 0,
                    sort_order INTEGER NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TEXT
                )
            `);

            // Step 2: Copy data, transforming PC_ITEMS to CONSTRUCTION
            db.exec(`
                INSERT INTO cost_lines_new (
                    id, project_id, company_id, section, cost_code, description, reference,
                    budget_cents, approved_contract_cents, sort_order, created_at, updated_at, deleted_at
                )
                SELECT
                    id, project_id, company_id,
                    CASE WHEN section = 'PC_ITEMS' THEN 'CONSTRUCTION' ELSE section END,
                    cost_code, description, reference,
                    budget_cents, approved_contract_cents, sort_order, created_at, updated_at, deleted_at
                FROM cost_lines
            `);

            // Step 3: Drop old table
            db.exec('DROP TABLE cost_lines');

            // Step 4: Rename new table
            db.exec('ALTER TABLE cost_lines_new RENAME TO cost_lines');

            // Step 5: Recreate indexes
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_cost_lines_project ON cost_lines(project_id) WHERE deleted_at IS NULL;
                CREATE INDEX IF NOT EXISTS idx_cost_lines_section ON cost_lines(project_id, section, sort_order);
            `);

            db.exec('COMMIT');

            // Re-enable foreign key checks
            db.exec('PRAGMA foreign_keys = ON');

            // Verify the migration
            const countAfter = db.prepare(`
                SELECT COUNT(*) as count FROM cost_lines WHERE section = 'PC_ITEMS'
            `).get();

            const countConstruction = db.prepare(`
                SELECT COUNT(*) as count FROM cost_lines WHERE section = 'CONSTRUCTION'
            `).get();

            if (countAfter.count === 0) {
                console.log(`✅ Migration complete: ${countConstruction.count} CONSTRUCTION rows`);
                console.log('CHECK constraint updated to use CONSTRUCTION');
            } else {
                console.error(`⚠️ Warning: ${countAfter.count} rows still have PC_ITEMS`);
            }

        } catch (err) {
            db.exec('ROLLBACK');
            throw err;
        }

        db.close();
    } catch (error) {
        console.error('Migration failed:', error.message);
        try { db.close(); } catch (e) {}
        process.exit(1);
    }
}

runMigration();
