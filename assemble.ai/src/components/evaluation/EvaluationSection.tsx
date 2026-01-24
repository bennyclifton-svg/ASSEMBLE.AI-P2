/**
 * T012: EvaluationSection Component
 * Main container for Evaluation reports within discipline/trade tabs
 * Feature 011 - Evaluation Report
 */

'use client';

import { useState } from 'react';
import { useEvaluationSectionUI } from '@/lib/contexts/procurement-ui-context';
import { FileText, Loader2 } from 'lucide-react';
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
                        Evaluation
                    </span>
                    {isExpanded ? <TriangleDown /> : <TriangleRight />}
                </button>
            </div>

            {/* Tabs - always visible */}
            <div className="bg-[var(--color-bg-secondary)]">
                {/* Tabs and Actions Row */}
                <div className="flex items-center justify-between px-4 pt-2 border-b border-[var(--color-border)]">
                    {/* Tab Buttons - underline style matching RFT/Addendum */}
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

                    {/* Action Buttons - Icon Only */}
                    <div className="flex items-center gap-2 pb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('pdf')}
                            disabled={isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export PDF"
                        >
                            {isExporting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <PdfIcon size={22} />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('docx')}
                            disabled={isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export Word"
                        >
                            <DocxIcon size={22} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport('xlsx')}
                            disabled={isExporting}
                            className="h-8 w-8 p-0 hover:bg-[var(--color-border)]"
                            title="Export Excel"
                        >
                            <XlsxIcon size={22} />
                        </Button>
                    </div>
                </div>

                {/* Content Area - only shown when expanded */}
                {isExpanded && (
                    <div className="p-4 bg-[var(--color-bg-primary)]">
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
