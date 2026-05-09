/**
 * RFTNewSection Component
 * Main container for RFT NEW reports within discipline/trade tabs
 * Supports multiple RFTs per stakeholder with numbered tabs (01, 02, etc.)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRftNew } from '@/lib/hooks/use-rft-new';
import { useRftNewTransmittal } from '@/lib/hooks/use-rft-new-transmittal';
import { useRFTSectionUI } from '@/lib/contexts/procurement-ui-context';
import { RFTNewShortTab } from './RFTNewShortTab';
import { RFTTabs } from './RFTTabs';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';
import {
    ProcurementIconButton,
    ProcurementSectionShell,
    ProcurementToolbarDivider,
} from '@/components/procurement';

const RFT_ACCENT_COLOR = 'var(--sw-cyan)';

interface RFTNewSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
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

export function RFTNewSection({
    projectId,
    stakeholderId,
    stakeholderName,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
    displayMode = 'accordion',
}: RFTNewSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);

    // Use context for expanded state persistence across tab navigation
    const { isExpanded, activeRftId, setExpanded: setIsExpanded, setActiveRftId } = useRFTSectionUI(stakeholderId);

    // Get all RFTs for this stakeholder
    const {
        rfts,
        isLoading,
        createRft,
        updateRftDate,
        updateObjectivesVisible,
        updateProgramVisible,
        deleteRft,
    } = useRftNew({
        projectId,
        stakeholderId,
    });

    // Find the active RFT
    const activeRft = rfts.find(r => r.id === activeRftId) || rfts[0] || null;

    // Auto-select first RFT when loaded
    useEffect(() => {
        if (rfts.length > 0 && !activeRftId) {
            setActiveRftId(rfts[0].id);
        }
    }, [rfts, activeRftId, setActiveRftId]);

    // Get transmittal for the active RFT
    const {
        saveTransmittal,
        loadTransmittal,
        hasTransmittal,
        documentCount,
    } = useRftNewTransmittal({
        rftNewId: activeRft?.id || null,
    });

    const handleCreateRft = useCallback(async () => {
        setIsCreating(true);
        try {
            const newRft = await createRft();
            if (newRft) {
                setActiveRftId(newRft.id);
                setIsExpanded(true);
            }
        } finally {
            setIsCreating(false);
        }
    }, [createRft, setActiveRftId, setIsExpanded]);

    // Auto-create first RFT when expanding with none
    const handleExpandToggle = useCallback(async () => {
        if (!isExpanded && rfts.length === 0 && !isLoading && !isCreating) {
            await handleCreateRft();
        } else {
            setIsExpanded(!isExpanded);
        }
    }, [isExpanded, rfts.length, isLoading, isCreating, handleCreateRft, setIsExpanded]);

    const handleDeleteRft = useCallback(async (rftId: string) => {
        const success = await deleteRft(rftId);
        if (success && rftId === activeRftId) {
            // Select the first remaining RFT or null
            const remaining = rfts.filter(r => r.id !== rftId);
            setActiveRftId(remaining[0]?.id || null);
        }
    }, [deleteRft, activeRftId, rfts, setActiveRftId]);

    const handleSelectRft = useCallback((rftId: string) => {
        setActiveRftId(rftId);
        if (!isExpanded) {
            setIsExpanded(true);
        }
    }, [setActiveRftId, isExpanded, setIsExpanded]);

    const handleSaveTransmittal = useCallback(async () => {
        if (onSaveTransmittal) {
            const documentIds = onSaveTransmittal();
            await saveTransmittal(documentIds);
        } else if (selectedDocumentIds.length > 0) {
            await saveTransmittal(selectedDocumentIds);
        }
    }, [selectedDocumentIds, onSaveTransmittal, saveTransmittal]);

    const handleLoadTransmittal = useCallback(() => {
        const documentIds = loadTransmittal();
        if (onLoadTransmittal && documentIds.length > 0) {
            onLoadTransmittal(documentIds);
        }
    }, [loadTransmittal, onLoadTransmittal]);

    const handleDownloadTransmittal = useCallback(async () => {
        if (!activeRft) return;

        setIsDownloading(true);
        try {
            const response = await fetch(`/api/rft-new/${activeRft.id}/transmittal/download`);

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const contextName = stakeholderName || 'RFT';
            let filename = `${contextName}_Transmittal.zip`;
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
    }, [activeRft, stakeholderName]);

    const handleExport = useCallback(async (format: 'pdf' | 'docx') => {
        if (!activeRft) return;

        setIsExporting(true);
        try {
            const response = await fetch(`/api/rft-new/${activeRft.id}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format }),
            });

            if (!response.ok) {
                if (response.status === 501) {
                    const data = await response.json();
                    alert(data.message || 'Export functionality coming soon');
                    return;
                }
                const errorData = await response.json().catch(() => ({}));
                console.error('Export error details:', errorData);
                throw new Error(errorData.details || errorData.error || 'Export failed');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `RFT.${format}`;
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
            alert(`Export failed: ${(error as Error).message}`);
        } finally {
            setIsExporting(false);
        }
    }, [activeRft]);

    const handleDateChange = useCallback(async (date: string) => {
        if (activeRft) {
            await updateRftDate(activeRft.id, date);
        }
    }, [activeRft, updateRftDate]);

    const handleToggleObjectivesVisible = useCallback(async (visible: boolean) => {
        if (activeRft) {
            await updateObjectivesVisible(activeRft.id, visible);
        }
    }, [activeRft, updateObjectivesVisible]);

    const handleToggleProgramVisible = useCallback(async (visible: boolean) => {
        if (activeRft) {
            await updateProgramVisible(activeRft.id, visible);
        }
    }, [activeRft, updateProgramVisible]);

    const contextName = stakeholderName || 'Unknown';
    const sectionExpanded = displayMode === 'detail' || isExpanded;
    const detailDate = activeRft
        ? formatDetailDate(activeRft.rftDate ?? activeRft.createdAt)
        : '';
    const sectionLabel = displayMode === 'detail' ? 'request for tender record' : 'request for tender';
    const sectionMeta = displayMode === 'detail'
        ? `request for tender / ${detailDate || 'no date'}`
        : `${rfts.length} issued - ${documentCount} docs`;

    return (
        <div className={displayMode === 'detail' ? '' : 'mt-2'}>
            <ProcurementSectionShell
                label={sectionLabel}
                meta={sectionMeta}
                accentColor={displayMode === 'detail' ? RFT_ACCENT_COLOR : undefined}
                isExpanded={sectionExpanded}
                onToggleExpanded={handleExpandToggle}
                isMenuExpanded={isMenuExpanded}
                onToggleMenu={() => setIsMenuExpanded(!isMenuExpanded)}
                displayMode={displayMode}
                menuContent={
                    <>
                        <RFTTabs
                            rfts={rfts}
                            activeRftId={activeRft?.id || null}
                            onSelectRft={handleSelectRft}
                            onCreateRft={handleCreateRft}
                            onDeleteRft={handleDeleteRft}
                            isLoading={isCreating}
                        />
                        <ProcurementToolbarDivider />
                        <div className="flex items-center gap-1">
                            <ProcurementIconButton
                                title="Export PDF"
                                onClick={() => handleExport('pdf')}
                                disabled={!activeRft || isExporting}
                            >
                                <PdfIcon size={20} />
                            </ProcurementIconButton>
                            <ProcurementIconButton
                                title="Export Word"
                                onClick={() => handleExport('docx')}
                                disabled={!activeRft || isExporting}
                            >
                                <DocxIcon size={20} />
                            </ProcurementIconButton>
                        </div>
                    </>
                }
            >
                {isLoading ? (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>Loading RFTs...</p>
                    </div>
                ) : rfts.length === 0 ? (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>No RFTs yet. Click + to create one.</p>
                    </div>
                ) : activeRft ? (
                    <RFTNewShortTab
                        projectId={projectId}
                        rftNew={activeRft}
                        stakeholderId={stakeholderId}
                        contextName={contextName}
                        onDateChange={handleDateChange}
                        onToggleObjectivesVisible={handleToggleObjectivesVisible}
                        onToggleProgramVisible={handleToggleProgramVisible}
                        onSaveTransmittal={handleSaveTransmittal}
                        onLoadTransmittal={handleLoadTransmittal}
                        onDownloadTransmittal={handleDownloadTransmittal}
                        canSaveTransmittal={!!activeRft && selectedDocumentIds.length > 0}
                        hasTransmittal={hasTransmittal}
                        documentCount={documentCount}
                        isDownloading={isDownloading}
                        surface={displayMode === 'detail' ? 'record' : 'procurement'}
                    />
                ) : (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>Unable to load RFT</p>
                    </div>
                )}
            </ProcurementSectionShell>
        </div>
    );
}
