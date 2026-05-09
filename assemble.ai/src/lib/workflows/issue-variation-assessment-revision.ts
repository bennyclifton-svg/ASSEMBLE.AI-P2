import { z } from 'zod';
import type { WorkflowPlan } from './types';
import {
    buildDeliveryTrace,
    deliveryAssessmentSchema,
    formatDeliveryAssessmentArtifact,
    outboundCorrespondenceSchema,
} from './issue-variation';

export const ISSUE_VARIATION_ASSESSMENT_REVISION_WORKFLOW_KEY =
    'issue-variation-assessment-revision';

const contractorSchema = z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
});

const revisionDeliveryAssessmentSchema = deliveryAssessmentSchema.extend({
    assessmentMode: z.enum(['delivery_lite', 'deep_delivery']).default('deep_delivery'),
});

export const issueVariationAssessmentRevisionInputSchema = z.object({
    userGoal: z.string().trim().min(1).optional(),
    inboundCorrespondenceId: z.string().trim().min(1).optional(),
    assessmentNoteId: z.string().trim().min(1),
    revisionInstruction: z.string().trim().min(1),
    contractor: contractorSchema.optional(),
    variationDescription: z.string().trim().min(1),
    evidence: z.array(z.string().trim().min(1)).optional(),
    assumptions: z.array(z.string().trim().min(1)).optional(),
    deliveryAssessment: revisionDeliveryAssessmentSchema,
    outboundCorrespondence: outboundCorrespondenceSchema.optional(),
});

export type IssueVariationAssessmentRevisionInput = z.input<
    typeof issueVariationAssessmentRevisionInputSchema
>;
type ParsedIssueVariationAssessmentRevisionInput = z.infer<
    typeof issueVariationAssessmentRevisionInputSchema
>;

function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined)
    );
}

function bulletList(items: string[]): string {
    return items.map((item) => `- ${item}`).join('\n');
}

function revisedOutboundBodyText(input: ParsedIssueVariationAssessmentRevisionInput): string {
    const contractorName = input.contractor?.name || 'Contractor';
    const assessment = input.deliveryAssessment;
    const evidenceGaps = [
        ...(assessment.evidenceGaps ?? []),
        ...(assessment.missingInformation ?? []),
    ].filter((item, index, all) => all.indexOf(item) === index);
    const geotechLine = (assessment.documentsReviewed ?? []).some((item) => /geotech/i.test(item))
        ? 'In particular, the geotechnical report has been reviewed as part of this revised preliminary assessment.'
        : null;

    return [
        `Dear ${contractorName},`,
        '',
        `Re: ${input.variationDescription}`,
        '',
        'Further to our review of your variation claim, we have updated the preliminary assessment record.',
        geotechLine,
        '',
        assessment.summary,
        '',
        assessment.entitlement ? `Entitlement: ${assessment.entitlement}` : null,
        assessment.quantum ? `Quantum: ${assessment.quantum}` : null,
        assessment.programme ? `Programme: ${assessment.programme}` : null,
        evidenceGaps.length > 0
            ? [
                  '',
                  'Please provide the following further particulars so the assessment can continue:',
                  bulletList(evidenceGaps),
              ].join('\n')
            : null,
        '',
        assessment.recommendation,
        '',
        'For clarity, this correspondence does not constitute approval of entitlement, quantum, or programme impact unless separately confirmed in writing by the Superintendent.',
        '',
        assessment.contractAssumption,
        '',
        'Kind regards,',
    ]
        .filter((line): line is string => typeof line === 'string')
        .join('\n');
}

function deliveryAssessmentSummary(input: ParsedIssueVariationAssessmentRevisionInput): string {
    return [
        input.deliveryAssessment.summary,
        input.deliveryAssessment.entitlement
            ? `Entitlement: ${input.deliveryAssessment.entitlement}`
            : null,
        input.deliveryAssessment.quantum
            ? `Quantum: ${input.deliveryAssessment.quantum}`
            : null,
        input.deliveryAssessment.programme
            ? `Programme: ${input.deliveryAssessment.programme}`
            : null,
        input.deliveryAssessment.recommendation
            ? `Recommendation: ${input.deliveryAssessment.recommendation}`
            : null,
    ]
        .filter((line): line is string => typeof line === 'string')
        .join('\n');
}

export function buildIssueVariationAssessmentRevisionPlan(
    rawInput: IssueVariationAssessmentRevisionInput
): WorkflowPlan {
    const input = issueVariationAssessmentRevisionInputSchema.parse(rawInput);
    const evidence = input.evidence ?? [];
    const assumptions = [...(input.assumptions ?? [])];
    assumptions.push('This revision updates the Delivery assessment artifact and drafts a response; it does not create a duplicate variation.');
    if (input.inboundCorrespondenceId) {
        assumptions.push(`Inbound correspondence ${input.inboundCorrespondenceId} remains the linked source.`);
    }
    if (input.deliveryAssessment.contractAssumption) {
        assumptions.push(input.deliveryAssessment.contractAssumption);
    }

    const noteContent = formatDeliveryAssessmentArtifact({
        variationDescription: input.variationDescription,
        contractorName: input.contractor?.name,
        inboundCorrespondenceId: input.inboundCorrespondenceId,
        evidence,
        revisionInstruction: input.revisionInstruction,
        deliveryAssessment: input.deliveryAssessment,
    });
    const draftType = input.outboundCorrespondence?.draftType ?? 'assessment_response';
    const bodyText =
        input.outboundCorrespondence?.bodyText ?? revisedOutboundBodyText(input);
    const deliveryTrace = buildDeliveryTrace({
        workflowKey: ISSUE_VARIATION_ASSESSMENT_REVISION_WORKFLOW_KEY,
        assessmentMode: input.deliveryAssessment.assessmentMode,
        documentsReviewed: input.deliveryAssessment.documentsReviewed,
        knowledgeReferences: input.deliveryAssessment.knowledgeReferences,
        proposedActions: ['Update assessment note', 'Draft revised outbound response'],
    });

    return {
        workflowKey: ISSUE_VARIATION_ASSESSMENT_REVISION_WORKFLOW_KEY,
        userGoal:
            input.userGoal ??
            `Revise variation assessment - ${input.variationDescription}`,
        summary: `Revise Delivery assessment - ${input.variationDescription}`,
        executionBrief: [
            `Revise the Delivery assessment for "${input.variationDescription}".`,
            `Revision requested: ${input.revisionInstruction}.`,
            evidence.length > 0 ? `Evidence used: ${evidence.join('; ')}.` : 'Evidence used: current assessment context.',
            `Prepared 2 dependency-aware steps: update the assessment note -> draft a revised outbound response.`,
            'Each write step will be presented through explicit approval controls before project data changes.',
        ].join('\n'),
        evidence,
        assumptions,
        steps: [
            {
                stepKey: 'update_assessment_note',
                title: 'Update Delivery assessment note',
                actionId: 'correspondence.note.update',
                input: asRecord({
                    id: input.assessmentNoteId,
                    title: `Deep Delivery assessment - ${input.variationDescription}`,
                    content: noteContent,
                    type: 'variation',
                    status: 'open',
                }),
                dependencyStepKeys: [],
                failurePolicy: 'abort_workflow',
                risk: 'confirm',
            },
            {
                stepKey: 'draft_revised_outbound_correspondence',
                title: 'Draft revised outbound correspondence',
                actionId: 'correspondence.outbound_email.draft',
                input: asRecord({
                    inboundCorrespondenceId: input.inboundCorrespondenceId,
                    draftType,
                    toEmail: input.outboundCorrespondence?.toEmail ?? input.contractor?.email,
                    toName: input.outboundCorrespondence?.toName ?? input.contractor?.name,
                    ccEmails: input.outboundCorrespondence?.ccEmails,
                    subject: input.outboundCorrespondence?.subject,
                    bodyText,
                    responseRequiredBy: input.outboundCorrespondence?.responseRequiredBy,
                    deliveryAssessmentSummary: deliveryAssessmentSummary(input),
                    deliveryTrace,
                    markAsSentInAssemble: true,
                }),
                dependencyStepKeys: ['update_assessment_note'],
                failurePolicy: 'ask_user',
                risk: 'sensitive',
            },
        ],
    };
}
