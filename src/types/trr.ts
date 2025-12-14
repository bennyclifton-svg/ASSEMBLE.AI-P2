/**
 * TRR (Tender Recommendation Report) Types
 * Feature 012 - TRR Report
 */

export interface TRR {
    id: string;
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
    executiveSummary?: string | null;
    clarifications?: string | null;
    recommendation?: string | null;
    reportDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface TRRTransmittal {
    id: string;
    trrId: string;
    documentId: string;
    addedAt?: string;
}

export interface TRRWithContext extends TRR {
    disciplineName?: string;
    tradeName?: string;
}

export interface TRRUpdateData {
    executiveSummary?: string | null;
    clarifications?: string | null;
    recommendation?: string | null;
    reportDate?: string | null;
}

// Tender Process table row
export interface TenderProcessFirm {
    id: string;
    companyName: string;
    contactPerson?: string | null;
    shortlisted: boolean;
    rftDate?: string | null;
}

// Addendum table row for TRR display
export interface TRRAddendumRow {
    id: string;
    addendumNumber: number;
    summary: string;
    date?: string | null;
}

// Evaluation display data
export interface TRREvaluationData {
    hasData: boolean;
    rows: Array<{
        description: string;
        values: Record<string, number>; // firmId -> amount in cents
    }>;
    firms: Array<{
        id: string;
        companyName: string;
    }>;
}

// Attachment display data
export interface TRRAttachment {
    id: string;
    documentName: string;
    revision: number;
    date?: string;
}
