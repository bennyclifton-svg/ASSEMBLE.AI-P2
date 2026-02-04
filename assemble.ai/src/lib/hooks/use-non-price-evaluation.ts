/**
 * Feature 013: use-non-price-evaluation hook
 * React hook for fetching and updating non-price evaluation data
 * T011-T012: Data loading, mutation, optimistic updates
 */

import { useState, useCallback, useEffect } from 'react';
import type {
    NonPriceEvaluationData,
    EvaluationNonPriceCriteria,
    EvaluationNonPriceCell,
    EvaluationFirm,
    QualityRating,
    NonPriceExtractionResult,
} from '@/types/evaluation';

interface UseNonPriceEvaluationOptions {
    projectId: string;
    stakeholderId?: string;
}

// Parse result for UI feedback
export interface NonPriceParseResult {
    success: boolean;
    firmId: string;
    extractedCount: number;
    overallConfidence: number;
    results?: NonPriceExtractionResult[];
    error?: string;
}

interface UseNonPriceEvaluationReturn {
    data: NonPriceEvaluationData | null;
    isLoading: boolean;
    error: string | null;
    isSaving: boolean;
    isParsing: boolean;
    parsingFirmId: string | null;
    firmType: 'consultant' | 'contractor';

    // Actions
    refresh: () => Promise<void>;
    updateCell: (
        criteriaId: string,
        firmId: string,
        firmType: 'consultant' | 'contractor',
        content: string,
        rating: QualityRating
    ) => Promise<boolean>;
    parseTender: (file: File, firmId: string, firmType: 'consultant' | 'contractor') => Promise<NonPriceParseResult>;

    // Computed values
    shortlistedFirms: EvaluationFirm[];
    getCellForFirm: (criteriaId: string, firmId: string) => EvaluationNonPriceCell | undefined;
    getCriteriaInOrder: () => EvaluationNonPriceCriteria[];
}

export function useNonPriceEvaluation({
    projectId,
    stakeholderId,
}: UseNonPriceEvaluationOptions): UseNonPriceEvaluationReturn {
    const [data, setData] = useState<NonPriceEvaluationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [parsingFirmId, setParsingFirmId] = useState<string | null>(null);

    // Use stakeholder context - firmType determined from data
    const contextType = 'stakeholder';
    const contextId = stakeholderId;

    // Use firmType from API response (derived from stakeholder group)
    const firmType: 'consultant' | 'contractor' = data?.firmType ?? 'consultant';

    // Fetch non-price evaluation data
    const fetchData = useCallback(async () => {
        if (!contextId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/non-price`
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch non-price evaluation data');
            }

            const result = await response.json();
            setData(result.data);
        } catch (err) {
            console.error('Error fetching non-price evaluation:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch non-price evaluation data');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, contextType, contextId]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Update a cell (T019 - save on modal close)
    const updateCell = useCallback(async (
        criteriaId: string,
        firmId: string,
        firmType: 'consultant' | 'contractor',
        content: string,
        rating: QualityRating
    ): Promise<boolean> => {
        if (!contextId) return false;

        // T012: Optimistic update
        setData(prev => {
            if (!prev) return prev;

            const existingCellIndex = prev.cells.findIndex(
                c => c.criteriaId === criteriaId && c.firmId === firmId
            );

            const updatedCells = [...prev.cells];

            if (existingCellIndex >= 0) {
                // Update existing cell
                updatedCells[existingCellIndex] = {
                    ...updatedCells[existingCellIndex],
                    userEditedContent: content,
                    userEditedRating: rating,
                    updatedAt: new Date().toISOString(),
                };
            } else {
                // Add new cell (optimistic)
                updatedCells.push({
                    id: `temp-${Date.now()}`,
                    criteriaId,
                    firmId,
                    firmType,
                    extractedContent: null,
                    qualityRating: null,
                    userEditedContent: content,
                    userEditedRating: rating,
                    source: 'manual',
                    confidence: null,
                    sourceChunks: null,
                    sourceSubmissionId: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            return { ...prev, cells: updatedCells };
        });

        try {
            setIsSaving(true);

            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/non-price`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        criteriaId,
                        firmId,
                        firmType,
                        content,
                        rating,
                    }),
                }
            );

            if (!response.ok) {
                // Rollback on error
                await fetchData();
                throw new Error('Failed to update cell');
            }

            const result = await response.json();

            // Update with actual cell data from server
            if (result.cell) {
                setData(prev => {
                    if (!prev) return prev;

                    const existingCellIndex = prev.cells.findIndex(
                        c => c.criteriaId === criteriaId && c.firmId === firmId
                    );

                    const updatedCells = [...prev.cells];

                    if (existingCellIndex >= 0) {
                        updatedCells[existingCellIndex] = result.cell;
                    } else {
                        updatedCells.push(result.cell);
                    }

                    return { ...prev, cells: updatedCells };
                });
            }

            return true;
        } catch (err) {
            console.error('Error updating cell:', err);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [projectId, contextType, contextId, fetchData]);

    // Parse tender PDF for non-price criteria
    const parseTender = useCallback(async (
        file: File,
        firmId: string,
        firmType: 'consultant' | 'contractor'
    ): Promise<NonPriceParseResult> => {
        if (!contextId) {
            return {
                success: false,
                firmId,
                extractedCount: 0,
                overallConfidence: 0,
                error: 'No context ID',
            };
        }

        try {
            setIsParsing(true);
            setParsingFirmId(firmId);

            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('firmId', firmId);
            formData.append('firmType', firmType);

            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/non-price/parse`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to parse tender');
            }

            const result = await response.json();

            // Refresh data to get updated cells
            await fetchData();

            return {
                success: true,
                firmId,
                extractedCount: result.results?.length || 0,
                overallConfidence: result.results
                    ? result.results.reduce((sum: number, r: NonPriceExtractionResult) => sum + r.confidence, 0) / result.results.length
                    : 0,
                results: result.results,
            };
        } catch (err) {
            console.error('Error parsing tender:', err);
            return {
                success: false,
                firmId,
                extractedCount: 0,
                overallConfidence: 0,
                error: err instanceof Error ? err.message : 'Failed to parse tender',
            };
        } finally {
            setIsParsing(false);
            setParsingFirmId(null);
        }
    }, [projectId, contextType, contextId, fetchData]);

    // Computed: Get shortlisted firms only
    const shortlistedFirms = data?.firms.filter(f => f.shortlisted) || [];

    // Helper: Get cell for a specific firm and criteria
    const getCellForFirm = useCallback((criteriaId: string, firmId: string): EvaluationNonPriceCell | undefined => {
        return data?.cells.find(c => c.criteriaId === criteriaId && c.firmId === firmId);
    }, [data?.cells]);

    // Helper: Get criteria in order
    const getCriteriaInOrder = useCallback((): EvaluationNonPriceCriteria[] => {
        return data?.criteria.sort((a, b) => a.orderIndex - b.orderIndex) || [];
    }, [data?.criteria]);

    return {
        data,
        isLoading,
        error,
        isSaving,
        isParsing,
        parsingFirmId,
        firmType,
        refresh: fetchData,
        updateCell,
        parseTender,
        shortlistedFirms,
        getCellForFirm,
        getCriteriaInOrder,
    };
}
