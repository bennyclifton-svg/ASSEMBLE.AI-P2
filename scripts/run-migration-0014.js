/**
 * Migration 0014: Add discipline_id to cost_lines table
 * Feature 006 - Cost Planning: Use Discipline instead of Company
 *
 * This migration adds the discipline_id column to link cost lines to disciplines.
 * The company_id column is left in place for backwards compatibility.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Starting migration 0014: Add discipline_id to cost_lines...\n');

try {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info('cost_lines')").all();
    const hasDisciplineId = tableInfo.some(col => col.name === 'discipline_id');

    if (hasDisciplineId) {
        console.log('Column discipline_id already exists in cost_lines table. Skipping migration.');
    } else {
        // Add discipline_id column to cost_lines table
        db.exec(`
            ALTER TABLE cost_lines ADD COLUMN discipline_id TEXT REFERENCES consultant_disciplines(id);
        `);
        console.log('✓ Added discipline_id column to cost_lines table');

        // Create index for discipline lookups
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_cost_lines_discipline ON cost_lines(discipline_id) WHERE deleted_at IS NULL;
        `);
        console.log('✓ Created index idx_cost_lines_discipline');
    }

    // Show current state
    const costLineCount = db.prepare("SELECT COUNT(*) as count FROM cost_lines WHERE deleted_at IS NULL").get();
    const linesWithDiscipline = db.prepare("SELECT COUNT(*) as count FROM cost_lines WHERE discipline_id IS NOT NULL AND deleted_at IS NULL").get();

    console.log('\n=== Migration Summary ===');
    console.log(`Total cost lines: ${costLineCount.count}`);
    console.log(`Lines with discipline: ${linesWithDiscipline.count}`);

    // Show table structure
    const newTableInfo = db.prepare("PRAGMA table_info('cost_lines')").all();
    console.log('\nUpdated cost_lines columns:');
    newTableInfo.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });

    console.log('\n✓ Migration 0014 completed successfully');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
} finally {
    db.close();
}
