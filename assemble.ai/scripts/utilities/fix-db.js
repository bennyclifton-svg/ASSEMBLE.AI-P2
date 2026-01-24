const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'local.db');
console.log('Fixing database...');

try {
    const db = new Database(dbPath);

    // Check if __new_documents exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('documents', '__new_documents')").all();
    console.log('Found tables:', tables.map(t => t.name));

    if (tables.some(t => t.name === '__new_documents')) {
        // Rename __new_documents to documents
        console.log('Renaming __new_documents to documents...');
        db.exec('ALTER TABLE `__new_documents` RENAME TO `documents`');
        console.log('Table renamed successfully!');
    }

    // Verify
    const tablesAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log('\nAll tables after fix:');
    tablesAfter.forEach(table => {
        console.log(`  - ${table.name}`);
    });

    // Check documents table structure
    if (tablesAfter.some(t => t.name === 'documents')) {
        const tableInfo = db.prepare("PRAGMA table_info(documents)").all();
        console.log('\nDocuments table structure:');
        tableInfo.forEach(col => {
            console.log(`  ${col.name}: ${col.type}`);
        });

        // Check foreign keys
        const foreignKeys = db.prepare("PRAGMA foreign_key_list(documents)").all();
        console.log('\nForeign keys on documents table:');
        if (foreignKeys.length === 0) {
            console.log('  No foreign keys (good!)');
        } else {
            foreignKeys.forEach(fk => {
                console.log(`  ${fk.from} -> ${fk.table}.${fk.to}`);
            });
        }
    }

    db.close();
} catch (error) {
    console.error('Error:', error.message);
}