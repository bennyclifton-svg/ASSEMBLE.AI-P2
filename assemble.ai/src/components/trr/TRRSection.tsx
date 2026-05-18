/**
 * TRRSection Component
 * Main container for TRR (Tender Recommendation Report) within discipline/trade tabs
 * Supports multiple TRRs per stakeholder with numbered tabs (01, 02, etc.)
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTRR } from '@/lib/hooks/use-trr';
import { useEvaluationPriceSectionUI, useTRRSectionUI } from '@/lib/contexts/procurement-ui-context';
import { TRRShortTab } from './TRRShortTab';
import type { TRRShortTabHandle } from './TRRShortTab';
import { TRRTabs } from './TRRTabs';
import { Loader2 } from 'lucide-react';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';
import {
    ProcurementIconButton,
    ProcurementSectionShell,
    ProcurementToolbarDivider,
} from '@/components/procurement';
import { TRR_ACCENT_COLOR } from './TRRSectionHeading';

interface TRRSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    contextType: 'discipline' | 'trade';
    selectedDocumentIds?: string[];
    onLoadTransmittal?: (documentIds: string[]) => void;
    onSaveTransmittal?: () => string[];
    displayMode?: 'accordion' | 'detail';
}

function formatDetailDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TRRSection({
    projectId,
    stakeholderId,
    stakeholderName,
    contextType,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
    displayMode = 'accordion',
}: TRRSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);
    const shortTabRef = useRef<TRRShortTabHandle>(null);

    // Use context for expanded state persistence across tab navigation
    const { isExpanded, activeTrrId, setExpanded: setIsExpanded, setActiveTrrId } = useTRRSectionUI(stakeholderId);
    const { activeEvaluationPriceId } = useEvaluationPriceSectionUI(stakeholderId);

    // Get all TRRs for this stakeholder
    const {
        trrs,
        isLoading,
        createTrr,
        updateTRR,
        deleteTrr,
        refetch,
    } = useTRR({
        projectId,
        stakeholderId,
        evaluationPriceId: activeEvaluationPriceId,
    });

    // Find the active TRR
    const activeTrr = trrs.find(t => t.id === activeTrrId) || trrs[0] || null;

    // Auto-select first TRR when loaded
    useEffect(() => {
        if (trrs.length > 0 && !activeTrrId) {
            setActiveTrrId(trrs[0].id);
        }
    }, [trrs, activeTrrId, setActiveTrrId]);

    const handleCreateTrr = useCallback(async () => {
        setIsCreating(true);
        try {
            const newTrr = await createTrr();
            if (newTrr) {
                setActiveTrrId(newTrr.id);
                setIsExpanded(true);
            }
        } finally {
            setIsCreating(false);
        }
    }, [createTrr, setActiveTrrId, setIsExpanded]);

    // Auto-create first TRR when expanding with none
    const handleExpandToggle = useCallback(async () => {
        if (!isExpanded && trrs.length === 0 && !isLoading && !isCreating) {
            await handleCreateTrr();
        } else {
            setIsExpanded(!isExpanded);
        }
    }, [isExpanded, trrs.length, isLoading, isCreating, handleCreateTrr, setIsExpanded]);

    const handleDeleteTrr = useCallback(async (trrId: string) => {
        const success = await deleteTrr(trrId);
        if (success && trrId === activeTrrId) {
            // Select the first remaining TRR or null
            const remaining = trrs.filter(t => t.id !== trrId);
            setActiveTrrId(remaining[0]?.id || null);
        }
    }, [deleteTrr, activeTrrId, trrs, setActiveTrrId]);

    const handleSelectTrr = useCallback((trrId: string) => {
        setActiveTrrId(trrId);
        if (!isExpanded) {
            setIsExpanded(true);
        }
    }, [setActiveTrrId, isExpanded, setIsExpanded]);

    const handleSaveTransmittal = useCallback(async () => {
        if (!activeTrr) return;

        let documentIds: string[] = [];
        if (onSaveTransmittal) {
            documentIds = onSaveTransmittal();
        } else if (selectedDocumentIds.length > 0) {
            documentIds = selectedDocumentIds;
        }

        if (documentIds.length === 0) return;

        try {
            const response = await fetch(`/api/trr/${activeTrr.id}/transmittal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds }),
            });
            if (response.ok) {
                refetch();
            }
        } catch (error) {
            console.error('Failed to save attachments:', error);
        }
    }, [activeTrr, selectedDocumentIds, onSaveTransmittal, refetch]);

    const handleLoadTransmittal = useCallback(async () => {
        if (!activeTrr) return;

        try {
            const response = await fetch(`/api/trr/${activeTrr.id}/transmittal`);
            if (response.ok) {
                const data = await response.json();
                const documentIds = data.documents?.map((d: { documentId: string }) => d.documentId) || [];
                if (onLoadTransmittal && documentIds.length > 0) {
                    onLoadTransmittal(documentIds);
                }
            }
        } catch (error) {
            console.error('Failed to load transmittal:', error);
        }
    }, [activeTrr, onLoadTransmittal]);

    const handleDownloadTransmittal = useCallback(async () => {
        if (!activeTrr) return;

        setIsDownloading(true);
        try {
            const response = await fetch(`/api/trr/${activeTrr.id}/transmittal/download`);

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const contextName = stakeholderName || 'TRR';
            let filename = `${contextName}_TRR_Attachments.zip`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
        } finally {
            setIsDownloading(false);
        }
    }, [activeTrr, stakeholderName]);

    const handleExport = useCallback(async (format: 'pdf' | 'docx') => {
        if (!activeTrr) return;

        setIsExporting(true);
        try {
            // Flush any pending saves so the DB has the latest content
            if (shortTabRef.current) {
                await shortTabRef.current.flushSave();
            }

            const response = await fetch(`/api/trr/${activeTrr.id}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const contextName = stakeholderName || 'Unknown';
            let filename = `TRR ${contextName}.${format}`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setIsExporting(false);
        }
    }, [activeTrr, stakeholderName]);

    const handleUpdateTRR = useCallback(async (data: Parameters<typeof updateTRR>[1]) => {
        if (activeTrr) {
            return updateTRR(activeTrr.id, data);
        }
        return null;
    }, [activeTrr, updateTRR]);

    const contextName = stakeholderName || 'Unknown';
    const sectionExpanded = displayMode === 'detail' || isExpanded;
    const detailDate = activeTrr
        ? formatDetailDate(activeTrr.reportDate ?? activeTrr.createdAt)
        : '';
    const sectionLabel = displayMode === 'detail'
        ? 'tender recommendation report record'
        : 'tender recommendation report';
    const sectionMeta = displayMode === 'detail'
        ? `tender recommendation report / ${detailDate || 'no date'}`
        : `${trrs.length} reports`;

    return (
        <div className={displayMode === 'detail' ? '' : 'mt-2'}>
            <ProcurementSectionShell
                label={sectionLabel}
                meta={sectionMeta}
                accentColor={displayMode === 'detail' ? TRR_ACCENT_COLOR : undefined}
                isExpanded={sectionExpanded}
                onToggleExpanded={handleExpandToggle}
                isMenuExpanded={isMenuExpanded}
                onToggleMenu={() => setIsMenuExpanded(!isMenuExpanded)}
                displayMode={displayMode}
                menuContent={
                    <>
                        <TRRTabs
                            trrs={trrs}
                            activeTrrId={activeTrr?.id || null}
                            onSelectTrr={handleSelectTrr}
                            onCreateTrr={handleCreateTrr}
                            onDeleteTrr={handleDeleteTrr}
                            isLoading={isCreating}
                        />
                        <ProcurementToolbarDivider />
                        <div className="flex items-center gap-1">
                            <ProcurementIconButton
                                title="Export PDF"
                                onClick={() => handleExport('pdf')}
                                disabled={!activeTrr || isExporting}
                            >
                                {isExporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <PdfIcon size={20} />
                                )}
                            </ProcurementIconButton>
                            <ProcurementIconButton
                                title="Export Word"
                                onClick={() => handleExport('docx')}
                                disabled={!activeTrr || isExporting}
                            >
                                <DocxIcon size={20} />
                            </ProcurementIconButton>
                        </div>
                    </>
                }
            >
                {isLoading ? (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>Loading TRRs...</p>
                    </div>
                ) : trrs.length === 0 ? (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>No TRRs yet. Click + to create one.</p>
                    </div>
                ) : activeTrr ? (
                    <TRRShortTab
                        ref={shortTabRef}
                        projectId={projectId}
                        trr={activeTrr}
                        stakeholderId={stakeholderId}
                        contextType={contextType}
                        contextName={contextName}
                        onUpdateTRR={handleUpdateTRR}
                        onSaveTransmittal={handleSaveTransmittal}
                        onLoadTransmittal={handleLoadTransmittal}
                        onDownloadTransmittal={handleDownloadTransmittal}
                        canSaveTransmittal={!!activeTrr && selectedDocumentIds.length > 0}
                        isDownloading={isDownloading}
                        surface={displayMode === 'detail' ? 'record' : 'procurement'}
                    />
                ) : (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>Unable to load TRR</p>
                    </div>
                )}
            </ProcurementSectionShell>
        </div>
    );
}
