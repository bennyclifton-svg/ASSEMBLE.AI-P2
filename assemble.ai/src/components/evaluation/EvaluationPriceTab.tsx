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
import { Loader2, AlertCircle, CheckCircle2, Upload, ArrowRightToLine, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import type { EvaluationCellValueType, EvaluationFirm, EvaluationRow, EvaluationTableType } from '@/types/evaluation';
import { EVALUATION_TABLE_COLUMNS } from '@/types/evaluation';
import { calculateTenderEvaluationTotals } from '@/lib/evaluation/tender-commercial';
import { CostPlanPushDialog, type CostPlanPushSection } from './CostPlanPushDialog';
import {
    EVALUATION_PRICE_ACCENT_COLOR,
    EvaluationReportHeader,
} from './EvaluationReportChrome';

interface EvaluationPriceTabProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    evaluationPriceId?: string; // For multi-instance price evaluation
    evaluationPriceNumber?: number; // Tab number (1, 2, etc.) for dynamic title
    issuedDate?: string | null;
    surface?: 'procurement' | 'record';
}

function getFirmCellValue(row: EvaluationRow, firm: EvaluationFirm) {
    const cell = row.cells?.find(candidate => candidate.firmId === firm.id);
    const valueType = (cell?.valueType || 'amount') as EvaluationCellValueType;
    const contributesAmount = valueType === 'amount' || valueType === 'blank';

    return {
        amountCents: contributesAmount ? (cell?.amountCents || 0) : 0,
        valueType,
        contributesAmount,
    };
}

function makeCostPlanPushRows(
    rows: EvaluationRow[],
    tableType: EvaluationTableType,
    firm: EvaluationFirm | undefined,
    defaultRequiresAmount = true
) {
    if (!firm) return [];

    return rows
        .filter(row => row.description.trim().length > 0)
        .map(row => {
            const cellValue = getFirmCellValue(row, firm);
            return {
                id: row.id,
                tableType,
                description: row.description,
                amountCents: cellValue.amountCents,
                valueType: cellValue.valueType,
                defaultSelected: cellValue.contributesAmount && (!defaultRequiresAmount || cellValue.amountCents !== 0),
            };
        });
}

export function EvaluationPriceTab({
    projectId,
    stakeholderId,
    stakeholderName,
    evaluationPriceId,
    evaluationPriceNumber = 1,
    issuedDate,
    surface = 'procurement',
}: EvaluationPriceTabProps) {
    const {
        isLoading,
        error,
        isSaving,
        isParsing,
        parsingFirmId,
        firmType,
        updateCell,
        addRow,
        deleteRow,
        parseTender,
        mergeRows,
        updateRowDescription,
        reorderRow,
        updateRowLock,
        updateRowMeta,
        refresh,
        shortlistedFirms,
        initialPriceRows,
        addSubsRows,
        valueManagementRows,
    } = useEvaluation({
        projectId,
        stakeholderId,
        evaluationPriceId,
    });

    const { toast } = useToast();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Guard: prevent concurrent tender parsing (ref avoids stale closure issues)
    const isParsingRef = useRef(false);
    const [parsingFileName, setParsingFileName] = useState<string | null>(null);

    // T089-T093: Row selection state
    const [selectedInitialPriceRowIds, setSelectedInitialPriceRowIds] = useState<Set<string>>(new Set());
    const [selectedAddSubsRowIds, setSelectedAddSubsRowIds] = useState<Set<string>>(new Set());
    const [selectedValueManagementRowIds, setSelectedValueManagementRowIds] = useState<Set<string>>(new Set());
    const [lastSelectedRowId, setLastSelectedRowId] = useState<string | null>(null);

    // T094-T097: Merge dialog state
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
    const [mergeTableType, setMergeTableType] = useState<'initial_price' | 'adds_subs'>('initial_price');
    const [isCostPlanPushOpen, setIsCostPlanPushOpen] = useState(false);
    const [isPushingCostPlan, setIsPushingCostPlan] = useState(false);
    const [isRefreshingEvaluation, setIsRefreshingEvaluation] = useState(false);

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

    // T111: Filter out empty AI-generated rows (rows with no cell data)
    // BUT always show cost_plan and manual rows (they are expected line items)
    const visibleInitialPriceRows = useMemo(() => {
        return initialPriceRows.filter(row => {
            // Always show cost_plan rows (expected line items from cost plan)
            // and manual rows (user-created) - they should always be visible
            // source defaults to 'cost_plan' if not set
            if (row.source === 'cost_plan' || row.source === 'manual' || !row.source) {
                return true;
            }
            // For AI-parsed rows, only show if they have data (non-zero amount)
            const hasData = row.cells?.some(cell => cell.amountCents !== 0);
            return hasData;
        });
    }, [initialPriceRows]);

    const visibleAddSubsRows = useMemo(() => {
        return addSubsRows.filter(row => {
            // Always show manual rows
            if (row.source === 'manual' || !row.source) {
                return true;
            }
            // For AI-parsed rows, only show if they have data
            const hasData = row.cells?.some(cell => cell.amountCents !== 0);
            return hasData;
        });
    }, [addSubsRows]);

    const visibleValueManagementRows = useMemo(() => {
        return valueManagementRows.filter(row => {
            if (row.source === 'manual' || !row.source) {
                return true;
            }
            const hasData = row.cells?.some(cell =>
                cell.amountCents !== 0 ||
                (!!cell.valueType && cell.valueType !== 'amount' && cell.valueType !== 'blank')
            );
            return hasData;
        });
    }, [valueManagementRows]);

    // Calculate totals
    const totals = useMemo(() => calculateTenderEvaluationTotals(
        [...initialPriceRows, ...addSubsRows, ...valueManagementRows],
        shortlistedFirms
    ), [shortlistedFirms, initialPriceRows, addSubsRows, valueManagementRows]);

    const awardedFirm = useMemo(
        () => shortlistedFirms.find(firm => firm.awarded),
        [shortlistedFirms]
    );

    const costPlanPushSections = useMemo<CostPlanPushSection[]>(() => {
        if (!awardedFirm) {
            return [
                { id: 'initial_price', title: 'Price', rows: [] },
                { id: 'adds_subs', title: 'Adds & Subs', rows: [] },
                { id: 'value_management', title: 'Adopted VM', rows: [] },
            ];
        }

        const adoptedValueManagementRows = visibleValueManagementRows.filter(row =>
            row.vmAdoptionStatus === 'adopted' && row.vmEmbeddedInBase !== true
        );

        return [
            {
                id: 'initial_price',
                title: 'Price',
                rows: makeCostPlanPushRows(visibleInitialPriceRows, 'initial_price', awardedFirm),
            },
            {
                id: 'adds_subs',
                title: 'Adds & Subs',
                rows: makeCostPlanPushRows(visibleAddSubsRows, 'adds_subs', awardedFirm),
            },
            {
                id: 'value_management',
                title: 'Adopted VM',
                rows: makeCostPlanPushRows(adoptedValueManagementRows, 'value_management', awardedFirm),
            },
        ];
    }, [awardedFirm, visibleInitialPriceRows, visibleAddSubsRows, visibleValueManagementRows]);

    // Handle cell update
    const handleCellUpdate = useCallback(async (
        rowId: string,
        firmId: string,
        amountCents: number,
        valueType: EvaluationCellValueType = 'amount'
    ) => {
        await updateCell({
            rowId,
            firmId,
            firmType,
            amountCents,
            valueType,
            source: 'manual',
        });
    }, [firmType, updateCell]);

    // Handle add row for each table
    const handleAddRow = useCallback((tableType: EvaluationTableType) => {
        addRow({
            tableType,
            description: '',
        });
    }, [addRow]);

    // Handle row delete
    const handleDeleteRow = useCallback(async (rowId: string) => {
        await deleteRow(rowId);
    }, [deleteRow]);

    const handlePushCostPlan = useCallback(async (rowIds: string[]) => {
        if (!stakeholderId || !awardedFirm) return;

        setIsPushingCostPlan(true);
        try {
            const response = await fetch(
                `/api/evaluation/${projectId}/stakeholder/${stakeholderId}/push-cost-plan`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        evaluationPriceId,
                        firmId: awardedFirm.id,
                        firmType: awardedFirm.firmType || firmType,
                        rowIds,
                    }),
                }
            );

            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to push awarded price to the cost plan');
            }

            toast({
                title: 'Cost plan updated',
                description: `${result.data.createdCount} lines pushed for ${awardedFirm.companyName}`,
                variant: 'success',
            });
        } catch (err) {
            toast({
                title: 'Cost plan push failed',
                description: err instanceof Error ? err.message : 'Failed to push awarded price to the cost plan',
                variant: 'destructive',
            });
        } finally {
            setIsPushingCostPlan(false);
        }
    }, [stakeholderId, awardedFirm, projectId, evaluationPriceId, firmType, toast]);

    const handleRefreshEvaluation = useCallback(async () => {
        if (!stakeholderId) return;
        setIsRefreshingEvaluation(true);
        try {
            const response = await fetch(
                `/api/evaluation/${projectId}/stakeholder/${stakeholderId}/refresh`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ evaluationPriceId }),
                }
            );
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to refresh evaluation');
            }

            await refresh();
            const summary = result.data?.summary;
            const changedCount = summary
                ? (Object.values(summary.created) as number[]).reduce((sum, count) => sum + count, 0) +
                    (Object.values(summary.updated) as number[]).reduce((sum, count) => sum + count, 0) +
                    (Object.values(summary.removed) as number[]).reduce((sum, count) => sum + count, 0)
                : 0;

            toast({
                title: 'Evaluation refreshed',
                description: changedCount > 0 ? `${changedCount} AI row changes applied` : 'No row changes found',
                variant: 'success',
            });
        } catch (err) {
            toast({
                title: 'Refresh failed',
                description: err instanceof Error ? err.message : 'Failed to refresh evaluation',
                variant: 'destructive',
            });
        } finally {
            setIsRefreshingEvaluation(false);
        }
    }, [stakeholderId, projectId, evaluationPriceId, refresh, toast]);

    // T048-T051: Handle file drop for tender parsing
    // Uses ref-based guard to prevent duplicate ingestion from rapid drops
    const handleFileDrop = useCallback(async (file: File, firmId: string) => {
        // Guard: reject if a parse is already in-flight
        if (isParsingRef.current) {
            console.log(`[EvaluationPriceTab] Ignoring drop — parse already in progress`);
            toast({
                title: 'Parse already in progress',
                description: 'Please wait for the current tender to finish processing.',
            });
            return;
        }

        isParsingRef.current = true;
        setParsingFileName(file.name);

        console.log(`[EvaluationPriceTab] handleFileDrop called for firm ${firmId}, file: ${file.name}`);
        const firm = shortlistedFirms.find(f => f.id === firmId);
        const firmName = firm?.companyName || 'Unknown';

        toast({
            title: 'Parsing tender...',
            description: `Extracting pricing from ${file.name} for ${firmName}`,
        });

        try {
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
                    variant: 'success',
                });
            } else {
                toast({
                    title: 'Failed to parse tender',
                    description: result.error || 'An error occurred while parsing the tender',
                    variant: 'destructive',
                });
            }
        } finally {
            isParsingRef.current = false;
            setParsingFileName(null);
        }
    }, [parseTender, shortlistedFirms, toast]);

    // T089-T093: Handle row selection with Click, Shift+Click, Ctrl/Cmd+Click
    const handleRowSelect = useCallback((
        rowId: string,
        event: React.MouseEvent,
        tableType: EvaluationTableType,
        rows: EvaluationRow[]
    ) => {
        const setSelectedRowIds = tableType === 'initial_price'
            ? setSelectedInitialPriceRowIds
            : tableType === 'adds_subs'
                ? setSelectedAddSubsRowIds
                : setSelectedValueManagementRowIds;

        // Clear selection from other table
        if (tableType === 'initial_price') {
            setSelectedAddSubsRowIds(new Set());
            setSelectedValueManagementRowIds(new Set());
        } else if (tableType === 'adds_subs') {
            setSelectedInitialPriceRowIds(new Set());
            setSelectedValueManagementRowIds(new Set());
        } else {
            setSelectedInitialPriceRowIds(new Set());
            setSelectedAddSubsRowIds(new Set());
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
                variant: 'success',
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

    // Handle row reorder for each table
    const handleRowReorder = useCallback((
        rowId: string,
        newIndex: number,
        tableType: EvaluationTableType
    ) => {
        reorderRow(rowId, newIndex, tableType);
    }, [reorderRow]);

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
                <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
                <span className="ml-2 text-sm text-[var(--color-text-secondary)]">Loading evaluation data...</span>
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
                <AlertCircle className="w-8 h-8 text-[var(--color-text-muted)] mb-3" />
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    No Short-listed Firms
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] max-w-sm">
                    To use the evaluation tables, first short-list firms by toggling the
                    &quot;Shortlisted&quot; option on the firm cards above.
                </p>
            </div>
        );
    }

    return (
        <div
            className="space-y-6"
            style={surface === 'record' ? { backgroundColor: 'white', color: 'var(--color-text-primary)' } : undefined}
        >
            <EvaluationReportHeader
                projectId={projectId}
                documentTitle={`Evaluation Price, ${stakeholderName || 'Unknown'} ${String(evaluationPriceNumber).padStart(2, '0')}`}
                issuedDate={issuedDate}
                accentColor={EVALUATION_PRICE_ACCENT_COLOR}
                surface={surface}
            />

            {/* Save Status & Upload Instruction */}
            <div className="flex items-center justify-between">
                {/* Upload instruction / parsing status - left side */}
                {isParsing ? (
                    <div
                        className="flex items-center gap-2 rounded-none border px-3 py-1.5"
                        style={{
                            background: `color-mix(in srgb, ${EVALUATION_PRICE_ACCENT_COLOR} 10%, transparent)`,
                            borderColor: `color-mix(in srgb, ${EVALUATION_PRICE_ACCENT_COLOR} 30%, transparent)`,
                        }}
                    >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: EVALUATION_PRICE_ACCENT_COLOR }} />
                        <span className="text-xs font-medium" style={{ color: EVALUATION_PRICE_ACCENT_COLOR }}>
                            Ingesting tender pricing{parsingFileName ? ` — ${parsingFileName}` : ''}…
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                        <Upload className="w-3.5 h-3.5" style={{ color: EVALUATION_PRICE_ACCENT_COLOR }} />
                        <span>Drag submission PDF onto firm column</span>
                    </div>
                )}
                {/* Save status - right side */}
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
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
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isRefreshingEvaluation}
                        title="Refresh evaluation"
                        onClick={handleRefreshEvaluation}
                        className="h-7 rounded-none border-[var(--color-border)] px-2 text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-primary)]"
                    >
                        {isRefreshingEvaluation ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Refresh
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!awardedFirm || isPushingCostPlan}
                        title={awardedFirm ? 'Push awarded price to cost plan' : 'Award a tenderer first'}
                        onClick={() => setIsCostPlanPushOpen(true)}
                        className="h-7 rounded-none border-[var(--color-border)] px-2 text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-primary)]"
                    >
                        {isPushingCostPlan ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <ArrowRightToLine className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Push to Cost Plan
                    </Button>
                </div>
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
                onRowReorder={(rowId, newIndex) => handleRowReorder(rowId, newIndex, 'initial_price')}
                onToggleRowLock={updateRowLock}
                onRowMetaUpdate={updateRowMeta}
                parsingFirmId={parsingFirmId}
                subtotals={totals.initialPriceSubtotals}
                title={`Price ${String(evaluationPriceNumber).padStart(2, '0')}`}
                accentColor={EVALUATION_PRICE_ACCENT_COLOR}
                surface={surface}
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
                onRowReorder={(rowId, newIndex) => handleRowReorder(rowId, newIndex, 'adds_subs')}
                onToggleRowLock={updateRowLock}
                onRowMetaUpdate={updateRowMeta}
                parsingFirmId={parsingFirmId}
                subtotals={totals.addSubsSubtotals}
                title="Adds & Subs"
                showFirmHeaders={false}
                accentColor={EVALUATION_PRICE_ACCENT_COLOR}
                surface={surface}
            />

            {/* Value Management Table */}
            <EvaluationSheet
                rows={visibleValueManagementRows}
                firms={shortlistedFirms}
                tableType="value_management"
                onCellUpdate={handleCellUpdate}
                onDeleteRow={handleDeleteRow}
                onAddRow={() => handleAddRow('value_management')}
                onDescriptionUpdate={updateRowDescription}
                selectedRowIds={selectedValueManagementRowIds}
                onRowSelect={(rowId, event) => handleRowSelect(rowId, event, 'value_management', visibleValueManagementRows)}
                onRowReorder={(rowId, newIndex) => handleRowReorder(rowId, newIndex, 'value_management')}
                onToggleRowLock={updateRowLock}
                onRowMetaUpdate={updateRowMeta}
                parsingFirmId={parsingFirmId}
                subtotals={totals.valueManagementSubtotals}
                title="Value Management"
                showFirmHeaders={false}
                accentColor={EVALUATION_PRICE_ACCENT_COLOR}
                surface={surface}
            />

            {/* Comparable and Award Basis Totals */}
            <div className="relative overflow-x-auto w-full">
                <table className="border-collapse w-full table-fixed">
                    <colgroup>
                        {/* Drag handle column (empty for grand total) */}
                        <col style={{ width: `${EVALUATION_TABLE_COLUMNS.dragHandle}px` }} />
                        {/* Description column */}
                        <col style={{ width: `${EVALUATION_TABLE_COLUMNS.description}px` }} />
                        {/* Firm columns */}
                        {shortlistedFirms.map(firm => (
                            <col key={firm.id} style={{ width: `${EVALUATION_TABLE_COLUMNS.firmColumn}px` }} />
                        ))}
                        {/* Delete button column */}
                        <col style={{ width: `${EVALUATION_TABLE_COLUMNS.deleteButton}px` }} />
                    </colgroup>
                    <tbody>
                        <tr className="border-t border-[var(--color-border)]">
                            {/* Empty drag handle cell */}
                            <td
                                style={{ height: 28 }}
                            />
                            <td
                                className="px-3 text-sm font-bold text-[var(--color-text-primary)]"
                                style={{ height: 28 }}
                            >
                                Comparable Total
                            </td>
                            {shortlistedFirms.map(firm => (
                                <td
                                    key={firm.id}
                                    className="px-3 text-right text-sm font-bold"
                                    style={{ height: 28, color: EVALUATION_PRICE_ACCENT_COLOR }}
                                >
                                    {formatCurrency(totals.comparableTotals[firm.id] || 0)}
                                </td>
                            ))}
                            {/* Empty delete cell */}
                            <td style={{ height: 28 }} />
                        </tr>
                        <tr className="border-t border-[var(--color-border)]/70">
                            {/* Empty drag handle cell */}
                            <td
                                style={{ height: 28 }}
                            />
                            <td
                                className="px-3 text-sm font-semibold text-[var(--color-text-primary)]"
                                style={{ height: 28 }}
                            >
                                Award Basis Total
                            </td>
                            {shortlistedFirms.map(firm => (
                                <td
                                    key={firm.id}
                                    className="px-3 text-right text-sm font-semibold"
                                    style={{ height: 28, color: EVALUATION_PRICE_ACCENT_COLOR }}
                                >
                                    {formatCurrency(totals.awardBasisTotals[firm.id] || 0)}
                                </td>
                            ))}
                            {/* Empty delete cell */}
                            <td style={{ height: 28 }} />
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

            <CostPlanPushDialog
                open={isCostPlanPushOpen}
                onOpenChange={setIsCostPlanPushOpen}
                firmName={awardedFirm?.companyName || 'No awarded firm'}
                sections={costPlanPushSections}
                onConfirm={handlePushCostPlan}
            />
        </div>
    );
}
