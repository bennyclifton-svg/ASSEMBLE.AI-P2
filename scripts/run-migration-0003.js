const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./sqlite.db');

// Read the migration file
const migrationSQL = fs.readFileSync(
  path.join(__dirname, '..', 'drizzle', '0003_tranquil_archangel.sql'),
  'utf8'
);

// Split by statement breakpoint and execute each statement
const statements = migrationSQL
  .split('--> statement-breakpoint')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Applying migration 0003_tranquil_archangel.sql...`);
console.log(`Found ${statements.length} statements to execute.`);

try {
  statements.forEach((statement, index) => {
    console.log(`\nExecuting statement ${index + 1}/${statements.length}...`);
    try {
      db.exec(statement);
      console.log(`✓ Statement ${index + 1} executed successfully`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`⚠ Table already exists, skipping statement ${index + 1}`);
      } else {
        throw err;
      }
    }
  });

  console.log('\n✓ Migration completed successfully!');
} catch (error) {
  console.error('\n✗ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
