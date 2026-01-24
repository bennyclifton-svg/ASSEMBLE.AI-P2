/**
 * TRRSection Component
 * Main container for TRR (Tender Recommendation Report) within discipline/trade tabs
 * Positioned BELOW Evaluation section
 *
 * Contains two tabs: SHORT and LONG
 * Only one TRR per discipline/trade (auto-created)
 */

'use client';

import { useState, useCallback } from 'react';
import { useTRR } from '@/lib/hooks/use-trr';
import { useTRRSectionUI } from '@/lib/contexts/procurement-ui-context';
import { TRRShortTab } from './TRRShortTab';
import { TRRLongTab } from './TRRLongTab';
import { FileText, Save, RotateCcw, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';

// Procurement section accent color (copper from design system)
const SECTION_ACCENT = 'var(--primitive-copper-darker)'; // Warm bronze for icons
const SECTION_TINT = 'var(--color-accent-copper-tint)';
const SECTION_TEXT = 'var(--primitive-copper-darker)'; // Bronze text on copper-tint bg

interface TRRSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    selectedDocumentIds?: string[];
    onLoadTransmittal?: (documentIds: string[]) => void;
    onSaveTransmittal?: () => string[];
}

export function TRRSection({
    projectId,
    stakeholderId,
    stakeholderName,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
}: TRRSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Use context for expanded state persistence across tab navigation
    const { isExpanded, activeTab, setExpanded: setIsExpanded, setActiveTab } = useTRRSectionUI(stakeholderId);

    // Get or create the TRR for this stakeholder
    const {
        trr,
        isLoading,
        updateTRR,
        refetch,
    } = useTRR({
        projectId,
        stakeholderId,
    });

    const handleSaveTransmittal = useCallback(async () => {
        if (!trr) return;

        let documentIds: string[] = [];
        if (onSaveTransmittal) {
            documentIds = onSaveTransmittal();
        } else if (selectedDocumentIds.length > 0) {
            documentIds = selectedDocumentIds;
        }

        if (documentIds.length === 0) return;

        try {
            const response = await fetch(`/api/trr/${trr.id}/transmittal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds }),
            });
            if (response.ok) {
                // Refetch TRR to update transmittal count
                refetch();
            }
        } catch (error) {
            console.error('Failed to save attachments:', error);
        }
    }, [trr, selectedDocumentIds, onSaveTransmittal, refetch]);

    const handleLoadTransmittal = useCallback(async () => {
        if (!trr) return;

        try {
            const response = await fetch(`/api/trr/${trr.id}/transmittal`);
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
    }, [trr, onLoadTransmittal]);

    const handleDownloadTransmittal = useCallback(async () => {
        if (!trr) return;

        setIsDownloading(true);
        try {
            const response = await fetch(`/api/trr/${trr.id}/transmittal/download`);

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
    }, [trr, stakeholderName]);

    const handleExport = useCallback(async (format: 'pdf' | 'docx') => {
        if (!trr) return;

        setIsExporting(true);
        try {
            const response = await fetch(`/api/trr/${trr.id}/export`, {
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
                throw new Error('Export failed');
            }

            // Download the file
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
    }, [trr, stakeholderName]);

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
                        TRR
                    </span>
                    {isExpanded ? <TriangleDown /> : <TriangleRight />}
                </button>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveTransmittal}
                        disabled={!trr || selectedDocumentIds.length === 0}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: SECTION_TINT,
                            color: SECTION_TEXT,
                        }}
                    >
                        <Save className="w-3 h-3 mr-1" />
                        Save Attachments
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadTransmittal}
                        disabled={!trr || (trr.transmittalCount ?? 0) === 0}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: SECTION_TINT,
                            color: SECTION_TEXT,
                        }}
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Recall {(trr?.transmittalCount ?? 0) > 0 && `(${trr?.transmittalCount})`}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadTransmittal}
                        disabled={!trr || (trr.transmittalCount ?? 0) === 0 || isDownloading}
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
                    {/* SHORT/LONG Tabs */}
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
                            disabled={!trr || isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export PDF"
                        >
                            {isExporting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <PdfIcon size={22} />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('docx')}
                            disabled={!trr || isExporting}
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
                                    <p>Loading TRR...</p>
                                </div>
                            ) : trr ? (
                                <TRRShortTab
                                    projectId={projectId}
                                    trr={trr}
                                    stakeholderId={stakeholderId}
                                    contextName={contextName}
                                    onUpdateTRR={updateTRR}
                                />
                            ) : (
                                <div className="p-8 text-center text-[var(--color-text-muted)]">
                                    <p>Unable to load TRR</p>
                                </div>
                            )
                        ) : (
                            <TRRLongTab />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
