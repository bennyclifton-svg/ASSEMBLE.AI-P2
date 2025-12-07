/**
 * Migration: Add discipline/trade support to transmittals table
 * Run with: node scripts/migrate-transmittals.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

console.log('Starting migration: Add discipline/trade columns to transmittals...');

// Check if columns already exist
const tableInfo = db.pragma('table_info(transmittals)');
const columnNames = tableInfo.map(col => col.name);

const columnsToAdd = [
    { name: 'project_id', sql: "ALTER TABLE transmittals ADD COLUMN project_id TEXT REFERENCES projects(id)" },
    { name: 'discipline_id', sql: "ALTER TABLE transmittals ADD COLUMN discipline_id TEXT REFERENCES consultant_disciplines(id)" },
    { name: 'trade_id', sql: "ALTER TABLE transmittals ADD COLUMN trade_id TEXT REFERENCES contractor_trades(id)" },
];

let addedCount = 0;
for (const col of columnsToAdd) {
    if (!columnNames.includes(col.name)) {
        try {
            db.exec(col.sql);
            console.log(`  Added column: ${col.name}`);
            addedCount++;
        } catch (err) {
            console.error(`  Failed to add column ${col.name}:`, err.message);
        }
    } else {
        console.log(`  Column ${col.name} already exists, skipping`);
    }
}

db.close();

if (addedCount > 0) {
    console.log(`Migration complete. Added ${addedCount} column(s).`);
} else {
    console.log('Migration complete. No changes needed.');
}
