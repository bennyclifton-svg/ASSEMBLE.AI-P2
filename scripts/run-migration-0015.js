const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('sqlite.db');

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'drizzle', '0015_addendum.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Remove comment lines and split by semicolon
const cleanedSQL = migrationSQL
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

const statements = cleanedSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

console.log(`Running migration: ${path.basename(migrationPath)}`);
console.log(`Found ${statements.length} statements to execute`);

try {
    db.pragma('foreign_keys = OFF');
    db.exec('BEGIN TRANSACTION');

    statements.forEach((statement, index) => {
        console.log(`\nExecuting statement ${index + 1}/${statements.length}...`);
        console.log(statement.substring(0, 80) + (statement.length > 80 ? '...' : ''));
        db.exec(statement);
    });

    db.exec('COMMIT');
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
