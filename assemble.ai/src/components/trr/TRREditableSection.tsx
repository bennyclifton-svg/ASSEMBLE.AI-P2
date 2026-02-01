/**
 * TRREditableSection Component
 * Wrapper for editable text sections (Executive Summary, Clarifications, Recommendation)
 * Feature 012 - TRR Report
 *
 * T236: Updated to support AI field generation via Unified Field Generation pattern
 */

'use client';

import { useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { AIGenerateIcon } from '@/components/ui/ai-generate-icon';
import { useToast } from '@/components/ui/use-toast';
import { useFieldGeneration } from '@/lib/hooks/use-field-generation';
import type { FieldType } from '@/lib/constants/field-types';

interface TRREditableSectionProps {
    title: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    placeholder?: string;
    /** Enable AI generation for this field */
    enableAIGeneration?: boolean;
    /** Field type for AI generation */
    fieldType?: FieldType;
    /** Project ID for AI context */
    projectId?: string;
    /** Discipline ID for AI context */
    disciplineId?: string;
    /** Additional context for AI generation */
    additionalContext?: {
        firmName?: string;
        evaluationData?: object;
    };
}

export function TRREditableSection({
    title,
    value,
    onChange,
    onBlur,
    placeholder = 'Enter text...',
    enableAIGeneration = false,
    fieldType,
    projectId,
    disciplineId,
    additionalContext,
}: TRREditableSectionProps) {
    const { toast } = useToast();

    // Only initialize hook if AI generation is enabled and required props are provided
    const canGenerateAI = enableAIGeneration && fieldType && projectId;

    const {
        generate,
        isGenerating,
    } = useFieldGeneration({
        fieldType: fieldType || 'trr.executiveSummary', // Default, but only used if canGenerateAI
        projectId: projectId || '',
        disciplineId,
        additionalContext,
    });

    const handleGenerate = useCallback(async () => {
        if (!canGenerateAI) return;

        try {
            const result = await generate(value);
            onChange(result.content);
            toast({
                title: `${title} Generated`,
                description: `Generated using ${result.sources.length} source(s) from Knowledge Source`,
            });
        } catch (error) {
            toast({
                title: 'Generation Failed',
                description: error instanceof Error ? error.message : 'Failed to generate',
                variant: 'destructive',
            });
        }
    }, [canGenerateAI, generate, value, onChange, toast, title]);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    {title}
                </h3>
                {canGenerateAI && (
                    <AIGenerateIcon
                        size={14}
                        className="text-[var(--color-accent-copper)] hover:text-[#6fd1ff]"
                        onClick={handleGenerate}
                        isLoading={isGenerating}
                        disabled={isGenerating}
                        title={`Generate ${title.toLowerCase()} with AI`}
                    />
                )}
                {isGenerating && (
                    <span className="text-xs animate-text-aurora">Generating...</span>
                )}
            </div>
            <div className="border border-[var(--color-border)] rounded overflow-hidden">
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={isGenerating}
                    className="w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] resize-y min-h-[120px] p-4 border-l-2 border-l-[var(--color-accent-copper)]/30 hover:border-l-[var(--color-accent-copper)] hover:bg-[var(--color-bg-primary)] transition-colors cursor-text disabled:opacity-70"
                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
            </div>
        </div>
    );
}
