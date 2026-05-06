import { createHash, randomUUID } from 'crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
    categories,
    correspondence,
    correspondenceAttachments,
    correspondenceThreads,
    db,
    documents,
    fileAssets,
    projectInboxes,
    projects,
    versions,
} from '@/lib/db';
import { storage } from '@/lib/storage';
import type {
    CorrespondenceAddress,
    InboundCorrespondenceAttachmentInput,
    InboundCorrespondenceInput,
    ProjectInboxView,
} from '@/types/correspondence';
import {
    extractMessageIds,
    lowerHeaderMap,
    normalizeMessageId,
    normalizeSubject,
    parseAddress,
    parseAddressList,
} from './threading';

const CORRESPONDENCE_CATEGORY_ID = 'correspondence';
const DEFAULT_INBOUND_DOMAIN = 'inbound.assemble.local';

function inboundEmailDomain(): string {
    return (
        process.env.PROJECT_INBOUND_EMAIL_DOMAIN ||
        process.env.INBOUND_EMAIL_DOMAIN ||
        DEFAULT_INBOUND_DOMAIN
    ).trim().toLowerCase();
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24);
}

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeEmailList(addresses: CorrespondenceAddress[]): string[] {
    return Array.from(new Set(addresses.map((address) => address.email).filter(Boolean)));
}

function buildRawPayload(input: InboundCorrespondenceInput): Record<string, unknown> {
    if (input.rawPayload) return input.rawPayload;

    const { attachments = [], ...rest } = input;
    return {
        ...rest,
        attachments: attachments.map(({ contentBase64, ...attachment }) => ({
            ...attachment,
            encodedByteLength: contentBase64.length,
        })),
        attachmentCount: attachments.length,
    };
}

async function ensureCorrespondenceCategory(): Promise<void> {
    await db
        .insert(categories)
        .values({
            id: CORRESPONDENCE_CATEGORY_ID,
            name: 'Correspondence',
            isSystem: true,
        })
        .onConflictDoNothing();
}

export async function ensureProjectInbox(projectId: string): Promise<ProjectInboxView> {
    const [existing] = await db
        .select()
        .from(projectInboxes)
        .where(eq(projectInboxes.projectId, projectId))
        .limit(1);

    if (existing) {
        return {
            projectId: existing.projectId,
            localPart: existing.localPart,
            emailAddress: existing.emailAddress,
        };
    }

    const [project] = await db
        .select({
            id: projects.id,
            name: projects.name,
            code: projects.code,
        })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    if (!project) {
        throw new Error(`Project ${projectId} was not found.`);
    }

    const seed = project.code || project.name || project.id;
    const suffix = createHash('sha1').update(project.id).digest('hex').slice(0, 8);
    const localPart = `${slugify(seed) || 'project'}-${suffix}`;
    const emailAddress = `${localPart}@${inboundEmailDomain()}`;

    await db
        .insert(projectInboxes)
        .values({
            projectId,
            localPart,
            emailAddress,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .onConflictDoNothing();

    const [created] = await db
        .select()
        .from(projectInboxes)
        .where(eq(projectInboxes.projectId, projectId))
        .limit(1);

    if (!created) {
        throw new Error(`Could not create inbox for project ${projectId}.`);
    }

    return {
        projectId: created.projectId,
        localPart: created.localPart,
        emailAddress: created.emailAddress,
    };
}

export async function resolveProjectInboxByRecipients(
    recipientEmails: string[]
): Promise<ProjectInboxView | null> {
    const normalized = Array.from(
        new Set(recipientEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))
    );
    if (normalized.length === 0) return null;

    const [inbox] = await db
        .select()
        .from(projectInboxes)
        .where(inArray(projectInboxes.emailAddress, normalized))
        .limit(1);

    if (!inbox) return null;

    return {
        projectId: inbox.projectId,
        localPart: inbox.localPart,
        emailAddress: inbox.emailAddress,
    };
}

export function collectRecipientEmails(input: InboundCorrespondenceInput): string[] {
    return normalizeEmailList([
        ...parseAddressList(input.to),
        ...parseAddressList(input.cc),
    ]);
}

async function findThreadId(args: {
    projectId: string;
    normalizedSubject: string;
    referenceIds: string[];
}): Promise<string | null> {
    if (args.referenceIds.length > 0) {
        const [byReference] = await db
            .select({ threadId: correspondence.threadId })
            .from(correspondence)
            .where(
                and(
                    eq(correspondence.projectId, args.projectId),
                    inArray(correspondence.providerMessageId, args.referenceIds)
                )
            )
            .orderBy(desc(correspondence.receivedAt))
            .limit(1);

        if (byReference?.threadId) return byReference.threadId;
    }

    const [bySubject] = await db
        .select({ id: correspondenceThreads.id })
        .from(correspondenceThreads)
        .where(
            and(
                eq(correspondenceThreads.projectId, args.projectId),
                eq(correspondenceThreads.normalizedSubject, args.normalizedSubject)
            )
        )
        .orderBy(desc(correspondenceThreads.lastMessageAt))
        .limit(1);

    return bySubject?.id || null;
}

async function getOrCreateThread(args: {
    projectId: string;
    subject: string;
    normalizedSubject: string;
    referenceIds: string[];
    receivedAt: Date;
}): Promise<string> {
    const existingThreadId = await findThreadId(args);
    if (existingThreadId) return existingThreadId;

    const id = randomUUID();
    await db.insert(correspondenceThreads).values({
        id,
        projectId: args.projectId,
        subject: args.subject,
        normalizedSubject: args.normalizedSubject,
        lastMessageAt: args.receivedAt,
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return id;
}

async function createDocumentForAttachment(args: {
    projectId: string;
    attachment: InboundCorrespondenceAttachmentInput;
    buffer: Buffer;
}): Promise<{ documentId: string; fileAssetId: string; sizeBytes: number; mimeType: string }> {
    await ensureCorrespondenceCategory();

    const mimeType = args.attachment.contentType || 'application/octet-stream';
    const file = new File([new Uint8Array(args.buffer)], args.attachment.filename, { type: mimeType });
    const { path: storagePath, hash, size } = await storage.save(file, args.buffer);
    const now = new Date();
    const fileAssetId = randomUUID();
    const documentId = randomUUID();
    const versionId = randomUUID();

    await db.insert(fileAssets).values({
        id: fileAssetId,
        storagePath,
        originalName: args.attachment.filename,
        mimeType,
        sizeBytes: size,
        hash,
        ocrStatus: 'PENDING',
        createdAt: now,
    });

    await db.insert(documents).values({
        id: documentId,
        projectId: args.projectId,
        categoryId: CORRESPONDENCE_CATEGORY_ID,
        latestVersionId: versionId,
        createdAt: now,
        updatedAt: now,
    });

    await db.insert(versions).values({
        id: versionId,
        documentId,
        fileAssetId,
        versionNumber: 1,
        uploadedBy: 'Correspondence',
        createdAt: now,
    });

    try {
        const { addDrawingForExtraction } = await import('@/lib/queue/client');
        await addDrawingForExtraction(fileAssetId, storagePath, args.attachment.filename, mimeType);
    } catch (error) {
        console.warn('[correspondence] Failed to queue attachment drawing extraction:', error);
    }

    return { documentId, fileAssetId, sizeBytes: size, mimeType };
}

export async function ingestInboundCorrespondence(
    input: InboundCorrespondenceInput,
    projectIdOverride?: string
): Promise<{
    correspondenceId: string;
    threadId: string;
    attachmentCount: number;
    documentIds: string[];
    idempotent: boolean;
}> {
    const projectId = projectIdOverride || input.projectId;
    if (!projectId) throw new Error('projectId is required for inbound correspondence.');

    const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
    if (!project) throw new Error(`Project ${projectId} was not found.`);

    await ensureProjectInbox(projectId);

    const headers = lowerHeaderMap(input.headers);
    const subject = input.subject?.trim() || '(no subject)';
    const normalizedSubject = normalizeSubject(subject);
    const from = parseAddress(input.from);
    const toEmails = normalizeEmailList(parseAddressList(input.to));
    const ccEmails = normalizeEmailList(parseAddressList(input.cc));
    const receivedAt = parseDate(input.receivedAt) || new Date();
    const sentAt = parseDate(input.sentAt);
    const headerMessageId = Array.isArray(headers['message-id'])
        ? headers['message-id'][0]
        : headers['message-id'];
    const providerMessageId =
        normalizeMessageId(input.providerMessageId) ||
        normalizeMessageId(input.messageId) ||
        normalizeMessageId(headerMessageId) ||
        `generated-${randomUUID()}`;
    const headerInReplyTo = Array.isArray(headers['in-reply-to'])
        ? headers['in-reply-to'][0]
        : headers['in-reply-to'];
    const inReplyTo = normalizeMessageId(input.inReplyTo) || normalizeMessageId(headerInReplyTo);
    const headerReferences = headers.references;
    const referenceIds = Array.from(new Set([
        ...extractMessageIds(input.references),
        ...extractMessageIds(headerReferences),
        ...(inReplyTo ? [inReplyTo] : []),
    ]));

    const [existing] = await db
        .select({
            id: correspondence.id,
            threadId: correspondence.threadId,
        })
        .from(correspondence)
        .where(
            and(
                eq(correspondence.projectId, projectId),
                eq(correspondence.providerMessageId, providerMessageId)
            )
        )
        .limit(1);

    if (existing) {
        const attachments = await db
            .select({ documentId: correspondenceAttachments.documentId })
            .from(correspondenceAttachments)
            .where(eq(correspondenceAttachments.correspondenceId, existing.id));

        return {
            correspondenceId: existing.id,
            threadId: existing.threadId,
            attachmentCount: attachments.length,
            documentIds: attachments.map((attachment) => attachment.documentId).filter((id): id is string => Boolean(id)),
            idempotent: true,
        };
    }

    const threadId = await getOrCreateThread({
        projectId,
        subject,
        normalizedSubject,
        referenceIds,
        receivedAt,
    });

    const correspondenceId = randomUUID();
    await db.insert(correspondence).values({
        id: correspondenceId,
        projectId,
        threadId,
        direction: 'inbound',
        correspondenceType: input.correspondenceType || 'general',
        classificationStatus: input.correspondenceType ? 'confirmed' : 'unclassified',
        providerMessageId,
        fromName: from.name || null,
        fromEmail: from.email,
        toEmails,
        ccEmails,
        subject,
        bodyText: input.bodyText || null,
        bodyHtml: input.bodyHtml || null,
        sentAt,
        receivedAt,
        inReplyTo,
        referencesMessageIds: referenceIds,
        rawHeaders: headers,
        rawPayload: buildRawPayload(input),
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const documentIds: string[] = [];
    for (const attachment of input.attachments || []) {
        const buffer = Buffer.from(attachment.contentBase64, 'base64');
        const document = await createDocumentForAttachment({ projectId, attachment, buffer });
        documentIds.push(document.documentId);

        await db.insert(correspondenceAttachments).values({
            id: randomUUID(),
            correspondenceId,
            documentId: document.documentId,
            fileAssetId: document.fileAssetId,
            originalName: attachment.filename,
            mimeType: document.mimeType,
            sizeBytes: document.sizeBytes,
            contentId: attachment.contentId || null,
            createdAt: new Date(),
        });
    }

    await db
        .update(correspondenceThreads)
        .set({
            lastMessageAt: receivedAt,
            messageCount: sql`${correspondenceThreads.messageCount} + 1`,
            updatedAt: new Date(),
        })
        .where(eq(correspondenceThreads.id, threadId));

    return {
        correspondenceId,
        threadId,
        attachmentCount: documentIds.length,
        documentIds,
        idempotent: false,
    };
}
