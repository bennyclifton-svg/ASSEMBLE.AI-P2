/**
 * Diagnostic script to check for orphaned documents
 * Run with: node check-orphaned-docs.js
 */

const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

console.log('=== Checking for orphaned documents ===\n');

// Get all documents
const allDocs = db.prepare(`
    SELECT
        d.id,
        d.project_id,
        d.category_id,
        d.latest_version_id
    FROM documents d
`).all();

console.log(`Total documents: ${allDocs.length}\n`);

// Check documents with NULL latest_version_id
const orphanedDocs = allDocs.filter(d => !d.latest_version_id);
console.log(`Documents with NULL latest_version_id: ${orphanedDocs.length}`);

if (orphanedDocs.length > 0) {
    console.log('\nOrphaned documents:');
    for (const doc of orphanedDocs) {
        console.log(`  - ID: ${doc.id}`);
        console.log(`    Category: ${doc.category_id}`);
        console.log(`    Project: ${doc.project_id}`);

        // Check if this document has ANY versions
        const versions = db.prepare(`
            SELECT v.id, v.version_number, v.file_asset_id, fa.original_name
            FROM versions v
            LEFT JOIN file_assets fa ON v.file_asset_id = fa.id
            WHERE v.document_id = ?
            ORDER BY v.version_number DESC
        `).all(doc.id);

        if (versions.length > 0) {
            console.log(`    Has ${versions.length} version(s):`);
            for (const v of versions) {
                console.log(`      - Version ${v.version_number}: ${v.original_name || 'NO FILENAME'} (asset: ${v.file_asset_id})`);
            }
            console.log(`    >> Can be repaired by setting latest_version_id = ${versions[0].id}`);
        } else {
            console.log(`    Has NO versions - truly orphaned`);
        }
        console.log('');
    }
}

// Check documents in Knowledge category specifically
console.log('\n=== Knowledge category documents ===\n');
const knowledgeDocs = db.prepare(`
    SELECT
        d.id,
        d.latest_version_id,
        d.category_id
    FROM documents d
    WHERE d.category_id = 'knowledge'
`).all();

console.log(`Documents in Knowledge category: ${knowledgeDocs.length}`);
for (const doc of knowledgeDocs) {
    const versions = db.prepare(`
        SELECT v.id, v.version_number, fa.original_name
        FROM versions v
        LEFT JOIN file_assets fa ON v.file_asset_id = fa.id
        WHERE v.document_id = ?
        ORDER BY v.version_number DESC
    `).all(doc.id);

    console.log(`\n  Document: ${doc.id}`);
    console.log(`  latest_version_id: ${doc.latest_version_id || 'NULL'}`);
    console.log(`  Versions: ${versions.length}`);
    if (versions.length > 0) {
        for (const v of versions) {
            console.log(`    - v${v.version_number}: "${v.original_name}" (version_id: ${v.id})`);
        }
    }
}

// Auto-repair option
console.log('\n\n=== Auto-repair ===\n');
const toRepair = orphanedDocs.filter(doc => {
    const versions = db.prepare(`SELECT id FROM versions WHERE document_id = ? ORDER BY version_number DESC LIMIT 1`).all(doc.id);
    return versions.length > 0;
});

if (toRepair.length > 0) {
    console.log(`Found ${toRepair.length} documents that can be repaired.`);
    console.log('Running repair...\n');

    for (const doc of toRepair) {
        const latestVersion = db.prepare(`
            SELECT id FROM versions WHERE document_id = ? ORDER BY version_number DESC LIMIT 1
        `).get(doc.id);

        if (latestVersion) {
            db.prepare(`UPDATE documents SET latest_version_id = ? WHERE id = ?`).run(latestVersion.id, doc.id);
            console.log(`  Repaired document ${doc.id} -> latest_version_id = ${latestVersion.id}`);
        }
    }
    console.log('\nRepair complete!');
} else {
    console.log('No documents to repair (either all are fine, or they have no versions at all).');
}

db.close();
