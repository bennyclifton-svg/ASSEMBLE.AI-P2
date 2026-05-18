/**
 * Feature 011: Evaluation Report Types
 * Types for the EVALUATION report in the Procurement section
 */

// =============================================================================
// Shared Column Width Constants
// Used by EvaluationSheet, EvaluationPriceTab (Grand Total), and related tables
// to ensure consistent horizontal alignment across all evaluation tables
// =============================================================================
export const EVALUATION_TABLE_COLUMNS = {
    dragHandle: 32,      // Drag handle / add row button column
    description: 308,    // Description/line item column
    firmColumn: 120,     // Each firm amount column
    deleteButton: 28,    // Delete button column
} as const;

// Calculate total table width based on number of firms
// This ensures all evaluation tables have identical widths for alignment
export function getEvaluationTableWidth(firmCount: number): number {
    return (
        EVALUATION_TABLE_COLUMNS.dragHandle +
        EVALUATION_TABLE_COLUMNS.description +
        (firmCount * EVALUATION_TABLE_COLUMNS.firmColumn) +
        EVALUATION_TABLE_COLUMNS.deleteButton
    );
}

// Evaluation entity
export interface Evaluation {
    id: string;
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
    stakeholderId?: string | null;
    recommendationState?: RecommendationState;
    createdAt?: string;
    updatedAt?: string;
}

export const EVALUATION_TABLE_TYPES = ['initial_price', 'adds_subs', 'value_management'] as const;
export type EvaluationTableType = typeof EVALUATION_TABLE_TYPES[number];

export const EVALUATION_CELL_VALUE_TYPES = [
    'amount',
    'included',
    'assumed_included',
    'excluded',
    'tbc',
    'na',
    'blank',
] as const;
export type EvaluationCellValueType = typeof EVALUATION_CELL_VALUE_TYPES[number];

export type VmAdoptionStatus = 'adopted' | 'tbd' | 'not_adopted';
export type VmOrigin = 'tenderer_proposed' | 'pm_client_proposed' | 'ai_identified' | 'tender_wide_option';
export type RecommendationState = 'draft' | 'conditional' | 'final';
export type RecommendationEvent =
    | 'high_materiality_clarification_raised'
    | 'high_materiality_clarification_resolved'
    | 'refresh_applied'
    | 'new_tender_file_attached'
    | 'active_price_instance_changed'
    | 'user_confirms_final';
export type ClarificationStatus = 'draft' | 'issued' | 'responded' | 'closed';
export type ClarificationMateriality = 'low' | 'medium' | 'high';

// Row source type (Feature 011 US7 + tender AI foundations)
export type EvaluationRowSource = 'cost_plan' | 'ai_parsed' | 'manual' | 'ai' | 'system';
export type EvaluationCellSource = 'manual' | 'ai' | 'system';

// Evaluation row entity
export interface EvaluationRow {
    id: string;
    evaluationId: string;
    evaluationPriceId?: string | null;
    tableType: EvaluationTableType;
    description: string;
    orderIndex: number;
    isSystemRow?: boolean;
    costLineId?: string | null;
    // Feature 011 US7: Track row origin
    source?: EvaluationRowSource;
    sourceSubmissionId?: string | null;
    aiStableKey?: string | null;
    isLocked?: boolean | null;
    category?: string | null;
    sourceDocumentId?: string | null;
    sourceFileAssetId?: string | null;
    vmAdoptionStatus?: VmAdoptionStatus | null;
    vmEmbeddedInBase?: boolean | null;
    vmOrigin?: VmOrigin | null;
    createdAt?: string;
    cells?: EvaluationCell[];
}

// Evaluation cell entity
export interface EvaluationCell {
    id: string;
    rowId: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    amountCents: number;
    valueType?: EvaluationCellValueType | null;
    source: EvaluationCellSource;
    confidence?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

// Firm info for display in columns
export interface EvaluationFirm {
    id: string;
    companyName: string;
    shortlisted: boolean;
    awarded?: boolean;
    firmType?: 'consultant' | 'contractor';
}

// Full evaluation data with rows and cells
export interface EvaluationData {
    evaluation: Evaluation | null;
    rows: EvaluationRow[];
    firms: EvaluationFirm[];
}

// API request types
export interface UpdateCellRequest {
    rowId: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    amountCents: number;
    valueType?: EvaluationCellValueType;
    source?: EvaluationCellSource;
    confidence?: number;
}

export interface AddRowRequest {
    tableType: EvaluationTableType;
    description: string;
}

export interface DeleteRowRequest {
    rowId: string;
}

// API response types
export interface EvaluationApiResponse {
    success: boolean;
    data?: EvaluationData;
    error?: string;
}

// Calculation types
export interface TableSubtotals {
    [firmId: string]: number; // Amount in cents
}

export interface EvaluationTotals {
    initialPriceSubtotals: TableSubtotals;
    addSubsSubtotals: TableSubtotals;
    valueManagementSubtotals: TableSubtotals;
    comparableTotals: TableSubtotals;
    awardBasisTotals: TableSubtotals;
    // Legacy alias retained for current UI/export code paths.
    grandTotals: TableSubtotals;
}

// FortuneSheet integration types
export interface EvaluationSheetData {
    rows: EvaluationRow[];
    firms: EvaluationFirm[];
    tableType: EvaluationTableType;
}

// Item type classification for tender parsing
export type TenderItemType =
    | 'deliverable'
    | 'total'
    | 'unit_rate'
    | 'allowance'
    | 'commercial_adjustment'
    | 'value_management';

// Parse result types (for AI extraction)
export interface ParsedLineItem {
    description: string;
    amountCents: number;
    confidence: number;
    matchedRowId?: string;
    // Classification fields for filtering
    itemType?: TenderItemType;
    tableType?: EvaluationTableType;
    category?: string;
    sourceSection?: string;
    vmAdoptionStatus?: VmAdoptionStatus;
    vmEmbeddedInBase?: boolean;
    vmOrigin?: VmOrigin;
    isFiltered?: boolean;
    filterReason?: string;
}

export interface TenderParseResult {
    firmId: string;
    firmName?: string;
    items: ParsedLineItem[];
    filteredItems?: ParsedLineItem[];  // Items filtered out (totals, unit rates)
    overallConfidence: number;
    errors?: string[];
}

export interface BulkParseResult {
    results: TenderParseResult[];
    unmatchedDocuments: Array<{
        documentId: string;
        documentName: string;
        reason: string;
    }>;
}

// Feature 011 US7: Tender Submission (audit trail)
export interface TenderSubmission {
    id: string;
    evaluationId: string;
    packageId?: string | null;
    evaluationPriceId?: string | null;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    filename: string;
    documentId?: string | null;
    versionId?: string | null;
    fileAssetId?: string | null;
    parsedAt?: string;
    parserUsed?: string;
    confidence?: number | null;
    rawExtractedItems?: string | null; // JSON string
    createdAt?: string;
}

export interface TenderSubmissionPackage {
    id: string;
    evaluationId: string;
    evaluationPriceId?: string | null;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    status?: 'active' | 'superseded' | 'archived' | string | null;
    createdAt?: string;
    updatedAt?: string;
    submissions?: TenderSubmission[];
}

export type AiArtefactKind =
    | 'full_extraction'
    | 'file_interpretation'
    | 'package_interpretation'
    | 'prompt_trace'
    | 'issue_snapshot';

export interface AiArtefact {
    id: string;
    kind: AiArtefactKind;
    hash: string;
    status: 'ready' | 'failed' | 'pending' | string;
    payloadFileAssetId?: string | null;
    evaluationId?: string | null;
    evaluationPriceId?: string | null;
    packageId?: string | null;
    submissionId?: string | null;
    actionInvocationId?: string | null;
    trrId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt?: string;
}

export interface Clarification {
    id: string;
    evaluationId: string;
    evaluationPriceId?: string | null;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    questionText: string;
    category?: string | null;
    materiality: ClarificationMateriality;
    status: ClarificationStatus;
    responseText?: string | null;
    responseDocumentId?: string | null;
    responseFileAssetId?: string | null;
    linkedRowIds: string[];
    linkedAddendumId?: string | null;
    sourceAiArtefactId?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// Feature 011 US7: Merge rows request
export interface MergeRowsRequest {
    rowIds: string[];
    newDescription: string;
    tableType: 'initial_price' | 'adds_subs';
}

// Feature 011 US7: Merge rows result
export interface MergeRowsResult {
    success: boolean;
    mergedRow?: EvaluationRow;
    error?: string;
}

// Feature 011 US7: Update row description request
export interface UpdateRowDescriptionRequest {
    rowId: string;
    description: string;
}

export interface UpdateRowMetaRequest {
    vmAdoptionStatus?: VmAdoptionStatus | null;
    vmEmbeddedInBase?: boolean | null;
    vmOrigin?: VmOrigin | null;
    isLocked?: boolean;
}

// =============================================================================
// Feature 013: Evaluation Non-Price Types
// Types for the NON-PRICE tab in the Evaluation section
// =============================================================================

// Non-Price Criteria Key (7 fixed criteria)
export const NON_PRICE_CRITERIA_KEYS = [
    'methodology',
    'program',
    'personnel',
    'experience',
    'health_safety',
    'insurance',
    'departures',
] as const;

export type NonPriceCriteriaKey = typeof NON_PRICE_CRITERIA_KEYS[number];

// Quality Rating (Good/Average/Poor)
export const QUALITY_RATINGS = ['good', 'average', 'poor'] as const;

export type QualityRating = typeof QUALITY_RATINGS[number];

// Criteria definition (for constants)
export interface NonPriceCriteriaDefinition {
    key: NonPriceCriteriaKey;
    label: string;
    description: string;
    searchQuery: string; // For semantic search
}

// Non-Price Criteria entity (stored in DB)
export interface EvaluationNonPriceCriteria {
    id: string;
    evaluationId: string;
    criteriaKey: NonPriceCriteriaKey;
    criteriaLabel: string;
    orderIndex: number;
    createdAt?: string;
}

// Non-Price Cell entity (stored in DB)
export interface EvaluationNonPriceCell {
    id: string;
    criteriaId: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    // AI-extracted content
    extractedContent: string | null;
    qualityRating: QualityRating | null;
    // User overrides (take precedence)
    userEditedContent: string | null;
    userEditedRating: QualityRating | null;
    // Metadata
    source: 'manual' | 'ai';
    confidence: number | null;
    sourceChunks: string[] | null; // Parsed from JSON
    sourceSubmissionId: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// AI extraction result for a single criterion
export interface NonPriceExtractionResult {
    criteriaKey: NonPriceCriteriaKey;
    summary: string;  // Now formatted as bullet points: "• Point one\n• Point two"
    rating: QualityRating;
    confidence: number;
    keyPoints?: string[];  // Optional - kept for backwards compatibility
    sourceChunks: string[];
}

// Full non-price evaluation data with criteria and cells
export interface NonPriceEvaluationData {
    evaluation: Evaluation;
    criteria: EvaluationNonPriceCriteria[];
    cells: EvaluationNonPriceCell[];
    firms: EvaluationFirm[];
    firmType: 'consultant' | 'contractor';
}

// API request types for non-price
export interface UpdateNonPriceCellRequest {
    criteriaId: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    content: string;
    rating: QualityRating;
}

// API response types for non-price
export interface NonPriceApiResponse {
    success: boolean;
    data?: NonPriceEvaluationData;
    error?: string;
}

// Parse request for single tender
export interface NonPriceParseRequest {
    firmId: string;
    firmType: 'consultant' | 'contractor';
    // File is sent as multipart form data
}

// Parse response
export interface NonPriceParseResponse {
    success: boolean;
    results?: NonPriceExtractionResult[];
    submission?: TenderSubmission;
    error?: string;
}

// Helper functions for display logic
export function getDisplayContent(cell: EvaluationNonPriceCell): string | null {
    return cell.userEditedContent ?? cell.extractedContent;
}

export function getDisplayRating(cell: EvaluationNonPriceCell): QualityRating | null {
    return cell.userEditedRating ?? cell.qualityRating;
}

export function isUserEdited(cell: EvaluationNonPriceCell): boolean {
    return cell.userEditedContent !== null || cell.userEditedRating !== null;
}

export function isAIGenerated(cell: EvaluationNonPriceCell): boolean {
    return cell.source === 'ai' && cell.extractedContent !== null;
}

export function isLowConfidence(cell: EvaluationNonPriceCell): boolean {
    return cell.confidence !== null && cell.confidence < 70;
}
