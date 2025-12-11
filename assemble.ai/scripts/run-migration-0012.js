/**
 * Migration 0012: Landing Page Auth & Knowledge Libraries
 * Feature 010 - Landing Page
 *
 * Creates tables for:
 * - organizations (tenants)
 * - users (authentication)
 * - sessions (session management)
 * - login_attempts (rate limiting)
 * - knowledge_libraries (library types per org)
 * - library_documents (documents in libraries)
 * - Adds organization_id to projects table
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'sqlite.db');

function runMigration() {
    console.log('Running migration 0012: Landing Page Auth & Knowledge Libraries...');
    console.log(`Database path: ${DB_PATH}`);

    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
        console.log('Database does not exist yet. Skipping migration.');
        console.log('Migration will be applied when database is created.');
        return;
    }

    const db = new Database(DB_PATH);

    try {
        // Check if migration already applied
        const orgTableExists = db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'
        `).get();

        if (orgTableExists) {
            console.log('organizations table already exists. Migration already applied.');
            db.close();
            return;
        }

        console.log('Creating auth and library tables...');

        db.exec('BEGIN TRANSACTION');

        try {
            // Organizations table
            db.exec(`
                CREATE TABLE organizations (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    default_settings TEXT DEFAULT '{}',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            `);
            console.log('  Created: organizations');

            // Users table
            db.exec(`
                CREATE TABLE users (
                    id TEXT PRIMARY KEY NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    organization_id TEXT REFERENCES organizations(id),
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            `);
            db.exec(`CREATE INDEX idx_users_email ON users(email)`);
            console.log('  Created: users');

            // Sessions table
            db.exec(`
                CREATE TABLE sessions (
                    id TEXT PRIMARY KEY NOT NULL,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash TEXT NOT NULL UNIQUE,
                    expires_at INTEGER NOT NULL,
                    created_at INTEGER NOT NULL
                )
            `);
            db.exec(`CREATE INDEX idx_sessions_token ON sessions(token_hash)`);
            db.exec(`CREATE INDEX idx_sessions_user ON sessions(user_id)`);
            console.log('  Created: sessions');

            // Login attempts table (rate limiting)
            db.exec(`
                CREATE TABLE login_attempts (
                    id TEXT PRIMARY KEY NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    locked_until INTEGER,
                    updated_at INTEGER NOT NULL
                )
            `);
            console.log('  Created: login_attempts');

            // Knowledge libraries table
            db.exec(`
                CREATE TABLE knowledge_libraries (
                    id TEXT PRIMARY KEY NOT NULL,
                    organization_id TEXT NOT NULL REFERENCES organizations(id),
                    type TEXT NOT NULL,
                    document_count INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    UNIQUE(organization_id, type)
                )
            `);
            console.log('  Created: knowledge_libraries');

            // Library documents table
            db.exec(`
                CREATE TABLE library_documents (
                    id TEXT PRIMARY KEY NOT NULL,
                    library_id TEXT NOT NULL REFERENCES knowledge_libraries(id) ON DELETE CASCADE,
                    file_asset_id TEXT NOT NULL REFERENCES file_assets(id),
                    added_at INTEGER NOT NULL,
                    added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
                    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'processing', 'synced', 'failed'))
                )
            `);
            db.exec(`CREATE INDEX idx_library_docs_library ON library_documents(library_id)`);
            console.log('  Created: library_documents');

            // Add organization_id to projects table (nullable for migration)
            const projectColExists = db.prepare(`
                SELECT * FROM pragma_table_info('projects') WHERE name='organization_id'
            `).get();

            if (!projectColExists) {
                db.exec(`ALTER TABLE projects ADD COLUMN organization_id TEXT REFERENCES organizations(id)`);
                console.log('  Added: organization_id column to projects');
            }

            // Create default organization
            const now = Math.floor(Date.now() / 1000);
            const defaultOrgId = randomUUID();

            db.prepare(`
                INSERT INTO organizations (id, name, default_settings, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(defaultOrgId, 'Default Organization', '{}', now, now);
            console.log(`  Created default organization: ${defaultOrgId}`);

            // Update existing projects to use default organization
            const updateResult = db.prepare(`
                UPDATE projects SET organization_id = ? WHERE organization_id IS NULL
            `).run(defaultOrgId);
            console.log(`  Updated ${updateResult.changes} projects with default organization`);

            // Create default knowledge libraries for the organization
            const libraryTypes = [
                'due-diligence',
                'house',
                'apartments',
                'fitout',
                'industrial',
                'remediation'
            ];

            for (const type of libraryTypes) {
                db.prepare(`
                    INSERT INTO knowledge_libraries (id, organization_id, type, document_count, created_at, updated_at)
                    VALUES (?, ?, ?, 0, ?, ?)
                `).run(randomUUID(), defaultOrgId, type, now, now);
            }
            console.log(`  Created ${libraryTypes.length} default knowledge libraries`);

            db.exec('COMMIT');
            console.log('');
            console.log('Migration 0012 complete!');

        } catch (err) {
            db.exec('ROLLBACK');
            throw err;
        }

        db.close();
    } catch (error) {
        console.error('Migration failed:', error.message);
        try { db.close(); } catch (e) {}
        process.exit(1);
    }
}

runMigration();
