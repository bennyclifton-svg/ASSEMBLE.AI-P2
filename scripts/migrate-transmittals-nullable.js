/**
 * Migration: Make subcategory_id nullable in transmittals table
 * Run with: node scripts/migrate-transmittals-nullable.js
 *
 * SQLite doesn't support ALTER COLUMN, so we need to:
 * 1. Create a new table with nullable subcategory_id
 * 2. Copy data from old table
 * 3. Drop old table
 * 4. Rename new table
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

console.log('Starting migration: Make subcategory_id nullable in transmittals...');

try {
    db.pragma('foreign_keys = OFF');

    // Start transaction
    db.exec('BEGIN TRANSACTION');

    // Create new table with correct schema
    db.exec(`
        CREATE TABLE transmittals_new (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT REFERENCES projects(id),
            subcategory_id TEXT REFERENCES subcategories(id),
            discipline_id TEXT REFERENCES consultant_disciplines(id),
            trade_id TEXT REFERENCES contractor_trades(id),
            name TEXT NOT NULL,
            status TEXT DEFAULT 'DRAFT',
            issued_at TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Copy data from old table
    db.exec(`
        INSERT INTO transmittals_new (id, project_id, subcategory_id, discipline_id, trade_id, name, status, issued_at, updated_at, created_at)
        SELECT id, project_id, subcategory_id, discipline_id, trade_id, name, status, issued_at, updated_at, created_at
        FROM transmittals
    `);

    // Drop old table
    db.exec('DROP TABLE transmittals');

    // Rename new table
    db.exec('ALTER TABLE transmittals_new RENAME TO transmittals');

    // Commit transaction
    db.exec('COMMIT');

    db.pragma('foreign_keys = ON');

    console.log('Migration completed successfully!');
    console.log('subcategory_id is now nullable in the transmittals table.');
} catch (err) {
    db.exec('ROLLBACK');
    db.pragma('foreign_keys = ON');
    console.error('Migration failed:', err.message);
    process.exit(1);
} finally {
    db.close();
}
