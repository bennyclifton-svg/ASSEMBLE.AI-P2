import { randomUUID } from 'crypto';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    correspondence,
    correspondenceThreads,
    projectInboxes,
} from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { normalizeSubject } from '@/lib/correspondence/threading';
import { defineAction } from '../define';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const inputSchema = z.object({
    inboundCorrespondenceId: z.string().trim().min(1).optional(),
    draftType: z.enum(['request_particulars', 'assessment_response']),
    toEmail: z.string().trim().email().optional(),
    toName: z.string().trim().min(1).optional(),
    ccEmails: z.array(z.string().trim().email()).optional(),
    subject: z.string().trim().min(1).optional(),
    bodyText: z.string().trim().min(1),
    responseRequiredBy: z.string().regex(ISO_DATE).optional(),
    deliveryAssessmentSummary: z.string().trim().min(1).optional(),
    deliveryTrace: z.object({
        source: z.enum(['inbound_email', 'manual_entry', 'unknown']).optional(),
        trigger: z.enum(['auto_triage', 'manual_review', 'unknown']).optional(),
        agentName: z.string().trim().min(1).optional(),
        workflowKey: z.string().trim().min(1).nullable().optional(),
        draftingMode: z.enum([
            'deterministic_delivery_lite_template',
            'llm_assisted_delivery_template',
            'llm_generated',
            'manual',
            'none',
        ]).optional(),
        llmUsed: z.boolean().optional(),
        knowledgeLibraryUsed: z.boolean().optional(),
        approvalRequired: z.boolean().optional(),
        proposedActions: z.array(z.string().trim().min(1)).optional(),
        documentsReviewed: z.array(z.string().trim().min(1)).optional(),
    }).optional(),
    markAsSentInAssemble: z.boolean().default(true),
    _toolUseId: z.string().optional(),
});

type CreateOutboundCorrespondenceInput = z.infer<typeof inputSchema>;

interface ResolvedOutboundInput extends CreateOutboundCorrespondenceInput {
    threadId: string;
    toEmail: string;
    subject: string;
    inReplyTo?: string | null;
    referencesMessageIds?: string[];
    inboundSubject?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function addChange(
    changes: ProposedDiff['changes'],
    label: string,
    after: unknown,
    field = label.toLowerCase().replace(/\s+/g, '_')
): void {
    if (after === undefined || after === null || after === '') return;
    changes.push({ field, label, before: '-', after });
}

async function resolveOutboundInput(
    projectId: string,
    input: CreateOutboundCorrespondenceInput,
    options: { createThread: boolean }
): Promise<ResolvedOutboundInput> {
    let threadId = '';
    let toEmail = input.toEmail;
    let subject = input.subject;
    let inReplyTo: string | null | undefined;
    let referencesMessageIds: string[] = [];
    let inboundSubject: string | undefined;

    if (input.inboundCorrespondenceId) {
        const [inbound] = await db
            .select({
                id: correspondence.id,
                threadId: correspondence.threadId,
                providerMessageId: correspondence.providerMessageId,
                fromEmail: correspondence.fromEmail,
                subject: correspondence.subject,
                referencesMessageIds: correspondence.referencesMessageIds,
            })
            .from(correspondence)
            .where(
                and(
                    eq(correspondence.id, input.inboundCorrespondenceId),
                    eq(correspondence.projectId, projectId)
                )
            )
            .limit(1);

        if (!inbound) {
            throw new Error(`Inbound correspondence ${input.inboundCorrespondenceId} was not found.`);
        }
        if (inbound.threadId) threadId = inbound.threadId;
        toEmail = toEmail || inbound.fromEmail;
        subject = subject || `Re: ${inbound.subject}`;
        inReplyTo = inbound.providerMessageId || null;
        referencesMessageIds = [
            ...(inbound.referencesMessageIds ?? []),
            ...(inbound.providerMessageId ? [inbound.providerMessageId] : []),
        ].filter((id, index, all) => all.indexOf(id) === index);
        inboundSubject = inbound.subject;
    }

    if (!toEmail) throw new Error('Outbound correspondence needs a recipient email.');
    if (!subject) throw new Error('Outbound correspondence needs a subject.');

    if (!threadId && options.createThread) {
        threadId = randomUUID();
        await db.insert(correspondenceThreads).values({
            id: threadId,
            projectId,
            subject,
            normalizedSubject: normalizeSubject(subject),
            lastMessageAt: new Date(),
            messageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    if (!threadId) threadId = 'pending-thread-on-approval';

    return {
        ...input,
        threadId,
        toEmail,
        subject,
        inReplyTo,
        referencesMessageIds,
        inboundSubject,
    };
}

async function projectFromEmail(projectId: string): Promise<string> {
    const [inbox] = await db
        .select({ emailAddress: projectInboxes.emailAddress })
        .from(projectInboxes)
        .where(eq(projectInboxes.projectId, projectId))
        .limit(1);

    return inbox?.emailAddress || 'project@inbound.assemble.local';
}

export const createOutboundCorrespondenceAction = defineAction<
    CreateOutboundCorrespondenceInput,
    Record<string, unknown>
>({
    id: 'correspondence.outbound_email.draft',
    toolName: 'draft_outbound_correspondence',
    domain: 'correspondence',
    description:
        'Draft and register an outbound contractor email inside Assemble. This does not send through an external mail provider.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    emits: [{ entity: 'correspondence', op: 'created' }],
    uiTarget: { tab: 'correspondence', focusEntity: 'correspondence' },
    async prepareProposal(ctx, input) {
        const resolved = await resolveOutboundInput(ctx.projectId, input, { createThread: false });
        const changes: ProposedDiff['changes'] = [];
        addChange(changes, 'Draft type', resolved.draftType);
        addChange(changes, 'To', resolved.toEmail);
        addChange(changes, 'Subject', resolved.subject);
        addChange(changes, 'Body', resolved.bodyText);
        addChange(changes, 'Linked inbound', resolved.inboundSubject || resolved.inboundCorrespondenceId);
        addChange(changes, 'Response required by', resolved.responseRequiredBy);
        addChange(
            changes,
            'Send status',
            resolved.markAsSentInAssemble ? 'Mark as sent in Assemble only' : 'Register as draft only'
        );

        return {
            proposedDiff: {
                entity: 'correspondence',
                entityId: null,
                summary: `Draft outbound email - ${resolved.subject}`,
                changes,
            },
            input: resolved,
        };
    },
    async apply(ctx, input) {
        const resolved = await resolveOutboundInput(ctx.projectId, input, { createThread: true });
        const id = randomUUID();
        const now = new Date();
        const fromEmail = await projectFromEmail(ctx.projectId);
        const sendStatus = resolved.markAsSentInAssemble
            ? 'sent_in_assemble'
            : 'draft_registered';

        await db.insert(correspondence).values({
            id,
            projectId: ctx.projectId,
            threadId: resolved.threadId,
            direction: 'outbound',
            correspondenceType: 'contractor_correspondence',
            classificationStatus: 'confirmed',
            providerMessageId: `assemble-outbound-${id}`,
            fromName: 'Assemble',
            fromEmail,
            toEmails: [resolved.toEmail],
            ccEmails: resolved.ccEmails ?? [],
            subject: resolved.subject,
            bodyText: resolved.bodyText,
            bodyHtml: null,
            sentAt: resolved.markAsSentInAssemble ? now : null,
            receivedAt: now,
            inReplyTo: resolved.inReplyTo ?? null,
            referencesMessageIds: resolved.referencesMessageIds ?? [],
            rawHeaders: {},
            rawPayload: {
                draftType: resolved.draftType,
                sendStatus,
                providerSend: 'deferred',
                inResponseToCorrespondenceId: resolved.inboundCorrespondenceId ?? null,
                responseRequiredBy: resolved.responseRequiredBy ?? null,
                deliveryAssessmentSummary: resolved.deliveryAssessmentSummary ?? null,
                deliveryTrace: resolved.deliveryTrace ?? null,
                createdByAction: 'correspondence.outbound_email.draft',
            },
            createdAt: now,
            updatedAt: now,
        });

        await db
            .update(correspondenceThreads)
            .set({
                lastMessageAt: now,
                messageCount: sql`${correspondenceThreads.messageCount} + 1`,
                updatedAt: now,
            })
            .where(eq(correspondenceThreads.id, resolved.threadId));

        if (resolved.inboundCorrespondenceId) {
            const [inbound] = await db
                .select({ rawPayload: correspondence.rawPayload })
                .from(correspondence)
                .where(
                    and(
                        eq(correspondence.id, resolved.inboundCorrespondenceId),
                        eq(correspondence.projectId, ctx.projectId)
                    )
                )
                .limit(1);
            const rawPayload = asRecord(inbound?.rawPayload);
            const variationTriage = asRecord(rawPayload.variationTriage);
            const existingTrace = asRecord(variationTriage.trace);
            await db
                .update(correspondence)
                .set({
                    rawPayload: {
                        ...rawPayload,
                        variationTriage: Object.keys(variationTriage).length
                            ? {
                                  ...variationTriage,
                                  trace: resolved.deliveryTrace
                                      ? {
                                            ...existingTrace,
                                            ...resolved.deliveryTrace,
                                        }
                                      : variationTriage.trace,
                              }
                            : rawPayload.variationTriage,
                        responseCorrespondenceId: id,
                        responseStatus: sendStatus,
                    },
                    updatedAt: now,
                })
                .where(eq(correspondence.id, resolved.inboundCorrespondenceId));
        }

        return {
            id,
            threadId: resolved.threadId,
            inboundCorrespondenceId: resolved.inboundCorrespondenceId ?? null,
            subject: resolved.subject,
            toEmail: resolved.toEmail,
            sendStatus,
            providerSend: 'deferred',
        };
    },
});
