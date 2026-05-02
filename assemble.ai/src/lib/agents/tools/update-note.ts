/**
 * update_note - propose edits to an existing project note.
 */

import { db } from '@/lib/db';
import { documents, fileAssets, notes, versions } from '@/lib/db/pg-schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    ensureAtLeastOneDefined,
    optionalBoolean,
    optionalEnum,
    optionalNullableIsoDate,
    optionalNullableString,
    optionalStringArray,
    requiredString,
    updateDiffChanges,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface UpdateNoteInput extends Record<string, unknown> {
    id: string;
    title?: string;
    content?: string | null;
    isStarred?: boolean;
    color?: 'yellow' | 'blue' | 'green' | 'pink' | 'white';
    type?: 'rfi' | 'notice' | 'eot' | 'defect' | 'variation' | 'risk' | 'transmittal' | 'review' | 'note';
    status?: 'open' | 'closed';
    noteDate?: string | null;
    attachDocumentIds?: string[];
    _toolUseId?: string;
}

const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink', 'white'] as const;
const NOTE_TYPES = ['rfi', 'notice', 'eot', 'defect', 'variation', 'risk', 'transmittal', 'review', 'note'] as const;
const NOTE_STATUSES = ['open', 'closed'] as const;
const TOOL = 'update_note';
const CHANGE_KEYS = ['title', 'content', 'isStarred', 'color', 'type', 'status', 'noteDate', 'attachDocumentIds'];

function claimsDocumentAttachment(input: Pick<UpdateNoteInput, 'title' | 'content'>): boolean {
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

const definition: AgentToolDefinition<UpdateNoteInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose edits to one existing note. Call list_notes first to find the current note id and content. Optional attachDocumentIds appends explicit existing project document IDs to the note. For natural requests like "attach all mechanical documents" to an existing note, prefer attach_documents_to_note with noteTitle/noteId and disciplineOrTrade instead of this lower-level tool. Do not say documents are attached unless attachDocumentIds is populated. The change requires user approval.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Note id from list_notes.' },
                title: { type: 'string' },
                content: { type: ['string', 'null'] },
                isStarred: { type: 'boolean' },
                color: { type: 'string', enum: [...NOTE_COLORS] },
                type: { type: 'string', enum: [...NOTE_TYPES] },
                status: { type: 'string', enum: [...NOTE_STATUSES] },
                noteDate: { type: ['string', 'null'], description: 'YYYY-MM-DD or null.' },
                attachDocumentIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Existing project document IDs to attach to this note without removing current attachments.',
                },
            },
            required: ['id'],
        },
    },
    mutating: true,
    validate(input: unknown): UpdateNoteInput {
        const obj = asObject(input, TOOL);
        const out: UpdateNoteInput = { id: requiredString(obj, 'id', TOOL) };
        const title = optionalNullableString(obj, 'title', TOOL);
        if (title !== undefined) {
            if (title === null) throw new Error(`${TOOL}: "title" cannot be null`);
            out.title = title;
        }
        const content = optionalNullableString(obj, 'content', TOOL);
        if (content !== undefined) out.content = content;
        const isStarred = optionalBoolean(obj, 'isStarred', TOOL);
        if (isStarred !== undefined) out.isStarred = isStarred;
        const color = optionalEnum(obj, 'color', NOTE_COLORS, TOOL);
        if (color !== undefined) out.color = color;
        const type = optionalEnum(obj, 'type', NOTE_TYPES, TOOL);
        if (type !== undefined) out.type = type;
        const status = optionalEnum(obj, 'status', NOTE_STATUSES, TOOL);
        if (status !== undefined) out.status = status;
        const noteDate = optionalNullableIsoDate(obj, 'noteDate', TOOL);
        if (noteDate !== undefined) out.noteDate = noteDate;
        const attachDocumentIds = optionalStringArray(obj, 'attachDocumentIds', TOOL);
        if (attachDocumentIds !== undefined) out.attachDocumentIds = attachDocumentIds;
        if (claimsDocumentAttachment(out) && (out.attachDocumentIds?.length ?? 0) === 0) {
            throw new Error(
                `${TOOL}: attachDocumentIds are required when the note claims documents are attached. ` +
                    'Use list_project_documents with includeDocuments=true, then pass the returned document ids.'
            );
        }
        copyToolUseId(obj, out);
        ensureAtLeastOneDefined(out, CHANGE_KEYS, TOOL);
        return out;
    },
    async execute(ctx: ToolContext, input: UpdateNoteInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

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

        if (!row) throw new Error(`Note ${input.id} not found in this project.`);

        const documentNames = await resolveDocumentNames(ctx.projectId, input.attachDocumentIds ?? []);
        const missingDocumentIds = (input.attachDocumentIds ?? []).filter((id) => !documentNames.has(id));
        if (missingDocumentIds.length > 0) {
            throw new Error(`${TOOL}: document(s) not found in this project: ${missingDocumentIds.join(', ')}`);
        }

        const changes = updateDiffChanges(input, row as unknown as Record<string, unknown>, [
            { key: 'title', label: 'Title' },
            { key: 'content', label: 'Content' },
            { key: 'isStarred', label: 'Starred' },
            { key: 'color', label: 'Colour' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'noteDate', label: 'Note date' },
            {
                key: 'attachDocumentIds',
                label: 'Attach documents',
                format: (value) => formatDocumentIds(value, documentNames),
            },
        ]);
        if (changes.length === 0) throw new Error(`${TOOL}: proposed values are identical to the current note.`);

        const summary = `Update note - ${row.title}`;
        const diff: ProposedDiff = {
            entity: 'note',
            entityId: row.id,
            summary,
            changes,
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input,
                proposedDiff: diff,
                expectedRowVersion: row.rowVersion ?? 1,
            })
        ).toolResult;
    },
};

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

registerTool(definition);

export { definition as updateNoteTool };
