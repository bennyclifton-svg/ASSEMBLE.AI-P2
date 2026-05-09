import { z } from 'zod';
import type { WorkflowPlan, WorkflowPlanStep } from './types';

export const ISSUE_VARIATION_WORKFLOW_KEY = 'issue-variation';

const variationCategorySchema = z.enum(['Principal', 'Contractor', 'Lessor Works']);
const variationStatusSchema = z.enum(['Forecast', 'Approved', 'Rejected', 'Withdrawn']);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const masterStageSchema = z.enum([
    'initiation',
    'schematic_design',
    'design_development',
    'procurement',
    'delivery',
]);

const createVariationInputSchema = z.object({
    category: variationCategorySchema.default('Principal'),
    description: z.string().trim().min(1),
    status: variationStatusSchema.default('Forecast'),
    costLineId: z.string().trim().min(1).optional(),
    costLineReference: z.string().trim().min(1).optional(),
    disciplineOrTrade: z.string().trim().min(1).optional(),
    amountForecastCents: z.number().int().nonnegative().optional(),
    amountApprovedCents: z.number().int().nonnegative().optional(),
    dateSubmitted: isoDateSchema.optional(),
    dateApproved: isoDateSchema.optional(),
    requestedBy: z.string().trim().min(1).optional(),
    approvedBy: z.string().trim().min(1).optional(),
});

const updateCostLineInputSchema = z.object({
    id: z.string().trim().min(1).optional(),
    activity: z.string().trim().min(1).optional(),
    section: z.string().trim().min(1).optional(),
    costCode: z.string().trim().min(1).optional(),
    reference: z.string().trim().min(1).optional(),
    budgetCents: z.number().int().nonnegative().optional(),
    approvedContractCents: z.number().int().nonnegative().optional(),
    masterStage: masterStageSchema.optional(),
});

const updateProgramActivityInputSchema = z.object({
    id: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    parentId: z.union([z.string().trim().min(1), z.null()]).optional(),
    startDate: z.union([isoDateSchema, z.null()]).optional(),
    endDate: z.union([isoDateSchema, z.null()]).optional(),
    collapsed: z.boolean().optional(),
    masterStage: z.union([masterStageSchema, z.null()]).optional(),
    color: z.union([z.string().trim().min(1), z.null()]).optional(),
    sortOrder: z.number().int().optional(),
});

const createNoteInputSchema = z.object({
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().optional(),
    isStarred: z.boolean().optional(),
    color: z.enum(['purple', 'orange', 'pink', 'blue']).optional(),
    type: z.enum(['rfi', 'notice', 'eot', 'defect', 'variation', 'risk', 'transmittal', 'review', 'note']).optional(),
    status: z.enum(['open', 'closed']).optional(),
    noteDate: isoDateSchema.optional(),
    documentIds: z.array(z.string().trim().min(1)).optional(),
});

const contractorSchema = z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
});

const stringListSchema = z.array(z.string().trim().min(1));

export const deliveryAssessmentSchema = z.object({
    assessmentMode: z.enum(['delivery_lite', 'deep_delivery']).optional(),
    completeness: z.enum(['complete_enough', 'missing_information']).optional(),
    summary: z.string().trim().min(1).optional(),
    entitlement: z.string().trim().min(1).optional(),
    quantum: z.string().trim().min(1).optional(),
    programme: z.string().trim().min(1).optional(),
    recommendation: z.string().trim().min(1).optional(),
    contractAssumption: z.string().trim().min(1).optional(),
    missingInformation: stringListSchema.optional(),
    documentsReviewed: stringListSchema.optional(),
    knowledgeReferences: stringListSchema.optional(),
    entitlementReasons: stringListSchema.optional(),
    quantumReasons: stringListSchema.optional(),
    programmeReasons: stringListSchema.optional(),
    evidenceGaps: stringListSchema.optional(),
    confidence: z.number().min(0).max(1).optional(),
});

export type DeliveryAssessmentInput = z.input<typeof deliveryAssessmentSchema>;
type ParsedDeliveryAssessment = z.infer<typeof deliveryAssessmentSchema>;

export const outboundCorrespondenceSchema = z.object({
    draftType: z.enum(['request_particulars', 'assessment_response']).optional(),
    toEmail: z.string().trim().email().optional(),
    toName: z.string().trim().min(1).optional(),
    ccEmails: z.array(z.string().trim().email()).optional(),
    subject: z.string().trim().min(1).optional(),
    bodyText: z.string().trim().min(1).optional(),
    responseRequiredBy: isoDateSchema.optional(),
});

export const issueVariationWorkflowInputSchema = z.object({
    userGoal: z.string().trim().min(1).optional(),
    inboundCorrespondenceId: z.string().trim().min(1).optional(),
    contractor: contractorSchema.optional(),
    evidence: z.array(z.string().trim().min(1)).optional(),
    assumptions: z.array(z.string().trim().min(1)).optional(),
    missingInformation: z.array(z.string().trim().min(1)).optional(),
    deliveryAssessment: deliveryAssessmentSchema.optional(),
    variation: createVariationInputSchema,
    costLineUpdate: updateCostLineInputSchema.optional(),
    programActivityUpdate: updateProgramActivityInputSchema.optional(),
    note: createNoteInputSchema.optional(),
    outboundCorrespondence: outboundCorrespondenceSchema.optional(),
});

export type IssueVariationWorkflowInput = z.input<typeof issueVariationWorkflowInputSchema>;
type ParsedIssueVariationWorkflowInput = z.infer<typeof issueVariationWorkflowInputSchema>;

const COST_LINE_CHANGE_KEYS = [
    'budgetCents',
    'approvedContractCents',
] as const;

const PROGRAM_ACTIVITY_CHANGE_KEYS = [
    'parentId',
    'startDate',
    'endDate',
    'collapsed',
    'masterStage',
    'color',
    'sortOrder',
] as const;

function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined)
    );
}

function hasAnyDefinedKey<T extends readonly string[]>(
    value: unknown,
    keys: T
): value is Record<T[number], unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return keys.some((key) => record[key] !== undefined);
}

function workflowText(input: ParsedIssueVariationWorkflowInput): string {
    return [
        input.userGoal,
        ...(input.evidence ?? []),
        ...(input.assumptions ?? []),
        ...(input.missingInformation ?? []),
        input.deliveryAssessment?.summary,
        input.deliveryAssessment?.programme,
        input.deliveryAssessment?.recommendation,
        input.note?.title,
        input.note?.content,
        input.outboundCorrespondence?.bodyText,
    ]
        .filter((entry): entry is string => typeof entry === 'string')
        .join(' ');
}

function explicitCostPlanUpdateRequested(input: ParsedIssueVariationWorkflowInput): boolean {
    const text = workflowText(input).toLowerCase();
    const updateVerb = /\b(update|change|adjust|increase|decrease|revise|set|amend|reduce)\b/;
    const costPlanTarget =
        /\b(cost plan|budget|approved contract|contract sum|contract value|base contract|trade contract)\b/;
    const addToCostPlanTarget =
        /\badd(?:ed)?\b[\s\S]{0,60}\b(to|onto)\b[\s\S]{0,40}\b(cost plan|budget|approved contract|contract sum|contract value|base contract|trade contract)\b/;
    return (updateVerb.test(text) && costPlanTarget.test(text)) || addToCostPlanTarget.test(text);
}

function variationWithLinkedCostLine(
    input: ParsedIssueVariationWorkflowInput
): ParsedIssueVariationWorkflowInput['variation'] {
    if (input.variation.costLineId || !input.costLineUpdate?.id) {
        return input.variation;
    }

    return {
        ...input.variation,
        costLineId: input.costLineUpdate.id,
    };
}

function defaultVariationNoteContent(input: ParsedIssueVariationWorkflowInput): string {
    const requester = input.contractor?.name || input.variation.requestedBy || 'Contractor';
    const prefix =
        input.variation.category === 'Contractor'
            ? `${requester} submitted a contractor variation claim`
            : 'Client requested variation';
    const lines = [`${prefix}: ${input.variation.description}.`];
    if (input.inboundCorrespondenceId) {
        lines.push(`Inbound correspondence: ${input.inboundCorrespondenceId}.`);
    }
    const missing = workflowMissingInformation(input);
    if (missing.length > 0) {
        lines.push(`Missing information requested: ${missing.join('; ')}.`);
    }
    if (input.deliveryAssessment?.summary) {
        lines.push(`Delivery assessment: ${input.deliveryAssessment.summary}`);
    }
    const costLineLabel = [
        input.variation.disciplineOrTrade,
        input.variation.costLineReference,
        input.costLineUpdate?.costCode,
        input.costLineUpdate?.activity,
        input.costLineUpdate?.reference,
    ]
        .filter(Boolean)
        .join(' - ');
    if (costLineLabel) {
        lines.push(`Cost line mapping: ${costLineLabel}.`);
    }
    if (input.programActivityUpdate?.name) {
        lines.push(`Programme activity mapping: ${input.programActivityUpdate.name}.`);
    }
    return lines.join('\n');
}

function workflowMissingInformation(input: ParsedIssueVariationWorkflowInput): string[] {
    return [
        ...(input.missingInformation ?? []),
        ...(input.deliveryAssessment?.missingInformation ?? []),
    ].filter((item, index, all) => all.indexOf(item) === index);
}

function isDeepDeliveryAssessment(assessment?: ParsedDeliveryAssessment): boolean {
    return assessment?.assessmentMode === 'deep_delivery';
}

function bulletList(items: string[] | undefined, fallback = '- Not recorded'): string {
    return items?.length ? items.map((item) => `- ${item}`).join('\n') : fallback;
}

function optionalSection(title: string, body?: string, bullets?: string[]): string[] {
    if (!body && (!bullets || bullets.length === 0)) return [];
    return [
        `## ${title}`,
        ...(body ? [body] : []),
        ...(bullets && bullets.length > 0 ? ['', bulletList(bullets)] : []),
        '',
    ];
}

export function formatDeliveryAssessmentArtifact(args: {
    variationDescription: string;
    contractorName?: string | null;
    inboundCorrespondenceId?: string;
    evidence?: string[];
    revisionInstruction?: string;
    deliveryAssessment: ParsedDeliveryAssessment;
}): string {
    const assessment = args.deliveryAssessment;
    const contractorName = args.contractorName || 'Contractor';
    const lines = [
        `# Deep Delivery Assessment - ${args.variationDescription}`,
        '',
        `Contractor: ${contractorName}`,
        args.inboundCorrespondenceId ? `Inbound correspondence: ${args.inboundCorrespondenceId}` : null,
        args.revisionInstruction ? `Revision request: ${args.revisionInstruction}` : null,
        assessment.confidence !== undefined ? `Confidence: ${Math.round(assessment.confidence * 100)}%` : null,
        '',
        ...optionalSection('Summary', assessment.summary),
        ...optionalSection('Documents Reviewed', undefined, assessment.documentsReviewed),
        ...optionalSection('Knowledge References', undefined, assessment.knowledgeReferences),
        ...optionalSection('Entitlement', assessment.entitlement, assessment.entitlementReasons),
        ...optionalSection('Quantum', assessment.quantum, assessment.quantumReasons),
        ...optionalSection('Programme', assessment.programme, assessment.programmeReasons),
        ...optionalSection('Evidence Gaps', undefined, [
            ...(assessment.evidenceGaps ?? []),
            ...(assessment.missingInformation ?? []),
        ]),
        ...optionalSection('Recommendation', assessment.recommendation),
        ...optionalSection('Contract Assumption', assessment.contractAssumption),
        ...(args.evidence?.length ? ['## Evidence Log', bulletList(args.evidence), ''] : []),
    ].filter((line): line is string => typeof line === 'string');

    return lines.join('\n').trim();
}

export function buildDeliveryTrace(args: {
    workflowKey: string;
    assessmentMode?: ParsedDeliveryAssessment['assessmentMode'];
    documentsReviewed?: string[];
    knowledgeReferences?: string[];
    proposedActions: string[];
}): Record<string, unknown> {
    const isDeep = args.assessmentMode === 'deep_delivery';
    return {
        source: 'inbound_email',
        trigger: isDeep ? 'manual_review' : 'auto_triage',
        agentName: 'delivery',
        workflowKey: args.workflowKey,
        draftingMode: isDeep
            ? 'llm_assisted_delivery_template'
            : 'deterministic_delivery_lite_template',
        llmUsed: isDeep,
        knowledgeLibraryUsed: Boolean(args.knowledgeReferences?.length),
        approvalRequired: true,
        proposedActions: args.proposedActions,
        documentsReviewed: args.documentsReviewed ?? [],
    };
}

function defaultNoteTitle(
    input: ParsedIssueVariationWorkflowInput,
    variation: ParsedIssueVariationWorkflowInput['variation']
): string {
    if (isDeepDeliveryAssessment(input.deliveryAssessment)) {
        return `Deep Delivery assessment - ${variation.description}`;
    }
    return `Variation - ${variation.description}`;
}

function defaultNoteContent(input: ParsedIssueVariationWorkflowInput): string {
    if (isDeepDeliveryAssessment(input.deliveryAssessment)) {
        return formatDeliveryAssessmentArtifact({
            variationDescription: input.variation.description,
            contractorName: input.contractor?.name || input.variation.requestedBy,
            inboundCorrespondenceId: input.inboundCorrespondenceId,
            evidence: input.evidence,
            deliveryAssessment: input.deliveryAssessment,
        });
    }
    return defaultVariationNoteContent(input);
}

function deepAssessmentOutboundBodyText(input: ParsedIssueVariationWorkflowInput): string {
    const assessment = input.deliveryAssessment;
    const contractorName = input.contractor?.name || input.variation.requestedBy || 'Contractor';
    const claimLabel = input.variation.description;
    const evidenceGaps = [
        ...(assessment?.evidenceGaps ?? []),
        ...(workflowMissingInformation(input) ?? []),
    ].filter((item, index, all) => all.indexOf(item) === index);
    const contractAssumption =
        assessment?.contractAssumption ||
        'This preliminary response is subject to review against the executed contract and special conditions.';

    return [
        `Dear ${contractorName},`,
        '',
        `Re: ${claimLabel}`,
        '',
        'We acknowledge receipt of your variation claim. The matter has been registered as a Forecast variation while the assessment is finalised.',
        '',
        'Our preliminary assessment is that entitlement remains under review and is not accepted at this stage.',
        assessment?.entitlement,
        '',
        assessment?.quantum ? `Quantum: ${assessment.quantum}` : null,
        assessment?.programme ? `Programme: ${assessment.programme}` : null,
        evidenceGaps.length > 0
            ? [
                  '',
                  'Please provide the following further particulars so the assessment can continue:',
                  bulletList(evidenceGaps),
              ].join('\n')
            : null,
        '',
        assessment?.recommendation,
        '',
        'For clarity, this correspondence does not constitute approval of entitlement, quantum, or programme impact unless separately confirmed in writing by the Superintendent.',
        '',
        contractAssumption,
        '',
        'Kind regards,',
    ]
        .filter((line): line is string => typeof line === 'string')
        .join('\n');
}

function defaultOutboundBodyText(
    input: ParsedIssueVariationWorkflowInput,
    draftType: 'request_particulars' | 'assessment_response'
): string {
    if (draftType === 'assessment_response' && isDeepDeliveryAssessment(input.deliveryAssessment)) {
        return deepAssessmentOutboundBodyText(input);
    }

    const contractorName = input.contractor?.name || input.variation.requestedBy || 'Contractor';
    const missing = workflowMissingInformation(input);
    const claimLabel = input.variation.description;
    const assessmentSummary =
        input.deliveryAssessment?.summary ||
        'The claim has been registered for review by the project team.';
    const contractAssumption =
        input.deliveryAssessment?.contractAssumption ||
        'This preliminary response is based on standard-form contract administration assumptions and must be checked against the executed contract and special conditions.';

    if (draftType === 'request_particulars') {
        const particulars =
            missing.length > 0
                ? missing.map((item) => `- ${item}`).join('\n')
                : '- Detailed cost breakdown\n- Contractual basis for the claim\n- Supporting site records or attachments';
        return [
            `Dear ${contractorName},`,
            '',
            `Re: ${claimLabel}`,
            '',
            'We acknowledge receipt of your variation claim. The matter has been registered as a Forecast variation while it remains under assessment.',
            '',
            'Before the claim can be assessed, please provide the following particulars:',
            particulars,
            '',
            'For clarity, registration of the claim does not constitute acceptance of entitlement, quantum, or programme impact.',
            '',
            contractAssumption,
            '',
            'Kind regards,',
        ].join('\n');
    }

    return [
        `Dear ${contractorName},`,
        '',
        `Re: ${claimLabel}`,
        '',
        'We acknowledge receipt of your variation claim. The matter has been registered as a Forecast variation while the assessment is finalised.',
        '',
        assessmentSummary,
        '',
        'For clarity, this correspondence does not constitute approval of entitlement, quantum, or programme impact unless separately confirmed in writing by the Superintendent.',
        '',
        contractAssumption,
        '',
        'Kind regards,',
    ].join('\n');
}

function buildOutboundCorrespondenceInput(
    input: ParsedIssueVariationWorkflowInput
): Record<string, unknown> | null {
    if (!input.inboundCorrespondenceId && !input.outboundCorrespondence) return null;

    const missing = workflowMissingInformation(input);
    const draftType =
        input.outboundCorrespondence?.draftType ??
        (missing.length > 0 ? 'request_particulars' : 'assessment_response');
    const bodyText =
        input.outboundCorrespondence?.bodyText ??
        defaultOutboundBodyText(input, draftType);
    const deliveryAssessmentSummary = [
        input.deliveryAssessment?.summary,
        input.deliveryAssessment?.entitlement ? `Entitlement: ${input.deliveryAssessment.entitlement}` : null,
        input.deliveryAssessment?.quantum ? `Quantum: ${input.deliveryAssessment.quantum}` : null,
        input.deliveryAssessment?.programme ? `Programme: ${input.deliveryAssessment.programme}` : null,
        input.deliveryAssessment?.recommendation ? `Recommendation: ${input.deliveryAssessment.recommendation}` : null,
    ]
        .filter(Boolean)
        .join('\n');
    const deliveryTrace = input.deliveryAssessment
        ? buildDeliveryTrace({
              workflowKey: ISSUE_VARIATION_WORKFLOW_KEY,
              assessmentMode: input.deliveryAssessment.assessmentMode,
              documentsReviewed: input.deliveryAssessment.documentsReviewed,
              knowledgeReferences: input.deliveryAssessment.knowledgeReferences,
              proposedActions: isDeepDeliveryAssessment(input.deliveryAssessment)
                  ? ['Forecast variation', 'Deep assessment note', 'Assessment response draft']
                  : ['Forecast variation', 'Variation note', `${draftType === 'request_particulars' ? 'Request particulars' : 'Assessment response'} draft`],
          })
        : undefined;

    return asRecord({
        inboundCorrespondenceId: input.inboundCorrespondenceId,
        draftType,
        toEmail: input.outboundCorrespondence?.toEmail ?? input.contractor?.email,
        toName: input.outboundCorrespondence?.toName ?? input.contractor?.name,
        ccEmails: input.outboundCorrespondence?.ccEmails,
        subject: input.outboundCorrespondence?.subject,
        bodyText,
        responseRequiredBy: input.outboundCorrespondence?.responseRequiredBy,
        deliveryAssessmentSummary: deliveryAssessmentSummary || undefined,
        deliveryTrace,
        markAsSentInAssemble: true,
    });
}

export function buildIssueVariationPlan(rawInput: IssueVariationWorkflowInput): WorkflowPlan {
    const input = issueVariationWorkflowInputSchema.parse(rawInput);
    const variation = variationWithLinkedCostLine(input);
    const userGoal =
        input.userGoal ??
        `Issue variation - ${variation.description}`;
    const evidence = input.evidence ?? [];
    const assumptions = [...(input.assumptions ?? [])];
    if (input.inboundCorrespondenceId) {
        assumptions.push(`Inbound correspondence ${input.inboundCorrespondenceId} triggered this workflow.`);
    }
    if (input.deliveryAssessment?.contractAssumption) {
        assumptions.push(input.deliveryAssessment.contractAssumption);
    }
    if (
        input.variation.costLineId &&
        input.costLineUpdate?.id &&
        input.variation.costLineId !== input.costLineUpdate.id
    ) {
        assumptions.push(
            'Variation cost-line link differs from the cost-plan row context; the variation link was left as supplied.'
        );
    }
    const steps: WorkflowPlanStep[] = [
        {
            stepKey: 'create_variation',
            title: 'Create variation register item',
            actionId: 'finance.variations.create',
            input: asRecord(variation),
            dependencyStepKeys: [],
            failurePolicy: 'abort_workflow',
            risk: 'sensitive',
        },
    ];

    if (
        input.costLineUpdate?.id &&
        hasAnyDefinedKey(input.costLineUpdate, COST_LINE_CHANGE_KEYS) &&
        explicitCostPlanUpdateRequested(input)
    ) {
        steps.push({
            stepKey: 'update_cost_plan',
            title: 'Update linked cost plan line',
            actionId: 'finance.cost_plan.update_line',
            input: asRecord(input.costLineUpdate),
            dependencyStepKeys: ['create_variation'],
            failurePolicy: 'ask_user',
            risk: 'propose',
        });
    } else if (
        input.costLineUpdate?.id &&
        hasAnyDefinedKey(input.costLineUpdate, COST_LINE_CHANGE_KEYS)
    ) {
        assumptions.push(
            'Cost-plan monetary update was skipped because the request only linked the variation to the cost line; variation amounts are tracked on the variation register.'
        );
    } else if (input.costLineUpdate?.id) {
        assumptions.push(
            'Cost line was resolved and linked on the variation; no base cost-plan row update was required.'
        );
    } else if (input.costLineUpdate) {
        assumptions.push('Cost plan update was skipped because no resolved cost line id was supplied.');
    }

    if (
        input.programActivityUpdate?.id &&
        hasAnyDefinedKey(input.programActivityUpdate, PROGRAM_ACTIVITY_CHANGE_KEYS)
    ) {
        steps.push({
            stepKey: 'update_program',
            title: 'Update programme activity',
            actionId: 'program.activity.update',
            input: asRecord(input.programActivityUpdate),
            dependencyStepKeys: ['create_variation'],
            failurePolicy: 'ask_user',
            risk: 'propose',
        });
    } else if (input.programActivityUpdate?.id) {
        assumptions.push(
            'Programme activity was resolved for context, but no programme row update was supplied.'
        );
    } else if (input.programActivityUpdate) {
        assumptions.push('Programme activity update was skipped because no resolved activity id was supplied.');
    }

    {
        const noteInput = {
            ...input.note,
            title: input.note?.title ?? defaultNoteTitle(input, variation),
            content:
                input.note?.content ??
                defaultNoteContent({
                    ...input,
                    variation,
                }),
            type: input.note?.type ?? 'variation',
            status: input.note?.status ?? 'open',
        };
        steps.push({
            stepKey: 'create_note',
            title: 'Create variation note',
            actionId: 'correspondence.note.create',
            input: asRecord(noteInput),
            dependencyStepKeys: steps.map((step) => step.stepKey),
            failurePolicy: 'continue',
            risk: 'confirm',
        });
    }

    const outboundInput = buildOutboundCorrespondenceInput(input);
    if (outboundInput) {
        steps.push({
            stepKey: 'draft_outbound_correspondence',
            title: 'Draft outbound correspondence',
            actionId: 'correspondence.outbound_email.draft',
            input: outboundInput,
            dependencyStepKeys: steps.map((step) => step.stepKey),
            failurePolicy: 'ask_user',
            risk: 'sensitive',
        });
    }

    const amount =
        variation.amountApprovedCents ?? variation.amountForecastCents;
    const amountText =
        typeof amount === 'number'
            ? new Intl.NumberFormat('en-AU', {
                  style: 'currency',
                  currency: 'AUD',
                  maximumFractionDigits: 0,
              }).format(amount / 100)
            : 'an unpriced amount';

    const executionBrief = [
        `Understood: prepare an issue-variation workflow for "${variation.description}" at ${amountText}.`,
        evidence.length > 0 ? `Evidence used: ${evidence.join('; ')}.` : 'Evidence used: current project context and supplied instruction.',
        assumptions.length > 0 ? `Assumptions: ${assumptions.join('; ')}.` : 'Assumptions: none recorded.',
        `Prepared ${steps.length} dependency-aware step${steps.length === 1 ? '' : 's'}: ${steps.map((step) => step.title).join(' -> ')}.`,
        'Each write step will be presented through explicit approval controls before project data changes.',
    ].join('\n');

    return {
        workflowKey: ISSUE_VARIATION_WORKFLOW_KEY,
        userGoal,
        summary: `Issue variation - ${variation.description}`,
        executionBrief,
        evidence,
        assumptions,
        steps,
    };
}
