import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'sqlite.db');
console.log('Opening DB at:', dbPath);

const db = new Database(dbPath);

const migrations = [
    {
        table: 'consultant_disciplines',
        column: 'brief_deliverables',
        sql: 'ALTER TABLE consultant_disciplines ADD COLUMN brief_deliverables text'
    },
    {
        table: 'contractor_trades',
        column: 'scope_deliverables',
        sql: 'ALTER TABLE contractor_trades ADD COLUMN scope_deliverables text'
    }
];

migrations.forEach(mig => {
    try {
        const info = db.pragma(`table_info(${mig.table})`) as any[];
        const exists = info.some(col => col.name === mig.column);

        if (!exists) {
            console.log(`Adding ${mig.column} to ${mig.table}...`);
            db.prepare(mig.sql).run();
            console.log('Success.');
        } else {
            console.log(`${mig.column} already exists in ${mig.table}.`);
        }
    } catch (e: any) {
        console.error(`Error processing ${mig.table}.${mig.column}:`, e.message);
    }
});

console.log('Schema update complete.');
