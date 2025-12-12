/**
 * Migration Runner: 0019 - Update RFT NEW schema
 * Feature: 004-procurement-rft-new
 *
 * This script updates the rft_new table to remove rft_number
 * and add UNIQUE constraints for single report per discipline/trade.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'assemble.db');
const migrationPath = path.join(__dirname, '..', 'drizzle', '0019_rft_new_update.sql');

console.log('🔧 Running Migration 0019: Update RFT NEW schema');
console.log('Database:', dbPath);
console.log('Migration:', migrationPath);

try {
    // Read the migration SQL
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Open database connection
    const db = new Database(dbPath);

    // Execute migration
    db.exec(sql);

    // Verify tables were created
    const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND (name='rft_new' OR name='rft_new_transmittals')
    `).all();

    console.log('\n✅ Migration completed successfully!');
    console.log('Tables updated:', tables.map(t => t.name).join(', '));

    // Show table structure
    console.log('\n📋 Updated RFT NEW table structure:');
    const rftNewInfo = db.prepare(`PRAGMA table_info(rft_new)`).all();
    console.table(rftNewInfo);

    console.log('\n📋 RFT NEW Transmittals table structure:');
    const transmittalsInfo = db.prepare(`PRAGMA table_info(rft_new_transmittals)`).all();
    console.table(transmittalsInfo);

    // Show indexes
    console.log('\n🔍 Indexes:');
    const indexes = db.prepare(`
        SELECT name, tbl_name, sql FROM sqlite_master
        WHERE type='index' AND (tbl_name='rft_new' OR tbl_name='rft_new_transmittals')
        AND name NOT LIKE 'sqlite_%'
    `).all();
    console.table(indexes);

    db.close();
    console.log('\n✨ Database connection closed');

} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
}
