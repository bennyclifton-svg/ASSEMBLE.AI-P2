/**
 * EvaluationPriceSection Component
 * Main container for Evaluation Price reports within discipline/trade tabs
 * Supports multiple evaluation price instances per stakeholder with numbered tabs (01, 02, etc.)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useEvaluationPrice, type EvaluationPriceInstance } from '@/lib/hooks/use-evaluation-price';
import { useEvaluationPriceSectionUI } from '@/lib/contexts/procurement-ui-context';
import { EvaluationPriceTabs } from './EvaluationPriceTabs';
import { EvaluationPriceTab } from './EvaluationPriceTab';
import { FileText, MoreHorizontal, MoreVertical, Loader2 } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon, XlsxIcon } from '@/components/ui/file-type-icons';

// Procurement section accent color (copper from design system)
const SECTION_ACCENT = 'var(--primitive-copper-darker)';

interface EvaluationPriceSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
}

export function EvaluationPriceSection({
    projectId,
    stakeholderId,
    stakeholderName,
}: EvaluationPriceSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);

    // Use context for expanded state persistence across tab navigation
    const {
        isExpanded,
        activeEvaluationPriceId,
        setExpanded: setIsExpanded,
        setActiveEvaluationPriceId,
    } = useEvaluationPriceSectionUI(stakeholderId);

    // Get all evaluation prices for this stakeholder
    const {
        evaluationPrices,
        isLoading,
        createEvaluationPrice,
        deleteEvaluationPrice,
    } = useEvaluationPrice({
        projectId,
        stakeholderId,
    });

    // Find the active evaluation price
    const activeEvaluationPrice = evaluationPrices.find(ep => ep.id === activeEvaluationPriceId)
        || evaluationPrices[0]
        || null;

    // Auto-select first evaluation price when loaded
    useEffect(() => {
        if (evaluationPrices.length > 0 && !activeEvaluationPriceId) {
            setActiveEvaluationPriceId(evaluationPrices[0].id);
        }
    }, [evaluationPrices, activeEvaluationPriceId, setActiveEvaluationPriceId]);

    const handleCreateEvaluationPrice = useCallback(async () => {
        setIsCreating(true);
        try {
            const newInstance = await createEvaluationPrice();
            if (newInstance) {
                setActiveEvaluationPriceId(newInstance.id);
                setIsExpanded(true);
            }
        } finally {
            setIsCreating(false);
        }
    }, [createEvaluationPrice, setActiveEvaluationPriceId, setIsExpanded]);

    // Auto-create first evaluation price when expanding with none
    const handleExpandToggle = useCallback(async () => {
        if (!isExpanded && evaluationPrices.length === 0 && !isLoading && !isCreating) {
            await handleCreateEvaluationPrice();
        } else {
            setIsExpanded(!isExpanded);
        }
    }, [isExpanded, evaluationPrices.length, isLoading, isCreating, handleCreateEvaluationPrice, setIsExpanded]);

    const handleDeleteEvaluationPrice = useCallback(async (id: string) => {
        const success = await deleteEvaluationPrice(id);
        if (success && id === activeEvaluationPriceId) {
            // Select the first remaining instance or null
            const remaining = evaluationPrices.filter(ep => ep.id !== id);
            setActiveEvaluationPriceId(remaining[0]?.id || null);
        }
    }, [deleteEvaluationPrice, activeEvaluationPriceId, evaluationPrices, setActiveEvaluationPriceId]);

    const handleSelectEvaluationPrice = useCallback((id: string) => {
        setActiveEvaluationPriceId(id);
        if (!isExpanded) {
            setIsExpanded(true);
        }
    }, [setActiveEvaluationPriceId, isExpanded, setIsExpanded]);

    // Handle export
    const handleExport = async (format: 'pdf' | 'docx' | 'xlsx') => {
        if (!activeEvaluationPrice) return;

        setIsExporting(true);
        try {
            const response = await fetch(
                `/api/evaluation/${projectId}/stakeholder/${stakeholderId}/export?format=${format}&evaluationPriceId=${activeEvaluationPrice.id}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Download the file
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            const contextName = stakeholderName || 'Evaluation';
            let filename = `Evaluation_Price_${contextName}.${format}`;
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
    };

    return (
        <div className="mt-6">
            {/* Header - Segmented white ribbons with grey surround */}
            <div className="flex items-stretch gap-0.5 p-2">
                {/* Evaluation Price segment */}
                <div className="flex items-center w-fit h-11 px-3 py-1.5 border border-[var(--color-border)] shadow-sm rounded-l-md" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 50%, transparent)' }}>
                    <FileText className="w-4 h-4" style={{ color: SECTION_ACCENT }} />
                    <span className="ml-1 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                        Evaluation Price
                    </span>
                </div>
                {/* Corner bracket segment - square, points out to expand, in to collapse */}
                <button
                    onClick={handleExpandToggle}
                    className="flex items-center justify-center w-11 h-11 border border-[var(--color-border)] shadow-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 50%, transparent)' }}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                >
                    <CornerBracketIcon
                        direction={isExpanded ? 'right' : 'left'}
                        className="w-4 h-4"
                    />
                </button>
                {/* More options segment - expandable to show tabs and export buttons */}
                <div className="flex items-center h-11 border border-[var(--color-border)] shadow-sm rounded-r-md transition-all" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 50%, transparent)' }}>
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
                            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
                            <EvaluationPriceTabs
                                evaluationPrices={evaluationPrices}
                                activeEvaluationPriceId={activeEvaluationPrice?.id || null}
                                onSelectEvaluationPrice={handleSelectEvaluationPrice}
                                onCreateEvaluationPrice={handleCreateEvaluationPrice}
                                onDeleteEvaluationPrice={handleDeleteEvaluationPrice}
                                isLoading={isCreating}
                            />
                            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('pdf')}
                                    disabled={!activeEvaluationPrice || isExporting}
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
                                    disabled={!activeEvaluationPrice || isExporting}
                                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                                    title="Export Word"
                                >
                                    <DocxIcon size={20} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('xlsx')}
                                    disabled={!activeEvaluationPrice || isExporting}
                                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                                    title="Export Excel"
                                >
                                    <XlsxIcon size={20} />
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
                    <div className="mx-2 p-4 rounded-md shadow-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 50%, transparent)' }}>
                        {isLoading ? (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>Loading evaluations...</p>
                            </div>
                        ) : evaluationPrices.length === 0 ? (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>No evaluations yet. Click + to create one.</p>
                            </div>
                        ) : activeEvaluationPrice ? (
                            <EvaluationPriceTab
                                projectId={projectId}
                                stakeholderId={stakeholderId}
                                stakeholderName={stakeholderName}
                                evaluationPriceId={activeEvaluationPrice.id}
                                evaluationPriceNumber={activeEvaluationPrice.evaluationPriceNumber}
                            />
                        ) : (
                            <div className="p-8 text-center text-[var(--color-text-muted)]">
                                <p>Unable to load evaluation</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
