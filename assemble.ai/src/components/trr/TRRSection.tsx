/**
 * TRRSection Component
 * Main container for TRR (Tender Recommendation Report) within discipline/trade tabs
 * Supports multiple TRRs per stakeholder with numbered tabs (01, 02, etc.)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTRR } from '@/lib/hooks/use-trr';
import { useTRRSectionUI } from '@/lib/contexts/procurement-ui-context';
import { TRRShortTab } from './TRRShortTab';
import { TRRTabs } from './TRRTabs';
import { FileText, Loader2, MoreHorizontal, MoreVertical } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';

// Procurement section accent color (aurora blue from design system)
const SECTION_ACCENT = 'var(--color-accent-copper)';

interface TRRSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    contextType: 'discipline' | 'trade';
    selectedDocumentIds?: string[];
    onLoadTransmittal?: (documentIds: string[]) => void;
    onSaveTransmittal?: () => string[];
}

export function TRRSection({
    projectId,
    stakeholderId,
    stakeholderName,
    contextType,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
}: TRRSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);

    // Use context for expanded state persistence across tab navigation
    const { isExpanded, activeTrrId, setExpanded: setIsExpanded, setActiveTrrId } = useTRRSectionUI(stakeholderId);

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
            const response = await fetch(`/api/trr/${activeTrr.id}/export`, {
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

    return (
        <div className="mt-6">
            {/* Header - Segmented white ribbons with grey surround */}
            <div className="flex items-stretch gap-0.5 p-2">
                {/* TRR segment */}
                <div className="flex items-center w-[220px] px-3 py-1.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm rounded-l-md">
                    <FileText className="w-4 h-4" style={{ color: SECTION_ACCENT }} />
                    <span className="ml-1 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                        TRR
                    </span>
                </div>
                {/* Corner bracket segment - square, points out to expand, in to collapse */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center justify-center p-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                >
                    <CornerBracketIcon
                        direction={isExpanded ? 'right' : 'left'}
                        className="w-4 h-4"
                    />
                </button>
                {/* More options segment - expandable to show tabs and export buttons */}
                <div className="flex items-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm rounded-r-md transition-all">
                    <button
                        onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                        className="flex items-center justify-center w-8 h-8 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        title={isMenuExpanded ? 'Hide options' : 'Show options'}
                    >
                        {isMenuExpanded ? <MoreHorizontal className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
                    </button>
                    {/* Expanded content: tabs and export buttons */}
                    {isMenuExpanded && (
                        <>
                            <div className="ml-1 mr-2 h-5 w-px bg-[var(--color-border)]" />
                            <TRRTabs
                                trrs={trrs}
                                activeTrrId={activeTrr?.id || null}
                                onSelectTrr={handleSelectTrr}
                                onCreateTrr={handleCreateTrr}
                                onDeleteTrr={handleDeleteTrr}
                                isLoading={isCreating}
                            />
                            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
                            <div className="flex items-center gap-1 pr-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('pdf')}
                                    disabled={!activeTrr || isExporting}
                                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                                    title="Export PDF"
                                >
                                    {isExporting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <PdfIcon size={20} />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('docx')}
                                    disabled={!activeTrr || isExporting}
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
                    <div className="mx-2 p-4 bg-[var(--color-bg-secondary)] rounded-md shadow-sm">
                        {isLoading ? (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>Loading TRRs...</p>
                            </div>
                        ) : trrs.length === 0 ? (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>No TRRs yet. Click + to create one.</p>
                            </div>
                        ) : activeTrr ? (
                            <TRRShortTab
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
                            />
                        ) : (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>Unable to load TRR</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
