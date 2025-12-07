const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('sqlite.db');

const seedFile = path.join(__dirname, '../drizzle/seed-planning-data.sql');
const sql = fs.readFileSync(seedFile, 'utf8');

try {
    db.exec(sql);
    console.log('Successfully seeded planning data!');
} catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
}
