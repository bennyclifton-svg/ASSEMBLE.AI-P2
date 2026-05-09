/**
 * EvaluationNonPriceSection Component
 * Main container for Non-Price Evaluation within discipline/trade tabs
 * Single instance (no tabs) - simpler than EvaluationPriceSection
 */

'use client';

import { useState } from 'react';
import { useEvaluationNonPriceSectionUI } from '@/lib/contexts/procurement-ui-context';
import { Loader2 } from 'lucide-react';
import { PdfIcon, DocxIcon, XlsxIcon } from '@/components/ui/file-type-icons';
import { EvaluationNonPriceTab } from './EvaluationNonPriceTab';
import {
    ProcurementIconButton,
    ProcurementSectionShell,
} from '@/components/procurement';
import { EVALUATION_NON_PRICE_ACCENT_COLOR } from './EvaluationReportChrome';

interface EvaluationNonPriceSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
    displayMode?: 'accordion' | 'detail';
}

export function EvaluationNonPriceSection({
    projectId,
    stakeholderId,
    stakeholderName,
    displayMode = 'accordion',
}: EvaluationNonPriceSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);

    // Use context for expanded state persistence across tab navigation
    const { isExpanded, setExpanded: setIsExpanded } = useEvaluationNonPriceSectionUI(stakeholderId);

    // Use stakeholder context - type kept for URL compatibility
    const contextType = 'stakeholder';
    const contextId = stakeholderId;
    const contextName = stakeholderName || 'Unknown';

    // Handle export
    const handleExport = async (format: 'pdf' | 'docx' | 'xlsx') => {
        if (!contextId) return;

        setIsExporting(true);
        try {
            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/non-price/export?format=${format}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Download the file
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Evaluation_NonPrice_${contextName}.${format}`;
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
    const sectionLabel = displayMode === 'detail' ? 'evaluation non-price record' : 'evaluation non-price';

    return (
        <div className={displayMode === 'detail' ? '' : 'mt-2'}>
            <ProcurementSectionShell
                label={sectionLabel}
                meta={displayMode === 'detail' ? 'evaluation non-price / criteria' : 'criteria - scoring'}
                isExpanded={sectionExpanded}
                accentColor={displayMode === 'detail' ? EVALUATION_NON_PRICE_ACCENT_COLOR : undefined}
                onToggleExpanded={() => setIsExpanded(!isExpanded)}
                isMenuExpanded={isMenuExpanded}
                onToggleMenu={() => setIsMenuExpanded(!isMenuExpanded)}
                displayMode={displayMode}
                menuContent={
                    <>
                        <div className="flex items-center gap-1">
                            <ProcurementIconButton
                                title="Export PDF"
                                onClick={() => handleExport('pdf')}
                                disabled={isExporting}
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
                                disabled={isExporting}
                            >
                                <DocxIcon size={20} />
                            </ProcurementIconButton>
                            <ProcurementIconButton
                                title="Export Excel"
                                onClick={() => handleExport('xlsx')}
                                disabled={isExporting}
                            >
                                <XlsxIcon size={20} />
                            </ProcurementIconButton>
                        </div>
                    </>
                }
            >
                <EvaluationNonPriceTab
                    projectId={projectId}
                    stakeholderId={stakeholderId}
                    stakeholderName={stakeholderName}
                    surface={displayMode === 'detail' ? 'record' : 'procurement'}
                />
            </ProcurementSectionShell>
        </div>
    );
}
