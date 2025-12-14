/**
 * Migration script for 0022_trr.sql
 * Creates TRR (Tender Recommendation Report) tables
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'sqlite.db');
const MIGRATION_PATH = path.join(__dirname, '..', 'drizzle', '0022_trr.sql');

console.log('Running migration 0022_trr.sql...');
console.log('Database path:', DB_PATH);

try {
    const db = new Database(DB_PATH);

    // Read migration SQL
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

    // Execute migration
    db.exec(sql);

    console.log('Migration 0022_trr.sql completed successfully!');

    // Verify tables were created
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('trr', 'trr_transmittals')").all();
    console.log('Created tables:', tables.map(t => t.name).join(', '));

    db.close();
} catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
}
