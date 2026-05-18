import crypto from 'crypto';
import { and, desc, eq, max } from 'drizzle-orm';
import { db as defaultDb } from '@/lib/db';
import {
    fileAssets,
    projectDetails,
    projects,
    rfiIssuedArtefacts,
} from '@/lib/db/pg-schema';
import { storage as defaultStorage, type StorageService } from '@/lib/storage';
import {
    isRfiExportFormat,
    type RfiExportFormat,
    type RfiIssuedArtefact,
    type RfiIssuedArtefactListResponse,
    type RfiRecord,
} from '@/types/rfi';
import {
    renderRfiExport,
    type RfiExportProjectDetails,
    type RfiExportRenderInput,
    type RfiRenderedExport,
} from './export';
import { rfiService, RfiServiceError } from './service';

type TimestampValue = Date | string | null | undefined;

export interface RfiIssuedArtefactRepositoryRow {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    versionNumber: number;
    format: RfiExportFormat;
    fileAssetId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    hash: string;
    sourceRfiRowVersion: number;
    generatedBy: string;
    generatedByName: string | null;
    generatedAt: TimestampValue;
    createdAt: TimestampValue;
    storagePath: string;
}

export interface InsertRfiIssuedArtefactValues {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    versionNumber: number;
    format: RfiExportFormat;
    fileAssetId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    hash: string;
    sourceRfiRowVersion: number;
    generatedBy: string;
    generatedByName: string | null;
    generatedAt: Date;
    createdAt: Date;
}

export interface InsertRfiFileAssetValues {
    id: string;
    storagePath: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    hash: string;
    ocrStatus: string;
}

export interface RfiIssuedArtefactRepository {
    getRfi(id: string, projectId: string, organizationId: string): Promise<RfiRecord | null>;
    getProjectDetails(projectId: string, organizationId: string): Promise<RfiExportProjectDetails | null>;
    nextVersionNumber(rfiId: string, organizationId: string): Promise<number>;
    insertFileAsset(values: InsertRfiFileAssetValues): Promise<void>;
    insertIssuedArtefact(values: InsertRfiIssuedArtefactValues): Promise<RfiIssuedArtefactRepositoryRow>;
    listIssuedArtefacts(
        rfiId: string,
        projectId: string,
        organizationId: string
    ): Promise<RfiIssuedArtefactRepositoryRow[]>;
    getIssuedArtefact(
        id: string,
        rfiId: string,
        projectId: string,
        organizationId: string
    ): Promise<RfiIssuedArtefactRepositoryRow | null>;
}

export interface RfiIssuedArtefactServiceOptions {
    now?: () => Date;
    idFactory?: () => string;
    storage?: StorageService;
    render?: (input: RfiExportRenderInput) => Promise<RfiRenderedExport>;
}

function makeId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `rfi-export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toIsoString(value: TimestampValue, fallback: Date): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return fallback.toISOString();
}

function toIssuedArtefact(row: RfiIssuedArtefactRepositoryRow, fallbackDate: Date): RfiIssuedArtefact {
    return {
        id: row.id,
        rfiId: row.rfiId,
        projectId: row.projectId,
        organizationId: row.organizationId,
        versionNumber: row.versionNumber,
        format: row.format,
        fileAssetId: row.fileAssetId,
        filename: row.filename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        hash: row.hash,
        sourceRfiRowVersion: row.sourceRfiRowVersion,
        generatedBy: row.generatedBy,
        generatedByName: row.generatedByName,
        generatedAt: toIsoString(row.generatedAt, fallbackDate),
        createdAt: toIsoString(row.createdAt, fallbackDate),
    };
}

function normalizeFormat(value: unknown): RfiExportFormat {
    if (value === undefined || value === null || value === '') return 'pdf';
    if (!isRfiExportFormat(value)) {
        throw new RfiServiceError('VALIDATION', 'Invalid RFI export format.', 400);
    }
    return value;
}

function normalizeActorId(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new RfiServiceError('VALIDATION', 'actorId is required.', 400);
    }
    return value.trim();
}

function normalizeActorName(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function safeFilenamePart(value: string): string {
    return value
        .replace(/[/\\:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
}

function filenameFor(rfi: RfiRecord, versionNumber: number, format: RfiExportFormat): string {
    const title = safeFilenamePart(rfi.title) || 'RFI';
    return `${rfi.reference} - ${title} - v${String(versionNumber).padStart(2, '0')}.${format}`;
}

function fileFor(filename: string, mimeType: string, buffer: Buffer): File {
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
}

function listResponse(
    rows: RfiIssuedArtefactRepositoryRow[],
    fallbackDate: Date
): RfiIssuedArtefactListResponse {
    const issuedArtefacts = rows.map((row) => toIssuedArtefact(row, fallbackDate));
    return {
        issuedArtefacts,
        latestIssuedArtefact: issuedArtefacts[0] ?? null,
    };
}

export function createRfiIssuedArtefactService(
    repository: RfiIssuedArtefactRepository,
    options: RfiIssuedArtefactServiceOptions = {}
) {
    const now = options.now ?? (() => new Date());
    const idFactory = options.idFactory ?? makeId;
    const storage = options.storage ?? defaultStorage;
    const render = options.render ?? renderRfiExport;

    return {
        async list(input: { id: string; projectId: string; organizationId: string }): Promise<RfiIssuedArtefactListResponse> {
            const rfi = await repository.getRfi(input.id, input.projectId, input.organizationId);
            if (!rfi) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            const rows = await repository.listIssuedArtefacts(input.id, input.projectId, input.organizationId);
            return listResponse(rows, now());
        },

        async generate(input: {
            id: string;
            projectId: string;
            organizationId: string;
            actorId: unknown;
            actorName?: unknown;
            format?: unknown;
        }): Promise<RfiIssuedArtefact> {
            const format = normalizeFormat(input.format);
            const actorId = normalizeActorId(input.actorId);
            const actorName = normalizeActorName(input.actorName);
            const rfi = await repository.getRfi(input.id, input.projectId, input.organizationId);
            if (!rfi) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }

            const project = await repository.getProjectDetails(input.projectId, input.organizationId);
            if (!project) {
                throw new RfiServiceError('NOT_FOUND', 'Project not found.', 404);
            }

            const generatedAt = now();
            const versionNumber = await repository.nextVersionNumber(rfi.id, input.organizationId);
            const filename = filenameFor(rfi, versionNumber, format);
            const rendered = await render({ rfi, project, format, generatedAt });
            const hash = crypto.createHash('sha256').update(rendered.buffer).digest('hex');
            const fileAssetId = idFactory();
            const stored = await storage.save(fileFor(filename, rendered.mimeType, rendered.buffer), rendered.buffer);

            await repository.insertFileAsset({
                id: fileAssetId,
                storagePath: stored.path,
                originalName: filename,
                mimeType: rendered.mimeType,
                sizeBytes: stored.size,
                hash: stored.hash || hash,
                ocrStatus: 'COMPLETED',
            });

            const row = await repository.insertIssuedArtefact({
                id: idFactory(),
                rfiId: rfi.id,
                projectId: rfi.projectId,
                organizationId: rfi.organizationId,
                versionNumber,
                format,
                fileAssetId,
                filename,
                mimeType: rendered.mimeType,
                sizeBytes: stored.size,
                hash: stored.hash || hash,
                sourceRfiRowVersion: rfi.rowVersion,
                generatedBy: actorId,
                generatedByName: actorName,
                generatedAt,
                createdAt: generatedAt,
            });

            return toIssuedArtefact(row, generatedAt);
        },

        async getFile(input: {
            exportId: string;
            id: string;
            projectId: string;
            organizationId: string;
        }): Promise<{ artefact: RfiIssuedArtefact; storagePath: string }> {
            const row = await repository.getIssuedArtefact(
                input.exportId,
                input.id,
                input.projectId,
                input.organizationId
            );
            if (!row) {
                throw new RfiServiceError('NOT_FOUND', 'RFI export not found.', 404);
            }
            return {
                artefact: toIssuedArtefact(row, now()),
                storagePath: row.storagePath,
            };
        },
    };
}

const issuedArtefactSelect = {
    id: rfiIssuedArtefacts.id,
    rfiId: rfiIssuedArtefacts.rfiId,
    projectId: rfiIssuedArtefacts.projectId,
    organizationId: rfiIssuedArtefacts.organizationId,
    versionNumber: rfiIssuedArtefacts.versionNumber,
    format: rfiIssuedArtefacts.format,
    fileAssetId: rfiIssuedArtefacts.fileAssetId,
    filename: rfiIssuedArtefacts.filename,
    mimeType: rfiIssuedArtefacts.mimeType,
    sizeBytes: rfiIssuedArtefacts.sizeBytes,
    hash: rfiIssuedArtefacts.hash,
    sourceRfiRowVersion: rfiIssuedArtefacts.sourceRfiRowVersion,
    generatedBy: rfiIssuedArtefacts.generatedBy,
    generatedByName: rfiIssuedArtefacts.generatedByName,
    generatedAt: rfiIssuedArtefacts.generatedAt,
    createdAt: rfiIssuedArtefacts.createdAt,
    storagePath: fileAssets.storagePath,
};

export const drizzleRfiIssuedArtefactRepository: RfiIssuedArtefactRepository = {
    async getRfi(id, projectId, organizationId) {
        try {
            return await rfiService.get({ id, projectId, organizationId });
        } catch (error) {
            if (error instanceof RfiServiceError && error.code === 'NOT_FOUND') return null;
            throw error;
        }
    },

    async getProjectDetails(projectId, organizationId) {
        const [row] = await defaultDb
            .select({
                projectName: projects.name,
                projectCode: projects.code,
                address: projectDetails.address,
            })
            .from(projects)
            .leftJoin(projectDetails, eq(projectDetails.projectId, projects.id))
            .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
            .limit(1);
        return row ?? null;
    },

    async nextVersionNumber(rfiId, organizationId) {
        const [row] = await defaultDb
            .select({ maxNumber: max(rfiIssuedArtefacts.versionNumber) })
            .from(rfiIssuedArtefacts)
            .where(and(eq(rfiIssuedArtefacts.rfiId, rfiId), eq(rfiIssuedArtefacts.organizationId, organizationId)));
        return Number(row?.maxNumber ?? 0) + 1;
    },

    async insertFileAsset(values) {
        await defaultDb.insert(fileAssets).values(values);
    },

    async insertIssuedArtefact(values) {
        await defaultDb.insert(rfiIssuedArtefacts).values(values);
        const row = await this.getIssuedArtefact(values.id, values.rfiId, values.projectId, values.organizationId);
        if (!row) {
            throw new RfiServiceError('NOT_FOUND', 'RFI export not found after create.', 404);
        }
        return row;
    },

    async listIssuedArtefacts(rfiId, projectId, organizationId) {
        return defaultDb
            .select(issuedArtefactSelect)
            .from(rfiIssuedArtefacts)
            .innerJoin(fileAssets, eq(rfiIssuedArtefacts.fileAssetId, fileAssets.id))
            .where(
                and(
                    eq(rfiIssuedArtefacts.rfiId, rfiId),
                    eq(rfiIssuedArtefacts.projectId, projectId),
                    eq(rfiIssuedArtefacts.organizationId, organizationId)
                )
            )
            .orderBy(desc(rfiIssuedArtefacts.versionNumber));
    },

    async getIssuedArtefact(id, rfiId, projectId, organizationId) {
        const [row] = await defaultDb
            .select(issuedArtefactSelect)
            .from(rfiIssuedArtefacts)
            .innerJoin(fileAssets, eq(rfiIssuedArtefacts.fileAssetId, fileAssets.id))
            .where(
                and(
                    eq(rfiIssuedArtefacts.id, id),
                    eq(rfiIssuedArtefacts.rfiId, rfiId),
                    eq(rfiIssuedArtefacts.projectId, projectId),
                    eq(rfiIssuedArtefacts.organizationId, organizationId)
                )
            )
            .limit(1);
        return row ?? null;
    },
};

export const rfiIssuedArtefactService = createRfiIssuedArtefactService(
    drizzleRfiIssuedArtefactRepository
);
