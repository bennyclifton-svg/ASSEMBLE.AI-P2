import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    briefAttachments,
    briefingMessages,
    briefingSessions,
    categories,
    documents,
    fileAssets,
    projectDetails,
    projectProfiles,
    projects,
    subcategories,
    versions,
} from '@/lib/db/pg-schema';
import { projectObjectives } from '@/lib/db/objectives-schema';
import { documentSetMembers } from '@/lib/db/rag-schema';
import { ragDb } from '@/lib/db/rag-client';
import { DEFAULT_BRIEFING_COVERAGE, isComplete, normalizeCoverage } from './coverage-judge';
import type {
    BriefingContextSnapshot,
    BriefingDocumentMetadata,
    BriefingMessageRow,
    BriefingSessionRow,
    BriefingToolCallRecord,
} from './types';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

export function serializeBriefingSession(row: BriefingSessionRow | null) {
    if (!row) return null;
    return {
        ...row,
        coverage: normalizeCoverage(row.coverage),
        isComplete: isComplete(row.coverage),
    };
}

export function serializeBriefingMessage(row: BriefingMessageRow) {
    return {
        ...row,
        toolCalls: (row.toolCalls ?? null) as BriefingToolCallRecord[] | null,
    };
}

export async function getActiveSession(projectId: string): Promise<BriefingSessionRow | null> {
    const [row] = await db
        .select()
        .from(briefingSessions)
        .where(and(eq(briefingSessions.projectId, projectId), eq(briefingSessions.status, 'active')))
        .limit(1);
    return row ?? null;
}

export async function getVisibleSession(projectId: string): Promise<BriefingSessionRow | null> {
    const active = await getActiveSession(projectId);
    if (active) return active;

    const [latest] = await db
        .select()
        .from(briefingSessions)
        .where(eq(briefingSessions.projectId, projectId))
        .orderBy(desc(briefingSessions.startedAt))
        .limit(1);
    return latest ?? null;
}

export async function startSession(projectId: string): Promise<BriefingSessionRow> {
    const active = await getActiveSession(projectId);
    if (active) return active;

    const [created] = await db
        .insert(briefingSessions)
        .values({
            projectId,
            status: 'active',
            coverage: DEFAULT_BRIEFING_COVERAGE,
        })
        .returning();
    return created;
}

export async function listMessages(sessionId: string): Promise<BriefingMessageRow[]> {
    return db
        .select()
        .from(briefingMessages)
        .where(eq(briefingMessages.sessionId, sessionId))
        .orderBy(asc(briefingMessages.createdAt));
}

export async function appendMessage(args: {
    sessionId: string;
    role: BriefingMessageRow['role'];
    content: string;
    toolCalls?: BriefingToolCallRecord[] | null;
}): Promise<BriefingMessageRow> {
    const [message] = await db
        .insert(briefingMessages)
        .values({
            sessionId: args.sessionId,
            role: args.role,
            content: args.content,
            toolCalls: args.toolCalls ?? null,
        })
        .returning();
    return message;
}

export async function endSession(args: {
    projectId: string;
    reason: 'user' | 'agent';
}): Promise<BriefingSessionRow | null> {
    const active = await getActiveSession(args.projectId);
    if (!active) return null;

    const status = args.reason === 'agent' || isComplete(active.coverage) ? 'completed' : 'abandoned';
    const [updated] = await db
        .update(briefingSessions)
        .set({
            status,
            completedAt: new Date(),
            endedBy: args.reason,
        })
        .where(eq(briefingSessions.id, active.id))
        .returning();
    return updated ?? null;
}

export async function updateSessionCoverage(
    sessionId: string,
    coverage: unknown
): Promise<BriefingSessionRow> {
    const normalized = normalizeCoverage(coverage);
    const [updated] = await db
        .update(briefingSessions)
        .set({
            coverage: normalized,
            ...(isComplete(normalized)
                ? { status: 'completed' as const, completedAt: new Date(), endedBy: 'agent' as const }
                : {}),
        })
        .where(eq(briefingSessions.id, sessionId))
        .returning();
    return updated;
}

async function getRagStatuses(documentIds: string[]): Promise<Map<string, string>> {
    const statuses = new Map<string, string>();
    if (documentIds.length === 0) return statuses;

    try {
        const rows = await ragDb
            .select({
                documentId: documentSetMembers.documentId,
                syncStatus: documentSetMembers.syncStatus,
            })
            .from(documentSetMembers)
            .where(inArray(documentSetMembers.documentId, documentIds));

        const rank: Record<string, number> = {
            synced: 4,
            processing: 3,
            pending: 2,
            failed: 1,
        };
        for (const row of rows) {
            const next = row.syncStatus ?? 'pending';
            const current = statuses.get(row.documentId);
            if (!current || (rank[next] ?? 0) > (rank[current] ?? 0)) {
                statuses.set(row.documentId, next);
            }
        }
    } catch {
        return statuses;
    }

    return statuses;
}

export async function listBriefAttachments(projectId: string): Promise<BriefingDocumentMetadata[]> {
    const rows = await db
        .select({
            attachmentId: briefAttachments.id,
            documentId: briefAttachments.documentId,
            attachedAt: briefAttachments.attachedAt,
            originalName: fileAssets.originalName,
            drawingName: fileAssets.drawingName,
            mimeType: fileAssets.mimeType,
            ocrStatus: fileAssets.ocrStatus,
            categoryName: categories.name,
            subcategoryName: subcategories.name,
        })
        .from(briefAttachments)
        .innerJoin(documents, eq(briefAttachments.documentId, documents.id))
        .leftJoin(versions, eq(documents.latestVersionId, versions.id))
        .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
        .leftJoin(categories, eq(documents.categoryId, categories.id))
        .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
        .where(eq(briefAttachments.projectId, projectId))
        .orderBy(asc(briefAttachments.attachedAt));

    const ragStatuses = await getRagStatuses(rows.map((row) => row.documentId));

    return rows.map((row) => ({
        attachmentId: row.attachmentId,
        documentId: row.documentId,
        title: row.drawingName ?? row.originalName ?? 'Untitled document',
        type: row.subcategoryName ?? row.categoryName ?? row.mimeType ?? null,
        pageCount: null,
        ocrStatus: row.ocrStatus ?? null,
        ragStatus: ragStatuses.get(row.documentId) ?? null,
        attachedAt: row.attachedAt,
    }));
}

export async function attachBriefDocuments(args: {
    projectId: string;
    userId: string;
    documentIds: string[];
}): Promise<BriefingDocumentMetadata[]> {
    const ids = Array.from(new Set(args.documentIds.filter(Boolean)));
    if (ids.length > 0) {
        const existingDocuments = await db
            .select({ id: documents.id })
            .from(documents)
            .where(and(eq(documents.projectId, args.projectId), inArray(documents.id, ids)));
        const validIds = new Set(existingDocuments.map((doc) => doc.id));
        const values = ids
            .filter((documentId) => validIds.has(documentId))
            .map((documentId) => ({
                projectId: args.projectId,
                documentId,
                attachedBy: args.userId,
            }));

        if (values.length > 0) {
            await db
                .insert(briefAttachments)
                .values(values)
                .onConflictDoNothing({
                    target: [briefAttachments.projectId, briefAttachments.documentId],
                });
        }
    }
    return listBriefAttachments(args.projectId);
}

export async function detachBriefDocument(args: {
    projectId: string;
    documentId: string;
}): Promise<void> {
    await db
        .delete(briefAttachments)
        .where(
            and(
                eq(briefAttachments.projectId, args.projectId),
                eq(briefAttachments.documentId, args.documentId)
            )
        );
}

export async function buildContextSnapshot(
    projectId: string,
    session: BriefingSessionRow
): Promise<BriefingContextSnapshot> {
    const [profile] = await db
        .select()
        .from(projectProfiles)
        .where(eq(projectProfiles.projectId, projectId))
        .limit(1);
    const [details] = await db
        .select()
        .from(projectDetails)
        .where(eq(projectDetails.projectId, projectId))
        .limit(1);
    const objectives = await db
        .select({
            id: projectObjectives.id,
            objectiveType: projectObjectives.objectiveType,
            text: projectObjectives.text,
            status: projectObjectives.status,
            source: projectObjectives.source,
            sortOrder: projectObjectives.sortOrder,
        })
        .from(projectObjectives)
        .where(
            and(
                eq(projectObjectives.projectId, projectId),
                eq(projectObjectives.isDeleted, false)
            )
        )
        .orderBy(asc(projectObjectives.objectiveType), asc(projectObjectives.sortOrder));

    const messages = await listMessages(session.id);
    const attachments = await listBriefAttachments(projectId);

    return {
        projectId,
        profile: profile
            ? {
                id: profile.id,
                buildingClass: profile.buildingClass,
                projectType: profile.projectType,
                subclass: parseJson(profile.subclass, []),
                subclassOther: parseJson(profile.subclassOther, []),
                scaleData: parseJson(profile.scaleData, {}),
                complexity: parseJson(profile.complexity, {}),
                workScope: parseJson(profile.workScope, []),
                complexityScore: profile.complexityScore,
                region: profile.region,
            }
            : null,
        projectDetails: details ?? null,
        objectives,
        attachments,
        session,
        messages,
    };
}

export async function projectBelongsToOrganization(args: {
    projectId: string;
    organizationId: string;
}): Promise<boolean> {
    const [row] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, args.projectId), eq(projects.organizationId, args.organizationId)))
        .limit(1);
    return Boolean(row);
}
