const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'local.db');
const migrationPath = path.join(__dirname, '..', 'drizzle', '0004_wandering_alex_wilder.sql');

console.log('Running migration 0004_wandering_alex_wilder.sql...');
console.log('Database path:', dbPath);
console.log('Migration path:', migrationPath);

try {
    const db = new Database(dbPath);

    // Read the migration file
    const migration = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement-breakpoint and execute each statement
    const statements = migration.split('--> statement-breakpoint');

    for (const statement of statements) {
        const sql = statement.trim();
        if (sql) {
            console.log('Executing:', sql.substring(0, 50) + '...');
            db.exec(sql);
        }
    }

    console.log('Migration completed successfully!');

    // Verify the changes
    const tableInfo = db.prepare("PRAGMA table_info(documents)").all();
    console.log('\nDocuments table structure after migration:');
    tableInfo.forEach(col => {
        console.log(`  ${col.name}: ${col.type} (nullable: ${col.notnull === 0 ? 'yes' : 'no'})`);
    });

    // Check foreign keys
    const foreignKeys = db.prepare("PRAGMA foreign_key_list(documents)").all();
    console.log('\nForeign keys on documents table:');
    if (foreignKeys.length === 0) {
        console.log('  No foreign keys on category_id or subcategory_id (as expected)');
    } else {
        foreignKeys.forEach(fk => {
            console.log(`  ${fk.from} -> ${fk.table}.${fk.to}`);
        });
    }

    db.close();
} catch (error) {
    console.error('Error running migration:', error.message);
    process.exit(1);
}