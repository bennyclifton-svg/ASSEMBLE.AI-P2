/**
 * T012: EvaluationSection Component
 * Main container for Evaluation reports within discipline/trade tabs
 * Feature 011 - Evaluation Report
 */

'use client';

import { useState } from 'react';
import { useEvaluationSectionUI } from '@/lib/contexts/procurement-ui-context';
import { FileText, Loader2, MoreHorizontal, MoreVertical } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon, XlsxIcon } from '@/components/ui/file-type-icons';
import { EvaluationPriceTab } from './EvaluationPriceTab';
import { EvaluationNonPriceTab } from './EvaluationNonPriceTab';

// Procurement section accent color (copper from design system)
const SECTION_ACCENT = 'var(--primitive-copper-darker)'; // Warm bronze for icons
const SECTION_TINT = 'var(--color-accent-copper-tint)';
const SECTION_TEXT = 'var(--primitive-copper-darker)'; // Bronze text on copper-tint bg

interface EvaluationSectionProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
}

export function EvaluationSection({
    projectId,
    stakeholderId,
    stakeholderName,
}: EvaluationSectionProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);

    // Use context for expanded state persistence across tab navigation
    const { isExpanded, activeTab, setExpanded: setIsExpanded, setActiveTab } = useEvaluationSectionUI(stakeholderId);

    // Use stakeholder context - type kept for URL compatibility
    const contextType = 'stakeholder';
    const contextId = stakeholderId;
    const contextName = stakeholderName || 'Unknown';

    // Handle tab click - expand if collapsed
    const handleTabClick = (tab: 'price' | 'non-price') => {
        setActiveTab(tab);
        if (!isExpanded) {
            setIsExpanded(true);
        }
    };

    // Handle export
    const handleExport = async (format: 'pdf' | 'docx' | 'xlsx') => {
        if (!contextId) return;

        setIsExporting(true);
        try {
            const response = await fetch(
                `/api/evaluation/${projectId}/${contextType}/${contextId}/export?format=${format}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Download the file
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Evaluation_${contextName}.${format}`;
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
            <div className="flex items-center gap-0.5 p-2">
                {/* Evaluation segment */}
                <div className="flex items-center w-[220px] px-3 py-1.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm rounded-l-md">
                    <FileText className="w-4 h-4" style={{ color: SECTION_ACCENT }} />
                    <span className="ml-1 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                        Evaluation
                    </span>
                </div>
                {/* Corner bracket segment - square, points out to expand, in to collapse */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center justify-center w-8 h-8 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                >
                    <CornerBracketIcon
                        direction={isExpanded ? 'right' : 'left'}
                        className="w-3.5 h-3.5"
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
                            {/* Tab Buttons */}
                            <div className="flex items-center">
                                <div
                                    className={`relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer ${activeTab === 'price'
                                        ? 'text-[var(--color-text-primary)] border-b-[3px] border-[var(--color-accent-copper)] -mb-px'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                        }`}
                                    onClick={() => handleTabClick('price')}
                                >
                                    <span>PRICE</span>
                                </div>
                                <div
                                    className={`relative group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer ${activeTab === 'non-price'
                                        ? 'text-[var(--color-text-primary)] border-b-[3px] border-[var(--color-accent-copper)] -mb-px'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                        }`}
                                    onClick={() => handleTabClick('non-price')}
                                >
                                    <span>NON-PRICE</span>
                                </div>
                            </div>
                            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
                            <div className="flex items-center gap-1 pr-2">
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
                    <div className="mx-2 p-4 bg-[var(--color-bg-secondary)] rounded-md">
                        {activeTab === 'price' ? (
                            <EvaluationPriceTab
                                projectId={projectId}
                                stakeholderId={stakeholderId}
                                stakeholderName={stakeholderName}
                            />
                        ) : (
                            <EvaluationNonPriceTab
                                projectId={projectId}
                                stakeholderId={stakeholderId}
                                stakeholderName={stakeholderName}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
