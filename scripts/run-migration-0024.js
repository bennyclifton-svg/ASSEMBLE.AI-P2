// Migration script for 0024_non_price_evaluation
// Feature: 013-evaluation-non-price

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
const migrationPath = path.join(__dirname, '..', 'drizzle', '0024_non_price_evaluation.sql');

console.log('Running migration 0024_non_price_evaluation...');
console.log('Database path:', dbPath);

try {
    const db = new Database(dbPath);
    const migration = fs.readFileSync(migrationPath, 'utf-8');

    // Remove line comments first (lines starting with --)
    const withoutLineComments = migration
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

    // Split by semicolon and execute each statement
    const statements = withoutLineComments
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    db.exec('BEGIN TRANSACTION');

    for (const statement of statements) {
        console.log('Executing:', statement.substring(0, 60) + '...');
        db.exec(statement);
    }

    db.exec('COMMIT');

    console.log('Migration 0024_non_price_evaluation completed successfully!');

    // Verify tables exist
    const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE 'evaluation_non_price%'
    `).all();

    console.log('Created tables:', tables.map(t => t.name).join(', '));

    db.close();
} catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
}
