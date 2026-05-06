export const CORRESPONDENCE_TYPES = [
    'rfi_response',
    'tender_submission',
    'consultant_query',
    'council_correspondence',
    'contractor_correspondence',
    'client_correspondence',
    'general',
] as const;

export type CorrespondenceType = typeof CORRESPONDENCE_TYPES[number];

export const CORRESPONDENCE_CLASSIFICATION_STATUSES = [
    'unclassified',
    'suggested',
    'confirmed',
] as const;

export type CorrespondenceClassificationStatus =
    typeof CORRESPONDENCE_CLASSIFICATION_STATUSES[number];

export interface CorrespondenceAddress {
    email: string;
    name?: string | null;
}

export interface InboundCorrespondenceAttachmentInput {
    filename: string;
    contentBase64: string;
    contentType?: string | null;
    contentId?: string | null;
}

export interface InboundCorrespondenceInput {
    projectId?: string;
    messageId?: string | null;
    providerMessageId?: string | null;
    from: string | CorrespondenceAddress;
    to?: Array<string | CorrespondenceAddress> | string | null;
    cc?: Array<string | CorrespondenceAddress> | string | null;
    subject?: string | null;
    bodyText?: string | null;
    bodyHtml?: string | null;
    sentAt?: string | null;
    receivedAt?: string | null;
    inReplyTo?: string | null;
    references?: string[] | string | null;
    headers?: Record<string, string | string[] | null | undefined> | null;
    attachments?: InboundCorrespondenceAttachmentInput[];
    correspondenceType?: CorrespondenceType;
    rawPayload?: Record<string, unknown>;
}

export interface ProjectInboxView {
    projectId: string;
    localPart: string;
    emailAddress: string;
}

export interface CorrespondenceAttachmentView {
    id: string;
    documentId: string | null;
    fileAssetId: string | null;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
}

export interface CorrespondenceView {
    id: string;
    threadId: string;
    subject: string;
    normalizedSubject: string;
    fromName: string | null;
    fromEmail: string;
    toEmails: string[];
    ccEmails: string[];
    bodyText: string | null;
    correspondenceType: CorrespondenceType;
    classificationStatus: CorrespondenceClassificationStatus;
    receivedAt: string | null;
    sentAt: string | null;
    attachmentCount: number;
    attachments: CorrespondenceAttachmentView[];
}
