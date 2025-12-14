const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
console.log('Database path:', dbPath);

try {
    const db = new Database(dbPath);

    // Get all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log('\nExisting tables:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });

    // Check for trr and addenda
    const trrTable = tables.find(t => t.name === 'trr');
    const addendaTable = tables.find(t => t.name === 'addenda');

    console.log('\ntrr table exists:', !!trrTable);
    console.log('addenda table exists:', !!addendaTable);

    if (addendaTable) {
        const addendaColumns = db.prepare("PRAGMA table_info(addenda)").all();
        console.log('\naddenda columns:');
        addendaColumns.forEach(c => console.log('  -', c.name, c.type));
    }

    if (trrTable) {
        const trrColumns = db.prepare("PRAGMA table_info(trr)").all();
        console.log('\ntrr columns:');
        trrColumns.forEach(c => console.log('  -', c.name, c.type));
    }

    db.close();
} catch (error) {
    console.error('Error:', error.message);
}