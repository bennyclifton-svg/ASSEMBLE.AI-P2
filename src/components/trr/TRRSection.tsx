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
import { TRRShortTab } from './TRRShortTab';
import { TRRLongTab } from './TRRLongTab';
import { FileText, Save, RotateCcw, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';

// Highlight blue color for icons and buttons
const HIGHLIGHT_BLUE = '#4fc1ff';

interface TRRSectionProps {
    projectId: string;
    disciplineId?: string;
    disciplineName?: string;
    tradeId?: string;
    tradeName?: string;
    selectedDocumentIds?: string[];
    onLoadTransmittal?: (documentIds: string[]) => void;
    onSaveTransmittal?: () => string[];
}

export function TRRSection({
    projectId,
    disciplineId,
    tradeId,
    disciplineName,
    tradeName,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
}: TRRSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'short' | 'long'>('short');

    // Get or create the TRR for this discipline/trade
    const {
        trr,
        isLoading,
        updateTRR,
        refetch,
    } = useTRR({
        projectId,
        disciplineId,
        tradeId,
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
            const contextName = disciplineName || tradeName || 'TRR';
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
    }, [trr, disciplineName, tradeName]);

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
            const contextName = disciplineName || tradeName || 'Unknown';
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
    }, [trr, disciplineName, tradeName]);

    const handleTabClick = (tab: 'short' | 'long') => {
        if (activeTab === tab) {
            setIsExpanded(!isExpanded);
        } else {
            setActiveTab(tab);
            if (!isExpanded) setIsExpanded(true);
        }
    };

    const contextName = disciplineName || tradeName || 'Unknown';

    // Solid triangle icons - matching Firm Cards style
    const TriangleRight = () => (
        <svg
            className="w-3.5 h-3.5 text-[#858585]"
            viewBox="0 0 12 12"
            fill="currentColor"
        >
            <polygon points="2,0 12,6 2,12" />
        </svg>
    );

    const TriangleDown = () => (
        <svg
            className="w-3.5 h-3.5 text-[#858585]"
            viewBox="0 0 12 12"
            fill="currentColor"
        >
            <polygon points="0,2 12,2 6,12" />
        </svg>
    );

    return (
        <div className="mt-6 border border-[#3e3e42] rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d30] border-b border-[#3e3e42]">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    <FileText className="w-4 h-4" style={{ color: HIGHLIGHT_BLUE }} />
                    <span className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
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
                        className="h-7 px-2 text-xs"
                        style={{
                            backgroundColor: `rgba(79, 193, 255, 0.2)`,
                            color: HIGHLIGHT_BLUE,
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
                        className="h-7 px-2 text-xs"
                        style={{
                            backgroundColor: `rgba(79, 193, 255, 0.2)`,
                            color: HIGHLIGHT_BLUE,
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
                        className="h-7 px-2 text-xs"
                        style={{
                            backgroundColor: `rgba(79, 193, 255, 0.2)`,
                            color: HIGHLIGHT_BLUE,
                        }}
                    >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-[#252526]">
                {/* Tabs and Export Actions Row */}
                <div className="flex items-center justify-between px-4 pt-2 border-b border-[#3e3e42]">
                    {/* SHORT/LONG Tabs */}
                    <div className="flex items-center">
                        <div
                            className={`relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer ${activeTab === 'short'
                                ? 'text-[#cccccc] border-b-[3px] border-[#0e639c] -mb-px'
                                : 'text-[#858585] hover:text-[#cccccc]'
                                }`}
                            onClick={() => handleTabClick('short')}
                        >
                            <span>SHORT</span>
                        </div>
                        <div
                            className={`relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer ${activeTab === 'long'
                                ? 'text-[#cccccc] border-b-[3px] border-[#0e639c] -mb-px'
                                : 'text-[#858585] hover:text-[#cccccc]'
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
                            className="h-8 w-8 p-0 hover:bg-[#3e3e42]"
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
                            className="h-8 w-8 p-0 hover:bg-[#3e3e42]"
                            title="Export Word"
                        >
                            <DocxIcon size={22} />
                        </Button>
                    </div>
                </div>

                {/* Tab Content - only shown when expanded */}
                {isExpanded && (
                    <div className="p-4 bg-[#1e1e1e]">
                        {activeTab === 'short' ? (
                            isLoading ? (
                                <div className="p-8 text-center text-[#858585]">
                                    <p>Loading TRR...</p>
                                </div>
                            ) : trr ? (
                                <TRRShortTab
                                    projectId={projectId}
                                    trr={trr}
                                    disciplineId={disciplineId}
                                    tradeId={tradeId}
                                    contextName={contextName}
                                    contextType={disciplineId ? 'discipline' : 'trade'}
                                    onUpdateTRR={updateTRR}
                                />
                            ) : (
                                <div className="p-8 text-center text-[#858585]">
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
