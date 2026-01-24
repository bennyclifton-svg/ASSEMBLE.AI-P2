/**
 * RFTNewSection Component
 * Main container for RFT NEW report within discipline/trade tabs
 * Positioned ABOVE Addendum section
 *
 * Contains two tabs: SHORT and LONG
 * Only one RFT NEW per discipline/trade (auto-created)
 */

'use client';

import { useState, useCallback } from 'react';
import { useRftNew } from '@/lib/hooks/use-rft-new';
import { useRftNewTransmittal } from '@/lib/hooks/use-rft-new-transmittal';
import { useRFTSectionUI } from '@/lib/contexts/procurement-ui-context';
import { RFTNewShortTab } from './RFTNewShortTab';
import { RFTNewTransmittalSchedule } from './RFTNewTransmittalSchedule';
import { FileText, Save, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Procurement section accent color (copper from design system)
const SECTION_ACCENT = 'var(--color-accent-copper)'; // Copper for icons (better contrast)
const SECTION_TINT = 'var(--color-accent-copper-tint)';
const SECTION_TEXT = 'var(--color-accent-copper)'; // Copper text for better contrast on dark bg

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

    // Use context for expanded state persistence across tab navigation
    const { isExpanded, activeTab, setExpanded: setIsExpanded, setActiveTab } = useRFTSectionUI(stakeholderId);

    // Get or create the RFT NEW for this stakeholder
    const {
        rftNew,
        isLoading,
        updateRftDate,
    } = useRftNew({
        projectId,
        stakeholderId,
    });

    // Get transmittal for the RFT NEW
    const {
        transmittal,
        saveTransmittal,
        loadTransmittal,
        hasTransmittal,
        documentCount,
    } = useRftNewTransmittal({
        rftNewId: rftNew?.id || null,
    });

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
        if (!rftNew) return;

        setIsDownloading(true);
        try {
            const response = await fetch(`/api/rft-new/${rftNew.id}/transmittal/download`);

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
    }, [rftNew, stakeholderName]);

    const handleExport = useCallback(async (format: 'pdf' | 'docx') => {
        if (!rftNew) return;

        setIsExporting(true);
        try {
            const response = await fetch(`/api/rft-new/${rftNew.id}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format }),
            });

            if (!response.ok) {
                // For now, export is not implemented (501 status)
                if (response.status === 501) {
                    const data = await response.json();
                    alert(data.message || 'Export functionality coming soon in Phase 3');
                    return;
                }
                // Get detailed error from server
                const errorData = await response.json().catch(() => ({}));
                console.error('Export error details:', errorData);
                throw new Error(errorData.details || errorData.error || 'Export failed');
            }

            // Download the file
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
    }, [rftNew]);

    const handleTabClick = (tab: 'short' | 'long') => {
        if (activeTab === tab) {
            setIsExpanded(!isExpanded);
        } else {
            setActiveTab(tab);
            if (!isExpanded) setIsExpanded(true);
        }
    };

    const contextName = stakeholderName || 'Unknown';

    // Solid triangle icons - matching Firm Cards style
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
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveTransmittal}
                        disabled={!rftNew || selectedDocumentIds.length === 0}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: SECTION_TINT,
                            color: SECTION_TEXT,
                        }}
                    >
                        <Save className="w-3 h-3 mr-1" />
                        Save Transmittal
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadTransmittal}
                        disabled={!rftNew || !hasTransmittal}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: SECTION_TINT,
                            color: SECTION_TEXT,
                        }}
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Recall {documentCount > 0 && `(${documentCount})`}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadTransmittal}
                        disabled={!rftNew || !hasTransmittal || isDownloading}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: SECTION_TINT,
                            color: SECTION_TEXT,
                        }}
                    >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-[var(--color-bg-secondary)]">
                {/* Tabs and Export Actions Row */}
                <div className="flex items-center justify-between px-4 pt-2 border-b border-[var(--color-border)]">
                    {/* SHORT/LONG Tabs - Custom consistency with AddendumTabs */}
                    <div className="flex items-center">
                        <div
                            className={`relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer ${activeTab === 'short'
                                ? 'text-[var(--color-text-primary)] border-b-[3px] border-[var(--color-accent-copper)] -mb-px'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                            onClick={() => handleTabClick('short')}
                        >
                            <span>SHORT</span>
                        </div>
                        <div
                            className={`relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer ${activeTab === 'long'
                                ? 'text-[var(--color-text-primary)] border-b-[3px] border-[var(--color-accent-copper)] -mb-px'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                            onClick={() => handleTabClick('long')}
                        >
                            <span>LONG</span>
                        </div>
                    </div>

                    {/* Export Buttons - Icon Only */}
                    <div className="flex items-center gap-2 pb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('pdf')}
                            disabled={!rftNew || isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export PDF"
                        >
                            <PdfIcon size={22} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('docx')}
                            disabled={!rftNew || isExporting}
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
                        {activeTab === 'short' ? (
                            isLoading ? (
                                <div className="p-8 text-center text-[var(--color-text-muted)]">
                                    <p>Loading RFT...</p>
                                </div>
                            ) : rftNew ? (
                                <RFTNewShortTab
                                    projectId={projectId}
                                    rftNew={rftNew}
                                    stakeholderId={stakeholderId}
                                    contextName={contextName}
                                    onDateChange={updateRftDate}
                                />
                            ) : (
                                <div className="p-8 text-center text-[var(--color-text-muted)]">
                                    <p>Unable to load RFT</p>
                                </div>
                            )
                        ) : (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>LONG tab content coming in future release</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
