export const RFI_STATUSES = ['draft', 'open', 'responded', 'closed'] as const;
export type RfiStatus = typeof RFI_STATUSES[number];

export const RFI_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type RfiPriority = typeof RFI_PRIORITIES[number];

export const RFI_FILTERS = ['all', 'draft-open', 'overdue', 'responded', 'closed'] as const;
export type RfiFilter = typeof RFI_FILTERS[number];

export const RFI_EVIDENCE_TARGET_TYPES = ['document', 'note', 'correspondence'] as const;
export type RfiEvidenceTargetType = typeof RFI_EVIDENCE_TARGET_TYPES[number];

export const RFI_AUDIT_ACTIONS = ['response_recorded', 'closed', 'reopened'] as const;
export type RfiAuditAction = typeof RFI_AUDIT_ACTIONS[number];

export const RFI_EXPORT_FORMATS = ['pdf', 'docx'] as const;
export type RfiExportFormat = typeof RFI_EXPORT_FORMATS[number];

export const RFI_STATUS_LABELS: Record<RfiStatus, string> = {
    draft: 'Draft',
    open: 'Open',
    responded: 'Responded',
    closed: 'Closed',
};

export const RFI_PRIORITY_LABELS: Record<RfiPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
};

export const RFI_FILTER_LABELS: Record<RfiFilter, string> = {
    all: 'All',
    'draft-open': 'Draft/Open',
    overdue: 'Overdue',
    responded: 'Responded',
    closed: 'Closed',
};

export type RfiDisplayState = 'none' | 'upcoming' | 'due_today' | 'overdue';

export interface RfiResponsibleParty {
    id: string;
    name: string;
    organization: string | null;
    role: string | null;
    disciplineOrTrade: string | null;
}

export interface RfiSourceNote {
    id: string;
    title: string;
}

export interface RfiEvidenceLink {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    targetType: RfiEvidenceTargetType;
    targetId: string;
    label: string;
    createdAt: string;
}

export interface RfiAuditEvent {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    action: RfiAuditAction;
    actorId: string;
    actorName: string | null;
    previousStatus: RfiStatus;
    newStatus: RfiStatus;
    createdAt: string;
}

export interface RfiIssuedArtefact {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    versionNumber: number;
    format: RfiExportFormat;
    fileAssetId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    hash: string;
    sourceRfiRowVersion: number;
    generatedBy: string;
    generatedByName: string | null;
    generatedAt: string;
    createdAt: string;
}

export interface RfiIssuedArtefactListResponse {
    issuedArtefacts: RfiIssuedArtefact[];
    latestIssuedArtefact: RfiIssuedArtefact | null;
}

export interface GenerateRfiExportRequest {
    format?: RfiExportFormat;
}

export interface RfiRecord {
    id: string;
    projectId: string;
    organizationId: string;
    rfiNumber: number;
    reference: string;
    title: string;
    question: string;
    status: RfiStatus;
    priority: RfiPriority;
    responsibleStakeholderId: string | null;
    responsibleParty: RfiResponsibleParty | null;
    responsiblePartyLabel: string;
    dueDate: string | null;
    responseText: string | null;
    responseDate: string | null;
    sourceNoteId: string | null;
    sourceNote: RfiSourceNote | null;
    evidenceLinks: RfiEvidenceLink[];
    auditTrail: RfiAuditEvent[];
    displayState: RfiDisplayState;
    isOverdue: boolean;
    rowVersion: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface RfiListResponse {
    rfis: RfiRecord[];
    total: number;
    filter: RfiFilter;
}

export interface CreateRfiRequest {
    title: string;
    question: string;
    status?: RfiStatus;
    priority?: RfiPriority;
    responsibleStakeholderId?: string | null;
    dueDate?: string | null;
}

export interface UpdateRfiRequest {
    title?: string;
    question?: string;
    status?: RfiStatus;
    priority?: RfiPriority;
    responsibleStakeholderId?: string | null;
    dueDate?: string | null;
}

export interface AddRfiEvidenceRequest {
    targetType: RfiEvidenceTargetType;
    targetId: string;
}

export interface RecordRfiResponseRequest {
    responseText: string;
    responseDate: string;
    evidence?: AddRfiEvidenceRequest | null;
}

export interface PromoteNoteToRfiRequest {
    noteId: string;
}

export function isRfiStatus(value: unknown): value is RfiStatus {
    return typeof value === 'string' && (RFI_STATUSES as readonly string[]).includes(value);
}

export function isRfiPriority(value: unknown): value is RfiPriority {
    return typeof value === 'string' && (RFI_PRIORITIES as readonly string[]).includes(value);
}

export function isRfiFilter(value: unknown): value is RfiFilter {
    return typeof value === 'string' && (RFI_FILTERS as readonly string[]).includes(value);
}

export function isRfiEvidenceTargetType(value: unknown): value is RfiEvidenceTargetType {
    return typeof value === 'string' && (RFI_EVIDENCE_TARGET_TYPES as readonly string[]).includes(value);
}

export function isRfiExportFormat(value: unknown): value is RfiExportFormat {
    return typeof value === 'string' && (RFI_EXPORT_FORMATS as readonly string[]).includes(value);
}

export function formatRfiNumber(rfiNumber: number): string {
    return `RFI-${String(rfiNumber).padStart(3, '0')}`;
}

export function isValidIsoDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

export function toLocalIsoDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function deriveRfiDisplayState(
    input: { status: RfiStatus; dueDate: string | null },
    today = toLocalIsoDate()
): RfiDisplayState {
    if (!input.dueDate || input.status === 'responded' || input.status === 'closed') {
        return 'none';
    }
    if (input.dueDate < today) return 'overdue';
    if (input.dueDate === today) return 'due_today';
    return 'upcoming';
}

export function matchesRfiFilter(
    input: { status: RfiStatus; dueDate: string | null },
    filter: RfiFilter,
    today = toLocalIsoDate()
): boolean {
    if (filter === 'all') return true;
    if (filter === 'draft-open') return input.status === 'draft' || input.status === 'open';
    if (filter === 'responded') return input.status === 'responded';
    if (filter === 'closed') return input.status === 'closed';
    return deriveRfiDisplayState(input, today) === 'overdue';
}
