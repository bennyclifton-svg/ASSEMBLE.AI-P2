/**
 * RFTNewSection Component
 * Main container for RFT NEW reports within discipline/trade tabs
 * Supports multiple RFTs per stakeholder with numbered tabs (01, 02, etc.)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRftNew, type RftNew } from '@/lib/hooks/use-rft-new';
import { useRftNewTransmittal } from '@/lib/hooks/use-rft-new-transmittal';
import { useRFTSectionUI } from '@/lib/contexts/procurement-ui-context';
import { RFTNewShortTab } from './RFTNewShortTab';
import { RFTTabs } from './RFTTabs';
import { FileText, MoreHorizontal, MoreVertical } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';

// Procurement section accent color (copper from design system)
const SECTION_ACCENT = 'var(--color-accent-copper)';

interface RFTNewSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    selectedDocumentIds?: string[];
    onLoadTransmittal?: (documentIds: string[]) => void;
    onSaveTransmittal?: () => string[];
}

export function RFTNewSection({
    projectId,
    stakeholderId,
    stakeholderName,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
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

    const contextName = stakeholderName || 'Unknown';

    return (
        <div className="mt-6">
            {/* Header - Segmented white ribbons with grey surround */}
            <div className="flex items-stretch gap-0.5 p-2">
                {/* Request For Tender segment */}
                <div
                    className="flex items-center w-fit h-11 px-3 py-1.5 backdrop-blur-md border border-[var(--color-border)]/50 shadow-sm rounded-l-md"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
                >
                    <FileText className="w-4 h-4" style={{ color: SECTION_ACCENT }} />
                    <span className="ml-1 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                        Request For Tender
                    </span>
                </div>
                {/* Corner bracket segment - square, points out to expand, in to collapse */}
                <button
                    onClick={handleExpandToggle}
                    className="flex items-center justify-center w-11 h-11 backdrop-blur-md border border-[var(--color-border)]/50 shadow-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                >
                    <CornerBracketIcon
                        direction={isExpanded ? 'right' : 'left'}
                        className="w-4 h-4"
                    />
                </button>
                {/* More options segment - expandable to show tabs and export buttons */}
                <div
                    className="flex items-center h-11 backdrop-blur-md border border-[var(--color-border)]/50 shadow-sm rounded-r-md transition-all"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
                >
                    <button
                        onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                        className="flex items-center justify-center w-11 h-11 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        title={isMenuExpanded ? 'Hide options' : 'Show options'}
                    >
                        {isMenuExpanded ? <MoreHorizontal className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
                    </button>
                    {/* Expanded content: tabs and export buttons */}
                    {isMenuExpanded && (
                        <>
                            <div className="ml-1 mr-2 h-5 w-px bg-[var(--color-border)]" />
                            <RFTTabs
                                rfts={rfts}
                                activeRftId={activeRft?.id || null}
                                onSelectRft={handleSelectRft}
                                onCreateRft={handleCreateRft}
                                onDeleteRft={handleDeleteRft}
                                isLoading={isCreating}
                            />
                            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
                            <div className="flex items-center gap-1 pr-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('pdf')}
                                    disabled={!activeRft || isExporting}
                                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                                    title="Export PDF"
                                >
                                    <PdfIcon size={20} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('docx')}
                                    disabled={!activeRft || isExporting}
                                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                                    title="Export Word"
                                >
                                    <DocxIcon size={20} />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div>
                {/* Tab Content - only shown when expanded */}
                {isExpanded && (
                    <div
                        className="mx-2 p-4 backdrop-blur-md rounded-md shadow-sm"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
                    >
                        {isLoading ? (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>Loading RFTs...</p>
                            </div>
                        ) : rfts.length === 0 ? (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>No RFTs yet. Click + to create one.</p>
                            </div>
                        ) : activeRft ? (
                            <RFTNewShortTab
                                projectId={projectId}
                                rftNew={activeRft}
                                stakeholderId={stakeholderId}
                                contextName={contextName}
                                onDateChange={handleDateChange}
                                onSaveTransmittal={handleSaveTransmittal}
                                onLoadTransmittal={handleLoadTransmittal}
                                onDownloadTransmittal={handleDownloadTransmittal}
                                canSaveTransmittal={!!activeRft && selectedDocumentIds.length > 0}
                                hasTransmittal={hasTransmittal}
                                documentCount={documentCount}
                                isDownloading={isDownloading}
                            />
                        ) : (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>Unable to load RFT</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
