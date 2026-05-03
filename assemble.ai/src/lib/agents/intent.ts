const VARIATION_WRITE_RE =
    /\b(issue|raise|submit|prepare|draft|create|add|record|log)\b[\s\S]{0,100}\bvariations?\b|\bvariations?\b[\s\S]{0,100}\b(issue|raise|submit|prepare|draft|create|add|record|log)\b/i;

const NOTE_PRIMARY_VARIATION_RE =
    /\b(create|add|record|update|change|edit)\b[\s\S]{0,60}\bnotes?\b[\s\S]{0,120}\bvariations?\b/i;

const STRONG_VARIATION_WRITE_RE =
    /\b(issue|raise|submit)\b[\s\S]{0,100}\bvariations?\b|\bvariations?\b[\s\S]{0,100}\b(issue|raise|submit)\b/i;

const VARIATION_WORKFLOW_FOLLOW_THROUGH_RE =
    /\b(cost[-\s]?plan|cost lines?|programme|program|schedule|activities?|milestones?|project notes?|notes?|correspondence|letters?|emails?|link it|link this|linked)\b/i;

const WRITE_INTENT_RE =
    /\b(add|record|create|enter|post|allocate|log|issue|raise|submit|prepare|draft|update|change|set|move|populate|generate|redraft|replace|append|attach|save)\b/i;
const BRIEFING_RE =
    /\b(status|briefing|where are we|how are we tracking|overall|summary|health check)\b/i;
const READINESS_RE = /\b(ready|readiness|soft gate|gate|go to tender|tender-ready)\b/i;
const ADDENDUM_TERM = String.raw`(?:addendum|addenda|addendums?|addenumd|adenumd|adendum|addemdum)`;
const ADDENDUM_RE = new RegExp(String.raw`\b${ADDENDUM_TERM}\b`, 'i');
const CONSULTANT_ADDENDUM_RE = new RegExp(
    String.raw`\b${ADDENDUM_TERM}\b[\s\S]{0,160}\b(consultants?|architects?|engineers?|mechanical|electrical|hydraulic|structural|civil|bca|planners?|town planners?)\b|\b(consultants?|architects?|engineers?|mechanical|electrical|hydraulic|structural|civil|bca|planners?|town planners?)\b[\s\S]{0,160}\b${ADDENDUM_TERM}\b`,
    'i'
);
const DOCUMENT_SELECTION_RE =
    /\b(select|tick|check|choose|highlight)\b[\s\S]{0,140}\b(documents?|docs?|drawings?|files?)\b|\b(documents?|docs?|drawings?|files?)\b[\s\S]{0,140}\b(select|tick|checked|highlighted|chosen)\b/i;
const TRANSMITTAL_WRITE_RE =
    /\b(create|add|issue|prepare|draft|save|generate)\b[\s\S]{0,140}\b(transmittals?)\b|\b(transmittals?)\b[\s\S]{0,140}\b(create|add|issue|prepare|draft|save|generate|documents?|drawings?|files?)\b/i;
const RFT_WRITE_RE =
    /\b(add|record|create|enter|post|log|update|change|set|populate|generate|redraft|replace|append|attach)\b[\s\S]{0,140}\b(rft|request for tender|tender package|tender document|tender documents|brief|services brief|deliverables)\b[\s\S]{0,140}\b(rft|request for tender|tender package|tender document|tender documents)?\b|\b(rft|request for tender|tender package|tender document|tender documents)\b[\s\S]{0,140}\b(add|record|create|enter|post|log|update|change|set|populate|generate|redraft|replace|append|attach|brief|services brief|deliverables)\b/i;
const NOTE_WRITE_RE =
    /\b(add|record|create|enter|post|log|update|change|set)\b[\s\S]{0,140}\b(notes?|decision record)\b/i;
const FINANCE_NOTE_CONTEXT_RE =
    /\b(finance|financial|commercial|cost|budget|variation|invoice|claim|progress claim|qs)\b/i;
const PROGRAM_NOTE_CONTEXT_RE =
    /\b(programme|program|schedule|milestone|activity|eot|completion)\b/i;
const COST_VALUE_WRITE_RE =
    /\b(add|record|create|enter|post|allocate|log|issue|raise|submit|prepare|draft|update|change|set)\b[\s\S]{0,140}\b(budgets?|contract value|contract values|approved contracts?|contract sums?|cost plan|cost plans?|cost lines?)\b/i;
const FINANCE_WRITE_RE =
    /\b(add|record|create|enter|post|allocate|log|issue|raise|submit|prepare|draft|update|change|set)\b[\s\S]{0,140}\b(invoices?|progress claims?|claims?|fees?|cost lines?|variations?|commercial risks?|finance notes?)\b/i;
const PROGRAM_WRITE_RE =
    /\b(add|record|create|enter|post|log|update|change|set|move)\b[\s\S]{0,140}\b(programme|program|schedule|activit(?:y|ies)|milestones?|programme risks?|schedule risks?)\b/i;
const PROGRAMME_DATE_WRITE_RE =
    /\b(update|change|set|move|shift|delay)\b[\s\S]{0,180}\b(start date|end date|finish date|completion date|submission date|lodgement date|due date)\b/i;
const PROGRAMME_DATE_CONTEXT_RE =
    /\b(da\b|development application|lodgement|submission|programme|program|schedule|activit(?:y|ies)|milestones?|practical completion|pc\b|completion|tender)\b/i;
const DESIGN_WRITE_RE = new RegExp(
    String.raw`\b(add|record|create|enter|post|log|update|change|set|populate|generate|redraft|replace|append|attach|save|issue|prepare|draft)\b[\s\S]{0,140}\b(objectives?|project objectives?|brief|project brief|profile|stakeholders?|consultants?|contractors?|authorities?|contacts?|design notes?|meetings?|pre-da|da meetings?|design meetings?|${ADDENDUM_TERM}|transmittals?)\b`,
    'i'
);
const INVOICE_WRITE_RE =
    /\b(add|record|create|enter|post|allocate|log)\b[\s\S]{0,80}\b(invoice|progress claim|claim)\b/i;
const FINANCE_CONTEXT_RE =
    /\b(cost|budget|forecast|variance|cashflow|invoices?|claims?|contingency|variation|financial|fees?|contract sum|qs|commercial risk)\b/i;
const PROGRAM_CONTEXT_RE =
    /\b(programme|program|schedule|activit(?:y|ies)|milestone|delay|eot|extension of time|critical path|float|completion|duration|risk register|schedule risk)\b/i;
const DESIGN_CONTEXT_RE = new RegExp(
    String.raw`\b(design|drawing|documents?|architect|engineer|consultant|stakeholder|contractor|authority|brief|objectives?|profile|da\b|development application|planning|ncc|bca|condition|specification|meeting|${ADDENDUM_TERM}|transmittals?)\b`,
    'i'
);

export function hasWriteIntent(text: string): boolean {
    return WRITE_INTENT_RE.test(text);
}

export function isProjectStatusRequest(text: string): boolean {
    return (BRIEFING_RE.test(text) || READINESS_RE.test(text)) && !hasWriteIntent(text);
}

export function isConsultantAddendumRequest(text: string): boolean {
    return ADDENDUM_RE.test(text) && (hasWriteIntent(text) || CONSULTANT_ADDENDUM_RE.test(text));
}

export function isDocumentSelectionRequest(text: string): boolean {
    return DOCUMENT_SELECTION_RE.test(text);
}

export function isTransmittalWriteRequest(text: string): boolean {
    return TRANSMITTAL_WRITE_RE.test(text);
}

export function isRftWriteRequest(text: string): boolean {
    return RFT_WRITE_RE.test(text);
}

export function isNoteWriteRequest(text: string): boolean {
    return NOTE_WRITE_RE.test(text);
}

export function isFinanceNoteRequest(text: string): boolean {
    return isNoteWriteRequest(text) && FINANCE_NOTE_CONTEXT_RE.test(text);
}

export function isProgramNoteRequest(text: string): boolean {
    return isNoteWriteRequest(text) && PROGRAM_NOTE_CONTEXT_RE.test(text);
}

export function isCostValueWriteRequest(text: string): boolean {
    return COST_VALUE_WRITE_RE.test(text);
}

export function isFinanceWriteRequest(text: string): boolean {
    return FINANCE_WRITE_RE.test(text);
}

export function isProgramWriteRequest(text: string): boolean {
    return PROGRAM_WRITE_RE.test(text);
}

export function isProgrammeDateWriteRequest(text: string): boolean {
    return PROGRAMME_DATE_WRITE_RE.test(text) && PROGRAMME_DATE_CONTEXT_RE.test(text);
}

export function isDesignWriteRequest(text: string): boolean {
    return DESIGN_WRITE_RE.test(text);
}

export function isInvoiceWriteRequest(text: string): boolean {
    return INVOICE_WRITE_RE.test(text);
}

export function hasFinanceContext(text: string): boolean {
    return FINANCE_CONTEXT_RE.test(text);
}

export function hasProgramContext(text: string): boolean {
    return PROGRAM_CONTEXT_RE.test(text);
}

export function hasDesignContext(text: string): boolean {
    return DESIGN_CONTEXT_RE.test(text);
}

export function isVariationWriteRequest(text: string): boolean {
    if (!VARIATION_WRITE_RE.test(text)) return false;
    if (NOTE_PRIMARY_VARIATION_RE.test(text) && !STRONG_VARIATION_WRITE_RE.test(text)) {
        return false;
    }
    return true;
}

export function isIssueVariationWorkflowRequest(text: string): boolean {
    return isVariationWriteRequest(text) && VARIATION_WORKFLOW_FOLLOW_THROUGH_RE.test(text);
}
