/**
 * Migration 0016: Add trade_id to cost_lines table
 * Feature 006 - Cost Planning: Support both disciplines and trades
 *
 * This migration adds the trade_id column to link cost lines to contractor trades.
 * This allows CONSTRUCTION section cost lines to reference trades while
 * CONSULTANTS section cost lines reference disciplines.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Starting migration 0016: Add trade_id to cost_lines...\n');

try {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info('cost_lines')").all();
    const hasTradeId = tableInfo.some(col => col.name === 'trade_id');

    if (hasTradeId) {
        console.log('Column trade_id already exists in cost_lines table. Skipping migration.');
    } else {
        // Add trade_id column to cost_lines table
        db.exec(`
            ALTER TABLE cost_lines ADD COLUMN trade_id TEXT REFERENCES contractor_trades(id);
        `);
        console.log('✓ Added trade_id column to cost_lines table');

        // Create index for trade lookups
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_cost_lines_trade ON cost_lines(trade_id) WHERE deleted_at IS NULL;
        `);
        console.log('✓ Created index idx_cost_lines_trade');
    }

    // Show current state
    const costLineCount = db.prepare("SELECT COUNT(*) as count FROM cost_lines WHERE deleted_at IS NULL").get();
    const linesWithDiscipline = db.prepare("SELECT COUNT(*) as count FROM cost_lines WHERE discipline_id IS NOT NULL AND deleted_at IS NULL").get();
    const linesWithTrade = db.prepare("SELECT COUNT(*) as count FROM cost_lines WHERE trade_id IS NOT NULL AND deleted_at IS NULL").get();

    console.log('\n=== Migration Summary ===');
    console.log(`Total cost lines: ${costLineCount.count}`);
    console.log(`Lines with discipline: ${linesWithDiscipline.count}`);
    console.log(`Lines with trade: ${linesWithTrade.count}`);

    // Show table structure
    const newTableInfo = db.prepare("PRAGMA table_info('cost_lines')").all();
    console.log('\nUpdated cost_lines columns:');
    newTableInfo.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });

    console.log('\n✓ Migration 0016 completed successfully');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
} finally {
    db.close();
}
