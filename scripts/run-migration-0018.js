/**
 * Migration 0018: Rename description to activity in cost_lines
 * Feature 006 - Cost Planning: Improve terminology clarity
 *
 * This migration renames the 'description' column to 'activity' in cost_lines.
 * SQLite doesn't support RENAME COLUMN in all versions, so we recreate the table.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
const migrationPath = path.resolve(__dirname, '..', 'drizzle', '0018_rename_description_to_activity.sql');

console.log('Database path:', dbPath);
console.log('Migration file:', migrationPath);

const db = new Database(dbPath);

console.log('\nStarting migration 0018: Rename description to activity...\n');

try {
    // Check current table structure
    const tableInfo = db.prepare("PRAGMA table_info('cost_lines')").all();
    const hasDescription = tableInfo.some(col => col.name === 'description');
    const hasActivity = tableInfo.some(col => col.name === 'activity');

    if (!hasDescription && hasActivity) {
        console.log('Migration already applied: activity column exists, description column removed.');
        console.log('Skipping migration.');
    } else if (hasDescription && !hasActivity) {
        // Disable foreign keys for table recreation
        db.pragma('foreign_keys = OFF');
        console.log('Foreign keys disabled for table recreation');

        // Read and execute migration SQL
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration SQL...');
        db.exec('BEGIN TRANSACTION;');
        db.exec(migrationSQL);
        db.exec('COMMIT;');

        console.log('✓ Migration executed successfully');

        // Re-enable foreign keys
        db.pragma('foreign_keys = ON');
        console.log('✓ Foreign keys re-enabled');

        // Verify the migration
        const newTableInfo = db.prepare("PRAGMA table_info('cost_lines')").all();
        const verifyHasActivity = newTableInfo.some(col => col.name === 'activity');
        const verifyHasDescription = newTableInfo.some(col => col.name === 'description');

        if (!verifyHasActivity) {
            throw new Error('Migration verification failed: activity column not found');
        }

        if (verifyHasDescription) {
            throw new Error('Migration verification failed: description column still exists');
        }

        console.log('✓ Migration verified: activity column exists, description column removed');

        // Show summary
        const costLineCount = db.prepare("SELECT COUNT(*) as count FROM cost_lines WHERE deleted_at IS NULL").get();

        console.log('\n=== Migration Summary ===');
        console.log(`Total active cost lines: ${costLineCount.count}`);

        // Show table structure
        console.log('\nUpdated cost_lines columns:');
        newTableInfo.forEach(col => {
            console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
        });

        console.log('\n✓ Migration 0018 completed successfully');
    } else {
        throw new Error('Unexpected table state: Check cost_lines table structure manually');
    }
} catch (error) {
    try {
        db.exec('ROLLBACK;');
        console.error('Transaction rolled back');
    } catch (rollbackError) {
        // Rollback may fail if no transaction is active
    }
    console.error('Migration failed:', error);
    process.exit(1);
} finally {
    db.close();
}
