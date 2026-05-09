import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    correspondence,
    correspondenceAttachments,
    projects,
    workflowRuns,
} from '@/lib/db/pg-schema';
import { buildIssueVariationPlan } from '@/lib/workflows/issue-variation';
import type { IssueVariationWorkflowInput } from '@/lib/workflows/issue-variation';
import type { CorrespondenceVariationTraceView } from '@/types/correspondence';

export const HIGH_CONFIDENCE_VARIATION_CLAIM = 0.75;
export const MEDIUM_CONFIDENCE_VARIATION_CLAIM = 0.45;

export type InboundVariationTriageStatus =
    | 'auto_triaged'
    | 'needs_classification'
    | 'not_candidate';

export interface InboundVariationTriageInput {
    subject: string;
    bodyText?: string | null;
    fromName?: string | null;
    fromEmail: string;
    receivedAt?: Date | string | null;
    attachmentNames?: string[];
    inboundCorrespondenceId?: string;
}

export interface InboundVariationClaimFacts {
    contractorName: string | null;
    contractorEmail: string;
    description: string | null;
    basis: string | null;
    amountForecastCents: number | null;
    programmeImpactDays: number | null;
    requestedAction: string | null;
    evidenceReferences: string[];
    dateSubmitted: string | null;
}

export interface InboundVariationClaimTriage {
    status: InboundVariationTriageStatus;
    classification: 'variation_claim' | 'other';
    confidence: number;
    completeness: 'complete_enough' | 'missing_information';
    facts: InboundVariationClaimFacts;
    missingInformation: string[];
    candidateReasons: string[];
    trace: CorrespondenceVariationTraceView;
    workflowInput?: IssueVariationWorkflowInput;
    workflowRunId?: string;
}

const CONTRACTOR_RE =
    /\b(contractor|builder|constructions?|construction|civil|excavation|earthworks|pty|ltd|limited|contracting|trades?|subcontractor)\b/i;
const VARIATION_RE =
    /\b(variation|vo\b|claim|latent condition|unforeseen|additional cost|extra cost|extra works?|additional excavation|rock|excavat(?:e|ion)|instruction|direction)\b/i;
const CLAIM_RE =
    /\b(claim|submit|submitted|request(?:ing)?|confirm|approve|approval|quotation|quote|cost impact|time impact)\b/i;
const REQUEST_RE =
    /\b(please confirm|please advise|confirm instruction|confirm approval|approve|approval|respond|response required|request(?:ing)? confirmation)\b/i;
const BASIS_PATTERNS: Array<[RegExp, string]> = [
    [/\blatent condition|unforeseen ground|unexpected rock|rock\b/i, 'latent condition / unforeseen site condition'],
    [/\bsuperintendent'?s? direction|direction|instruction\b/i, 'superintendent direction or instruction'],
    [/\bdesign change|drawing change|revised drawing|client change|principal change\b/i, 'design or principal-driven change'],
    [/\bextra works?|additional works?|scope change\b/i, 'scope change / additional work'],
];

function traceActions(args: {
    status: InboundVariationTriageStatus;
    completeness: InboundVariationClaimTriage['completeness'];
}): string[] {
    if (args.status !== 'auto_triaged') return ['Manual review'];
    return [
        'Forecast variation',
        'Variation note',
        args.completeness === 'missing_information'
            ? 'Request particulars draft'
            : 'Assessment response draft',
    ];
}

function buildTriageTrace(args: {
    status: InboundVariationTriageStatus;
    completeness: InboundVariationClaimTriage['completeness'];
}): CorrespondenceVariationTraceView {
    const hasWorkflow = args.status === 'auto_triaged';
    return {
        source: 'inbound_email',
        trigger: 'auto_triage',
        agentName: 'delivery',
        workflowKey: hasWorkflow ? 'issue-variation' : null,
        draftingMode: hasWorkflow ? 'deterministic_delivery_lite_template' : 'none',
        llmUsed: false,
        knowledgeLibraryUsed: false,
        approvalRequired: hasWorkflow,
        proposedActions: traceActions(args),
        documentsReviewed: [],
    };
}

function moneyToCents(value: string): number | null {
    const amount = Number.parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function extractAmountCents(text: string): number | null {
    const match =
        text.match(/\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)/) ||
        text.match(/\bAUD\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
    return match ? moneyToCents(match[1]) : null;
}

function extractProgrammeDays(text: string): number | null {
    const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:working\s+|business\s+)?days?\b/i);
    if (!match) return null;
    const days = Number.parseFloat(match[1]);
    return Number.isFinite(days) ? days : null;
}

function extractBasis(text: string): string | null {
    return BASIS_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function firstSentence(text: string): string | null {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    return normalized.split(/(?<=[.!?])\s+/)[0]?.trim().slice(0, 220) || null;
}

function extractDescription(subject: string, bodyText: string): string | null {
    const cleanedSubject = subject
        .replace(/^(re|fw|fwd)\s*:\s*/i, '')
        .replace(/\b(variation|claim|vo)\b/gi, '')
        .replace(/^[\s:-]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (cleanedSubject.length >= 12) return cleanedSubject.slice(0, 180);
    return firstSentence(bodyText);
}

function isoDate(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function evidenceReferences(text: string, attachmentNames: string[]): string[] {
    const refs = [...attachmentNames];
    const drawingRefs = text.match(/\b(?:drawing|dwg|spec|clause|site record|photo)\s+[A-Z0-9_.-]+/gi) ?? [];
    refs.push(...drawingRefs.map((ref) => ref.trim()));
    return refs.filter((ref, index, all) => ref && all.indexOf(ref) === index);
}

function requestedAction(text: string): string | null {
    return text.match(REQUEST_RE)?.[0] ?? null;
}

function missingInformation(args: {
    facts: InboundVariationClaimFacts;
    hasTbcBreakdown: boolean;
}): string[] {
    const missing: string[] = [];
    if (!args.facts.description) missing.push('Description of the claimed change');
    if (!args.facts.basis) missing.push('Contractual basis or cause of the claim');
    if (!args.facts.amountForecastCents && !args.hasTbcBreakdown) {
        missing.push('Claimed amount or supporting cost breakdown');
    }
    if (args.facts.evidenceReferences.length === 0) {
        missing.push('Supporting evidence, attachment, drawing, site record, or specification reference');
    }
    if (!args.facts.requestedAction) missing.push('Requested response or instruction');
    return missing;
}

function scoreCandidate(args: {
    text: string;
    contractorSignal: boolean;
    amountCents: number | null;
    programmeDays: number | null;
    basis: string | null;
    requestedAction: string | null;
    evidenceCount: number;
}): { confidence: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;
    if (VARIATION_RE.test(args.text)) {
        score += 0.25;
        reasons.push('variation/claim language');
    }
    if (CLAIM_RE.test(args.text)) {
        score += 0.15;
        reasons.push('claim/request language');
    }
    if (args.contractorSignal) {
        score += 0.15;
        reasons.push('contractor-like sender/content');
    }
    if (args.amountCents !== null) {
        score += 0.15;
        reasons.push('claimed amount detected');
    }
    if (args.programmeDays !== null) {
        score += 0.05;
        reasons.push('programme impact detected');
    }
    if (args.basis) {
        score += 0.1;
        reasons.push('claim basis detected');
    }
    if (args.requestedAction) {
        score += 0.1;
        reasons.push('response requested');
    }
    if (args.evidenceCount > 0) {
        score += 0.1;
        reasons.push('supporting evidence reference detected');
    }
    return { confidence: Math.min(0.95, Number(score.toFixed(2))), reasons };
}

export function buildIssueVariationWorkflowInputFromTriage(
    triage: InboundVariationClaimTriage,
    source: InboundVariationTriageInput
): IssueVariationWorkflowInput {
    const description =
        triage.facts.description ||
        source.subject ||
        'Contractor variation claim';
    const contractorLabel =
        triage.facts.contractorName ||
        triage.facts.contractorEmail ||
        'Contractor';

    return {
        userGoal: `Auto-triage contractor variation claim - ${description}`,
        inboundCorrespondenceId: source.inboundCorrespondenceId,
        contractor: {
            name: triage.facts.contractorName ?? undefined,
            email: triage.facts.contractorEmail,
        },
        evidence: [
            ...(source.inboundCorrespondenceId ? [`Inbound correspondence ${source.inboundCorrespondenceId}`] : []),
            ...triage.facts.evidenceReferences,
            ...triage.candidateReasons.map((reason) => `Triage signal: ${reason}`),
        ],
        assumptions: [
            'Auto-triage only; contractual determination remains subject to user review.',
        ],
        missingInformation: triage.missingInformation,
        deliveryAssessment: {
            completeness: triage.completeness,
            summary:
                triage.completeness === 'missing_information'
                    ? `${contractorLabel} submitted a contractor variation claim that needs further particulars before assessment.`
                    : `${contractorLabel} submitted a contractor variation claim with enough particulars for preliminary assessment.`,
            entitlement: triage.facts.basis
                ? `Claim basis appears to be ${triage.facts.basis}. Verify against the executed contract and special conditions.`
                : undefined,
            quantum: triage.facts.amountForecastCents
                ? `Claimed amount detected: ${new Intl.NumberFormat('en-AU', {
                      style: 'currency',
                      currency: 'AUD',
                      maximumFractionDigits: 0,
                  }).format(triage.facts.amountForecastCents / 100)}.`
                : undefined,
            recommendation:
                triage.completeness === 'missing_information'
                    ? 'Request missing particulars before assessment.'
                    : 'Register as Forecast and prepare a draft assessment response for review.',
            contractAssumption:
                'Preliminary Delivery-lite assessment uses a conservative standard-form contract administration frame. Verify clauses against the executed contract and special conditions.',
            missingInformation: triage.missingInformation,
            confidence: triage.confidence,
        },
        variation: {
            category: 'Contractor',
            description,
            status: 'Forecast',
            amountForecastCents: triage.facts.amountForecastCents ?? undefined,
            dateSubmitted: triage.facts.dateSubmitted ?? undefined,
            requestedBy: contractorLabel,
        },
        note: {
            title: `Contractor variation claim - ${description}`,
            type: 'variation',
            status: 'open',
        },
        outboundCorrespondence: {
            draftType:
                triage.completeness === 'missing_information'
                    ? 'request_particulars'
                    : 'assessment_response',
            toEmail: triage.facts.contractorEmail,
            toName: triage.facts.contractorName ?? undefined,
        },
    };
}

export function classifyInboundVariationClaim(
    input: InboundVariationTriageInput
): InboundVariationClaimTriage {
    const bodyText = input.bodyText || '';
    const text = `${input.subject}\n${bodyText}`.trim();
    const attachmentNames = input.attachmentNames ?? [];
    const senderContractorSignal =
        CONTRACTOR_RE.test(`${input.fromName || ''} ${input.fromEmail}`);
    const contractorSignal =
        senderContractorSignal || CONTRACTOR_RE.test(text);
    const amountForecastCents = extractAmountCents(text);
    const programmeImpactDays = extractProgrammeDays(text);
    const basis = extractBasis(text);
    const refs = evidenceReferences(text, attachmentNames);
    const action = requestedAction(text);
    const facts: InboundVariationClaimFacts = {
        contractorName: input.fromName?.trim() || null,
        contractorEmail: input.fromEmail.trim().toLowerCase(),
        description: extractDescription(input.subject, bodyText),
        basis,
        amountForecastCents,
        programmeImpactDays,
        requestedAction: action,
        evidenceReferences: refs,
        dateSubmitted: isoDate(input.receivedAt),
    };
    const hasTbcBreakdown =
        /\b(tbc|to be confirmed|breakdown attached|cost breakdown attached|see attached)\b/i.test(text) &&
        attachmentNames.length > 0;
    const missing = missingInformation({ facts, hasTbcBreakdown });
    const { confidence, reasons } = scoreCandidate({
        text,
        contractorSignal,
        amountCents: amountForecastCents,
        programmeDays: programmeImpactDays,
        basis,
        requestedAction: action,
        evidenceCount: refs.length,
    });
    const classification =
        confidence >= MEDIUM_CONFIDENCE_VARIATION_CLAIM ? 'variation_claim' : 'other';
    const status: InboundVariationTriageStatus =
        confidence >= HIGH_CONFIDENCE_VARIATION_CLAIM && senderContractorSignal
            ? 'auto_triaged'
            : confidence >= MEDIUM_CONFIDENCE_VARIATION_CLAIM
              ? 'needs_classification'
              : 'not_candidate';
    const triage: InboundVariationClaimTriage = {
        status,
        classification,
        confidence,
        completeness: missing.length === 0 ? 'complete_enough' : 'missing_information',
        facts,
        missingInformation: missing,
        candidateReasons: reasons,
        trace: buildTriageTrace({
            status,
            completeness: missing.length === 0 ? 'complete_enough' : 'missing_information',
        }),
    };

    if (status === 'auto_triaged') {
        triage.workflowInput = buildIssueVariationWorkflowInputFromTriage(triage, input);
    }

    return triage;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

export async function autoTriageInboundVariationClaim(args: {
    projectId: string;
    correspondenceId: string;
}): Promise<InboundVariationClaimTriage | null> {
    const [row] = await db
        .select({
            id: correspondence.id,
            subject: correspondence.subject,
            bodyText: correspondence.bodyText,
            fromName: correspondence.fromName,
            fromEmail: correspondence.fromEmail,
            receivedAt: correspondence.receivedAt,
            rawPayload: correspondence.rawPayload,
        })
        .from(correspondence)
        .where(
            and(
                eq(correspondence.id, args.correspondenceId),
                eq(correspondence.projectId, args.projectId)
            )
        )
        .limit(1);
    if (!row) return null;

    const attachments = await db
        .select({ originalName: correspondenceAttachments.originalName })
        .from(correspondenceAttachments)
        .where(eq(correspondenceAttachments.correspondenceId, args.correspondenceId));

    const triage = classifyInboundVariationClaim({
        inboundCorrespondenceId: args.correspondenceId,
        subject: row.subject,
        bodyText: row.bodyText,
        fromName: row.fromName,
        fromEmail: row.fromEmail,
        receivedAt: row.receivedAt,
        attachmentNames: attachments.map((attachment) => attachment.originalName),
    });

    let workflowRunId: string | undefined;
    if (triage.status === 'auto_triaged' && triage.workflowInput) {
        const [project] = await db
            .select({ organizationId: projects.organizationId })
            .from(projects)
            .where(eq(projects.id, args.projectId))
            .limit(1);
        if (project?.organizationId) {
            const plan = buildIssueVariationPlan(triage.workflowInput);
            const [run] = await db
                .insert(workflowRuns)
                .values({
                    workflowKey: plan.workflowKey,
                    userGoal: plan.userGoal,
                    status: 'previewed',
                    organizationId: project.organizationId,
                    projectId: args.projectId,
                    threadId: null,
                    actorUserId: null,
                    activeAgent: 'delivery',
                    currentStepIds: [],
                    plan: plan as unknown as object,
                    summary: plan.summary,
                    updatedAt: new Date(),
                })
                .returning({ id: workflowRuns.id });
            workflowRunId = run.id;
            triage.workflowRunId = workflowRunId;
        }
    }

    const rawPayload = asRecord(row.rawPayload);
    const triageForPayload = {
        status: triage.status,
        classification: triage.classification,
        confidence: triage.confidence,
        completeness: triage.completeness,
        facts: triage.facts,
        missingInformation: triage.missingInformation,
        candidateReasons: triage.candidateReasons,
        trace: triage.trace,
        workflowRunId,
    };
    await db
        .update(correspondence)
        .set({
            correspondenceType:
                triage.classification === 'variation_claim'
                    ? 'contractor_correspondence'
                    : 'general',
            classificationStatus:
                triage.status === 'not_candidate' ? 'unclassified' : 'suggested',
            rawPayload: {
                ...rawPayload,
                variationTriage: triageForPayload,
            },
            updatedAt: new Date(),
        })
        .where(eq(correspondence.id, args.correspondenceId));

    return triage;
}
