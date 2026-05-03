/**
 * create_addendum - propose a new addendum and attach existing project documents.
 */

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    documents,
    fileAssets,
    projectStakeholders,
    versions,
} from '@/lib/db/pg-schema';
import { proposeApproval, type ProposedDiff } from '../approvals';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    asObject,
    copyToolUseId,
    createDiffChanges,
    optionalIsoDate,
    optionalStringArray,
    requiredString,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface CreateAddendumInput extends Record<string, unknown> {
    stakeholderId: string;
    content: string;
    documentIds?: string[];
    addendumDate?: string;
    _toolUseId?: string;
}

const TOOL = 'create_addendum';

const definition: AgentToolDefinition<CreateAddendumInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose a new addendum for a project stakeholder and attach existing project documents. Use for consultant addenda (Design) and contractor/tender addenda (Procurement/Document Control). Resolve stakeholderId with list_stakeholders and documentIds with list_project_documents/search_rag before calling. When the user says "the selection" or "selected set", pass the current selected documentIds from the app view exactly. If the user says "call it X", use X as content. The addendum is not created until the user approves the inline approval card.',
        inputSchema: {
            type: 'object',
            properties: {
                stakeholderId: {
                    type: 'string',
                    description:
                        'Project stakeholder id for the addendum recipient. For "Mechanical Consultant", use the consultant stakeholder, not a contractor.',
                },
                content: {
                    type: 'string',
                    description:
                        'Addendum content/details/title to record. If the user says "call it X", use X.',
                },
                documentIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Existing project document ids to attach to the addendum transmittal.',
                },
                addendumDate: {
                    type: 'string',
                    description: 'Optional addendum date in YYYY-MM-DD format.',
                },
            },
            required: ['stakeholderId', 'content'],
        },
    },
    mutating: true,
    validate(input: unknown): CreateAddendumInput {
        const obj = asObject(input, TOOL);
        const out: CreateAddendumInput = {
            stakeholderId: requiredString(obj, 'stakeholderId', TOOL),
            content: requiredString(obj, 'content', TOOL),
        };

        const documentIds = optionalStringArray(obj, 'documentIds', TOOL);
        if (documentIds !== undefined) out.documentIds = documentIds;

        const addendumDate = optionalIsoDate(obj, 'addendumDate', TOOL);
        if (addendumDate !== undefined) out.addendumDate = addendumDate;

        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: CreateAddendumInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

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
                    eq(projectStakeholders.id, input.stakeholderId),
                    eq(projectStakeholders.projectId, ctx.projectId),
                    isNull(projectStakeholders.deletedAt)
                )
            )
            .limit(1);

        if (!stakeholder) {
            throw new Error(`${TOOL}: stakeholderId was not found in this project`);
        }

        const documentIds = input.documentIds ?? [];
        const documentNames = await resolveDocumentNames(ctx.projectId, documentIds);
        const missingDocumentIds = documentIds.filter((id) => !documentNames.has(id));
        if (missingDocumentIds.length > 0) {
            throw new Error(`${TOOL}: document(s) not found in this project: ${missingDocumentIds.join(', ')}`);
        }

        const changes = createDiffChanges(
            {
                stakeholder: stakeholderLabel(stakeholder),
                content: input.content,
                addendumDate: input.addendumDate ?? null,
                documentIds,
            },
            [
                { key: 'stakeholder', label: 'Stakeholder' },
                { key: 'content', label: 'Content' },
                { key: 'addendumDate', label: 'Addendum date' },
                {
                    key: 'documentIds',
                    label: 'Attached documents',
                    format: (value) => {
                        const ids = Array.isArray(value) ? value : [];
                        if (ids.length === 0) return 'None';
                        const names = ids
                            .map((id) => documentNames.get(String(id)) ?? String(id))
                            .slice(0, 20);
                        const suffix = ids.length > names.length ? `, +${ids.length - names.length} more` : '';
                        return `${ids.length} document${ids.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
                    },
                },
            ]
        );

        const diff: ProposedDiff = {
            entity: 'addendum',
            entityId: null,
            summary: `Create addendum - ${addendumSummaryLabel(input.content, stakeholder)}`,
            changes,
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input,
                proposedDiff: diff,
                expectedRowVersion: null,
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

registerTool(definition);

export { definition as createAddendumTool };
