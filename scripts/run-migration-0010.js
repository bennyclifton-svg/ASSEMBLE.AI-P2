const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database is at project root
const dbPath = path.join(__dirname, '..', 'sqlite.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Read and execute migration
const migrationPath = path.join(__dirname, '..', 'drizzle', '0010_invoice_file_asset.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Split by semicolon for statements
const statements = migrationSQL
    .split(';')
    .map(s => s.replace(/--.*$/gm, '').trim())
    .filter(s => s.length > 0);

console.log(`Running Invoice File Asset migration with ${statements.length} statements...`);

try {
    // Disable foreign key checks during migration
    db.pragma('foreign_keys = OFF');

    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    for (let i = 0; i < statements.length; i++) {
        console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
        console.log(statements[i].substring(0, 100) + '...');
        try {
            db.exec(statements[i]);
            console.log('✓ Success');
        } catch (err) {
            // Handle common SQLite migration issues
            if (err.message.includes('duplicate column name')) {
                console.log('⚠ Column already exists, skipping');
            } else if (err.message.includes('already exists')) {
                console.log('⚠ Table/index already exists, skipping');
            } else {
                throw err;
            }
        }
    }

    // Commit transaction
    db.exec('COMMIT');

    // Re-enable foreign key checks
    db.pragma('foreign_keys = ON');

    console.log('\n✅ Invoice File Asset migration completed successfully!');

    // Verify the column was added
    console.log('\n--- Verifying invoices table ---');
    const info = db.prepare("PRAGMA table_info('invoices')").all();
    console.log(`\n✓ invoices (${info.length} columns)`);
    info.forEach(col => {
        console.log(`    - ${col.name}: ${col.type || 'TEXT'}${col.notnull ? ' NOT NULL' : ''}`);
    });

    // Check for file_asset_id specifically
    const hasFileAssetId = info.some(col => col.name === 'file_asset_id');
    console.log(`\n${hasFileAssetId ? '✓' : '✗'} file_asset_id column ${hasFileAssetId ? 'exists' : 'not found'}`);

} catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
