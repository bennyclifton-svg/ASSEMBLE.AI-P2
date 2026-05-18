import type { ObjectiveType } from '@/lib/db/objectives-schema';
import type {
    BriefingCoverage,
    briefingMessages,
    briefingSessions,
} from '@/lib/db/pg-schema';

export type BriefingSessionRow = typeof briefingSessions.$inferSelect;
export type BriefingMessageRow = typeof briefingMessages.$inferSelect;

export type BriefingToolName =
    | 'updateProfileField'
    | 'upsertObjective'
    | 'markCategoryCovered'
    | 'searchBriefingDocuments';

export interface BriefingToolCallRecord {
    name: BriefingToolName | string;
    input: unknown;
    output?: unknown;
    error?: string;
}

export interface BriefingDocumentMetadata {
    attachmentId: string;
    documentId: string;
    title: string;
    type: string | null;
    pageCount: number | null;
    ocrStatus: string | null;
    ragStatus: string | null;
    attachedAt: string | Date | null;
}

export interface BriefingContextSnapshot {
    projectId: string;
    profile: unknown;
    projectDetails: unknown;
    objectives: Array<{
        id: string;
        objectiveType: ObjectiveType;
        text: string;
        status: string;
        source: string;
        sortOrder: number | null;
    }>;
    attachments: BriefingDocumentMetadata[];
    session: BriefingSessionRow;
    messages: BriefingMessageRow[];
}

export type TurnEvent =
    | { type: 'status'; message: string }
    | { type: 'text-delta'; text: string }
    | { type: 'tool-call-result'; result: BriefingToolCallRecord }
    | { type: 'coverage'; coverage: BriefingCoverage }
    | { type: 'done'; message: BriefingMessageRow; session: BriefingSessionRow }
    | { type: 'error'; error: string };
