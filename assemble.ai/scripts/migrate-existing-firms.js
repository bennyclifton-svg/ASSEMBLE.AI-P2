const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Database is at project root
const dbPath = path.join(__dirname, '..', 'sqlite.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

/**
 * Migration Script: Link Existing Firms to Companies Master List
 *
 * This script finds all existing consultants and contractors that are not yet
 * linked to the companies master table, and creates company records for them.
 *
 * For each unlinked firm:
 * 1. Try to find an existing company with matching name (case-insensitive)
 * 2. If found, link the firm to that company
 * 3. If not found, create a new company record and link to it
 * 4. Mark the firm as awarded=true
 */

function normalizeCompanyName(name) {
    return (name || '').trim().toLowerCase();
}

function findExistingCompany(companyName) {
    const normalized = normalizeCompanyName(companyName);
    if (!normalized) return null;

    const companies = db.prepare('SELECT * FROM companies').all();
    return companies.find(c => normalizeCompanyName(c.name) === normalized);
}

function createCompany(firmData) {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO companies (id, name, abn, contact_name, contact_email, contact_phone, address, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        firmData.company_name || firmData.companyName,
        firmData.abn || null,
        firmData.contact_person || firmData.contactPerson || null,
        firmData.email || null,
        firmData.mobile || firmData.phone || null,
        firmData.address || null,
        now,
        now
    );

    return { id, name: firmData.company_name || firmData.companyName };
}

function migrateConsultants() {
    console.log('\n--- Migrating Consultants ---');

    // Get all consultants without company_id
    const consultants = db.prepare(`
        SELECT * FROM consultants WHERE company_id IS NULL
    `).all();

    console.log(`Found ${consultants.length} unlinked consultants`);

    let linked = 0;
    let created = 0;
    let skipped = 0;

    for (const consultant of consultants) {
        if (!consultant.company_name) {
            console.log(`  - Skipping consultant ${consultant.id}: no company name`);
            skipped++;
            continue;
        }

        // Try to find existing company
        let company = findExistingCompany(consultant.company_name);

        if (company) {
            console.log(`  - Linking "${consultant.company_name}" to existing company ${company.id}`);
        } else {
            // Create new company
            company = createCompany(consultant);
            console.log(`  - Created new company "${company.name}" (${company.id})`);
            created++;
        }

        // Update consultant with company_id and awarded=true
        db.prepare(`
            UPDATE consultants SET company_id = ?, awarded = 1, updated_at = ? WHERE id = ?
        `).run(company.id, new Date().toISOString(), consultant.id);

        linked++;
    }

    console.log(`\nConsultants: ${linked} linked, ${created} companies created, ${skipped} skipped`);
    return { linked, created, skipped };
}

function migrateContractors() {
    console.log('\n--- Migrating Contractors ---');

    // Get all contractors without company_id
    const contractors = db.prepare(`
        SELECT * FROM contractors WHERE company_id IS NULL
    `).all();

    console.log(`Found ${contractors.length} unlinked contractors`);

    let linked = 0;
    let created = 0;
    let skipped = 0;

    for (const contractor of contractors) {
        if (!contractor.company_name) {
            console.log(`  - Skipping contractor ${contractor.id}: no company name`);
            skipped++;
            continue;
        }

        // Try to find existing company
        let company = findExistingCompany(contractor.company_name);

        if (company) {
            console.log(`  - Linking "${contractor.company_name}" to existing company ${company.id}`);
        } else {
            // Create new company
            company = createCompany(contractor);
            console.log(`  - Created new company "${company.name}" (${company.id})`);
            created++;
        }

        // Update contractor with company_id and awarded=true
        db.prepare(`
            UPDATE contractors SET company_id = ?, awarded = 1, updated_at = ? WHERE id = ?
        `).run(company.id, new Date().toISOString(), contractor.id);

        linked++;
    }

    console.log(`\nContractors: ${linked} linked, ${created} companies created, ${skipped} skipped`);
    return { linked, created, skipped };
}

try {
    console.log('Starting Existing Firms Migration...\n');

    // Check if tables exist
    const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name IN ('consultants', 'contractors', 'companies')
    `).all();

    console.log('Found tables:', tables.map(t => t.name).join(', '));

    if (tables.length < 3) {
        console.error('Error: Required tables not found. Please run migrations first.');
        process.exit(1);
    }

    // Run migrations
    const consultantStats = migrateConsultants();
    const contractorStats = migrateContractors();

    console.log('\n=== Migration Summary ===');
    console.log(`Consultants: ${consultantStats.linked} linked, ${consultantStats.created} new companies`);
    console.log(`Contractors: ${contractorStats.linked} linked, ${contractorStats.created} new companies`);
    console.log('\n✅ Migration completed successfully!');

} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
