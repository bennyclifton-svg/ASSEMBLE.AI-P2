/**
 * EvaluationNonPriceSection Component
 * Main container for Non-Price Evaluation within discipline/trade tabs
 * Single instance (no tabs) - simpler than EvaluationPriceSection
 */

'use client';

import { useState } from 'react';
import { useEvaluationNonPriceSectionUI } from '@/lib/contexts/procurement-ui-context';
import { FileText, Loader2, MoreHorizontal } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon, XlsxIcon } from '@/components/ui/file-type-icons';
import { EvaluationNonPriceTab } from './EvaluationNonPriceTab';

// Procurement section accent color (copper from design system)
const SECTION_ACCENT = 'var(--primitive-copper-darker)';

interface EvaluationNonPriceSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
}

export function EvaluationNonPriceSection({
    projectId,
    stakeholderId,
    stakeholderName,
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

    return (
        <div className="mt-6">
            {/* Header - Segmented white ribbons with grey surround */}
            <div className="flex items-stretch gap-0.5 p-2">
                {/* Evaluation Non-Price segment */}
                <div className="flex items-center w-[220px] px-3 py-1.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm rounded-l-md">
                    <FileText className="w-4 h-4" style={{ color: SECTION_ACCENT }} />
                    <span className="ml-1 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                        Evaluation Non-Price
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
                {/* More options segment - expandable to show export buttons (no tabs) */}
                <div className="flex items-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm rounded-r-md transition-all">
                    <button
                        onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                        className="flex items-center justify-center w-8 h-8 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        title={isMenuExpanded ? 'Hide options' : 'Show options'}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {/* Expanded content: export buttons only (no tabs for non-price) */}
                    {isMenuExpanded && (
                        <>
                            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('pdf')}
                                    disabled={isExporting}
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
                                    disabled={isExporting}
                                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                                    title="Export Word"
                                >
                                    <DocxIcon size={20} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExport('xlsx')}
                                    disabled={isExporting}
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
                {/* Content - only shown when expanded */}
                {isExpanded && (
                    <div className="mx-2 p-4 bg-[var(--color-bg-secondary)] rounded-md shadow-sm">
                        <EvaluationNonPriceTab
                            projectId={projectId}
                            stakeholderId={stakeholderId}
                            stakeholderName={stakeholderName}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
