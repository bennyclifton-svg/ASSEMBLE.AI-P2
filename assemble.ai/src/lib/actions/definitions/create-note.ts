import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents, notes, noteTransmittals } from '@/lib/db/pg-schema';
import { defineAction } from '../define';
import type { ActionContext } from '../types';
import type { ProposedDiff } from '@/lib/agents/approvals';

const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink', 'white'] as const;
const NOTE_TYPES = ['rfi', 'notice', 'eot', 'defect', 'variation', 'risk', 'transmittal', 'review', 'note'] as const;
const NOTE_STATUSES = ['open', 'closed'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function claimsDocumentAttachment(input: { title?: string; content?: string }): boolean {
    const text = `${input.title ?? ''} ${input.content ?? ''}`.toLowerCase();
    if (!text) return false;
    if (
        /\b(no|without|do not|don't|not)\b[\s\S]{0,50}\b(attach|attached|attaching|attachment|attachments)\b/.test(text)
    ) {
        return false;
    }
    const attachment = /\b(attach|attached|attaching|attachment|attachments)\b/;
    const document = /\b(documents?|drawings?|files?)\b/;
    return attachment.test(text) && document.test(text);
}

const inputSchema = z
    .object({
        title: z.string().trim().min(1),
        content: z.string().trim().optional(),
        isStarred: z.boolean().optional(),
        color: z.enum(NOTE_COLORS).optional(),
        type: z.enum(NOTE_TYPES).optional(),
        status: z.enum(NOTE_STATUSES).optional(),
        noteDate: z.string().regex(ISO_DATE).optional(),
        documentIds: z.array(z.string().trim().min(1)).optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (claimsDocumentAttachment(input) && (input.documentIds?.length ?? 0) === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'documentIds are required when the note claims documents are attached.',
                path: ['documentIds'],
            });
        }
    });

type CreateNoteInput = z.infer<typeof inputSchema>;

async function validateProjectDocuments(
    ctx: ActionContext,
    documentIds: string[] | undefined
): Promise<string[]> {
    const ids = Array.from(new Set(documentIds ?? []));
    if (ids.length === 0) return [];

    const rows = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.projectId, ctx.projectId), inArray(documents.id, ids)));
    const found = new Set(rows.map((row) => row.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
        throw new Error(`Document(s) not found in this project: ${missing.join(', ')}`);
    }
    return ids;
}

function createNoteDiff(input: CreateNoteInput): ProposedDiff {
    const changes: ProposedDiff['changes'] = [
        { field: 'title', label: 'Title', before: '-', after: input.title },
    ];
    if (input.content !== undefined) {
        changes.push({ field: 'content', label: 'Content', before: '-', after: input.content });
    }
    if (input.isStarred !== undefined) {
        changes.push({ field: 'isStarred', label: 'Starred', before: '-', after: input.isStarred });
    }
    if (input.color !== undefined) {
        changes.push({ field: 'color', label: 'Colour', before: '-', after: input.color });
    }
    if (input.type !== undefined) {
        changes.push({ field: 'type', label: 'Type', before: '-', after: input.type });
    }
    if (input.status !== undefined) {
        changes.push({ field: 'status', label: 'Status', before: '-', after: input.status });
    }
    if (input.noteDate !== undefined) {
        changes.push({ field: 'noteDate', label: 'Note date', before: '-', after: input.noteDate });
    }
    if (input.documentIds !== undefined) {
        changes.push({
            field: 'documentIds',
            label: 'Attached documents',
            before: '-',
            after: input.documentIds.join(', '),
        });
    }

    return {
        entity: 'note',
        entityId: null,
        summary: `Create note - ${input.title}`,
        changes,
    };
}

export const createNoteAction = defineAction<CreateNoteInput, Record<string, unknown>>({
    id: 'correspondence.note.create',
    // Keep the legacy safe tool name while this action replaces the old applicator path.
    toolName: 'create_note',
    domain: 'correspondence',
    description: 'Create a project note, optionally attaching existing project documents.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'program', 'design', 'orchestrator'],
    emits: [{ entity: 'note', op: 'created' }],
    uiTarget: { tab: 'notes', focusEntity: 'note' },
    preview(_ctx, input) {
        return createNoteDiff(input);
    },
    async apply(ctx, input) {
        const documentIds = await validateProjectDocuments(ctx, input.documentIds);
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const values = {
            id,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            title: input.title,
            content: input.content ?? null,
            isStarred: input.isStarred ?? false,
            color: input.color ?? 'yellow',
            type: input.type ?? 'note',
            status: input.status ?? 'open',
            noteDate: input.noteDate ?? null,
            rowVersion: 1,
            createdAt: now,
            updatedAt: now,
        };

        await db.transaction(async (tx) => {
            await tx.insert(notes).values(values);
            for (const documentId of documentIds) {
                await tx.insert(noteTransmittals).values({
                    id: crypto.randomUUID(),
                    noteId: id,
                    documentId,
                    addedAt: now,
                });
            }
        });

        return { ...values, attachedDocumentIds: documentIds };
    },
});
