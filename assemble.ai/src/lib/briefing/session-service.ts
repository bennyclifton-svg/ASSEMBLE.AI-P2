import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    briefAttachments,
    briefingMessages,
    briefingSessions,
    documents,
    projects,
} from '@/lib/db/pg-schema';
import { assembleContext } from '@/lib/context/orchestrator';
import type { BriefingProjectData } from '@/lib/context/modules/briefing-project';
import { DEFAULT_BRIEFING_COVERAGE, isComplete, normalizeCoverage } from './coverage-judge';
import type {
    BriefingContextSnapshot,
    BriefingDocumentMetadata,
    BriefingMessageRow,
    BriefingSessionRow,
    BriefingToolCallRecord,
} from './types';

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

function emptyBriefingProjectData(): BriefingProjectData {
    return {
        profile: null,
        projectDetails: null,
        objectives: [],
        attachments: [],
    };
}

async function assembleBriefingProjectData(projectId: string): Promise<BriefingProjectData> {
    const assembled = await assembleContext({
        projectId,
        task: 'Assemble briefing project context',
        contextType: 'briefing',
        includeKnowledgeDomains: false,
        includeAiMemory: false,
    });

    const briefingProject = assembled.rawModules.get('briefingProject');
    if (!briefingProject?.success || !briefingProject.data) {
        return emptyBriefingProjectData();
    }

    return briefingProject.data as BriefingProjectData;
}

export async function listBriefAttachments(projectId: string): Promise<BriefingDocumentMetadata[]> {
    const projectContext = await assembleBriefingProjectData(projectId);
    return projectContext.attachments;
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
    const [projectContext, messages] = await Promise.all([
        assembleBriefingProjectData(projectId),
        listMessages(session.id),
    ]);

    return {
        projectId,
        profile: projectContext.profile,
        projectDetails: projectContext.projectDetails,
        objectives: projectContext.objectives,
        attachments: projectContext.attachments,
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
