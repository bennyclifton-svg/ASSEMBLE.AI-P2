import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import type { Pool, PoolClient } from 'pg';

export const PROJECT_BACKUP_FORMAT = 'sitewise.project-backup';
export const PROJECT_BACKUP_FORMAT_VERSION = 1;

type Row = Record<string, unknown>;
type RowSet = Record<string, Row[]>;
type IdMap = Record<string, Map<string, string>>;

type TableBackupPlan = {
    table: string;
    selectSql: string;
};

export type ProjectBackupManifest = {
    id: string;
    format: typeof PROJECT_BACKUP_FORMAT;
    formatVersion: typeof PROJECT_BACKUP_FORMAT_VERSION;
    createdAt: string;
    source: {
        projectId: string;
        projectName: string;
    };
    application: {
        name: string;
        version: string | null;
        schema: {
            drizzlePg: MigrationJournalSummary | null;
            drizzleAuth: MigrationJournalSummary | null;
            drizzleRag: MigrationJournalSummary | null;
        };
    };
    tables: Array<{
        name: string;
        rowCount: number;
    }>;
    files: BackupFileManifestEntry[];
    coverage: {
        included: string[];
        excluded: string[];
    };
};

export type MigrationJournalSummary = {
    latestTag: string | null;
    entryCount: number;
};

export type BackupFileManifestEntry = {
    fileAssetId: string;
    storagePath: string;
    archivePath: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    hash: string;
    sha256: string;
};

export type ProjectBackupResult = {
    outputPath: string;
    manifest: ProjectBackupManifest;
};

export type ProjectRestoreResult = {
    projectId: string;
    projectName: string;
    manifest: ProjectBackupManifest;
    tableCounts: Record<string, number>;
};

export type CreateProjectBackupOptions = {
    pool: Pool;
    projectId: string;
    outputPath?: string;
    cwd?: string;
    now?: Date;
};

export type RestoreProjectBackupOptions = {
    pool: Pool;
    backupPath: string;
    projectId?: string;
    projectName?: string;
    organizationId?: string;
    cwd?: string;
    idFactory?: () => string;
};

export type PrepareRestoreRowsOptions = {
    projectId: string;
    projectName?: string;
    organizationId?: string;
    restoredAt: Date;
    idFactory?: () => string;
};

const PROJECT_BACKUP_TABLES: TableBackupPlan[] = [
    { table: 'projects', selectSql: 'SELECT * FROM projects WHERE id = $1' },
    {
        table: 'file_assets',
        selectSql: `
            SELECT DISTINCT fa.*
            FROM file_assets fa
            WHERE fa.id IN (
                SELECT v.file_asset_id
                FROM versions v
                JOIN documents d ON d.id = v.document_id
                WHERE d.project_id = $1
                UNION
                SELECT i.file_asset_id
                FROM invoices i
                WHERE i.project_id = $1 AND i.file_asset_id IS NOT NULL
                UNION
                SELECT ca.file_asset_id
                FROM correspondence_attachments ca
                JOIN correspondence c ON c.id = ca.correspondence_id
                WHERE c.project_id = $1 AND ca.file_asset_id IS NOT NULL
            )
            ORDER BY fa.id
        `,
    },
    { table: 'subcategories', selectSql: 'SELECT * FROM subcategories WHERE project_id = $1 ORDER BY sort_order, id' },
    { table: 'category_visibility', selectSql: 'SELECT * FROM category_visibility WHERE project_id = $1 ORDER BY category_id' },
    { table: 'project_details', selectSql: 'SELECT * FROM project_details WHERE project_id = $1 ORDER BY id' },
    { table: 'project_question_answers', selectSql: 'SELECT * FROM project_question_answers WHERE project_id = $1' },
    { table: 'project_stages', selectSql: 'SELECT * FROM project_stages WHERE project_id = $1 ORDER BY stage_number, id' },
    { table: 'risks', selectSql: 'SELECT * FROM risks WHERE project_id = $1 ORDER BY "order", id' },
    { table: 'stakeholders', selectSql: 'SELECT * FROM stakeholders WHERE project_id = $1 ORDER BY "order", id' },
    { table: 'project_objectives', selectSql: 'SELECT * FROM project_objectives WHERE project_id = $1 ORDER BY sort_order, id' },
    { table: 'objective_generation_sessions', selectSql: 'SELECT * FROM objective_generation_sessions WHERE project_id = $1 ORDER BY created_at, id' },
    { table: 'project_profiles', selectSql: 'SELECT * FROM project_profiles WHERE project_id = $1 ORDER BY id' },
    { table: 'profiler_objectives', selectSql: 'SELECT * FROM profiler_objectives WHERE project_id = $1 ORDER BY id' },
    {
        table: 'objectives_transmittals',
        selectSql: `
            SELECT ot.*
            FROM objectives_transmittals ot
            JOIN profiler_objectives po ON po.id = ot.objectives_id
            WHERE po.project_id = $1
            ORDER BY ot.id
        `,
    },
    { table: 'project_stakeholders', selectSql: 'SELECT * FROM project_stakeholders WHERE project_id = $1 ORDER BY sort_order, id' },
    {
        table: 'stakeholder_tender_statuses',
        selectSql: `
            SELECT sts.*
            FROM stakeholder_tender_statuses sts
            JOIN project_stakeholders ps ON ps.id = sts.stakeholder_id
            WHERE ps.project_id = $1
            ORDER BY sts.stakeholder_id, sts.status_type
        `,
    },
    {
        table: 'stakeholder_submission_statuses',
        selectSql: `
            SELECT sss.*
            FROM stakeholder_submission_statuses sss
            JOIN project_stakeholders ps ON ps.id = sss.stakeholder_id
            WHERE ps.project_id = $1
            ORDER BY sss.stakeholder_id
        `,
    },
    { table: 'consultant_disciplines', selectSql: 'SELECT * FROM consultant_disciplines WHERE project_id = $1 ORDER BY "order", id' },
    {
        table: 'consultant_statuses',
        selectSql: `
            SELECT cs.*
            FROM consultant_statuses cs
            JOIN consultant_disciplines cd ON cd.id = cs.discipline_id
            WHERE cd.project_id = $1
            ORDER BY cs.discipline_id, cs.status_type
        `,
    },
    {
        table: 'discipline_fee_items',
        selectSql: `
            SELECT dfi.*
            FROM discipline_fee_items dfi
            JOIN consultant_disciplines cd ON cd.id = dfi.discipline_id
            WHERE cd.project_id = $1
            ORDER BY dfi.discipline_id, dfi.sort_order
        `,
    },
    { table: 'contractor_trades', selectSql: 'SELECT * FROM contractor_trades WHERE project_id = $1 ORDER BY "order", id' },
    {
        table: 'contractor_statuses',
        selectSql: `
            SELECT cs.*
            FROM contractor_statuses cs
            JOIN contractor_trades ct ON ct.id = cs.trade_id
            WHERE ct.project_id = $1
            ORDER BY cs.trade_id, cs.status_type
        `,
    },
    {
        table: 'trade_price_items',
        selectSql: `
            SELECT tpi.*
            FROM trade_price_items tpi
            JOIN contractor_trades ct ON ct.id = tpi.trade_id
            WHERE ct.project_id = $1
            ORDER BY tpi.trade_id, tpi.sort_order
        `,
    },
    { table: 'cost_lines', selectSql: 'SELECT * FROM cost_lines WHERE project_id = $1 ORDER BY sort_order, id' },
    {
        table: 'cost_line_allocations',
        selectSql: `
            SELECT cla.*
            FROM cost_line_allocations cla
            JOIN cost_lines cl ON cl.id = cla.cost_line_id
            WHERE cl.project_id = $1
            ORDER BY cla.cost_line_id, cla.fiscal_year
        `,
    },
    {
        table: 'cost_line_comments',
        selectSql: `
            SELECT clc.*
            FROM cost_line_comments clc
            JOIN cost_lines cl ON cl.id = clc.cost_line_id
            WHERE cl.project_id = $1
            ORDER BY clc.cost_line_id, clc.created_at
        `,
    },
    { table: 'variations', selectSql: 'SELECT * FROM variations WHERE project_id = $1 ORDER BY variation_number, id' },
    { table: 'invoices', selectSql: 'SELECT * FROM invoices WHERE project_id = $1 ORDER BY invoice_date, id' },
    { table: 'project_snapshots', selectSql: 'SELECT * FROM project_snapshots WHERE project_id = $1 ORDER BY created_at, id' },
    { table: 'program_activities', selectSql: 'SELECT * FROM program_activities WHERE project_id = $1 ORDER BY sort_order, id' },
    { table: 'program_dependencies', selectSql: 'SELECT * FROM program_dependencies WHERE project_id = $1 ORDER BY id' },
    {
        table: 'program_milestones',
        selectSql: `
            SELECT pm.*
            FROM program_milestones pm
            JOIN program_activities pa ON pa.id = pm.activity_id
            WHERE pa.project_id = $1
            ORDER BY pm.activity_id, pm.sort_order
        `,
    },
    { table: 'program_activity_expected_outputs', selectSql: 'SELECT * FROM program_activity_expected_outputs WHERE project_id = $1 ORDER BY sort_order, id' },
    { table: 'program_activity_evidence_links', selectSql: 'SELECT * FROM program_activity_evidence_links WHERE project_id = $1 ORDER BY created_at, id' },
    { table: 'documents', selectSql: 'SELECT * FROM documents WHERE project_id = $1 ORDER BY created_at, id' },
    {
        table: 'versions',
        selectSql: `
            SELECT v.*
            FROM versions v
            JOIN documents d ON d.id = v.document_id
            WHERE d.project_id = $1
            ORDER BY v.document_id, v.version_number
        `,
    },
    { table: 'transmittals', selectSql: 'SELECT * FROM transmittals WHERE project_id = $1 ORDER BY created_at, id' },
    {
        table: 'transmittal_items',
        selectSql: `
            SELECT ti.*
            FROM transmittal_items ti
            JOIN transmittals t ON t.id = ti.transmittal_id
            WHERE t.project_id = $1
            ORDER BY ti.transmittal_id, ti.added_at
        `,
    },
    { table: 'notes', selectSql: 'SELECT * FROM notes WHERE project_id = $1 ORDER BY created_at, id' },
    {
        table: 'note_transmittals',
        selectSql: `
            SELECT nt.*
            FROM note_transmittals nt
            JOIN notes n ON n.id = nt.note_id
            WHERE n.project_id = $1
            ORDER BY nt.note_id, nt.added_at
        `,
    },
    { table: 'meeting_groups', selectSql: 'SELECT * FROM meeting_groups WHERE project_id = $1 ORDER BY group_number, id' },
    { table: 'meetings', selectSql: 'SELECT * FROM meetings WHERE project_id = $1 ORDER BY meeting_date, id' },
    {
        table: 'meeting_sections',
        selectSql: `
            SELECT ms.*
            FROM meeting_sections ms
            JOIN meetings m ON m.id = ms.meeting_id
            WHERE m.project_id = $1
            ORDER BY ms.meeting_id, ms.sort_order
        `,
    },
    {
        table: 'meeting_attendees',
        selectSql: `
            SELECT ma.*
            FROM meeting_attendees ma
            JOIN meetings m ON m.id = ma.meeting_id
            WHERE m.project_id = $1
            ORDER BY ma.meeting_id, ma.created_at
        `,
    },
    {
        table: 'meeting_transmittals',
        selectSql: `
            SELECT mt.*
            FROM meeting_transmittals mt
            JOIN meetings m ON m.id = mt.meeting_id
            WHERE m.project_id = $1
            ORDER BY mt.meeting_id, mt.added_at
        `,
    },
    { table: 'report_groups', selectSql: 'SELECT * FROM report_groups WHERE project_id = $1 ORDER BY group_number, id' },
    { table: 'reports', selectSql: 'SELECT * FROM reports WHERE project_id = $1 ORDER BY report_date, id' },
    {
        table: 'report_sections',
        selectSql: `
            SELECT rs.*
            FROM report_sections rs
            JOIN reports r ON r.id = rs.report_id
            WHERE r.project_id = $1
            ORDER BY rs.report_id, rs.sort_order
        `,
    },
    {
        table: 'report_attendees',
        selectSql: `
            SELECT ra.*
            FROM report_attendees ra
            JOIN reports r ON r.id = ra.report_id
            WHERE r.project_id = $1
            ORDER BY ra.report_id, ra.created_at
        `,
    },
    {
        table: 'report_transmittals',
        selectSql: `
            SELECT rt.*
            FROM report_transmittals rt
            JOIN reports r ON r.id = rt.report_id
            WHERE r.project_id = $1
            ORDER BY rt.report_id, rt.added_at
        `,
    },
    { table: 'addenda', selectSql: 'SELECT * FROM addenda WHERE project_id = $1 ORDER BY addendum_number, id' },
    {
        table: 'addendum_transmittals',
        selectSql: `
            SELECT at.*
            FROM addendum_transmittals at
            JOIN addenda a ON a.id = at.addendum_id
            WHERE a.project_id = $1
            ORDER BY at.addendum_id, at.sort_order
        `,
    },
    { table: 'rft_new', selectSql: 'SELECT * FROM rft_new WHERE project_id = $1 ORDER BY rft_number, id' },
    {
        table: 'rft_new_transmittals',
        selectSql: `
            SELECT rnt.*
            FROM rft_new_transmittals rnt
            JOIN rft_new r ON r.id = rnt.rft_new_id
            WHERE r.project_id = $1
            ORDER BY rnt.rft_new_id, rnt.added_at
        `,
    },
    { table: 'briefing_sessions', selectSql: 'SELECT * FROM briefing_sessions WHERE project_id = $1 ORDER BY started_at, id' },
    {
        table: 'briefing_messages',
        selectSql: `
            SELECT bm.*
            FROM briefing_messages bm
            JOIN briefing_sessions bs ON bs.id = bm.session_id
            WHERE bs.project_id = $1
            ORDER BY bm.session_id, bm.created_at
        `,
    },
    { table: 'brief_attachments', selectSql: 'SELECT * FROM brief_attachments WHERE project_id = $1 ORDER BY attached_at, id' },
    { table: 'correspondence_threads', selectSql: 'SELECT * FROM correspondence_threads WHERE project_id = $1 ORDER BY created_at, id' },
    { table: 'correspondence', selectSql: 'SELECT * FROM correspondence WHERE project_id = $1 ORDER BY received_at, id' },
    {
        table: 'correspondence_attachments',
        selectSql: `
            SELECT ca.*
            FROM correspondence_attachments ca
            JOIN correspondence c ON c.id = ca.correspondence_id
            WHERE c.project_id = $1
            ORDER BY ca.correspondence_id, ca.created_at
        `,
    },
];

const INCLUDED_COVERAGE = [
    'project shell, details, profile, objectives, stages, risks, and stakeholder records',
    'cost plan rows, allocations, comments, variations, invoices, and snapshots',
    'program activities, dependencies, milestones, expected outputs, and evidence links',
    'document repository metadata, versions, linked transmittals, and local file payloads',
    'notes, meetings, reports, addenda, RFT records, briefing sessions, and correspondence records',
];

const EXCLUDED_COVERAGE = [
    'auth users, organizations, billing, model/provider secrets, and global company records',
    'RAG chunks, embeddings, generated report workspace state, and queue/Redis state',
    'cloud/Supabase storage payload retrieval',
    'incremental, encrypted, scheduled, or remote backups',
    'cross-version migration guarantees beyond recording the source schema marker',
];

const TABLE_REFERENCE_COLUMNS: Record<string, Record<string, string>> = {
    documents: { latest_version_id: 'versions' },
    versions: { document_id: 'documents', file_asset_id: 'file_assets' },
    transmittals: { subcategory_id: 'subcategories', stakeholder_id: 'project_stakeholders' },
    transmittal_items: { transmittal_id: 'transmittals', version_id: 'versions' },
    correspondence: { thread_id: 'correspondence_threads' },
    correspondence_attachments: {
        correspondence_id: 'correspondence',
        document_id: 'documents',
        file_asset_id: 'file_assets',
    },
    consultant_statuses: { discipline_id: 'consultant_disciplines' },
    discipline_fee_items: { discipline_id: 'consultant_disciplines' },
    contractor_statuses: { trade_id: 'contractor_trades' },
    trade_price_items: { trade_id: 'contractor_trades' },
    cost_lines: { stakeholder_id: 'project_stakeholders' },
    cost_line_allocations: { cost_line_id: 'cost_lines' },
    cost_line_comments: { cost_line_id: 'cost_lines' },
    variations: { cost_line_id: 'cost_lines' },
    invoices: { cost_line_id: 'cost_lines', variation_id: 'variations', file_asset_id: 'file_assets' },
    program_activities: { parent_id: 'program_activities' },
    program_dependencies: { from_activity_id: 'program_activities', to_activity_id: 'program_activities' },
    program_milestones: { activity_id: 'program_activities' },
    program_activity_expected_outputs: { activity_id: 'program_activities' },
    program_activity_evidence_links: {
        activity_id: 'program_activities',
        expected_output_id: 'program_activity_expected_outputs',
    },
    objectives_transmittals: { objectives_id: 'profiler_objectives', document_id: 'documents' },
    stakeholder_tender_statuses: { stakeholder_id: 'project_stakeholders' },
    stakeholder_submission_statuses: { stakeholder_id: 'project_stakeholders' },
    note_transmittals: { note_id: 'notes', document_id: 'documents' },
    meetings: { group_id: 'meeting_groups' },
    meeting_sections: {
        meeting_id: 'meetings',
        parent_section_id: 'meeting_sections',
        stakeholder_id: 'project_stakeholders',
    },
    meeting_attendees: { meeting_id: 'meetings', stakeholder_id: 'project_stakeholders' },
    meeting_transmittals: { meeting_id: 'meetings', document_id: 'documents' },
    reports: { group_id: 'report_groups' },
    report_sections: {
        report_id: 'reports',
        parent_section_id: 'report_sections',
        stakeholder_id: 'project_stakeholders',
    },
    report_attendees: { report_id: 'reports', stakeholder_id: 'project_stakeholders' },
    report_transmittals: { report_id: 'reports', document_id: 'documents' },
    addenda: { stakeholder_id: 'project_stakeholders' },
    addendum_transmittals: { addendum_id: 'addenda', document_id: 'documents' },
    rft_new: { stakeholder_id: 'project_stakeholders' },
    rft_new_transmittals: { rft_new_id: 'rft_new', document_id: 'documents' },
    briefing_messages: { session_id: 'briefing_sessions' },
    brief_attachments: { document_id: 'documents' },
};

export async function createProjectBackup(options: CreateProjectBackupOptions): Promise<ProjectBackupResult> {
    const cwd = options.cwd ?? process.cwd();
    const now = options.now ?? new Date();
    const client = await options.pool.connect();

    try {
        const tables = await readProjectTables(client, options.projectId);
        const project = tables.projects?.[0];
        if (!project) {
            throw new Error(`Project "${options.projectId}" was not found.`);
        }

        const backupId = makeBackupId(options.projectId, now);
        const files = await collectLocalFiles(tables.file_assets ?? [], cwd);
        const manifest = await buildManifest({
            backupId,
            cwd,
            now,
            project,
            tables,
            files,
        });
        const outputPath = options.outputPath
            ? path.resolve(cwd, options.outputPath)
            : path.join(cwd, '.sitewise-backups', `${backupId}.zip`);

        const zip = new JSZip();
        zip.file('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
        zip.file('data/project-records.json', `${JSON.stringify({ tables }, null, 2)}\n`);
        for (const file of files) {
            zip.file(file.manifest.archivePath, file.buffer);
        }

        const buffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, buffer);

        return { outputPath, manifest };
    } finally {
        client.release();
    }
}

export async function restoreProjectBackup(options: RestoreProjectBackupOptions): Promise<ProjectRestoreResult> {
    const cwd = options.cwd ?? process.cwd();
    const restoredAt = new Date();
    const archive = await readBackupArchive(options.backupPath);
    const newProjectId = options.projectId ?? randomUUID();
    const { rows, projectName } = prepareRestoreRows(archive.tables, {
        projectId: newProjectId,
        projectName: options.projectName,
        organizationId: options.organizationId,
        restoredAt,
        idFactory: options.idFactory,
    });

    await restoreLocalFiles(archive.zip, archive.manifest, cwd);

    const client = await options.pool.connect();
    try {
        await client.query('BEGIN');
        for (const plan of PROJECT_BACKUP_TABLES) {
            await insertRows(client, plan.table, rows[plan.table] ?? []);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return {
        projectId: newProjectId,
        projectName,
        manifest: archive.manifest,
        tableCounts: Object.fromEntries(Object.entries(rows).map(([table, tableRows]) => [table, tableRows.length])),
    };
}

export function prepareRestoreRows(
    tables: RowSet,
    options: PrepareRestoreRowsOptions
): { rows: RowSet; idMaps: IdMap; projectName: string } {
    const idFactory = options.idFactory ?? randomUUID;
    const idMaps: IdMap = {};

    for (const plan of PROJECT_BACKUP_TABLES) {
        const tableRows = tables[plan.table] ?? [];
        const tableMap = new Map<string, string>();
        for (const row of tableRows) {
            const id = row.id;
            if (typeof id === 'string') {
                tableMap.set(id, plan.table === 'projects' ? options.projectId : idFactory());
            }
        }
        if (tableMap.size) {
            idMaps[plan.table] = tableMap;
        }
    }

    const projectRow = tables.projects?.[0];
    const originalName = typeof projectRow?.name === 'string' ? projectRow.name : 'Restored Project';
    const projectName = options.projectName ?? `${originalName} (restored ${formatDateForName(options.restoredAt)})`;
    const rows: RowSet = {};

    for (const plan of PROJECT_BACKUP_TABLES) {
        rows[plan.table] = (tables[plan.table] ?? []).map((row) => rewriteRow(plan.table, row, idMaps, {
            projectId: options.projectId,
            projectName,
            organizationId: options.organizationId,
        }));
    }

    return { rows, idMaps, projectName };
}

export function resolveLocalStoragePath(storagePath: string, cwd = process.cwd()): string {
    if (!storagePath) {
        throw new Error('Storage path is empty.');
    }
    if (storagePath.startsWith('supabase://')) {
        throw new Error(`Cloud storage payloads are not supported by this backup format: ${storagePath}`);
    }

    if (path.isAbsolute(storagePath) && !/^[/\\]+uploads(?:[/\\]|$)/i.test(storagePath)) {
        return storagePath;
    }

    const localPath = storagePath.replace(/^[/\\]+/, '');
    const fullPath = path.resolve(cwd, localPath);
    const uploadsRoot = path.resolve(cwd, 'uploads');
    const relativeToUploads = path.relative(uploadsRoot, fullPath);

    if (relativeToUploads.startsWith('..') || path.isAbsolute(relativeToUploads)) {
        throw new Error(`Local storage path is outside uploads/: ${storagePath}`);
    }

    return fullPath;
}

async function readProjectTables(client: PoolClient, projectId: string): Promise<RowSet> {
    const tables: RowSet = {};
    for (const plan of PROJECT_BACKUP_TABLES) {
        if (!(await tableExists(client, plan.table))) {
            tables[plan.table] = [];
            continue;
        }

        const result = await client.query(plan.selectSql, [projectId]);
        tables[plan.table] = result.rows;
    }
    return tables;
}

async function tableExists(client: PoolClient, table: string): Promise<boolean> {
    const result = await client.query('SELECT to_regclass($1) AS table_name', [`public.${table}`]);
    return !!result.rows[0]?.table_name;
}

async function collectLocalFiles(rows: Row[], cwd: string): Promise<Array<{ manifest: BackupFileManifestEntry; buffer: Buffer }>> {
    const files: Array<{ manifest: BackupFileManifestEntry; buffer: Buffer }> = [];

    for (const row of rows) {
        const fileAssetId = stringValue(row.id, 'file_assets.id');
        const storagePath = stringValue(row.storage_path, `file_assets.storage_path for ${fileAssetId}`);
        const fullPath = resolveLocalStoragePath(storagePath, cwd);
        const buffer = await readFile(fullPath);
        const fileStat = await stat(fullPath);
        const sha256 = createHash('sha256').update(buffer).digest('hex');
        const archivePath = `files/${fileAssetId}/${path.basename(storagePath)}`;

        files.push({
            manifest: {
                fileAssetId,
                storagePath,
                archivePath,
                originalName: stringValue(row.original_name, `file_assets.original_name for ${fileAssetId}`),
                mimeType: stringValue(row.mime_type, `file_assets.mime_type for ${fileAssetId}`),
                sizeBytes: numberValue(row.size_bytes, `file_assets.size_bytes for ${fileAssetId}`),
                hash: stringValue(row.hash, `file_assets.hash for ${fileAssetId}`),
                sha256,
            },
            buffer,
        });

        if (fileStat.size !== buffer.length) {
            throw new Error(`Could not read a stable file payload for ${storagePath}.`);
        }
    }

    return files;
}

async function buildManifest(args: {
    backupId: string;
    cwd: string;
    now: Date;
    project: Row;
    tables: RowSet;
    files: Array<{ manifest: BackupFileManifestEntry }>;
}): Promise<ProjectBackupManifest> {
    const appInfo = await readPackageInfo(args.cwd);
    const schema = await readSchemaSummary(args.cwd);

    return {
        id: args.backupId,
        format: PROJECT_BACKUP_FORMAT,
        formatVersion: PROJECT_BACKUP_FORMAT_VERSION,
        createdAt: args.now.toISOString(),
        source: {
            projectId: stringValue(args.project.id, 'projects.id'),
            projectName: stringValue(args.project.name, 'projects.name'),
        },
        application: {
            name: appInfo.name,
            version: appInfo.version,
            schema,
        },
        tables: PROJECT_BACKUP_TABLES.map((plan) => ({
            name: plan.table,
            rowCount: args.tables[plan.table]?.length ?? 0,
        })),
        files: args.files.map((file) => file.manifest),
        coverage: {
            included: INCLUDED_COVERAGE,
            excluded: EXCLUDED_COVERAGE,
        },
    };
}

async function readPackageInfo(cwd: string): Promise<{ name: string; version: string | null }> {
    try {
        const raw = await readFile(path.join(cwd, 'package.json'), 'utf8');
        const parsed = JSON.parse(raw) as { name?: string; version?: string };
        return {
            name: parsed.name ?? 'sitewise',
            version: parsed.version ?? null,
        };
    } catch {
        return { name: 'sitewise', version: null };
    }
}

async function readSchemaSummary(cwd: string): Promise<ProjectBackupManifest['application']['schema']> {
    const [drizzlePg, drizzleAuth, drizzleRag] = await Promise.all([
        readMigrationJournal(path.join(cwd, 'drizzle-pg', 'meta', '_journal.json')),
        readMigrationJournal(path.join(cwd, 'drizzle-auth', 'meta', '_journal.json')),
        readMigrationJournal(path.join(cwd, 'drizzle', 'rag', 'meta', '_journal.json')),
    ]);

    return { drizzlePg, drizzleAuth, drizzleRag };
}

async function readMigrationJournal(filePath: string): Promise<MigrationJournalSummary | null> {
    try {
        const raw = await readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as { entries?: Array<{ tag?: string }> };
        const entries = parsed.entries ?? [];
        return {
            latestTag: entries.at(-1)?.tag ?? null,
            entryCount: entries.length,
        };
    } catch {
        return null;
    }
}

async function readBackupArchive(backupPath: string): Promise<{ zip: JSZip; manifest: ProjectBackupManifest; tables: RowSet }> {
    const buffer = await readFile(backupPath);
    const zip = await JSZip.loadAsync(buffer);
    const manifestFile = zip.file('manifest.json');
    const recordsFile = zip.file('data/project-records.json');

    if (!manifestFile || !recordsFile) {
        throw new Error('Backup is missing manifest.json or data/project-records.json.');
    }

    const manifest = JSON.parse(await manifestFile.async('string')) as ProjectBackupManifest;
    if (manifest.format !== PROJECT_BACKUP_FORMAT || manifest.formatVersion !== PROJECT_BACKUP_FORMAT_VERSION) {
        throw new Error(`Unsupported backup format ${manifest.format} v${manifest.formatVersion}.`);
    }

    const records = JSON.parse(await recordsFile.async('string')) as { tables?: RowSet };
    if (!records.tables) {
        throw new Error('Backup data is missing the tables payload.');
    }

    return { zip, manifest, tables: records.tables };
}

async function restoreLocalFiles(zip: JSZip, manifest: ProjectBackupManifest, cwd: string): Promise<void> {
    for (const file of manifest.files) {
        const zipEntry = zip.file(file.archivePath);
        if (!zipEntry) {
            throw new Error(`Backup is missing file payload ${file.archivePath}.`);
        }

        const buffer = Buffer.from(await zipEntry.async('nodebuffer'));
        const sha256 = createHash('sha256').update(buffer).digest('hex');
        if (sha256 !== file.sha256) {
            throw new Error(`File payload hash mismatch for ${file.storagePath}.`);
        }

        const fullPath = resolveLocalStoragePath(file.storagePath, cwd);
        await mkdir(path.dirname(fullPath), { recursive: true });

        const existing = await readFile(fullPath).catch(() => null);
        if (existing) {
            const existingHash = createHash('sha256').update(existing).digest('hex');
            if (existingHash !== file.sha256) {
                throw new Error(`Refusing to overwrite different local file at ${file.storagePath}.`);
            }
            continue;
        }

        await writeFile(fullPath, buffer);
    }
}

function rewriteRow(
    table: string,
    row: Row,
    idMaps: IdMap,
    options: {
        projectId: string;
        projectName: string;
        organizationId?: string;
    }
): Row {
    const next: Row = {};
    const references = TABLE_REFERENCE_COLUMNS[table] ?? {};

    for (const [column, value] of Object.entries(row)) {
        if (column === 'id' && typeof value === 'string') {
            next[column] = idMaps[table]?.get(value) ?? value;
            continue;
        }

        if (column === 'project_id') {
            next[column] = options.projectId;
            continue;
        }

        if (column === 'organization_id' && options.organizationId) {
            next[column] = options.organizationId;
            continue;
        }

        const referencedTable = references[column];
        if (referencedTable && typeof value === 'string') {
            next[column] = idMaps[referencedTable]?.get(value) ?? value;
            continue;
        }

        next[column] = value;
    }

    if (table === 'projects') {
        next.id = options.projectId;
        next.name = options.projectName;
        if (options.organizationId) {
            next.organization_id = options.organizationId;
        }
    }

    return next;
}

async function insertRows(client: PoolClient, table: string, rows: Row[]): Promise<void> {
    if (!rows.length) return;

    const columns = Object.keys(rows[0]);
    const values: unknown[] = [];
    const rowPlaceholders = rows.map((row, rowIndex) => {
        const placeholders = columns.map((column, columnIndex) => {
            values.push(row[column]);
            return `$${rowIndex * columns.length + columnIndex + 1}`;
        });
        return `(${placeholders.join(', ')})`;
    });

    const sql = `
        INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(', ')})
        VALUES ${rowPlaceholders.join(', ')}
    `;

    await client.query(sql, values);
}

function quoteIdent(value: string): string {
    if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
        throw new Error(`Unsafe SQL identifier: ${value}`);
    }
    return `"${value}"`;
}

function makeBackupId(projectId: string, now: Date): string {
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    return `project-${safeFilePart(projectId)}-${timestamp}`;
}

function safeFilePart(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function formatDateForName(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function stringValue(value: unknown, label: string): string {
    if (typeof value !== 'string' || !value) {
        throw new Error(`Expected ${label} to be a non-empty string.`);
    }
    return value;
}

function numberValue(value: unknown, label: string): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') return Number(value);
    throw new Error(`Expected ${label} to be a number.`);
}

export async function removeBackupFile(filePath: string): Promise<void> {
    await rm(filePath, { force: true });
}
