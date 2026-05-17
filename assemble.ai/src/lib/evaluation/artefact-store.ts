import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db as defaultDb } from '@/lib/db';
import { aiArtefacts, fileAssets } from '@/lib/db/pg-schema';
import { storage as defaultStorage, getFileFromStorage, type StorageService } from '@/lib/storage';
import { eq } from 'drizzle-orm';
import type { AiArtefactKind } from '@/types/evaluation';

type ArtefactContent = string | Buffer | object | unknown[];

export interface StoreArtefactRelations {
    evaluationId?: string | null;
    evaluationPriceId?: string | null;
    packageId?: string | null;
    submissionId?: string | null;
    actionInvocationId?: string | null;
    trrId?: string | null;
}

export interface StoreArtefactArgs {
    kind: AiArtefactKind;
    content: ArtefactContent;
    relations?: StoreArtefactRelations;
    metadata?: Record<string, unknown>;
    status?: 'ready' | 'failed' | 'pending' | string;
    filename?: string;
}

function serialiseArtefactContent(content: ArtefactContent): { buffer: Buffer; mimeType: string; extension: string } {
    if (Buffer.isBuffer(content)) {
        return { buffer: content, mimeType: 'application/octet-stream', extension: '.bin' };
    }

    if (typeof content === 'string') {
        return { buffer: Buffer.from(content, 'utf8'), mimeType: 'text/plain', extension: '.txt' };
    }

    return {
        buffer: Buffer.from(JSON.stringify(content, null, 2), 'utf8'),
        mimeType: 'application/json',
        extension: '.json',
    };
}

export async function storeArtefact(
    args: StoreArtefactArgs,
    deps: { db?: typeof defaultDb; storage?: StorageService } = {}
) {
    const db = deps.db ?? defaultDb;
    const storage = deps.storage ?? defaultStorage;
    const { buffer, mimeType, extension } = serialiseArtefactContent(args.content);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const payloadFileAssetId = uuidv4();
    const artefactId = uuidv4();
    const originalName = args.filename ?? `${args.kind}-${hash.slice(0, 12)}${extension}`;
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const file = new File([blob], originalName, { type: mimeType });
    const stored = await storage.save(file, buffer);

    await db.insert(fileAssets).values({
        id: payloadFileAssetId,
        storagePath: stored.path,
        originalName,
        mimeType,
        sizeBytes: stored.size,
        hash: stored.hash || hash,
        ocrStatus: 'COMPLETED',
    });

    const [record] = await db.insert(aiArtefacts).values({
        id: artefactId,
        kind: args.kind,
        hash,
        status: args.status ?? 'ready',
        payloadFileAssetId,
        evaluationId: args.relations?.evaluationId ?? undefined,
        evaluationPriceId: args.relations?.evaluationPriceId ?? undefined,
        packageId: args.relations?.packageId ?? undefined,
        submissionId: args.relations?.submissionId ?? undefined,
        actionInvocationId: args.relations?.actionInvocationId ?? undefined,
        trrId: args.relations?.trrId ?? undefined,
        metadata: args.metadata,
    }).returning();

    return record;
}

export async function loadArtefact(id: string, deps: { db?: typeof defaultDb } = {}) {
    const db = deps.db ?? defaultDb;
    const [record] = await db
        .select()
        .from(aiArtefacts)
        .where(eq(aiArtefacts.id, id))
        .limit(1);

    if (!record?.payloadFileAssetId) return null;

    const [payload] = await db
        .select()
        .from(fileAssets)
        .where(eq(fileAssets.id, record.payloadFileAssetId))
        .limit(1);

    if (!payload) return null;

    const buffer = await getFileFromStorage(payload.storagePath);
    if (!buffer) return { record, payload, content: null };

    const text = buffer.toString('utf8');
    if (payload.mimeType === 'application/json') {
        try {
            return { record, payload, content: JSON.parse(text) };
        } catch {
            return { record, payload, content: text };
        }
    }

    return { record, payload, content: text };
}
