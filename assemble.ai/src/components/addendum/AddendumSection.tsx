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
import { FileText, MoreHorizontal, MoreVertical } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';

// Procurement section accent color (aurora blue from design system)
const SECTION_ACCENT = 'var(--color-accent-copper)'; // Aurora blue for icons

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
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);

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
    const [isCreating, setIsCreating] = useState(false);
    const handleCreateAddendumWithExpand = useCallback(async () => {
        setIsCreating(true);
        try {
            const newAddendum = await createAddendum();
            if (newAddendum) {
                setActiveAddendumId(newAddendum.id);
                if (!isExpanded) {
                    setIsExpanded(true);
                }
            }
        } finally {
            setIsCreating(false);
        }
    }, [createAddendum, setActiveAddendumId, isExpanded, setIsExpanded]);

    // Auto-create first addendum when expanding with none
    const handleExpandToggle = useCallback(async () => {
        if (!isExpanded && addenda.length === 0 && !isLoading && !isCreating) {
            await handleCreateAddendumWithExpand();
        } else {
            setIsExpanded(!isExpanded);
        }
    }, [isExpanded, addenda.length, isLoading, isCreating, handleCreateAddendumWithExpand, setIsExpanded]);

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

    return (
        <div className="mt-6">
            {/* Header - Segmented white ribbons with grey surround */}
            <div className="flex items-stretch gap-0.5 p-2">
                {/* Addendum segment */}
                <div
                    className="flex items-center w-fit h-11 px-3 py-1.5 backdrop-blur-md border border-[var(--color-border)]/50 shadow-sm rounded-l-md"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
                >
                    <FileText className="w-4 h-4" style={{ color: SECTION_ACCENT }} />
                    <span className="ml-1 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                        Addendum
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
                            <AddendumTabs
                                addenda={addenda}
                                activeAddendumId={activeAddendumId}
                                onSelectAddendum={handleSelectAddendum}
                                onCreateAddendum={handleCreateAddendumWithExpand}
                                onDeleteAddendum={handleDeleteAddendum}
                                isLoading={isLoading}
                            />
                            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
                            <div className="flex items-center gap-1 pr-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('pdf')}
                                    disabled={!activeAddendumId || isExporting}
                                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                                    title="Export PDF"
                                >
                                    <PdfIcon size={20} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('docx')}
                                    disabled={!activeAddendumId || isExporting}
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
                {/* Content - only shown when expanded */}
                {isExpanded && (
                    activeAddendum ? (
                        <div
                            className="mx-2 p-4 backdrop-blur-md rounded-md shadow-sm"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
                        >
                            <AddendumContent
                                projectId={projectId}
                                addendum={activeAddendum}
                                onUpdateContent={updateContent}
                                onUpdateDate={updateDate}
                            />

                            <AddendumTransmittalSchedule
                                addendumId={activeAddendum.id}
                                onSaveTransmittal={handleSaveTransmittal}
                                onLoadTransmittal={handleLoadTransmittal}
                                onDownloadTransmittal={handleDownloadTransmittal}
                                canSaveTransmittal={!!activeAddendumId && selectedDocumentIds.length > 0}
                                hasTransmittal={hasTransmittal}
                                documentCount={documentCount}
                                isDownloading={isDownloading}
                            />
                        </div>
                    ) : (
                        <div
                            className="mx-2 p-8 text-center text-[var(--color-text-muted)] backdrop-blur-md rounded-md shadow-sm"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
                        >
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
