import { db } from '@/lib/db';
import {
    addenda,
    addendumTransmittals,
    documents,
    notes,
    noteTransmittals,
    projectStakeholders,
    subcategories,
    transmittalItems,
    transmittals,
} from '@/lib/db/pg-schema';
import { and, eq, inArray, isNull, max, or, sql } from 'drizzle-orm';

export interface CommunicationArtifactContext {
    organizationId: string;
    projectId: string;
    userId?: string;
    threadId?: string | null;
    runId?: string | null;
}

export type CommunicationArtifactResult =
    | { kind: 'applied'; output: Record<string, unknown> }
    | { kind: 'conflict'; reason: string }
    | { kind: 'gone'; reason: string };

export interface CreateCommunicationNoteInput {
    title: string;
    content?: string | null;
    isStarred?: boolean;
    color?: string;
    type?: string;
    status?: string;
    noteDate?: string | null;
    documentIds?: string[];
}

export interface CreateAddendumArtifactInput {
    stakeholderId: string;
    content: string;
    documentIds?: string[];
    addendumDate?: string | null;
}

export interface CreateTransmittalArtifactInput {
    name: string;
    documentIds?: string[];
    stakeholderId?: string | null;
    subcategoryId?: string | null;
    destination?: string | null;
}

export interface UpdateCommunicationNoteInput {
    id: string;
    title?: string | null;
    content?: string | null;
    color?: string | null;
    type?: string | null;
    status?: string | null;
    noteDate?: string | null;
    isStarred?: boolean;
    attachDocumentIds?: string[];
}

type DbClient = Pick<typeof db, 'select' | 'insert' | 'update'>;

function newArtifactId(): string {
    return crypto.randomUUID();
}

function dedupeStringArray(values: string[] | undefined): string[] {
    return Array.from(new Set((values ?? []).filter(Boolean)));
}

function conflictReason(entity: string, currentVersion: number | null, expectedVersion: number | null): string {
    return `The ${entity} was changed by someone else (version is now ${currentVersion}, agent proposed against version ${expectedVersion}). Re-read the row and propose again.`;
}

export async function validateCommunicationDocuments(
    projectId: string,
    documentIds: string[] | undefined,
    client: DbClient = db
): Promise<{ ok: true; ids: string[] } | { ok: false; reason: string }> {
    const ids = dedupeStringArray(documentIds);
    if (ids.length === 0) return { ok: true, ids: [] };

    const rows = await client
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.projectId, projectId), inArray(documents.id, ids)));

    const found = new Set(rows.map((row) => row.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
        return {
            ok: false,
            reason: `Document(s) not found in this project: ${missing.join(', ')}`,
        };
    }
    return { ok: true, ids };
}

export async function attachDocumentsToNote(
    noteId: string,
    documentIds: string[] | undefined,
    client: DbClient = db
): Promise<string[]> {
    const ids = dedupeStringArray(documentIds);
    if (ids.length === 0) return [];

    const existingRows = await client
        .select({ documentId: noteTransmittals.documentId })
        .from(noteTransmittals)
        .where(eq(noteTransmittals.noteId, noteId));
    const existing = new Set(existingRows.map((row) => row.documentId));
    const now = new Date().toISOString();

    for (const documentId of ids) {
        if (existing.has(documentId)) continue;
        await client.insert(noteTransmittals).values({
            id: newArtifactId(),
            noteId,
            documentId,
            addedAt: now,
        });
    }

    return ids;
}

export async function createCommunicationNote(
    ctx: CommunicationArtifactContext,
    input: CreateCommunicationNoteInput
): Promise<CommunicationArtifactResult> {
    if (!input.title) return { kind: 'gone', reason: 'Missing note title on proposal.' };

    const documentCheck = await validateCommunicationDocuments(ctx.projectId, input.documentIds);
    if (documentCheck.ok === false) return { kind: 'gone', reason: documentCheck.reason };

    const id = newArtifactId();
    const now = new Date().toISOString();
    const values = {
        id,
        projectId: ctx.projectId,
        organizationId: ctx.organizationId,
        title: input.title,
        content: input.content ?? null,
        isStarred: input.isStarred ?? false,
        color: input.color ?? 'purple',
        type: input.type ?? 'note',
        status: input.status ?? 'open',
        noteDate: input.noteDate ?? null,
        rowVersion: 1,
        createdAt: now,
        updatedAt: now,
    };

    await db.transaction(async (tx) => {
        await tx.insert(notes).values(values);
        for (const documentId of documentCheck.ids) {
            await tx.insert(noteTransmittals).values({
                id: newArtifactId(),
                noteId: id,
                documentId,
                addedAt: now,
            });
        }
    });

    return {
        kind: 'applied',
        output: { ...values, attachedDocumentIds: documentCheck.ids },
    };
}

export async function createAddendumArtifact(
    ctx: CommunicationArtifactContext,
    input: CreateAddendumArtifactInput
): Promise<CommunicationArtifactResult> {
    const stakeholderId = input.stakeholderId;
    const content = input.content;
    if (!stakeholderId || !content) {
        return { kind: 'gone', reason: 'Missing stakeholder or content on proposed addendum.' };
    }

    const [stakeholder] = await db
        .select({ id: projectStakeholders.id })
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.id, stakeholderId),
                eq(projectStakeholders.projectId, ctx.projectId),
                isNull(projectStakeholders.deletedAt)
            )
        )
        .limit(1);
    if (!stakeholder) {
        return { kind: 'gone', reason: 'Stakeholder no longer exists in this project.' };
    }

    const documentCheck = await validateCommunicationDocuments(ctx.projectId, input.documentIds);
    if (documentCheck.ok === false) return { kind: 'gone', reason: documentCheck.reason };

    const id = newArtifactId();
    const now = new Date();

    const output = await db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ maxNum: max(addenda.addendumNumber) })
            .from(addenda)
            .where(and(eq(addenda.projectId, ctx.projectId), eq(addenda.stakeholderId, stakeholderId)))
            .limit(1);

        const addendumNumber = Number(existing?.maxNum ?? 0) + 1;
        const values = {
            id,
            projectId: ctx.projectId,
            stakeholderId,
            addendumNumber,
            content,
            addendumDate: input.addendumDate ?? null,
            createdAt: now,
            updatedAt: now,
        };

        await tx.insert(addenda).values(values);

        if (documentCheck.ids.length > 0) {
            await tx.insert(addendumTransmittals).values(
                documentCheck.ids.map((documentId, index) => ({
                    id: newArtifactId(),
                    addendumId: id,
                    documentId,
                    sortOrder: index,
                    createdAt: now,
                }))
            );
        }

        return {
            ...values,
            attachedDocumentIds: documentCheck.ids,
            transmittalCount: documentCheck.ids.length,
        } as unknown as Record<string, unknown>;
    });

    return { kind: 'applied', output };
}

export async function createTransmittalArtifact(
    ctx: CommunicationArtifactContext,
    input: CreateTransmittalArtifactInput
): Promise<CommunicationArtifactResult> {
    const name = input.name;
    if (!name) return { kind: 'gone', reason: 'Missing transmittal name.' };

    const stakeholderId = input.stakeholderId ?? null;
    const subcategoryId = input.subcategoryId ?? null;
    const rawDestination = input.destination ?? null;
    if (rawDestination && rawDestination !== 'note' && rawDestination !== 'project') {
        return { kind: 'gone', reason: 'Unknown transmittal destination.' };
    }
    const destination = rawDestination ?? (stakeholderId || subcategoryId ? 'project' : 'note');

    if (stakeholderId) {
        const [stakeholder] = await db
            .select({ id: projectStakeholders.id })
            .from(projectStakeholders)
            .where(
                and(
                    eq(projectStakeholders.id, stakeholderId),
                    eq(projectStakeholders.projectId, ctx.projectId),
                    isNull(projectStakeholders.deletedAt)
                )
            )
            .limit(1);
        if (!stakeholder) {
            return { kind: 'gone', reason: 'Stakeholder no longer exists in this project.' };
        }
    }

    if (subcategoryId) {
        const [subcategory] = await db
            .select({ id: subcategories.id })
            .from(subcategories)
            .where(
                and(
                    eq(subcategories.id, subcategoryId),
                    or(eq(subcategories.projectId, ctx.projectId), isNull(subcategories.projectId))
                )
            )
            .limit(1);
        if (!subcategory) {
            return { kind: 'gone', reason: 'Subcategory no longer exists in this project.' };
        }
    }

    if (destination === 'project' && !stakeholderId && !subcategoryId) {
        return {
            kind: 'gone',
            reason:
                'Project transmittals require a stakeholder or subcategory target. Use a Notes section transmittal for untargeted drawing sets.',
        };
    }

    const documentIds = dedupeStringArray(input.documentIds);
    if (documentIds.length === 0) {
        return { kind: 'gone', reason: 'No documents were supplied for the transmittal.' };
    }

    const rows = await db
        .select({
            id: documents.id,
            latestVersionId: documents.latestVersionId,
        })
        .from(documents)
        .where(and(eq(documents.projectId, ctx.projectId), inArray(documents.id, documentIds)));

    const byId = new Map(rows.map((row) => [row.id, row.latestVersionId]));
    const missing = documentIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
        return {
            kind: 'gone',
            reason: `Document(s) not found in this project: ${missing.join(', ')}`,
        };
    }

    const withoutVersion = documentIds.filter((id) => !byId.get(id));
    if (withoutVersion.length > 0) {
        return {
            kind: 'gone',
            reason: `Document(s) do not have a latest version: ${withoutVersion.join(', ')}`,
        };
    }

    const id = newArtifactId();
    if (destination === 'note') {
        const now = new Date().toISOString();
        const output = await db.transaction(async (tx) => {
            const values = {
                id,
                projectId: ctx.projectId,
                organizationId: ctx.organizationId,
                title: name,
                content: null,
                isStarred: false,
                color: 'green',
                type: 'transmittal',
                status: 'open',
                noteDate: null,
                rowVersion: 1,
                createdAt: now,
                updatedAt: now,
            };

            await tx.insert(notes).values(values);
            await tx.insert(noteTransmittals).values(
                documentIds.map((documentId) => ({
                    id: newArtifactId(),
                    noteId: id,
                    documentId,
                    addedAt: now,
                }))
            );

            return {
                ...values,
                transmittalTarget: 'note',
                attachedDocumentIds: documentIds,
                documentCount: documentIds.length,
            } as unknown as Record<string, unknown>;
        });

        return { kind: 'applied', output };
    }

    const now = new Date();
    const output = await db.transaction(async (tx) => {
        const values = {
            id,
            projectId: ctx.projectId,
            stakeholderId,
            subcategoryId,
            name,
            status: 'DRAFT',
            createdAt: now,
            updatedAt: now,
        };

        await tx.insert(transmittals).values(values);
        await tx.insert(transmittalItems).values(
            documentIds.map((documentId) => ({
                id: newArtifactId(),
                transmittalId: id,
                versionId: byId.get(documentId)!,
            }))
        );

        return {
            ...values,
            transmittalTarget: 'project',
            documentIds,
            documentCount: documentIds.length,
        } as unknown as Record<string, unknown>;
    });

    return { kind: 'applied', output };
}

export async function updateCommunicationNote(
    ctx: CommunicationArtifactContext,
    input: UpdateCommunicationNoteInput,
    expectedRowVersion: number | null
): Promise<CommunicationArtifactResult> {
    const id = input.id;
    if (!id) return { kind: 'gone', reason: 'Missing note id' };

    const documentCheck = await validateCommunicationDocuments(ctx.projectId, input.attachDocumentIds);
    if (documentCheck.ok === false) return { kind: 'gone', reason: documentCheck.reason };

    const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
        rowVersion: sql`${notes.rowVersion} + 1`,
    };
    for (const key of ['title', 'content', 'color', 'type', 'status', 'noteDate'] as const) {
        if (input[key] !== undefined) updateData[key] = input[key];
    }
    if (input.isStarred !== undefined) updateData.isStarred = input.isStarred;

    const conditions = [
        eq(notes.id, id),
        eq(notes.projectId, ctx.projectId),
        eq(notes.organizationId, ctx.organizationId),
        isNull(notes.deletedAt),
    ];
    if (expectedRowVersion !== null) conditions.push(eq(notes.rowVersion, expectedRowVersion));

    const updateResult = await db.transaction(async (tx) => {
        const updated = await tx.update(notes).set(updateData).where(and(...conditions)).returning();
        if (updated.length !== 1) return null;
        await attachDocumentsToNote(id, documentCheck.ids, tx);
        return {
            ...(updated[0] as Record<string, unknown>),
            attachedDocumentIds: documentCheck.ids,
        } as Record<string, unknown>;
    });
    if (updateResult) {
        return {
            kind: 'applied',
            output: updateResult,
        };
    }

    const [stillThere] = await db
        .select({ id: notes.id, rowVersion: notes.rowVersion })
        .from(notes)
        .where(
            and(
                eq(notes.id, id),
                eq(notes.projectId, ctx.projectId),
                eq(notes.organizationId, ctx.organizationId),
                isNull(notes.deletedAt)
            )
        )
        .limit(1);
    if (!stillThere) return { kind: 'gone', reason: 'Note no longer exists.' };
    return { kind: 'conflict', reason: conflictReason('note', stillThere.rowVersion, expectedRowVersion) };
}
