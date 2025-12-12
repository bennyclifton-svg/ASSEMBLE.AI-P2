/**
 * Migration 0013: Add organizationId to projects table
 *
 * This migration adds the organization_id column to link projects to organizations.
 * Existing projects are assigned to the default organization.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Starting migration 0013: Add organizationId to projects...\n');

try {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info('projects')").all();
    const hasOrgId = tableInfo.some(col => col.name === 'organization_id');

    if (hasOrgId) {
        console.log('Column organization_id already exists in projects table. Skipping migration.');
    } else {
        // Add organization_id column to projects table
        db.exec(`
            ALTER TABLE projects ADD COLUMN organization_id TEXT REFERENCES organizations(id);
        `);
        console.log('✓ Added organization_id column to projects table');

        // Get the default organization
        const defaultOrg = db.prepare("SELECT id FROM organizations LIMIT 1").get();

        if (defaultOrg) {
            // Update existing projects with the default organization
            const updateResult = db.prepare(`
                UPDATE projects SET organization_id = ? WHERE organization_id IS NULL
            `).run(defaultOrg.id);

            console.log(`✓ Updated ${updateResult.changes} existing projects with default organization`);
        } else {
            console.log('⚠ No default organization found. Existing projects not updated.');
        }
    }

    // Show current state
    const projectCount = db.prepare("SELECT COUNT(*) as count FROM projects").get();
    const projectsWithOrg = db.prepare("SELECT COUNT(*) as count FROM projects WHERE organization_id IS NOT NULL").get();

    console.log('\n=== Migration Summary ===');
    console.log(`Total projects: ${projectCount.count}`);
    console.log(`Projects with organization: ${projectsWithOrg.count}`);

    console.log('\n✓ Migration 0013 completed successfully');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
} finally {
    db.close();
}
