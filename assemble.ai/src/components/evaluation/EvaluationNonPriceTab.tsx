/**
 * Feature 013: EvaluationNonPriceTab Component (T016)
 * Displays the NON-PRICE tab with qualitative evaluation table
 * Replaces the placeholder from Feature 011
 */

'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useNonPriceEvaluation } from '@/lib/hooks/use-non-price-evaluation';
import { NonPriceSheet } from './NonPriceSheet';
import { Loader2, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { QualityRating } from '@/types/evaluation';

interface EvaluationNonPriceTabProps {
    projectId: string;
    stakeholderId?: string;
    stakeholderName?: string;
}

export function EvaluationNonPriceTab({
    projectId,
    stakeholderId,
    stakeholderName,
}: EvaluationNonPriceTabProps) {
    const {
        data,
        isLoading,
        error,
        isSaving,
        isParsing,
        parsingFirmId,
        updateCell,
        parseTender,
        shortlistedFirms,
        firmType,
    } = useNonPriceEvaluation({
        projectId,
        stakeholderId,
    });

    const { toast } = useToast();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Show save status indicator
    useEffect(() => {
        if (isSaving) {
            setSaveStatus('saving');
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        } else if (saveStatus === 'saving') {
            setSaveStatus('saved');
            saveTimeoutRef.current = setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        }
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [isSaving, saveStatus]);

    // Handle cell update from modal
    const handleCellUpdate = useCallback(async (
        criteriaId: string,
        firmId: string,
        _firmType: 'consultant' | 'contractor',
        content: string,
        rating: QualityRating
    ): Promise<boolean> => {
        return await updateCell(criteriaId, firmId, firmType, content, rating);
    }, [updateCell, firmType]);

    // Handle file drop for tender parsing (T037)
    const handleFileDrop = useCallback(async (
        file: File,
        firmId: string,
        _firmType: 'consultant' | 'contractor'
    ) => {
        const firm = shortlistedFirms.find(f => f.id === firmId);
        const firmName = firm?.companyName || 'Unknown';

        toast({
            title: 'Parsing tender...',
            description: `Extracting non-price criteria from ${file.name} for ${firmName}`,
        });

        const result = await parseTender(file, firmId, firmType);

        if (result.success) {
            toast({
                title: 'Tender parsed successfully',
                description: `Extracted ${result.extractedCount} criteria (${Math.round(result.overallConfidence * 100)}% average confidence)`,
            });
        } else {
            toast({
                title: 'Failed to parse tender',
                description: result.error || 'An error occurred while parsing the tender',
                variant: 'destructive',
            });
        }
    }, [parseTender, firmType, shortlistedFirms, toast]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-black/40 animate-spin" />
                <span className="ml-2 text-sm text-black/60">Loading non-price evaluation data...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
                <p className="text-sm text-red-500">{error}</p>
            </div>
        );
    }

    // Empty state - no shortlisted firms (US1 Acceptance Scenario 2)
    if (shortlistedFirms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-8 h-8 text-black/40 mb-3" />
                <h3 className="text-sm font-medium text-black mb-1">
                    No Short-listed Firms
                </h3>
                <p className="text-xs text-black/60 max-w-sm">
                    To evaluate non-price criteria, first short-list firms by toggling the
                    "Shortlisted" option on the firm cards above.
                </p>
            </div>
        );
    }

    // Get criteria in order
    const sortedCriteria = data?.criteria || [];

    return (
        <div className="space-y-4">
            {/* Save Status & Upload Instruction */}
            <div className="flex items-center justify-between">
                {/* Upload instruction - left side */}
                <div className="flex items-center gap-1.5 text-xs text-black/60">
                    <Upload className="w-3.5 h-3.5 text-[var(--color-accent-copper)]" />
                    <span>Drag submission PDF onto firm column</span>
                </div>
                {/* Save status - right side */}
                <div className="flex items-center gap-2 text-xs text-black/60">
                    {saveStatus === 'saving' && (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Saving...</span>
                        </>
                    )}
                    {saveStatus === 'saved' && (
                        <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="text-green-500">Saved</span>
                        </>
                    )}
                </div>
            </div>

            {/* Non-Price Table */}
            <NonPriceSheet
                criteria={sortedCriteria}
                cells={data?.cells || []}
                firms={shortlistedFirms}
                onCellUpdate={handleCellUpdate}
                onFileDrop={handleFileDrop}
                isParsing={isParsing}
                parsingFirmId={parsingFirmId}
                firmType={firmType}
            />

            {/* Instructions */}
            <div className="px-3 py-2 text-xs text-black/60">
                <p>
                    <strong className="text-black">Tip:</strong> Click content area to edit inline. Use rating buttons (G/A/P) to set quality.
                    Drop a tender PDF onto a firm column to auto-extract criteria using AI.
                </p>
            </div>
        </div>
    );
}
