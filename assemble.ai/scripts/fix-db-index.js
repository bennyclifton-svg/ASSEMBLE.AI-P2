const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../sqlite.db');
const db = new Database(dbPath);

console.log('Dropping index gis_cache_address_unique if exists...');
try {
    db.prepare('DROP INDEX IF EXISTS gis_cache_address_unique').run();
    console.log('Success (or index did not exist).');
} catch (error) {
    console.error('Error dropping index:', error);
}
