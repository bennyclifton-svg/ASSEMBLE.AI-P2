/**
 * T111: AddendumSection Component
 * Main container for Addendum reports within discipline/trade tabs
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAddenda, type Addendum } from '@/lib/hooks/use-addenda';
import { useAddendumSectionUI } from '@/lib/contexts/procurement-ui-context';
import { useAddendumTransmittal } from '@/lib/hooks/use-addendum-transmittal';
import { AddendumTabs } from './AddendumTabs';
import { AddendumContent } from './AddendumContent';
import { AddendumTransmittalSchedule } from './AddendumTransmittalSchedule';
import { FileText, Save, RotateCcw, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';

// Procurement section accent color (copper from design system)
const SECTION_ACCENT = 'var(--primitive-copper-darker)'; // Warm bronze for icons
const SECTION_TINT = 'var(--color-accent-copper-tint)';
const SECTION_TEXT = 'var(--primitive-copper-darker)'; // Bronze text on copper-tint bg

interface AddendumSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    selectedDocumentIds?: string[];
    onLoadTransmittal?: (documentIds: string[]) => void;
    onSaveTransmittal?: () => string[];
}

export function AddendumSection({
    projectId,
    stakeholderId,
    stakeholderName,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
}: AddendumSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Use context for expanded state persistence across tab navigation
    const {
        isExpanded,
        activeAddendumId,
        setExpanded: setIsExpanded,
        setActiveAddendumId,
    } = useAddendumSectionUI(stakeholderId);

    const {
        addenda,
        isLoading,
        createAddendum,
        updateContent,
        updateDate,
        deleteAddendum,
    } = useAddenda({
        projectId,
        stakeholderId,
    });

    // Handle tab selection - also expands if collapsed
    const handleSelectAddendum = (id: string) => {
        setActiveAddendumId(id);
        if (!isExpanded) {
            setIsExpanded(true);
        }
    };

    // Handle create addendum - also expands if collapsed
    const handleCreateAddendumWithExpand = useCallback(async () => {
        const newAddendum = await createAddendum();
        if (newAddendum) {
            setActiveAddendumId(newAddendum.id);
            if (!isExpanded) {
                setIsExpanded(true);
            }
        }
    }, [createAddendum, setActiveAddendumId, isExpanded, setIsExpanded]);

    const {
        transmittal,
        saveTransmittal,
        loadTransmittal,
        hasTransmittal,
        documentCount,
    } = useAddendumTransmittal({
        addendumId: activeAddendumId,
    });

    // Set active addendum to first one when loaded
    useEffect(() => {
        if (!activeAddendumId && addenda.length > 0) {
            setActiveAddendumId(addenda[0].id);
        }
    }, [activeAddendumId, addenda, setActiveAddendumId]);

    const activeAddendum = addenda.find(a => a.id === activeAddendumId);


    const handleDeleteAddendum = useCallback(async (id: string) => {
        const success = await deleteAddendum(id);
        if (success) {
            // Select another addendum if the deleted one was active
            if (activeAddendumId === id) {
                const remaining = addenda.filter(a => a.id !== id);
                setActiveAddendumId(remaining.length > 0 ? remaining[0].id : null);
            }
        }
    }, [activeAddendumId, addenda, deleteAddendum]);

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
        if (!activeAddendumId) return;

        setIsDownloading(true);
        try {
            const response = await fetch(`/api/addenda/${activeAddendumId}/transmittal/download`);

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const contextName = stakeholderName || 'Addendum';
            let filename = `${contextName}_Addendum_Transmittal.zip`;
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
    }, [activeAddendumId, stakeholderName]);

    const handleExport = useCallback(async (format: 'pdf' | 'docx') => {
        if (!activeAddendumId) return;

        setIsExporting(true);
        try {
            const response = await fetch(`/api/addenda/${activeAddendumId}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Download the file
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Addendum.${format}`;
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
    }, [activeAddendumId]);

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
                        Addendum
                    </span>
                    {isExpanded ? <TriangleDown /> : <TriangleRight />}
                </button>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveTransmittal}
                        disabled={!activeAddendumId || selectedDocumentIds.length === 0}
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
                        disabled={!activeAddendumId || !hasTransmittal}
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
                        disabled={!activeAddendumId || !hasTransmittal || isDownloading}
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

            {/* Tabs - always visible */}
            <div className="bg-[var(--color-bg-secondary)]">
                {/* Tabs and Actions Row */}
                <div className="flex items-center justify-between px-4 pt-2 border-b border-[var(--color-border)]">
                    <AddendumTabs
                        addenda={addenda}
                        activeAddendumId={activeAddendumId}
                        onSelectAddendum={handleSelectAddendum}
                        onCreateAddendum={handleCreateAddendumWithExpand}
                        onDeleteAddendum={handleDeleteAddendum}
                        isLoading={isLoading}
                    />
                    <div className="flex items-center gap-2 pb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('pdf')}
                            disabled={!activeAddendumId || isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export PDF"
                        >
                            <PdfIcon size={22} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('docx')}
                            disabled={!activeAddendumId || isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export Word"
                        >
                            <DocxIcon size={22} />
                        </Button>
                    </div>
                </div>

                {/* Content Area - only shown when expanded */}
                {isExpanded && (
                    activeAddendum ? (
                        <div className="p-4 bg-[var(--color-bg-primary)]">
                            <AddendumContent
                                projectId={projectId}
                                addendum={activeAddendum}
                                onUpdateContent={updateContent}
                                onUpdateDate={updateDate}
                                onDelete={() => handleDeleteAddendum(activeAddendum.id)}
                            />

                            <AddendumTransmittalSchedule
                                addendumId={activeAddendum.id}
                            />
                        </div>
                    ) : (
                        <div className="p-8 text-center text-[var(--color-text-muted)] bg-[var(--color-bg-primary)]">
                            {isLoading ? (
                                <p>Loading addenda...</p>
                            ) : (
                                <div>
                                    <p className="mb-3">No addenda created yet</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCreateAddendumWithExpand}
                                        className="text-xs"
                                    >
                                        Create Addendum 01
                                    </Button>
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
