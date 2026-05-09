import type {
    CorrespondenceVariationTriageFactsView,
    CorrespondenceVariationTriageView,
    CorrespondenceVariationTraceView,
} from '@/types/correspondence';

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
}

function asStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
}

function isTriageStatus(
    value: unknown
): value is CorrespondenceVariationTriageView['status'] {
    return value === 'auto_triaged' || value === 'needs_classification' || value === 'not_candidate';
}

function isClassification(
    value: unknown
): value is CorrespondenceVariationTriageView['classification'] {
    return value === 'variation_claim' || value === 'other';
}

function isCompleteness(
    value: unknown
): value is CorrespondenceVariationTriageView['completeness'] {
    return value === 'complete_enough' || value === 'missing_information';
}

function isTraceSource(
    value: unknown
): value is CorrespondenceVariationTraceView['source'] {
    return value === 'inbound_email' || value === 'manual_entry' || value === 'unknown';
}

function isTraceTrigger(
    value: unknown
): value is CorrespondenceVariationTraceView['trigger'] {
    return value === 'auto_triage' || value === 'manual_review' || value === 'unknown';
}

function isDraftingMode(
    value: unknown
): value is CorrespondenceVariationTraceView['draftingMode'] {
    return (
        value === 'deterministic_delivery_lite_template' ||
        value === 'llm_assisted_delivery_template' ||
        value === 'llm_generated' ||
        value === 'manual' ||
        value === 'none'
    );
}

function toFacts(value: unknown): CorrespondenceVariationTriageFactsView {
    const facts = asRecord(value);
    return {
        contractorName: asString(facts.contractorName),
        contractorEmail: asString(facts.contractorEmail),
        description: asString(facts.description),
        basis: asString(facts.basis),
        amountForecastCents: asNumber(facts.amountForecastCents),
        programmeImpactDays: asNumber(facts.programmeImpactDays),
        requestedAction: asString(facts.requestedAction),
        evidenceReferences: asStringArray(facts.evidenceReferences),
        dateSubmitted: asString(facts.dateSubmitted),
    };
}

function defaultProposedActions(
    status: CorrespondenceVariationTriageView['status'],
    completeness: CorrespondenceVariationTriageView['completeness']
): string[] {
    if (status !== 'auto_triaged') return ['Manual review'];
    return [
        'Forecast variation',
        'Variation note',
        completeness === 'missing_information'
            ? 'Request particulars draft'
            : 'Assessment response draft',
    ];
}

function toTrace(args: {
    trace: unknown;
    status: CorrespondenceVariationTriageView['status'];
    completeness: CorrespondenceVariationTriageView['completeness'];
    workflowRunId: string | null;
}): CorrespondenceVariationTraceView {
    const trace = asRecord(args.trace);
    const proposedActions = asStringArray(trace.proposedActions);
    const workflowKey = asString(trace.workflowKey);
    const defaultDraftingMode =
        args.workflowRunId || args.status === 'auto_triaged'
            ? 'deterministic_delivery_lite_template'
            : 'none';

    return {
        source: isTraceSource(trace.source) ? trace.source : 'inbound_email',
        trigger: isTraceTrigger(trace.trigger) ? trace.trigger : 'auto_triage',
        agentName: asString(trace.agentName) ?? 'delivery',
        workflowKey: workflowKey ?? (args.workflowRunId ? 'issue-variation' : null),
        draftingMode: isDraftingMode(trace.draftingMode)
            ? trace.draftingMode
            : defaultDraftingMode,
        llmUsed: asBoolean(trace.llmUsed) ?? false,
        knowledgeLibraryUsed: asBoolean(trace.knowledgeLibraryUsed) ?? false,
        approvalRequired:
            asBoolean(trace.approvalRequired) ??
            Boolean(args.workflowRunId || args.status === 'auto_triaged'),
        proposedActions: proposedActions.length
            ? proposedActions
            : defaultProposedActions(args.status, args.completeness),
        documentsReviewed: asStringArray(trace.documentsReviewed),
    };
}

export function extractVariationTriageView(
    rawPayload: unknown
): CorrespondenceVariationTriageView | null {
    const payload = asRecord(rawPayload);
    const triage = asRecord(payload.variationTriage);
    if (!Object.keys(triage).length) return null;
    if (!isTriageStatus(triage.status)) return null;
    if (!isClassification(triage.classification)) return null;
    if (!isCompleteness(triage.completeness)) return null;
    const workflowRunId = asString(triage.workflowRunId);

    return {
        status: triage.status,
        classification: triage.classification,
        confidence: Math.max(0, Math.min(1, asNumber(triage.confidence) ?? 0)),
        completeness: triage.completeness,
        missingInformation: asStringArray(triage.missingInformation),
        candidateReasons: asStringArray(triage.candidateReasons),
        workflowRunId,
        facts: toFacts(triage.facts),
        trace: toTrace({
            trace: triage.trace,
            status: triage.status,
            completeness: triage.completeness,
            workflowRunId,
        }),
    };
}
