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
import { FileText } from 'lucide-react';
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

    // Solid triangle icons
    const TriangleRight = () => (
        <svg
            className="w-3.5 h-3.5 text-[var(--color-text-muted)]"
            viewBox="0 0 12 12"
            fill="currentColor"
        >
            <polygon points="2,0 12,6 2,12" />
        </svg>
    );

    const TriangleDown = () => (
        <svg
            className="w-3.5 h-3.5 text-[var(--color-text-muted)]"
            viewBox="0 0 12 12"
            fill="currentColor"
        >
            <polygon points="0,2 12,2 6,12" />
        </svg>
    );

    return (
        <div className="mt-6 border border-[var(--color-border)] rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    <FileText className="w-4 h-4" style={{ color: SECTION_ACCENT }} />
                    <span className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                        RFT
                    </span>
                    {isExpanded ? <TriangleDown /> : <TriangleRight />}
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-[var(--color-bg-secondary)]">
                {/* Tabs and Export Actions Row */}
                <div className="flex items-center justify-between px-4 pt-2">
                    {/* RFT Tabs (01, 02, etc. with + button) */}
                    <RFTTabs
                        rfts={rfts}
                        activeRftId={activeRft?.id || null}
                        onSelectRft={handleSelectRft}
                        onCreateRft={handleCreateRft}
                        onDeleteRft={handleDeleteRft}
                        isLoading={isCreating}
                    />

                    {/* Export Buttons - Icon Only */}
                    <div className="flex items-center gap-2 pb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('pdf')}
                            disabled={!activeRft || isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export PDF"
                        >
                            <PdfIcon size={22} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('docx')}
                            disabled={!activeRft || isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export Word"
                        >
                            <DocxIcon size={22} />
                        </Button>
                    </div>
                </div>

                {/* Tab Content - only shown when expanded */}
                {isExpanded && (
                    <div className="p-4 bg-[var(--color-bg-primary)]">
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
