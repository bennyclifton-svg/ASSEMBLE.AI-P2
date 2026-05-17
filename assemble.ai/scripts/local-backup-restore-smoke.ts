import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { createProjectBackup, restoreProjectBackup } from '../src/lib/backup/project-backup';
import { loadAppEnv } from '../src/lib/env/load-app-env';

loadAppEnv();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function assertLocalUrl(label: string, rawUrl: string): void {
    if (process.env.SITEWISE_ALLOW_REMOTE_BOOTSTRAP === '1') return;

    const host = new URL(rawUrl).hostname;
    if (!LOCAL_HOSTS.has(host)) {
        throw new Error(`${label} points at "${host}", not a local service.`);
    }
}

async function insertSmokeProject(pool: Pool, ids: {
    projectId: string;
    projectDetailsId: string;
    documentId: string;
    versionId: string;
    fileAssetId: string;
    storagePath: string;
    hash: string;
    size: number;
}): Promise<void> {
    await pool.query('BEGIN');
    try {
        await pool.query(
            `
            INSERT INTO projects (id, name, code, status)
            VALUES ($1, $2, $3, 'active')
            `,
            [ids.projectId, 'Sitewise Backup Smoke Source', 'BACKUP-SMOKE']
        );

        await pool.query(
            `
            INSERT INTO project_details (id, project_id, project_name, address)
            VALUES ($1, $2, $3, $4)
            `,
            [ids.projectDetailsId, ids.projectId, 'Sitewise Backup Smoke Source', '1 Smoke Test Avenue']
        );

        await pool.query(
            `
            INSERT INTO file_assets (id, storage_path, original_name, mime_type, size_bytes, hash, ocr_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETE')
            `,
            [
                ids.fileAssetId,
                ids.storagePath,
                'backup-smoke.txt',
                'text/plain',
                ids.size,
                ids.hash,
            ]
        );

        await pool.query(
            `
            INSERT INTO documents (id, project_id, latest_version_id)
            VALUES ($1, $2, NULL)
            `,
            [ids.documentId, ids.projectId]
        );

        await pool.query(
            `
            INSERT INTO versions (id, document_id, file_asset_id, version_number, uploaded_by)
            VALUES ($1, $2, $3, 1, 'Backup Smoke')
            `,
            [ids.versionId, ids.documentId, ids.fileAssetId]
        );

        await pool.query('UPDATE documents SET latest_version_id = $1 WHERE id = $2', [ids.versionId, ids.documentId]);
        await pool.query('COMMIT');
    } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
}

async function cleanupSmokeRows(pool: Pool, projectIds: string[], storagePath: string): Promise<void> {
    await pool.query('BEGIN');
    try {
        await pool.query(
            `
            DELETE FROM versions
            WHERE document_id IN (
                SELECT id FROM documents WHERE project_id = ANY($1::text[])
            )
            `,
            [projectIds]
        );
        await pool.query('DELETE FROM documents WHERE project_id = ANY($1::text[])', [projectIds]);
        await pool.query('DELETE FROM project_details WHERE project_id = ANY($1::text[])', [projectIds]);
        await pool.query('DELETE FROM file_assets WHERE storage_path = $1', [storagePath]);
        await pool.query('DELETE FROM projects WHERE id = ANY($1::text[])', [projectIds]);
        await pool.query('COMMIT');
    } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
}

async function verifyRestoredProject(pool: Pool, projectId: string, expectedContent: string): Promise<void> {
    const result = await pool.query(
        `
        SELECT
            p.name AS project_name,
            pd.address,
            d.id AS document_id,
            v.id AS version_id,
            fa.storage_path
        FROM projects p
        JOIN project_details pd ON pd.project_id = p.id
        JOIN documents d ON d.project_id = p.id
        JOIN versions v ON v.document_id = d.id
        JOIN file_assets fa ON fa.id = v.file_asset_id
        WHERE p.id = $1
        `,
        [projectId]
    );

    if (result.rowCount !== 1) {
        throw new Error(`Expected one restored project/document row, found ${result.rowCount}.`);
    }

    const storagePath = result.rows[0].storage_path as string;
    const restoredFile = path.resolve(process.cwd(), storagePath.replace(/^[/\\]+/, ''));
    const content = await readFile(restoredFile, 'utf8');
    if (content !== expectedContent) {
        throw new Error('Restored file content did not match the source payload.');
    }
}

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL or SUPABASE_POSTGRES_URL is required.');
    }
    assertLocalUrl('DATABASE_URL', databaseUrl);

    const pool = new Pool({ connectionString: databaseUrl });
    const suffix = randomUUID();
    const sourceProjectId = `backup-smoke-source-${suffix}`;
    const restoredProjectId = `backup-smoke-restored-${suffix}`;
    const storagePath = `/uploads/backup-smoke-${suffix}.txt`;
    const fullStoragePath = path.resolve(process.cwd(), storagePath.replace(/^[/\\]+/, ''));
    const backupPath = path.resolve(process.cwd(), '.tmp', 'backup-smoke', `${suffix}.zip`);
    const expectedContent = `sitewise backup restore smoke ${suffix}\n`;
    const buffer = Buffer.from(expectedContent, 'utf8');
    const hash = createHash('sha256').update(buffer).digest('hex');

    try {
        await mkdir(path.dirname(fullStoragePath), { recursive: true });
        await mkdir(path.dirname(backupPath), { recursive: true });
        await writeFile(fullStoragePath, buffer);

        await insertSmokeProject(pool, {
            projectId: sourceProjectId,
            projectDetailsId: `backup-smoke-details-${suffix}`,
            documentId: `backup-smoke-document-${suffix}`,
            versionId: `backup-smoke-version-${suffix}`,
            fileAssetId: `backup-smoke-file-${suffix}`,
            storagePath,
            hash,
            size: buffer.length,
        });

        const backup = await createProjectBackup({
            pool,
            projectId: sourceProjectId,
            outputPath: backupPath,
        });

        await rm(fullStoragePath, { force: true });

        const restore = await restoreProjectBackup({
            pool,
            backupPath: backup.outputPath,
            projectId: restoredProjectId,
            projectName: 'Sitewise Backup Smoke Restored',
        });

        await verifyRestoredProject(pool, restore.projectId, expectedContent);

        console.log(`ok      backup archive ${backup.outputPath}`);
        console.log(`ok      restored project ${restore.projectId}`);
        console.log('ok      restored local file payload');
    } finally {
        await cleanupSmokeRows(pool, [sourceProjectId, restoredProjectId], storagePath).catch((error) => {
            console.warn(error instanceof Error ? error.message : error);
        });
        await rm(fullStoragePath, { force: true }).catch(() => undefined);
        await rm(backupPath, { force: true }).catch(() => undefined);
        await pool.end();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
