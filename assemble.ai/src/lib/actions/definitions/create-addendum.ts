import { z } from 'zod';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    documents,
    fileAssets,
    projectStakeholders,
    versions,
} from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyCreateAddendum } from '@/lib/agents/applicators';
import { defineAction } from '../define';
import type { ActionContext } from '../types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const requiredTrimmedString = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1)
);
const dedupedStringArray = z.preprocess(
    (value) =>
        Array.isArray(value)
            ? Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : item))))
            : value,
    z.array(z.string().min(1))
);

const inputSchema = z.object({
    stakeholderId: requiredTrimmedString,
    content: requiredTrimmedString,
    documentIds: dedupedStringArray.optional(),
    addendumDate: z.string().regex(ISO_DATE).optional(),
    _toolUseId: z.string().optional(),
});

type CreateAddendumInput = z.infer<typeof inputSchema>;

async function resolveStakeholder(ctx: ActionContext, stakeholderId: string) {
    const [stakeholder] = await db
        .select({
            id: projectStakeholders.id,
            name: projectStakeholders.name,
            stakeholderGroup: projectStakeholders.stakeholderGroup,
            disciplineOrTrade: projectStakeholders.disciplineOrTrade,
        })
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
        throw new Error('create_addendum: stakeholderId was not found in this project');
    }
    return stakeholder;
}

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

function stakeholderLabel(stakeholder: {
    name: string;
    stakeholderGroup: string;
    disciplineOrTrade: string | null;
}): string {
    const discipline = stakeholder.disciplineOrTrade ? ` - ${stakeholder.disciplineOrTrade}` : '';
    return `${stakeholder.name} (${stakeholder.stakeholderGroup}${discipline})`;
}

function addendumSummaryLabel(
    content: string,
    stakeholder: { name: string; stakeholderGroup: string; disciplineOrTrade: string | null }
): string {
    const trimmed = content.trim().replace(/\s+/g, ' ');
    if (trimmed && trimmed.length <= 80) return trimmed;
    return stakeholderLabel(stakeholder);
}

function formatDocumentIds(value: unknown, documentNames: Map<string, string>): unknown {
    const ids = Array.isArray(value) ? value.map(String) : [];
    if (ids.length === 0) return 'None';

    const names = ids.map((id) => documentNames.get(id) ?? id).slice(0, 20);
    const suffix = ids.length > names.length ? `, +${ids.length - names.length} more` : '';
    return `${ids.length} document${ids.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
}

async function resolveAddendumProposal(ctx: ActionContext, input: CreateAddendumInput) {
    const stakeholder = await resolveStakeholder(ctx, input.stakeholderId);
    const documentIds = input.documentIds ?? [];
    const documentNames = await resolveDocumentNames(ctx.projectId, documentIds);
    const missingDocumentIds = documentIds.filter((id) => !documentNames.has(id));
    if (missingDocumentIds.length > 0) {
        throw new Error(`create_addendum: document(s) not found in this project: ${missingDocumentIds.join(', ')}`);
    }

    const proposedInput: CreateAddendumInput = {
        stakeholderId: input.stakeholderId,
        content: input.content,
        ...(documentIds.length > 0 ? { documentIds } : {}),
        ...(input.addendumDate !== undefined ? { addendumDate: input.addendumDate } : {}),
        ...(input._toolUseId !== undefined ? { _toolUseId: input._toolUseId } : {}),
    };

    const proposedDiff: ProposedDiff = {
        entity: 'addendum',
        entityId: null,
        summary: `Create addendum - ${addendumSummaryLabel(input.content, stakeholder)}`,
        changes: [
            {
                field: 'stakeholder',
                label: 'Stakeholder',
                before: '-',
                after: stakeholderLabel(stakeholder),
            },
            { field: 'content', label: 'Content', before: '-', after: input.content },
            {
                field: 'addendumDate',
                label: 'Addendum date',
                before: '-',
                after: input.addendumDate ?? null,
            },
            {
                field: 'documentIds',
                label: 'Attached documents',
                before: '-',
                after: formatDocumentIds(documentIds, documentNames),
            },
        ],
    };

    return { proposedDiff, proposedInput };
}

export const createAddendumAction = defineAction<CreateAddendumInput, Record<string, unknown>>({
    id: 'correspondence.addendum.create',
    toolName: 'create_addendum',
    domain: 'correspondence',
    description:
        'Propose a new addendum for a project stakeholder and attach existing project documents. Use for consultant addenda (Design) and contractor/tender addenda (Procurement/Document Control). Resolve stakeholderId from the latest user request with list_stakeholders and documentIds with list_project_documents/search_rag before calling; do not reuse a prior addendum recipient. When the user says "the selection" or "selected set", pass the current selected documentIds from the app view exactly. If the user says "call it X", use X as content. The addendum is not created until the user approves the inline approval card.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design', 'orchestrator'],
    emits: [{ entity: 'addendum', op: 'created' }],
    uiTarget: { tab: 'procurement', focusEntity: 'addendum' },
    async prepareProposal(ctx, input) {
        const { proposedDiff, proposedInput } = await resolveAddendumProposal(ctx, input);
        return {
            proposedDiff,
            input: proposedInput,
        };
    },
    applyResult(ctx, input) {
        return applyCreateAddendum(input, ctx);
    },
});
