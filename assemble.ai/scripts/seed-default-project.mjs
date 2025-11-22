import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '.data', 'sqlite.db');
const db = new Database(dbPath);

try {
    // Insert default project
    const stmt = db.prepare(`
    INSERT OR IGNORE INTO projects (id, name, code, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    const now = new Date().toISOString();
    stmt.run('default-project', 'Default Project', 'DEFAULT', 'active', now, now);

    console.log('✅ Default project seeded successfully');
} catch (error) {
    console.error('❌ Error seeding default project:', error);
} finally {
    db.close();
}
