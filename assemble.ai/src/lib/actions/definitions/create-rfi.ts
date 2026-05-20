import { z } from 'zod';
import { defineAction } from '../define';
import type { ActionContext } from '../types';
import type { ProposedDiff } from '@/lib/actions/types';
import { drizzleRfiRepository, rfiService } from '@/lib/rfi/service';
import {
    RFI_EVIDENCE_TARGET_TYPES,
    RFI_PRIORITIES,
    RFI_STATUSES,
    type RfiEvidenceTargetType,
} from '@/types/rfi';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const evidenceSchema = z.object({
    targetType: z.enum(RFI_EVIDENCE_TARGET_TYPES),
    targetId: z.string().trim().min(1),
    citation: z.string().trim().min(1).optional(),
});

const inputSchema = z.object({
    title: z.string().trim().min(1),
    question: z.string().trim().min(1),
    status: z.enum(RFI_STATUSES).optional(),
    priority: z.enum(RFI_PRIORITIES).optional(),
    responsibleStakeholderId: z.union([z.string().trim().min(1), z.null()]).optional(),
    dueDate: z.union([z.string().regex(ISO_DATE), z.null()]).optional(),
    evidence: z.array(evidenceSchema).optional(),
    assumptions: z.array(z.string().trim().min(1)).optional(),
    _toolUseId: z.string().optional(),
});

type CreateRfiInput = z.infer<typeof inputSchema>;

interface ResolvedEvidence {
    targetType: RfiEvidenceTargetType;
    targetId: string;
    label: string;
    citation?: string;
}

function compactEvidence(input: CreateRfiInput): CreateRfiInput {
    const seen = new Set<string>();
    const evidence = (input.evidence ?? []).filter((item) => {
        const key = `${item.targetType}:${item.targetId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return {
        ...input,
        ...(evidence.length > 0 ? { evidence } : { evidence: undefined }),
    };
}

async function resolveResponsiblePartyLabel(
    ctx: ActionContext,
    stakeholderId: string | null | undefined
): Promise<string> {
    if (!stakeholderId) return 'Unassigned';
    const party = await drizzleRfiRepository.findResponsibleParty(ctx.projectId, stakeholderId);
    if (!party) {
        throw new Error('Responsible party must be an active stakeholder on this project.');
    }
    return party.disciplineOrTrade || party.organization || party.name;
}

async function resolveEvidence(
    ctx: ActionContext,
    evidence: CreateRfiInput['evidence'] = []
): Promise<ResolvedEvidence[]> {
    const resolved: ResolvedEvidence[] = [];
    for (const item of evidence) {
        const target = await drizzleRfiRepository.findEvidenceTarget(
            ctx.projectId,
            ctx.organizationId,
            item.targetType,
            item.targetId
        );
        if (!target) {
            throw new Error(`Evidence target not found in this project: ${item.targetType}:${item.targetId}`);
        }
        resolved.push({
            targetType: item.targetType,
            targetId: item.targetId,
            label: target.label,
            ...(item.citation ? { citation: item.citation } : {}),
        });
    }
    return resolved;
}

function formatEvidenceForDiff(evidence: ResolvedEvidence[]): string {
    if (evidence.length === 0) return 'None';
    return evidence
        .map((item) => {
            const ref = `${item.label} (${item.targetType})`;
            return item.citation ? `${ref} - ${item.citation}` : ref;
        })
        .join('\n');
}

function formatAssumptions(input: CreateRfiInput): string {
    return input.assumptions?.length ? input.assumptions.join('\n') : 'None';
}

async function createRfiDiff(ctx: ActionContext, input: CreateRfiInput): Promise<ProposedDiff> {
    const responsibleParty = await resolveResponsiblePartyLabel(ctx, input.responsibleStakeholderId);
    const evidence = await resolveEvidence(ctx, input.evidence);

    return {
        entity: 'rfi',
        entityId: null,
        summary: `Create RFI - ${input.title}`,
        changes: [
            { field: 'title', label: 'Title', before: '-', after: input.title },
            { field: 'question', label: 'Request / question', before: '-', after: input.question },
            { field: 'status', label: 'Status', before: '-', after: input.status ?? 'draft' },
            { field: 'priority', label: 'Priority', before: '-', after: input.priority ?? 'medium' },
            { field: 'responsibleParty', label: 'Responsible party', before: '-', after: responsibleParty },
            { field: 'dueDate', label: 'Due date', before: '-', after: input.dueDate ?? 'Not set' },
            { field: 'evidence', label: 'Evidence references', before: '-', after: formatEvidenceForDiff(evidence) },
            { field: 'assumptions', label: 'Assumptions / limits', before: '-', after: formatAssumptions(input) },
        ],
    };
}

export const createRfiAction = defineAction<CreateRfiInput, Record<string, unknown>>({
    id: 'correspondence.rfi.create',
    toolName: 'create_rfi',
    domain: 'correspondence',
    description:
        'Propose a typed project RFI from project context and evidence. Use this for AI-drafted RFIs; it creates the RFI only after explicit approval.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design'],
    emits: [{ entity: 'rfi', op: 'created' }],
    uiTarget: { tab: 'planning', sub: 'rfis', focusEntity: 'rfi' },
    async prepareProposal(ctx, input) {
        const proposalInput = compactEvidence(input);
        return {
            proposedDiff: await createRfiDiff(ctx, proposalInput),
            input: proposalInput,
        };
    },
    async apply(ctx, input) {
        const proposalInput = compactEvidence(input);
        await resolveEvidence(ctx, proposalInput.evidence);
        const created = await rfiService.create({
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            title: proposalInput.title,
            question: proposalInput.question,
            status: proposalInput.status ?? 'draft',
            priority: proposalInput.priority ?? 'medium',
            responsibleStakeholderId: proposalInput.responsibleStakeholderId ?? null,
            dueDate: proposalInput.dueDate ?? null,
        });

        let current = created;
        for (const item of proposalInput.evidence ?? []) {
            current = await rfiService.addEvidence({
                id: current.id,
                projectId: ctx.projectId,
                organizationId: ctx.organizationId,
                targetType: item.targetType,
                targetId: item.targetId,
            });
        }

        return current as unknown as Record<string, unknown>;
    },
});
