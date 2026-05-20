import { z } from 'zod';
import type { ProposedDiff } from '@/lib/actions/types';
import { drizzleRfiRepository, rfiService } from '@/lib/rfi/service';
import {
    RFI_EVIDENCE_TARGET_TYPES,
    toLocalIsoDate,
    type RfiEvidenceTargetType,
    type RfiRecord,
} from '@/types/rfi';
import { defineAction } from '../define';
import type { ActionContext } from '../types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const optionalTrimmedString = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1)
).optional();

const evidenceSchema = z.object({
    targetType: z.enum(RFI_EVIDENCE_TARGET_TYPES),
    targetId: z.string().trim().min(1),
    citation: z.string().trim().min(1).optional(),
});

const inputSchema = z
    .object({
        rfiId: optionalTrimmedString,
        rfiReference: optionalTrimmedString,
        responseText: z.string().trim().min(1),
        responseDate: z.string().regex(ISO_DATE).optional(),
        evidence: z.array(evidenceSchema).optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!input.rfiId && !input.rfiReference) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'provide rfiId or rfiReference',
                path: ['rfiId'],
            });
        }
    });

type RecordRfiResponseInput = z.infer<typeof inputSchema>;
type EvidenceInput = z.infer<typeof evidenceSchema>;

interface ResolvedEvidence {
    targetType: RfiEvidenceTargetType;
    targetId: string;
    label: string;
    citation?: string;
}

function normalizedRfiReference(value: string): string {
    const digits = value.match(/\d+/)?.[0];
    if (digits) return String(Number(digits));
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function resolveRfi(ctx: ActionContext, input: RecordRfiResponseInput): Promise<RfiRecord> {
    if (input.rfiId) {
        return rfiService.get({
            id: input.rfiId,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
        });
    }

    const wanted = normalizedRfiReference(input.rfiReference ?? '');
    const result = await rfiService.list({
        projectId: ctx.projectId,
        organizationId: ctx.organizationId,
        filter: 'all',
    });
    const match = result.rfis.find((rfi) =>
        normalizedRfiReference(rfi.reference) === wanted ||
        normalizedRfiReference(String(rfi.rfiNumber)) === wanted
    );
    if (!match) {
        throw new Error(`record_rfi_response: RFI "${input.rfiReference}" was not found in this project`);
    }
    return match;
}

function compactEvidence(evidence: EvidenceInput[] = []): EvidenceInput[] {
    const seen = new Set<string>();
    const compacted: EvidenceInput[] = [];
    for (const item of evidence) {
        const key = `${item.targetType}:${item.targetId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        compacted.push(item);
    }
    return compacted;
}

async function resolveEvidence(ctx: ActionContext, evidence: EvidenceInput[] = []): Promise<ResolvedEvidence[]> {
    const resolved: ResolvedEvidence[] = [];
    for (const item of compactEvidence(evidence)) {
        const target = await drizzleRfiRepository.findEvidenceTarget(
            ctx.projectId,
            ctx.organizationId,
            item.targetType,
            item.targetId
        );
        if (!target) {
            throw new Error(`record_rfi_response: evidence target not found: ${item.targetType}:${item.targetId}`);
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

function formatEvidence(evidence: ResolvedEvidence[]): string {
    if (evidence.length === 0) return 'None';
    return evidence
        .map((item) => {
            const ref = `${item.label} (${item.targetType})`;
            return item.citation ? `${ref} - ${item.citation}` : ref;
        })
        .join('\n');
}

function proposedInputFor(rfi: RfiRecord, input: RecordRfiResponseInput): RecordRfiResponseInput {
    const evidence = compactEvidence(input.evidence);
    return {
        rfiId: rfi.id,
        responseText: input.responseText,
        responseDate: input.responseDate ?? toLocalIsoDate(),
        ...(evidence.length > 0 ? { evidence } : {}),
        ...(input._toolUseId ? { _toolUseId: input._toolUseId } : {}),
    };
}

export const recordRfiResponseAction = defineAction<RecordRfiResponseInput, Record<string, unknown>>({
    id: 'correspondence.rfi.record_response',
    toolName: 'record_rfi_response',
    domain: 'correspondence',
    description:
        'Propose recording an answer on an existing typed RFI. Use this after project evidence has been searched and a response can be populated back into the RFI response form.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design'],
    emits: [{ entity: 'rfi', op: 'updated' }],
    uiTarget: { tab: 'planning', sub: 'rfis', focusEntity: 'rfi' },
    async prepareProposal(ctx, input) {
        const rfi = await resolveRfi(ctx, input);
        if (rfi.status !== 'open') {
            throw new Error(`record_rfi_response: only open RFIs can be responded to. ${rfi.reference} is ${rfi.status}.`);
        }
        const proposalInput = proposedInputFor(rfi, input);
        const evidence = await resolveEvidence(ctx, proposalInput.evidence);
        const proposedDiff: ProposedDiff = {
            entity: 'rfi',
            entityId: rfi.id,
            summary: `Record response - ${rfi.reference}`,
            changes: [
                { field: 'reference', label: 'RFI', before: rfi.reference, after: rfi.reference },
                { field: 'status', label: 'Status', before: rfi.status, after: 'responded' },
                {
                    field: 'responseText',
                    label: 'Response',
                    before: rfi.responseText ?? '-',
                    after: proposalInput.responseText,
                },
                {
                    field: 'responseDate',
                    label: 'Response date',
                    before: rfi.responseDate ?? '-',
                    after: proposalInput.responseDate ?? toLocalIsoDate(),
                },
                {
                    field: 'evidence',
                    label: 'Evidence references',
                    before: rfi.evidenceLinks.length ? rfi.evidenceLinks.map((link) => link.label).join('\n') : 'None',
                    after: formatEvidence(evidence),
                },
            ],
        };

        return {
            proposedDiff,
            expectedRowVersion: rfi.rowVersion,
            input: proposalInput,
        };
    },
    async apply(ctx, input) {
        const rfi = await resolveRfi(ctx, input);
        const proposalInput = proposedInputFor(rfi, input);
        const evidence = compactEvidence(proposalInput.evidence);
        await resolveEvidence(ctx, evidence);

        const [firstEvidence, ...remainingEvidence] = evidence;
        let current = await rfiService.recordResponse({
            id: rfi.id,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            actorId: ctx.userId,
            responseText: proposalInput.responseText,
            responseDate: proposalInput.responseDate ?? toLocalIsoDate(),
            ...(firstEvidence
                ? {
                      evidence: {
                          targetType: firstEvidence.targetType,
                          targetId: firstEvidence.targetId,
                      },
                  }
                : {}),
        });

        for (const item of remainingEvidence) {
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
