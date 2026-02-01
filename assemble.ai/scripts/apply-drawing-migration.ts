import Database from 'better-sqlite3';

const db = new Database('sqlite.db');

console.log('Checking current columns...');
const info = db.prepare('PRAGMA table_info(file_assets)').all() as { name: string }[];
console.log('Current columns:', info.map(c => c.name));

const columnNames = new Set(info.map(c => c.name));

const columnsToAdd = [
  { name: 'drawing_number', sql: 'ALTER TABLE file_assets ADD COLUMN drawing_number TEXT' },
  { name: 'drawing_name', sql: 'ALTER TABLE file_assets ADD COLUMN drawing_name TEXT' },
  { name: 'drawing_revision', sql: 'ALTER TABLE file_assets ADD COLUMN drawing_revision TEXT' },
  { name: 'drawing_extraction_status', sql: "ALTER TABLE file_assets ADD COLUMN drawing_extraction_status TEXT DEFAULT 'PENDING'" },
  { name: 'drawing_extraction_confidence', sql: 'ALTER TABLE file_assets ADD COLUMN drawing_extraction_confidence INTEGER' },
];

for (const col of columnsToAdd) {
  if (!columnNames.has(col.name)) {
    console.log(`Adding column: ${col.name}`);
    try {
      db.exec(col.sql);
      console.log(`  ✓ Added ${col.name}`);
    } catch (err) {
      console.error(`  ✗ Failed to add ${col.name}:`, (err as Error).message);
    }
  } else {
    console.log(`Column ${col.name} already exists`);
  }
}

// Check projects table
console.log('\nChecking projects table...');
const projectInfo = db.prepare('PRAGMA table_info(projects)').all() as { name: string }[];
const projectColumns = new Set(projectInfo.map(c => c.name));

if (!projectColumns.has('drawing_extraction_enabled')) {
  console.log('Adding drawing_extraction_enabled to projects...');
  try {
    db.exec('ALTER TABLE projects ADD COLUMN drawing_extraction_enabled INTEGER DEFAULT 1');
    console.log('  ✓ Added drawing_extraction_enabled');
  } catch (err) {
    console.error('  ✗ Failed:', (err as Error).message);
  }
} else {
  console.log('Column drawing_extraction_enabled already exists');
}

// Create indexes
console.log('\nCreating indexes...');
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_file_assets_drawing_number ON file_assets(drawing_number)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_file_assets_extraction_status ON file_assets(drawing_extraction_status)');
  console.log('  ✓ Indexes created');
} catch (err) {
  console.error('  ✗ Index creation failed:', (err as Error).message);
}

// Verify
console.log('\nVerifying columns after migration:');
const finalInfo = db.prepare('PRAGMA table_info(file_assets)').all() as { name: string }[];
console.log('Final columns:', finalInfo.map(c => c.name));

db.close();
console.log('\nMigration complete!');
