/**
 * T017: EvaluationPriceTab Component
 * T048-T051: Integrated tender parsing via drag-drop
 * T089-T100: Row selection and merge integration (US7)
 * Displays the PRICE tab with two tables:
 * - Table 1: Initial Price (pre-populated from cost lines)
 * - Table 2: Adds & Subs
 * Feature 011 - Evaluation Report
 */

'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useEvaluation } from '@/lib/hooks/use-evaluation';
import { EvaluationSheet } from './EvaluationSheet';
import { MergeRowsDialog } from './MergeRowsDialog';
import { Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { EvaluationTotals, EvaluationRow } from '@/types/evaluation';

interface EvaluationPriceTabProps {
    projectId: string;
    disciplineId?: string;
    tradeId?: string;
    disciplineName?: string;
    tradeName?: string;
}

export function EvaluationPriceTab({
    projectId,
    disciplineId,
    tradeId,
}: EvaluationPriceTabProps) {
    const {
        isLoading,
        error,
        isSaving,
        isParsing,
        parsingFirmId,
        updateCell,
        addRow,
        deleteRow,
        parseTender,
        mergeRows,
        updateRowDescription,
        shortlistedFirms,
        initialPriceRows,
        addSubsRows,
    } = useEvaluation({
        projectId,
        disciplineId,
        tradeId,
    });

    const { toast } = useToast();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // T089-T093: Row selection state
    const [selectedInitialPriceRowIds, setSelectedInitialPriceRowIds] = useState<Set<string>>(new Set());
    const [selectedAddSubsRowIds, setSelectedAddSubsRowIds] = useState<Set<string>>(new Set());
    const [lastSelectedRowId, setLastSelectedRowId] = useState<string | null>(null);

    // T094-T097: Merge dialog state
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
    const [mergeTableType, setMergeTableType] = useState<'initial_price' | 'adds_subs'>('initial_price');

    // Show save status indicator
    useEffect(() => {
        if (isSaving) {
            setSaveStatus('saving');
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        } else if (saveStatus === 'saving') {
            setSaveStatus('saved');
            saveTimeoutRef.current = setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        }
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [isSaving, saveStatus]);

    // Filter out empty rows (rows with no cell data)
    // A row is considered empty if no firm has entered any amount
    const visibleInitialPriceRows = useMemo(() => {
        return initialPriceRows.filter(row => {
            // Keep row if it has any cell with data
            const hasData = row.cells?.some(cell => cell.amountCents > 0);
            return hasData;
        });
    }, [initialPriceRows]);

    const visibleAddSubsRows = useMemo(() => {
        return addSubsRows.filter(row => {
            // Keep row if it has any cell with data
            const hasData = row.cells?.some(cell => cell.amountCents > 0);
            return hasData;
        });
    }, [addSubsRows]);

    // Calculate totals
    const totals = useMemo((): EvaluationTotals => {
        const initialPriceSubtotals: { [firmId: string]: number } = {};
        const addSubsSubtotals: { [firmId: string]: number } = {};
        const grandTotals: { [firmId: string]: number } = {};

        // Initialize with 0 for all firms
        shortlistedFirms.forEach(firm => {
            initialPriceSubtotals[firm.id] = 0;
            addSubsSubtotals[firm.id] = 0;
            grandTotals[firm.id] = 0;
        });

        // Calculate Initial Price subtotals
        initialPriceRows.forEach(row => {
            row.cells?.forEach(cell => {
                if (initialPriceSubtotals[cell.firmId] !== undefined) {
                    initialPriceSubtotals[cell.firmId] += cell.amountCents;
                }
            });
        });

        // Calculate Adds & Subs subtotals
        addSubsRows.forEach(row => {
            row.cells?.forEach(cell => {
                if (addSubsSubtotals[cell.firmId] !== undefined) {
                    addSubsSubtotals[cell.firmId] += cell.amountCents;
                }
            });
        });

        // Calculate grand totals
        shortlistedFirms.forEach(firm => {
            grandTotals[firm.id] = initialPriceSubtotals[firm.id] + addSubsSubtotals[firm.id];
        });

        return { initialPriceSubtotals, addSubsSubtotals, grandTotals };
    }, [shortlistedFirms, initialPriceRows, addSubsRows]);

    // Handle cell update
    const handleCellUpdate = useCallback(async (
        rowId: string,
        firmId: string,
        amountCents: number
    ) => {
        const firmType = disciplineId ? 'consultant' : 'contractor';
        await updateCell({
            rowId,
            firmId,
            firmType,
            amountCents,
            source: 'manual',
        });
    }, [disciplineId, updateCell]);

    // Handle add row for each table
    const handleAddRow = useCallback((tableType: 'initial_price' | 'adds_subs') => {
        addRow({
            tableType,
            description: '',
        });
    }, [addRow]);

    // Handle row delete
    const handleDeleteRow = useCallback(async (rowId: string) => {
        await deleteRow(rowId);
    }, [deleteRow]);

    // T048-T051: Handle file drop for tender parsing
    const handleFileDrop = useCallback(async (file: File, firmId: string) => {
        console.log(`[EvaluationPriceTab] handleFileDrop called for firm ${firmId}, file: ${file.name}`);
        const firm = shortlistedFirms.find(f => f.id === firmId);
        const firmName = firm?.companyName || 'Unknown';

        toast({
            title: 'Parsing tender...',
            description: `Extracting pricing from ${file.name} for ${firmName}`,
        });

        console.log(`[EvaluationPriceTab] Calling parseTender...`);
        const result = await parseTender(file, firmId);
        console.log(`[EvaluationPriceTab] parseTender result:`, result);

        if (result.success) {
            const newRowsMsg = result.newRowsCreated > 0
                ? `, ${result.newRowsCreated} new rows created`
                : '';
            toast({
                title: 'Tender parsed successfully',
                description: `Mapped ${result.mappedCount} items (${Math.round(result.overallConfidence * 100)}% confidence)${newRowsMsg}`,
            });
        } else {
            toast({
                title: 'Failed to parse tender',
                description: result.error || 'An error occurred while parsing the tender',
                variant: 'destructive',
            });
        }
    }, [parseTender, shortlistedFirms, toast]);

    // T089-T093: Handle row selection with Click, Shift+Click, Ctrl/Cmd+Click
    const handleRowSelect = useCallback((
        rowId: string,
        event: React.MouseEvent,
        tableType: 'initial_price' | 'adds_subs',
        rows: EvaluationRow[]
    ) => {
        const setSelectedRowIds = tableType === 'initial_price'
            ? setSelectedInitialPriceRowIds
            : setSelectedAddSubsRowIds;

        // Clear selection from other table
        if (tableType === 'initial_price') {
            setSelectedAddSubsRowIds(new Set());
        } else {
            setSelectedInitialPriceRowIds(new Set());
        }

        setSelectedRowIds(prev => {
            const newSet = new Set(prev);

            if (event.shiftKey && lastSelectedRowId) {
                // T091: Shift+Click - Range selection
                const rowIds = rows.map(r => r.id);
                const lastIndex = rowIds.indexOf(lastSelectedRowId);
                const currentIndex = rowIds.indexOf(rowId);

                if (lastIndex !== -1 && currentIndex !== -1) {
                    const start = Math.min(lastIndex, currentIndex);
                    const end = Math.max(lastIndex, currentIndex);

                    for (let i = start; i <= end; i++) {
                        newSet.add(rowIds[i]);
                    }
                }
            } else if (event.ctrlKey || event.metaKey) {
                // T092: Ctrl/Cmd+Click - Toggle selection
                if (newSet.has(rowId)) {
                    newSet.delete(rowId);
                } else {
                    newSet.add(rowId);
                }
            } else {
                // T090: Single click - Select only this row
                newSet.clear();
                newSet.add(rowId);
            }

            return newSet;
        });

        setLastSelectedRowId(rowId);
    }, [lastSelectedRowId]);

    // T098-T100: Handle merge button click
    const handleMergeClick = useCallback((tableType: 'initial_price' | 'adds_subs') => {
        setMergeTableType(tableType);
        setIsMergeDialogOpen(true);
    }, []);

    // T098-T100: Handle merge confirm
    const handleMergeConfirm = useCallback(async (newDescription: string) => {
        const selectedRowIds = mergeTableType === 'initial_price'
            ? selectedInitialPriceRowIds
            : selectedAddSubsRowIds;

        const result = await mergeRows(
            Array.from(selectedRowIds),
            newDescription,
            mergeTableType
        );

        if (result.success) {
            toast({
                title: 'Rows merged successfully',
                description: `${selectedRowIds.size} rows merged into one`,
            });
            // Clear selection after merge
            if (mergeTableType === 'initial_price') {
                setSelectedInitialPriceRowIds(new Set());
            } else {
                setSelectedAddSubsRowIds(new Set());
            }
        } else {
            toast({
                title: 'Failed to merge rows',
                description: result.error || 'An error occurred while merging rows',
                variant: 'destructive',
            });
        }
    }, [mergeTableType, selectedInitialPriceRowIds, selectedAddSubsRowIds, mergeRows, toast]);

    // Get selected rows for merge dialog
    const selectedRowsForMerge = useMemo(() => {
        const selectedRowIds = mergeTableType === 'initial_price'
            ? selectedInitialPriceRowIds
            : selectedAddSubsRowIds;
        const rows = mergeTableType === 'initial_price' ? visibleInitialPriceRows : visibleAddSubsRows;
        return rows.filter(r => selectedRowIds.has(r.id));
    }, [mergeTableType, selectedInitialPriceRowIds, selectedAddSubsRowIds, visibleInitialPriceRows, visibleAddSubsRows]);

    // Format currency
    const formatCurrency = (cents: number): string => {
        const dollars = cents / 100;
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(dollars);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-[#858585] animate-spin" />
                <span className="ml-2 text-sm text-[#858585]">Loading evaluation data...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
                <p className="text-sm text-red-500">{error}</p>
            </div>
        );
    }

    // Empty state - no shortlisted firms
    if (shortlistedFirms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-8 h-8 text-[#858585] mb-3" />
                <h3 className="text-sm font-medium text-[#cccccc] mb-1">
                    No Short-listed Firms
                </h3>
                <p className="text-xs text-[#858585] max-w-sm">
                    To use the evaluation tables, first short-list firms by toggling the
                    "Shortlisted" option on the firm cards above.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Save Status & Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#858585]">
                    {saveStatus === 'saving' && (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Saving...</span>
                        </>
                    )}
                    {saveStatus === 'saved' && (
                        <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="text-green-500">Saved</span>
                        </>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    style={{ color: '#4fc1ff' }}
                    disabled
                >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Evaluate All Submissions
                </Button>
            </div>

            {/* Initial Price Table - with row selection and merge */}
            <EvaluationSheet
                rows={visibleInitialPriceRows}
                firms={shortlistedFirms}
                tableType="initial_price"
                onCellUpdate={handleCellUpdate}
                onDeleteRow={handleDeleteRow}
                onAddRow={() => handleAddRow('initial_price')}
                onFileDrop={handleFileDrop}
                onDescriptionUpdate={updateRowDescription}
                selectedRowIds={selectedInitialPriceRowIds}
                onRowSelect={(rowId, event) => handleRowSelect(rowId, event, 'initial_price', visibleInitialPriceRows)}
                onMergeClick={() => handleMergeClick('initial_price')}
                parsingFirmId={parsingFirmId}
                subtotals={totals.initialPriceSubtotals}
                title="Initial Price"
            />

            {/* Adds & Subs Table - with row selection and merge */}
            <EvaluationSheet
                rows={visibleAddSubsRows}
                firms={shortlistedFirms}
                tableType="adds_subs"
                onCellUpdate={handleCellUpdate}
                onDeleteRow={handleDeleteRow}
                onAddRow={() => handleAddRow('adds_subs')}
                onFileDrop={handleFileDrop}
                onDescriptionUpdate={updateRowDescription}
                selectedRowIds={selectedAddSubsRowIds}
                onRowSelect={(rowId, event) => handleRowSelect(rowId, event, 'adds_subs', visibleAddSubsRows)}
                onMergeClick={() => handleMergeClick('adds_subs')}
                parsingFirmId={parsingFirmId}
                subtotals={totals.addSubsSubtotals}
                title="Adds & Subs"
            />

            {/* Grand Total */}
            <div className="bg-[#252526]">
                <table className="w-full border-collapse table-fixed">
                    <colgroup>
                        <col style={{ width: '200px' }} />
                        {shortlistedFirms.map(firm => (
                            <col key={firm.id} style={{ width: '120px' }} />
                        ))}
                        <col style={{ width: '32px' }} />
                    </colgroup>
                    <tbody>
                        <tr>
                            <td
                                className="px-3 text-sm font-semibold text-[#cccccc] border-r border-[#3e3e42]"
                                style={{ height: 28 }}
                            >
                                GRAND TOTAL
                            </td>
                            {shortlistedFirms.map(firm => (
                                <td
                                    key={firm.id}
                                    className="px-3 text-right text-sm font-semibold text-[#4fc1ff] border-r border-[#3e3e42]"
                                    style={{ height: 28 }}
                                >
                                    {formatCurrency(totals.grandTotals[firm.id] || 0)}
                                </td>
                            ))}
                            <td style={{ height: 28 }}></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Merge Dialog */}
            <MergeRowsDialog
                open={isMergeDialogOpen}
                onOpenChange={setIsMergeDialogOpen}
                selectedRows={selectedRowsForMerge}
                firms={shortlistedFirms}
                onConfirm={handleMergeConfirm}
            />
        </div>
    );
}
