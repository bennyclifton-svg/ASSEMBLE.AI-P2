/**
 * Feature 011: Evaluation Report Types
 * Types for the EVALUATION report in the Procurement section
 */

// Evaluation entity
export interface Evaluation {
    id: string;
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// Row source type (Feature 011 US7)
export type EvaluationRowSource = 'cost_plan' | 'ai_parsed' | 'manual';

// Evaluation row entity
export interface EvaluationRow {
    id: string;
    evaluationId: string;
    tableType: 'initial_price' | 'adds_subs';
    description: string;
    orderIndex: number;
    isSystemRow?: boolean;
    costLineId?: string | null;
    // Feature 011 US7: Track row origin
    source?: EvaluationRowSource;
    sourceSubmissionId?: string | null;
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
    source: 'manual' | 'ai';
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
    source?: 'manual' | 'ai';
    confidence?: number;
}

export interface AddRowRequest {
    tableType: 'initial_price' | 'adds_subs';
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
    grandTotals: TableSubtotals;
}

// FortuneSheet integration types
export interface EvaluationSheetData {
    rows: EvaluationRow[];
    firms: EvaluationFirm[];
    tableType: 'initial_price' | 'adds_subs';
}

// Item type classification for tender parsing
export type TenderItemType = 'deliverable' | 'total' | 'unit_rate' | 'allowance';

// Parse result types (for AI extraction)
export interface ParsedLineItem {
    description: string;
    amountCents: number;
    confidence: number;
    matchedRowId?: string;
    // Classification fields for filtering
    itemType?: TenderItemType;
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
    firmId: string;
    firmType: 'consultant' | 'contractor';
    filename: string;
    fileAssetId?: string | null;
    parsedAt?: string;
    parserUsed?: string;
    confidence?: number | null;
    rawExtractedItems?: string | null; // JSON string
    createdAt?: string;
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
    summary: string;
    rating: QualityRating;
    confidence: number;
    keyPoints: string[];
    sourceChunks: string[];
}

// Full non-price evaluation data with criteria and cells
export interface NonPriceEvaluationData {
    evaluation: Evaluation;
    criteria: EvaluationNonPriceCriteria[];
    cells: EvaluationNonPriceCell[];
    firms: EvaluationFirm[];
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
