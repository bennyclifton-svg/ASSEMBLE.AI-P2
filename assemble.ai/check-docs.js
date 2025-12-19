// Diagnostic script to check document upload issue
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
console.log('Database path:', dbPath);

try {
    const db = new Database(dbPath);

    // Check documents with NULL latestVersionId
    console.log('\n=== Documents with NULL latestVersionId ===');
    const nullLatestVersion = db.prepare(`
        SELECT d.id, d.project_id, d.created_at
        FROM documents d
        WHERE d.latest_version_id IS NULL
    `).all();
    console.log('Count:', nullLatestVersion.length);
    if (nullLatestVersion.length > 0) {
        console.table(nullLatestVersion.slice(0, 5));
    }

    // Check all documents with their version info
    console.log('\n=== Recent documents (last 10) ===');
    const recentDocs = db.prepare(`
        SELECT
            d.id as docId,
            d.latest_version_id as latestVersionId,
            v.id as versionId,
            v.file_asset_id as fileAssetId,
            fa.original_name as originalName,
            fa.mime_type as mimeType
        FROM documents d
        LEFT JOIN versions v ON d.latest_version_id = v.id
        LEFT JOIN file_assets fa ON v.file_asset_id = fa.id
        ORDER BY d.created_at DESC
        LIMIT 10
    `).all();
    console.table(recentDocs);

    // Check for orphaned versions (versions not linked to any document as latestVersion)
    console.log('\n=== Versions not linked as latestVersionId (orphans) ===');
    const orphanedVersions = db.prepare(`
        SELECT v.id, v.document_id, fa.original_name
        FROM versions v
        JOIN file_assets fa ON v.file_asset_id = fa.id
        LEFT JOIN documents d ON d.latest_version_id = v.id
        WHERE d.id IS NULL
        ORDER BY v.created_at DESC
        LIMIT 10
    `).all();
    console.log('Count:', orphanedVersions.length);
    if (orphanedVersions.length > 0) {
        console.table(orphanedVersions);
    }

    // Check PDFs specifically
    console.log('\n=== PDF file assets ===');
    const pdfAssets = db.prepare(`
        SELECT
            fa.id,
            fa.original_name,
            fa.mime_type,
            v.document_id,
            d.latest_version_id
        FROM file_assets fa
        LEFT JOIN versions v ON v.file_asset_id = fa.id
        LEFT JOIN documents d ON v.document_id = d.id
        WHERE fa.mime_type = 'application/pdf' OR fa.original_name LIKE '%.pdf'
        ORDER BY fa.created_at DESC
        LIMIT 10
    `).all();
    console.table(pdfAssets);

    // Check for documents that have versions but latestVersionId doesn't point to any of them
    console.log('\n=== Documents with mismatched latestVersionId ===');
    const mismatched = db.prepare(`
        SELECT d.id as docId, d.latest_version_id,
               (SELECT COUNT(*) FROM versions WHERE document_id = d.id) as versionCount,
               (SELECT fa.original_name FROM versions v2
                JOIN file_assets fa ON v2.file_asset_id = fa.id
                WHERE v2.document_id = d.id
                ORDER BY v2.version_number DESC LIMIT 1) as latestFileName
        FROM documents d
        WHERE d.latest_version_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM versions v WHERE v.id = d.latest_version_id)
    `).all();
    console.log('Count:', mismatched.length);
    if (mismatched.length > 0) {
        console.table(mismatched);
    }

    // Check for versions with invalid fileAssetId
    console.log('\n=== Versions with invalid file_asset_id ===');
    const invalidAssets = db.prepare(`
        SELECT v.id as versionId, v.document_id, v.file_asset_id,
               (SELECT original_name FROM file_assets WHERE id = v.file_asset_id) as foundAssetName
        FROM versions v
        WHERE NOT EXISTS (SELECT 1 FROM file_assets fa WHERE fa.id = v.file_asset_id)
    `).all();
    console.log('Count:', invalidAssets.length);
    if (invalidAssets.length > 0) {
        console.table(invalidAssets);
    }

    // Check latest uploads - simulating what the API returns
    console.log('\n=== API-style query (recent docs) ===');
    const apiStyle = db.prepare(`
        SELECT
            d.id,
            d.category_id as categoryId,
            c.name as categoryName,
            d.subcategory_id as subcategoryId,
            d.latest_version_id as latestVersionId,
            fa.original_name as originalName,
            fa.mime_type as mimeType,
            fa.size_bytes as sizeBytes,
            v.version_number as versionNumber
        FROM documents d
        LEFT JOIN versions v ON d.latest_version_id = v.id
        LEFT JOIN file_assets fa ON v.file_asset_id = fa.id
        LEFT JOIN categories c ON d.category_id = c.id
        ORDER BY d.created_at DESC
        LIMIT 10
    `).all();
    console.table(apiStyle);

    db.close();
} catch (err) {
    console.error('Error:', err.message);
}
