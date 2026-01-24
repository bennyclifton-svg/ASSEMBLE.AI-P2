/**
 * T008: use-evaluation hook
 * React hook for fetching and updating evaluation data
 * T032: Debounced auto-save (500ms)
 * Feature 011 - Evaluation Report
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
    EvaluationData,
    EvaluationRow,
    EvaluationCell,
    UpdateCellRequest,
    AddRowRequest,
    EvaluationFirm,
    MergeRowsRequest,
} from '@/types/evaluation';

interface UseEvaluationOptions {
    projectId: string;
    stakeholderId?: string;
}

// T048-T051: Parse result for UI feedback
export interface ParseTenderResult {
    success: boolean;
    firmId: string;
    mappedCount: number;
    unmappedCount: number;
    newRowsCreated: number;
    overallConfidence: number;
    error?: string;
}

// T086: Merge rows result
export interface MergeRowsResult {
    success: boolean;
    mergedRow?: EvaluationRow;
    deletedRowIds?: string[];
    error?: string;
}

interface UseEvaluationReturn {
    data: EvaluationData | null;
    isLoading: boolean;
    error: string | null;
    isSaving: boolean;
    isParsing: boolean;
    parsingFirmId: string | null;
    firmType: 'consultant' | 'contractor';

    // Actions
    refresh: () => Promise<void>;
    updateCell: (request: UpdateCellRequest) => Promise<void>;
    addRow: (request: AddRowRequest) => Promise<EvaluationRow | null>;
    deleteRow: (rowId: string) => Promise<boolean>;
    parseTender: (file: File, firmId: string) => Promise<ParseTenderResult>;
    // T086: Merge rows
    mergeRows: (rowIds: string[], newDescription: string, tableType: 'initial_price' | 'adds_subs') => Promise<MergeRowsResult>;
    // T088: Update row description
    updateRowDescription: (rowId: string, description: string) => Promise<boolean>;

    // Computed values
    shortlistedFirms: EvaluationFirm[];
    initialPriceRows: EvaluationRow[];
    addSubsRows: EvaluationRow[];
}

// Debounce delay for auto-save (T032)
const DEBOUNCE_DELAY = 500;

export function useEvaluation({
    projectId,
    stakeholderId,
}: UseEvaluationOptions): UseEvaluationReturn {
    const [data, setData] = useState<EvaluationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // T048-T051: Parsing state
    const [isParsing, setIsParsing] = useState(false);
    const [parsingFirmId, setParsingFirmId] = useState<string | null>(null);

    // T032: Debounce tracking for auto-save
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdatesRef = useRef<Map<string, UpdateCellRequest>>(new Map());

    // Use stakeholder context - contextType kept for URL compatibility
    const contextType = 'stakeholder';
    const contextId = stakeholderId;

    // Determine firm type from loaded data (first firm's type)
    const firmType: 'consultant' | 'contractor' = data?.firms?.[0]?.firmType || 'consultant';

    // Fetch evaluation data
    const fetchData = useCallback(async () => {
        if (!contextId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}`
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch evaluation data');
            }

            const result = await response.json();
            setData(result.data);
        } catch (err) {
            console.error('Error fetching evaluation:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch evaluation data');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, contextType, contextId]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // T032: Flush pending updates to server
    const flushPendingUpdates = useCallback(async () => {
        if (pendingUpdatesRef.current.size === 0) return;

        const updates = Array.from(pendingUpdatesRef.current.values());
        pendingUpdatesRef.current.clear();

        setIsSaving(true);

        try {
            // Send all pending updates
            await Promise.all(
                updates.map(async (request) => {
                    const response = await fetch(
                        `/api/evaluation/${projectId}/${contextType}/${contextId}`,
                        {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'updateCell',
                                ...request,
                            }),
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Failed to update cell');
                    }
                })
            );
        } catch (err) {
            console.error('Error updating cells:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [projectId, contextType, contextId]);

    // T032: Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                // Flush any pending updates on unmount
                flushPendingUpdates();
            }
        };
    }, [flushPendingUpdates]);

    // Update a cell value with T032 debounced auto-save (500ms)
    const updateCell = useCallback(async (request: UpdateCellRequest) => {
        if (!contextId || !data?.evaluation) return;

        // Optimistically update local state immediately
        setData(prev => {
            if (!prev) return prev;

            const updatedRows = prev.rows.map(row => {
                if (row.id !== request.rowId) return row;

                const existingCellIndex = row.cells?.findIndex(
                    c => c.firmId === request.firmId
                ) ?? -1;

                const newCell: EvaluationCell = {
                    id: existingCellIndex >= 0 ? row.cells![existingCellIndex].id : `temp-${Date.now()}`,
                    rowId: request.rowId,
                    firmId: request.firmId,
                    firmType: request.firmType,
                    amountCents: request.amountCents,
                    source: request.source || 'manual',
                    confidence: request.confidence,
                };

                const updatedCells = [...(row.cells || [])];
                if (existingCellIndex >= 0) {
                    updatedCells[existingCellIndex] = newCell;
                } else {
                    updatedCells.push(newCell);
                }

                return { ...row, cells: updatedCells };
            });

            return { ...prev, rows: updatedRows };
        });

        // T032: Queue the update with debouncing
        const cellKey = `${request.rowId}:${request.firmId}`;
        pendingUpdatesRef.current.set(cellKey, request);

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer to flush after DEBOUNCE_DELAY
        setIsSaving(true); // Show saving indicator immediately
        debounceTimerRef.current = setTimeout(async () => {
            await flushPendingUpdates();
        }, DEBOUNCE_DELAY);
    }, [contextId, data?.evaluation, flushPendingUpdates]);

    // Add a new row
    const addRow = useCallback(async (request: AddRowRequest): Promise<EvaluationRow | null> => {
        if (!contextId) return null;

        try {
            setIsSaving(true);

            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/rows`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to add row');
            }

            const result = await response.json();
            const newRow = result.data;

            // Update local state
            setData(prev => {
                if (!prev) return prev;
                return { ...prev, rows: [...prev.rows, newRow] };
            });

            return newRow;
        } catch (err) {
            console.error('Error adding row:', err);
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [projectId, contextType, contextId]);

    // Delete a row
    const deleteRow = useCallback(async (rowId: string): Promise<boolean> => {
        if (!contextId) return false;

        try {
            setIsSaving(true);

            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/rows/${rowId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                throw new Error('Failed to delete row');
            }

            // Update local state
            setData(prev => {
                if (!prev) return prev;
                return { ...prev, rows: prev.rows.filter(row => row.id !== rowId) };
            });

            return true;
        } catch (err) {
            console.error('Error deleting row:', err);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [projectId, contextType, contextId]);

    // T048-T051: Parse tender PDF and update cells
    const parseTender = useCallback(async (file: File, firmId: string): Promise<ParseTenderResult> => {
        console.log(`[use-evaluation] parseTender called for firm ${firmId}, file: ${file.name}`);
        console.log(`[use-evaluation] contextId: ${contextId}, contextType: ${contextType}`);

        if (!contextId) {
            console.log(`[use-evaluation] No contextId, returning error`);
            return {
                success: false,
                firmId,
                mappedCount: 0,
                unmappedCount: 0,
                newRowsCreated: 0,
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

            const url = `/api/evaluation/${projectId}/${contextType}/${contextId}/parse`;
            console.log(`[use-evaluation] Calling POST ${url}`);

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            console.log(`[use-evaluation] Response status: ${response.status}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to parse tender');
            }

            const result = await response.json();
            const parseData = result.data;

            // Refresh data to get updated cells
            await fetchData();

            return {
                success: true,
                firmId,
                mappedCount: parseData.mappedItems?.length || 0,
                unmappedCount: 0, // Unmapped items are now created as new rows
                newRowsCreated: parseData.newRowsCreated?.length || 0,
                overallConfidence: parseData.overallConfidence || 0,
            };
        } catch (err) {
            console.error('Error parsing tender:', err);
            return {
                success: false,
                firmId,
                mappedCount: 0,
                unmappedCount: 0,
                newRowsCreated: 0,
                overallConfidence: 0,
                error: err instanceof Error ? err.message : 'Failed to parse tender',
            };
        } finally {
            setIsParsing(false);
            setParsingFirmId(null);
        }
    }, [projectId, contextType, contextId, fetchData]);

    // T086: Merge rows
    const mergeRows = useCallback(async (
        rowIds: string[],
        newDescription: string,
        tableType: 'initial_price' | 'adds_subs'
    ): Promise<MergeRowsResult> => {
        if (!contextId || rowIds.length < 2) {
            return {
                success: false,
                error: 'At least 2 rows are required for merge',
            };
        }

        try {
            setIsSaving(true);

            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/rows/merge`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rowIds,
                        newDescription,
                        tableType,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to merge rows');
            }

            const result = await response.json();

            // Refresh data to get updated rows
            await fetchData();

            return {
                success: true,
                mergedRow: result.data.mergedRow,
                deletedRowIds: result.data.deletedRowIds,
            };
        } catch (err) {
            console.error('Error merging rows:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Failed to merge rows',
            };
        } finally {
            setIsSaving(false);
        }
    }, [projectId, contextType, contextId, fetchData]);

    // T088: Update row description with optimistic update
    const updateRowDescription = useCallback(async (
        rowId: string,
        description: string
    ): Promise<boolean> => {
        if (!contextId) return false;

        // Optimistic update
        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                rows: prev.rows.map(row =>
                    row.id === rowId ? { ...row, description } : row
                ),
            };
        });

        try {
            setIsSaving(true);

            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/rows/${rowId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description }),
                }
            );

            if (!response.ok) {
                // Revert on failure
                await fetchData();
                throw new Error('Failed to update description');
            }

            return true;
        } catch (err) {
            console.error('Error updating row description:', err);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [projectId, contextType, contextId, fetchData]);

    // Computed values
    const shortlistedFirms = data?.firms.filter(f => f.shortlisted) || [];
    const initialPriceRows = data?.rows.filter(r => r.tableType === 'initial_price') || [];
    const addSubsRows = data?.rows.filter(r => r.tableType === 'adds_subs') || [];

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
        addRow,
        deleteRow,
        parseTender,
        mergeRows,
        updateRowDescription,
        shortlistedFirms,
        initialPriceRows,
        addSubsRows,
    };
}
