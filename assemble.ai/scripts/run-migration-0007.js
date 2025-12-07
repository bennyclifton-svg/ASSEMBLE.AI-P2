const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database is at project root
const dbPath = path.join(__dirname, '..', 'sqlite.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Read and execute migration
const migrationPath = path.join(__dirname, '..', 'drizzle', '0007_brief_scope_fields.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Split by semicolon for simple ALTER TABLE statements
const statements = migrationSQL
    .split(';')
    .map(s => s.replace(/--.*$/gm, '').trim())
    .filter(s => s.length > 0);

console.log(`Running migration with ${statements.length} statements...`);

try {
    // Disable foreign key checks during migration
    db.pragma('foreign_keys = OFF');

    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    for (let i = 0; i < statements.length; i++) {
        console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
        console.log(statements[i]);
        try {
            db.exec(statements[i]);
            console.log('✓ Success');
        } catch (err) {
            // SQLite doesn't support IF NOT EXISTS for columns, so check if column exists
            if (err.message.includes('duplicate column name')) {
                console.log('⚠ Column already exists, skipping');
            } else {
                throw err;
            }
        }
    }

    // Commit transaction
    db.exec('COMMIT');

    // Re-enable foreign key checks
    db.pragma('foreign_keys = ON');

    console.log('\n✅ Migration completed successfully!');

    // Verify the consultant_disciplines table structure
    console.log('\n--- consultant_disciplines table structure ---');
    const disciplineInfo = db.prepare("PRAGMA table_info('consultant_disciplines')").all();
    disciplineInfo.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });

    // Verify the contractor_trades table structure
    console.log('\n--- contractor_trades table structure ---');
    const tradeInfo = db.prepare("PRAGMA table_info('contractor_trades')").all();
    tradeInfo.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });

} catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
