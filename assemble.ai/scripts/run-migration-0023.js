/**
 * Migration script for 0023_rft_addendum_dates.sql
 * Adds date fields to RFT NEW and Addenda tables
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'sqlite.db');
const MIGRATION_PATH = path.join(__dirname, '..', 'drizzle', '0023_rft_addendum_dates.sql');

console.log('Running migration 0023_rft_addendum_dates.sql...');
console.log('Database path:', DB_PATH);

try {
    const db = new Database(DB_PATH);

    // Check if columns already exist
    const rftColumns = db.prepare("PRAGMA table_info(rft_new)").all();
    const addendaColumns = db.prepare("PRAGMA table_info(addenda)").all();

    const hasRftDate = rftColumns.some(col => col.name === 'rft_date');
    const hasAddendumDate = addendaColumns.some(col => col.name === 'addendum_date');

    if (hasRftDate && hasAddendumDate) {
        console.log('Columns already exist, skipping migration.');
        db.close();
        process.exit(0);
    }

    // Add columns if they don't exist
    if (!hasRftDate) {
        db.exec('ALTER TABLE rft_new ADD COLUMN rft_date TEXT');
        console.log('Added rft_date column to rft_new table');
    }

    if (!hasAddendumDate) {
        db.exec('ALTER TABLE addenda ADD COLUMN addendum_date TEXT');
        console.log('Added addendum_date column to addenda table');
    }

    console.log('Migration 0023_rft_addendum_dates.sql completed successfully!');

    db.close();
} catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
}
