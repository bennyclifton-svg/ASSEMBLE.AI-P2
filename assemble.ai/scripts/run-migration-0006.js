const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database is at project root
const dbPath = path.join(__dirname, '..', 'sqlite.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Read and execute migration
const migrationPath = path.join(__dirname, '..', 'drizzle', '0006_remove_document_fk_constraints.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Split by statement breakpoint
const statements = migrationSQL
    .split('--> statement-breakpoint')
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
        console.log(statements[i].substring(0, 100) + '...');
        db.exec(statements[i]);
        console.log('✓ Success');
    }

    // Commit transaction
    db.exec('COMMIT');

    // Re-enable foreign key checks
    db.pragma('foreign_keys = ON');

    console.log('\n✅ Migration completed successfully!');

    // Verify the table structure
    const tableInfo = db.prepare("PRAGMA table_info('documents')").all();
    console.log('\nNew documents table structure:');
    tableInfo.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });

    // Check foreign keys
    const fkInfo = db.prepare("PRAGMA foreign_key_list('documents')").all();
    console.log('\nForeign keys on documents table:');
    if (fkInfo.length === 0) {
        console.log('  (none - category_id and subcategory_id FK constraints removed)');
    } else {
        fkInfo.forEach(fk => {
            console.log(`  - ${fk.from} -> ${fk.table}(${fk.to})`);
        });
    }

} catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
