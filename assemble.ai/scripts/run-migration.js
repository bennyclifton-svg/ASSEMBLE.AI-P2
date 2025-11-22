const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('sqlite.db');

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'drizzle', '0002_abnormal_trish_tilby.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split by statement separator and execute each statement
const statements = migrationSQL
    .split('--> statement-breakpoint')
    .map(s => {
        // Remove comment lines but keep SQL
        return s.split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .trim();
    })
    .filter(s => s.length > 0);

console.log(`Running migration: ${path.basename(migrationPath)}`);
console.log(`Found ${statements.length} statements to execute`);

try {
    // Disable foreign keys before transaction
    db.pragma('foreign_keys = OFF');

    db.exec('BEGIN TRANSACTION');

    statements.forEach((statement, index) => {
        // Skip PRAGMA statements as we handle them separately
        if (statement.toUpperCase().includes('PRAGMA')) {
            console.log(`\nSkipping statement ${index + 1}/${statements.length} (handled separately)...`);
            return;
        }

        console.log(`\nExecuting statement ${index + 1}/${statements.length}...`);
        db.exec(statement);
    });

    db.exec('COMMIT');

    // Re-enable foreign keys after transaction
    db.pragma('foreign_keys = ON');

    console.log('\n✓ Migration completed successfully!');
} catch (error) {
    db.exec('ROLLBACK');
    db.pragma('foreign_keys = ON');
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
