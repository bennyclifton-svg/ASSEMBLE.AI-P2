/**
 * T111: AddendumSection Component
 * Main container for Addendum reports within discipline/trade tabs
 */

'use client';

import { useState, useCallback } from 'react';
import { useAddenda, type Addendum } from '@/lib/hooks/use-addenda';
import { useAddendumTransmittal } from '@/lib/hooks/use-addendum-transmittal';
import { AddendumTabs } from './AddendumTabs';
import { AddendumContent } from './AddendumContent';
import { AddendumTransmittalSchedule } from './AddendumTransmittalSchedule';
import { FileText, Save, Upload, Download, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Highlight blue color for icons and buttons
const HIGHLIGHT_BLUE = '#4fc1ff';

interface AddendumSectionProps {
    projectId: string;
    disciplineId?: string;
    disciplineName?: string;
    tradeId?: string;
    tradeName?: string;
    selectedDocumentIds?: string[];
    onLoadTransmittal?: (documentIds: string[]) => void;
    onSaveTransmittal?: () => string[];
}

export function AddendumSection({
    projectId,
    disciplineId,
    tradeId,
    disciplineName,
    tradeName,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
}: AddendumSectionProps) {
    const [activeAddendumId, setActiveAddendumId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

    // Handle tab selection - also expands if collapsed
    const handleSelectAddendum = (id: string) => {
        setActiveAddendumId(id);
        if (!isExpanded) {
            setIsExpanded(true);
        }
    };

    // Handle create addendum - also expands if collapsed
    const handleCreateAddendumWithExpand = async () => {
        const newAddendum = await createAddendum();
        if (newAddendum) {
            setActiveAddendumId(newAddendum.id);
            if (!isExpanded) {
                setIsExpanded(true);
            }
        }
    };

    const {
        addenda,
        isLoading,
        createAddendum,
        updateContent,
        deleteAddendum,
    } = useAddenda({
        projectId,
        disciplineId,
        tradeId,
    });

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
    if (!activeAddendumId && addenda.length > 0) {
        setActiveAddendumId(addenda[0].id);
    }

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
                        className="h-7 px-2 text-xs"
                        style={{
                            backgroundColor: `rgba(79, 193, 255, 0.2)`,
                            color: HIGHLIGHT_BLUE,
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
                        className="h-7 px-2 text-xs"
                        style={{
                            backgroundColor: `rgba(79, 193, 255, 0.2)`,
                            color: HIGHLIGHT_BLUE,
                        }}
                    >
                        <Upload className="w-3 h-3 mr-1" />
                        Load {documentCount > 0 && `(${documentCount})`}
                    </Button>
                </div>
            </div>

            {/* Tabs - always visible */}
            <div className="bg-[#252526]">
                {/* Tabs and Actions Row */}
                <div className="flex items-center justify-between px-4 pt-2 border-b border-[#3e3e42]">
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
                            className="h-7 px-2 text-xs"
                        >
                            <FileDown className="w-3 h-3 mr-1" />
                            Export PDF
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('docx')}
                            disabled={!activeAddendumId || isExporting}
                            className="h-7 px-2 text-xs"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            Export Word
                        </Button>
                    </div>
                </div>

                {/* Content Area - only shown when expanded */}
                {isExpanded && (
                    activeAddendum ? (
                        <div className="p-4 bg-[#1e1e1e]">
                            <AddendumContent
                                projectId={projectId}
                                addendum={activeAddendum}
                                onUpdateContent={updateContent}
                                onDelete={() => handleDeleteAddendum(activeAddendum.id)}
                            />

                            <AddendumTransmittalSchedule
                                addendumId={activeAddendum.id}
                            />
                        </div>
                    ) : (
                        <div className="p-8 text-center text-[#858585] bg-[#1e1e1e]">
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
