/**
 * TRREditableSection Component
 * Wrapper for editable text sections (Executive Summary, Clarifications, Recommendation)
 * Feature 012 - TRR Report
 *
 * T236: Updated to support AI field generation via Unified Field Generation pattern
 */

'use client';

import { useCallback, useState } from 'react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { useToast } from '@/components/ui/use-toast';
import { useFieldGeneration } from '@/lib/hooks/use-field-generation';
import type { FieldType } from '@/lib/constants/field-types';
import { TRRSectionHeading } from './TRRSectionHeading';

interface TRREditableSectionProps {
    title: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    placeholder?: string;
    /** Enable AI generation for this field */
    enableAIGeneration?: boolean;
    /** Field type for AI generation (used by generic useFieldGeneration) */
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
    /** Custom generate handler — overrides useFieldGeneration when provided */
    onGenerate?: (currentValue: string) => Promise<string>;
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
    onGenerate,
}: TRREditableSectionProps) {
    const { toast } = useToast();
    const [customGenerating, setCustomGenerating] = useState(false);

    // AI is available if custom handler provided OR generic field generation configured
    const hasCustomGenerate = !!onGenerate;
    const canGenerateAI = hasCustomGenerate || (enableAIGeneration && fieldType && projectId);

    const {
        generate,
        isGenerating: fieldIsGenerating,
    } = useFieldGeneration({
        fieldType: fieldType || 'trr.executiveSummary',
        projectId: projectId || '',
        disciplineId,
        additionalContext,
    });

    const isGenerating = customGenerating || fieldIsGenerating;

    const handleGenerate = useCallback(async () => {
        if (!canGenerateAI) return;

        try {
            if (hasCustomGenerate) {
                // Use dedicated TRR endpoint
                setCustomGenerating(true);
                const content = await onGenerate(value);
                onChange(content);
                toast({
                    title: `${title} Generated`,
                    description: 'Generated using evaluation and project data',
                    variant: 'success',
                });
            } else {
                // Fall back to generic field generation
                const result = await generate(value);
                onChange(result.content);
                toast({
                    title: `${title} Generated`,
                    description: `Generated using ${result.sources.length} source(s) from Knowledge Source`,
                    variant: 'success',
                });
            }
        } catch (error) {
            toast({
                title: 'Generation Failed',
                description: error instanceof Error ? error.message : 'Failed to generate',
                variant: 'destructive',
            });
        } finally {
            setCustomGenerating(false);
        }
    }, [canGenerateAI, hasCustomGenerate, onGenerate, generate, value, onChange, toast, title]);

    const generateButton = canGenerateAI ? (
        <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs text-[var(--color-accent-copper)] hover:text-[var(--sw-cyan)] transition-colors disabled:pointer-events-none"
            title={`Generate ${title.toLowerCase()} with AI`}
        >
            <DiamondIcon variant="empty" className={`w-3.5 h-3.5 ${isGenerating ? 'animate-diamond-spin' : ''}`} />
            <span className={isGenerating ? 'animate-text-aurora' : ''}>
                {isGenerating ? 'Generating...' : 'Generate'}
            </span>
        </button>
    ) : undefined;

    return (
        <div className="space-y-2">
            <div className="px-4 flex items-center justify-between gap-3">
                <TRRSectionHeading>
                    {title}
                </TRRSectionHeading>
                {generateButton}
            </div>
            <div className="overflow-hidden rounded-lg">
                <RichTextEditor
                    content={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    variant="mini"
                    toolbarVariant="none"
                    transparentBg
                    disabled={isGenerating}
                    className="border-0 rounded-none"
                    editorClassName="bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)] transition-colors"
                />
            </div>
        </div>
    );
}
