const VARIATION_WRITE_RE =
    /\b(issue|raise|submit|prepare|draft|create|add|record|log)\b[\s\S]{0,100}\bvariations?\b|\bvariations?\b[\s\S]{0,100}\b(issue|raise|submit|prepare|draft|create|add|record|log)\b/i;

const NOTE_PRIMARY_VARIATION_RE =
    /\b(create|add|record|update|change|edit)\b[\s\S]{0,60}\bnotes?\b[\s\S]{0,120}\bvariations?\b/i;

const STRONG_VARIATION_WRITE_RE =
    /\b(issue|raise|submit)\b[\s\S]{0,100}\bvariations?\b|\bvariations?\b[\s\S]{0,100}\b(issue|raise|submit)\b/i;

const VARIATION_WORKFLOW_FOLLOW_THROUGH_RE =
    /\b(cost[-\s]?plan|cost lines?|programme|program|schedule|activities?|milestones?|project notes?|notes?|correspondence|letters?|emails?|link it|link this|linked)\b/i;

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
