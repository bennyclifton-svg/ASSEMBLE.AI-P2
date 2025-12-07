const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('sqlite.db');

const seedFile = path.join(__dirname, '../drizzle/seed-cost-plan-data.sql');
const sql = fs.readFileSync(seedFile, 'utf8');

try {
    db.exec(sql);
    console.log('Successfully seeded cost plan data!');

    // Verify the data was inserted
    const companies = db.prepare('SELECT COUNT(*) as count FROM companies').get();
    const costLines = db.prepare('SELECT COUNT(*) as count FROM cost_lines WHERE project_id = ?').get('default-project');
    const variations = db.prepare('SELECT COUNT(*) as count FROM variations WHERE project_id = ?').get('default-project');
    const invoices = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE project_id = ?').get('default-project');

    console.log(`\nData summary:`);
    console.log(`- Companies: ${companies.count}`);
    console.log(`- Cost Lines: ${costLines.count}`);
    console.log(`- Variations: ${variations.count}`);
    console.log(`- Invoices: ${invoices.count}`);
} catch (error) {
    console.error('Error seeding cost plan data:', error);
    process.exit(1);
}
