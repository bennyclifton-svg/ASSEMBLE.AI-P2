/**
 * T111: AddendumSection Component
 * Main container for Addendum reports within discipline/trade tabs
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAddenda } from '@/lib/hooks/use-addenda';
import { useAddendumSectionUI } from '@/lib/contexts/procurement-ui-context';
import { useAddendumTransmittal } from '@/lib/hooks/use-addendum-transmittal';
import { AddendumTabs } from './AddendumTabs';
import { AddendumContent } from './AddendumContent';
import { AddendumTransmittalSchedule } from './AddendumTransmittalSchedule';
import {
    ADDENDUM_CREATED_EVENT,
    type AddendumCreatedDetail,
} from '@/lib/chat/addendum-events';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';
import {
    ProcurementIconButton,
    ProcurementSectionShell,
    ProcurementToolbarDivider,
} from '@/components/procurement';
import type { AddendumDetailViewMode } from './AddendumContent';

const ADDENDUM_ACCENT_COLOR = 'var(--sw-peach)';

interface AddendumSectionProps {
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

export function AddendumSection({
    projectId,
    stakeholderId,
    stakeholderName,
    selectedDocumentIds = [],
    onLoadTransmittal,
    onSaveTransmittal,
    displayMode = 'accordion',
}: AddendumSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<AddendumDetailViewMode>('long');
    const [isRefreshingContent, setIsRefreshingContent] = useState(false);
    const [contentRefreshKey, setContentRefreshKey] = useState(0);

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

    useEffect(() => {
        if (!stakeholderId) return;

        const handleCreated = (event: Event) => {
            const detail = (event as CustomEvent<AddendumCreatedDetail>).detail;
            if (
                !detail ||
                detail.projectId !== projectId ||
                detail.stakeholderId !== stakeholderId
            ) {
                return;
            }
            setActiveAddendumId(detail.addendumId);
            setIsExpanded(true);
            setIsMenuExpanded(true);
        };

        window.addEventListener(ADDENDUM_CREATED_EVENT, handleCreated);
        return () => {
            window.removeEventListener(ADDENDUM_CREATED_EVENT, handleCreated);
        };
    }, [projectId, setActiveAddendumId, setIsExpanded, stakeholderId]);

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
    }, [activeAddendumId, addenda, deleteAddendum, setActiveAddendumId]);

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

    const handleRefreshContent = useCallback(() => {
        setIsRefreshingContent(true);
        setContentRefreshKey((key) => key + 1);
        window.setTimeout(() => setIsRefreshingContent(false), 180);
    }, []);

    const sectionExpanded = displayMode === 'detail' || isExpanded;
    const detailDate = activeAddendum
        ? formatDetailDate(activeAddendum.addendumDate ?? activeAddendum.createdAt)
        : '';
    const sectionLabel = displayMode === 'detail' ? 'addendum record' : 'addendum';
    const sectionMeta = displayMode === 'detail'
        ? `addendum / ${detailDate || 'no date'}`
        : `${addenda.length} issued - ${documentCount} docs`;

    return (
        <div className={displayMode === 'detail' ? '' : 'mt-2'}>
            <ProcurementSectionShell
                label={sectionLabel}
                meta={sectionMeta}
                accentColor={displayMode === 'detail' ? ADDENDUM_ACCENT_COLOR : undefined}
                isExpanded={sectionExpanded}
                onToggleExpanded={handleExpandToggle}
                isMenuExpanded={isMenuExpanded}
                onToggleMenu={() => setIsMenuExpanded(!isMenuExpanded)}
                displayMode={displayMode}
                menuContent={
                    <>
                        <AddendumTabs
                            addenda={addenda}
                            activeAddendumId={activeAddendumId}
                            onSelectAddendum={handleSelectAddendum}
                            onCreateAddendum={handleCreateAddendumWithExpand}
                            onDeleteAddendum={handleDeleteAddendum}
                            isLoading={isLoading}
                        />
                        <ProcurementToolbarDivider />
                        <div className="flex items-center gap-1">
                            <ProcurementIconButton
                                title="Export PDF"
                                onClick={() => handleExport('pdf')}
                                disabled={!activeAddendumId || isExporting}
                            >
                                <PdfIcon size={20} />
                            </ProcurementIconButton>
                            <ProcurementIconButton
                                title="Export Word"
                                onClick={() => handleExport('docx')}
                                disabled={!activeAddendumId || isExporting}
                            >
                                <DocxIcon size={20} />
                            </ProcurementIconButton>
                        </div>
                        {displayMode === 'detail' ? (
                            <>
                                <ProcurementToolbarDivider />
                                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                                    <div
                                        role="group"
                                        aria-label="View mode"
                                        className="inline-flex items-center"
                                        style={{
                                            border: '1px solid var(--sw-rule)',
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 10,
                                            letterSpacing: '0.05em',
                                        }}
                                    >
                                        <DetailViewModeButton
                                            label="Short"
                                            active={viewMode === 'short'}
                                            onClick={() => setViewMode('short')}
                                        />
                                        <DetailViewModeButton
                                            label="Long"
                                            active={viewMode === 'long'}
                                            onClick={() => setViewMode('long')}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRefreshContent}
                                        disabled={isRefreshingContent}
                                        title="Refresh addendum content"
                                        aria-label="Refresh addendum content"
                                        className="inline-flex items-center border border-[var(--sw-rule)] bg-transparent px-1.5 py-1 text-[var(--sw-rose-dk)] transition-colors hover:bg-[var(--sw-rose-tint)] disabled:cursor-wait disabled:opacity-55"
                                    >
                                        <RotateCw className={`h-3 w-3 ${isRefreshingContent ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </>
                }
            >
                {activeAddendum ? (
                    <>
                        <AddendumContent
                            key={`${activeAddendum.id}-${contentRefreshKey}`}
                            projectId={projectId}
                            addendum={activeAddendum}
                            onUpdateContent={updateContent}
                            onUpdateDate={updateDate}
                            surface={displayMode === 'detail' ? 'record' : 'procurement'}
                            viewMode={viewMode}
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
                    </>
                ) : (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        {isLoading ? (
                            <p>Loading addenda...</p>
                        ) : (
                            <div>
                                <p className="mb-3">No addenda created yet</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCreateAddendumWithExpand}
                                    className="rounded-none border-[var(--sw-rule)] bg-transparent text-xs text-[var(--sw-ink)] hover:bg-[var(--sw-paper)]"
                                >
                                    Create Addendum 01
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </ProcurementSectionShell>
        </div>
    );
}

interface DetailViewModeButtonProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

function DetailViewModeButton({ label, active, onClick }: DetailViewModeButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="px-2 py-1 transition-colors"
            style={{
                background: active ? 'var(--sw-ink)' : 'transparent',
                color: active ? 'var(--sw-paper)' : 'var(--sw-muted)',
                borderRight: label === 'Short' ? '1px solid var(--sw-rule)' : 'none',
            }}
        >
            {label}
        </button>
    );
}
