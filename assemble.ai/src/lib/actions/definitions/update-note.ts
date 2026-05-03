import { z } from 'zod';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents, fileAssets, notes, versions } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyUpdateNote } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink', 'white'] as const;
const NOTE_TYPES = ['rfi', 'notice', 'eot', 'defect', 'variation', 'risk', 'transmittal', 'review', 'note'] as const;
const NOTE_STATUSES = ['open', 'closed'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHANGE_KEYS = ['title', 'content', 'isStarred', 'color', 'type', 'status', 'noteDate', 'attachDocumentIds'] as const;
const FIELD_LABELS: Record<(typeof CHANGE_KEYS)[number], string> = {
    title: 'Title',
    content: 'Content',
    isStarred: 'Starred',
    color: 'Colour',
    type: 'Type',
    status: 'Status',
    noteDate: 'Note date',
    attachDocumentIds: 'Attach documents',
};

const optionalTrimmedString = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1)
).optional();
const optionalNullableTrimmedString = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    },
    z.union([z.string(), z.null()])
).optional();
const dedupedStringArray = z.preprocess(
    (value) =>
        Array.isArray(value)
            ? Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : item))))
            : value,
    z.array(z.string().min(1))
);

function claimsDocumentAttachment(input: { title?: string; content?: string | null }): boolean {
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
        id: z.string().trim().min(1),
        title: optionalTrimmedString,
        content: optionalNullableTrimmedString,
        isStarred: z.boolean().optional(),
        color: z.enum(NOTE_COLORS).optional(),
        type: z.enum(NOTE_TYPES).optional(),
        status: z.enum(NOTE_STATUSES).optional(),
        noteDate: z.union([z.string().regex(ISO_DATE), z.null()]).optional(),
        attachDocumentIds: dedupedStringArray.optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!CHANGE_KEYS.some((key) => input[key] !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one note field is required.',
                path: ['id'],
            });
        }
        if (claimsDocumentAttachment(input) && (input.attachDocumentIds?.length ?? 0) === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'attachDocumentIds are required when the note claims documents are attached.',
                path: ['attachDocumentIds'],
            });
        }
    });

type UpdateNoteInput = z.infer<typeof inputSchema>;

async function resolveDocumentNames(projectId: string, documentIds: string[]): Promise<Map<string, string>> {
    const ids = Array.from(new Set(documentIds.filter(Boolean)));
    const names = new Map<string, string>();
    if (ids.length === 0) return names;

    const rows = await db
        .select({
            id: documents.id,
            originalName: fileAssets.originalName,
            drawingName: fileAssets.drawingName,
        })
        .from(documents)
        .leftJoin(versions, eq(documents.latestVersionId, versions.id))
        .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
        .where(and(eq(documents.projectId, projectId), inArray(documents.id, ids)));

    for (const row of rows) {
        names.set(row.id, row.drawingName ?? row.originalName ?? row.id);
    }
    return names;
}

function formatDocumentIds(value: unknown, documentNames: Map<string, string>): unknown {
    if (!Array.isArray(value)) return value;
    const ids = value.map(String);
    if (ids.length === 0) return 'None';

    const names = ids.map((id) => documentNames.get(id) ?? id).slice(0, 20);
    const suffix = ids.length > names.length ? `, +${ids.length - names.length} more` : '';
    return `${ids.length} document${ids.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
}

export const updateNoteAction = defineAction<UpdateNoteInput, Record<string, unknown>>({
    id: 'correspondence.note.update',
    toolName: 'update_note',
    domain: 'correspondence',
    description: 'Update one existing project note.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'program', 'design', 'orchestrator'],
    emits: [{ entity: 'note', op: 'updated' }],
    uiTarget: { tab: 'notes', focusEntity: 'note' },
    async prepareProposal(ctx, input) {
        const [row] = await db
            .select()
            .from(notes)
            .where(
                and(
                    eq(notes.id, input.id),
                    eq(notes.projectId, ctx.projectId),
                    eq(notes.organizationId, ctx.organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .limit(1);

        if (!row) {
            throw new Error(`Note ${input.id} not found in this project.`);
        }

        const documentNames = await resolveDocumentNames(ctx.projectId, input.attachDocumentIds ?? []);
        const missingDocumentIds = (input.attachDocumentIds ?? []).filter((id) => !documentNames.has(id));
        if (missingDocumentIds.length > 0) {
            throw new Error(`update_note: document(s) not found in this project: ${missingDocumentIds.join(', ')}`);
        }

        const rowRecord = row as Record<string, unknown>;
        const changes: ProposedDiff['changes'] = [];
        for (const key of CHANGE_KEYS) {
            const next = input[key];
            if (next === undefined) continue;
            const current = rowRecord[key];
            if (current === next) continue;
            const format = key === 'attachDocumentIds'
                ? (value: unknown) => formatDocumentIds(value, documentNames)
                : (value: unknown) => value;
            changes.push({
                field: key,
                label: FIELD_LABELS[key],
                before: format(current),
                after: format(next),
            });
        }
        if (changes.length === 0) {
            throw new Error('The proposed note values are identical to the current note.');
        }

        return {
            proposedDiff: {
                entity: 'note',
                entityId: row.id,
                summary: `Update note - ${row.title}`,
                changes,
            },
            expectedRowVersion: row.rowVersion ?? 1,
        };
    },
    applyResult(ctx, input, meta) {
        return applyUpdateNote(input, meta?.expectedRowVersion ?? null, ctx);
    },
});
