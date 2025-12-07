const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database is at project root
const dbPath = path.join(__dirname, '..', 'sqlite.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Read and execute migration
const migrationPath = path.join(__dirname, '..', 'drizzle', '0009_fee_price_items.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Split by semicolon for statements
const statements = migrationSQL
    .split(';')
    .map(s => s.replace(/--.*$/gm, '').trim())
    .filter(s => s.length > 0);

console.log(`Running Fee/Price Items migration with ${statements.length} statements...`);

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

    console.log('\n✅ Fee/Price Items migration completed successfully!');

    // Verify the new tables
    const tables = ['discipline_fee_items', 'trade_price_items'];

    console.log('\n--- Verifying created tables ---');
    tables.forEach(tableName => {
        try {
            const info = db.prepare(`PRAGMA table_info('${tableName}')`).all();
            if (info.length > 0) {
                console.log(`\n✓ ${tableName} (${info.length} columns)`);
                info.forEach(col => {
                    console.log(`    - ${col.name}: ${col.type || 'TEXT'}${col.notnull ? ' NOT NULL' : ''}`);
                });
            } else {
                console.log(`✗ ${tableName} - not found`);
            }
        } catch (err) {
            console.log(`✗ ${tableName} - error: ${err.message}`);
        }
    });

} catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
