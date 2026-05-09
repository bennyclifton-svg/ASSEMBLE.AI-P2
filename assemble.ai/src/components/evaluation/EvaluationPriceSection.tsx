/**
 * EvaluationPriceSection Component
 * Main container for Evaluation Price reports within discipline/trade tabs
 * Supports multiple evaluation price instances per stakeholder with numbered tabs (01, 02, etc.)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useEvaluationPrice } from '@/lib/hooks/use-evaluation-price';
import { useEvaluationPriceSectionUI } from '@/lib/contexts/procurement-ui-context';
import { EvaluationPriceTabs } from './EvaluationPriceTabs';
import { EvaluationPriceTab } from './EvaluationPriceTab';
import { Loader2 } from 'lucide-react';
import { PdfIcon, DocxIcon, XlsxIcon } from '@/components/ui/file-type-icons';
import {
    ProcurementIconButton,
    ProcurementSectionShell,
    ProcurementToolbarDivider,
} from '@/components/procurement';
import { EVALUATION_PRICE_ACCENT_COLOR } from './EvaluationReportChrome';

interface EvaluationPriceSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    displayMode?: 'accordion' | 'detail';
}

function formatDetailDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function EvaluationPriceSection({
    projectId,
    stakeholderId,
    stakeholderName,
    displayMode = 'accordion',
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

    const sectionExpanded = displayMode === 'detail' || isExpanded;
    const detailDate = activeEvaluationPrice
        ? formatDetailDate(activeEvaluationPrice.createdAt ?? activeEvaluationPrice.updatedAt)
        : '';
    const sectionLabel = displayMode === 'detail' ? 'evaluation price record' : 'evaluation price';
    const sectionMeta = displayMode === 'detail'
        ? `evaluation price / ${detailDate || 'no date'}`
        : `${evaluationPrices.length} reports`;

    return (
        <div className={displayMode === 'detail' ? '' : 'mt-2'}>
            <ProcurementSectionShell
                label={sectionLabel}
                meta={sectionMeta}
                accentColor={displayMode === 'detail' ? EVALUATION_PRICE_ACCENT_COLOR : undefined}
                isExpanded={sectionExpanded}
                onToggleExpanded={handleExpandToggle}
                isMenuExpanded={isMenuExpanded}
                onToggleMenu={() => setIsMenuExpanded(!isMenuExpanded)}
                displayMode={displayMode}
                menuContent={
                    <>
                        <EvaluationPriceTabs
                            evaluationPrices={evaluationPrices}
                            activeEvaluationPriceId={activeEvaluationPrice?.id || null}
                            onSelectEvaluationPrice={handleSelectEvaluationPrice}
                            onCreateEvaluationPrice={handleCreateEvaluationPrice}
                            onDeleteEvaluationPrice={handleDeleteEvaluationPrice}
                            isLoading={isCreating}
                        />
                        <ProcurementToolbarDivider />
                        <div className="flex items-center gap-1">
                            <ProcurementIconButton
                                title="Export PDF"
                                onClick={() => handleExport('pdf')}
                                disabled={!activeEvaluationPrice || isExporting}
                            >
                                {isExporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <PdfIcon size={20} />
                                )}
                            </ProcurementIconButton>
                            <ProcurementIconButton
                                title="Export Word"
                                onClick={() => handleExport('docx')}
                                disabled={!activeEvaluationPrice || isExporting}
                            >
                                <DocxIcon size={20} />
                            </ProcurementIconButton>
                            <ProcurementIconButton
                                title="Export Excel"
                                onClick={() => handleExport('xlsx')}
                                disabled={!activeEvaluationPrice || isExporting}
                            >
                                <XlsxIcon size={20} />
                            </ProcurementIconButton>
                        </div>
                    </>
                }
            >
                {isLoading ? (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>Loading evaluations...</p>
                    </div>
                ) : evaluationPrices.length === 0 ? (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>No evaluations yet. Click + to create one.</p>
                    </div>
                ) : activeEvaluationPrice ? (
                    <EvaluationPriceTab
                        projectId={projectId}
                        stakeholderId={stakeholderId}
                        stakeholderName={stakeholderName}
                        evaluationPriceId={activeEvaluationPrice.id}
                        evaluationPriceNumber={activeEvaluationPrice.evaluationPriceNumber}
                        issuedDate={activeEvaluationPrice.createdAt}
                        surface={displayMode === 'detail' ? 'record' : 'procurement'}
                    />
                ) : (
                    <div className="p-8 text-center text-[var(--sw-muted)]">
                        <p>Unable to load evaluation</p>
                    </div>
                )}
            </ProcurementSectionShell>
        </div>
    );
}
