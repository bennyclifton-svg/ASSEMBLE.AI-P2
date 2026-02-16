/**
 * T233: GenerativeField Component
 *
 * A reusable textarea with integrated AI generation capability.
 * Wraps the useFieldGeneration hook and AIGenerateIcon for consistent UX.
 *
 * Features:
 * - Textarea with AI generate button (or rich text editor)
 * - Loading spinner during generation
 * - Error state handling with toast notifications
 * - Field-type-specific placeholder text
 * - Source visibility (optional)
 * - Rich text editor mode with formatting toolbar
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Textarea } from './textarea';
import { RichTextEditor, type RichTextEditorVariant, type RichTextToolbarVariant } from './RichTextEditor';
import { AIGenerateIcon } from './ai-generate-icon';
import { useToast } from '@/components/ui/use-toast';
import { useFieldGeneration, type GenerateFieldResponse } from '@/lib/hooks/use-field-generation';
import { type FieldType, getFieldPlaceholder, getFieldDisplayName } from '@/lib/constants/field-types';
import { markdownToHTML } from '@/lib/utils/report-formatting';

export interface GenerativeFieldContext {
    projectId: string;
    disciplineId?: string;
    tradeId?: string;
}

export interface GenerativeFieldProps {
    /**
     * The type of field being generated
     */
    type: FieldType;

    /**
     * Current field value
     */
    value: string;

    /**
     * Called when the value changes (user typing or AI generation)
     */
    onChange: (value: string) => void;

    /**
     * Context for AI generation (project, discipline, trade)
     */
    context: GenerativeFieldContext;

    /**
     * Optional custom placeholder text
     */
    placeholder?: string;

    /**
     * Number of visible text rows
     */
    rows?: number;

    /**
     * Whether the field is disabled
     */
    disabled?: boolean;

    /**
     * Additional CSS classes
     */
    className?: string;

    /**
     * Additional CSS classes for the container
     */
    containerClassName?: string;

    /**
     * Label to display above the field
     */
    label?: string;

    /**
     * Whether to show the AI generate icon
     * @default true
     */
    showGenerateIcon?: boolean;

    /**
     * Whether to show sources after generation
     * @default false
     */
    showSources?: boolean;

    /**
     * Called after successful generation (optional)
     */
    onGenerate?: (result: GenerateFieldResponse) => void;

    /**
     * Called when field loses focus (for auto-save)
     */
    onBlur?: () => void;

    /**
     * Additional context for generation (firm name, etc.)
     */
    additionalContext?: {
        firmName?: string;
        evaluationData?: object;
        sectionTitle?: string;
    };

    /**
     * Editor mode: 'textarea' for plain text, 'richtext' for formatted editor
     * @default 'richtext'
     */
    editorMode?: 'textarea' | 'richtext';

    /**
     * Rich text editor size variant (only applies when editorMode is 'richtext')
     * @default 'compact'
     */
    richTextVariant?: RichTextEditorVariant;

    /**
     * Rich text toolbar variant (only applies when editorMode is 'richtext')
     * @default 'mini'
     */
    richTextToolbarVariant?: RichTextToolbarVariant;
}

/**
 * Reusable textarea with integrated AI generation
 *
 * @example
 * ```tsx
 * <GenerativeField
 *   type="brief.service"
 *   value={briefService}
 *   onChange={setBriefService}
 *   context={{ projectId, disciplineId }}
 *   label="Service"
 *   onBlur={() => saveBrief()}
 * />
 * ```
 */
export function GenerativeField({
    type,
    value,
    onChange,
    context,
    placeholder,
    rows,
    disabled = false,
    className,
    containerClassName,
    label,
    showGenerateIcon = true,
    showSources = false,
    onGenerate,
    onBlur,
    additionalContext,
    editorMode = 'richtext',
    richTextVariant = 'compact',
    richTextToolbarVariant = 'mini',
}: GenerativeFieldProps) {
    const { toast } = useToast();
    const [lastSources, setLastSources] = React.useState<GenerateFieldResponse['sources'] | null>(null);

    const { generate, isGenerating, error } = useFieldGeneration({
        fieldType: type,
        projectId: context.projectId,
        disciplineId: context.disciplineId,
        tradeId: context.tradeId,
        additionalContext,
    });

    const handleGenerate = React.useCallback(async () => {
        try {
            const result = await generate(value);
            // Convert to HTML if using rich text editor
            const content = editorMode === 'richtext'
                ? markdownToHTML(result.content)
                : result.content;
            onChange(content);
            setLastSources(result.sources);

            toast({
                title: 'Content Generated',
                description: `Generated using ${result.sources.length} source(s) from Knowledge Source`,
                variant: 'success',
            });

            onGenerate?.(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Generation failed';
            toast({
                title: 'Generation Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        }
    }, [generate, value, onChange, toast, onGenerate, editorMode]);

    const handleTextareaChange = React.useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
            // Clear sources when user manually edits
            if (lastSources) {
                setLastSources(null);
            }
        },
        [onChange, lastSources]
    );

    const handleRichTextChange = React.useCallback(
        (content: string) => {
            onChange(content);
            // Clear sources when user manually edits
            if (lastSources) {
                setLastSources(null);
            }
        },
        [onChange, lastSources]
    );

    const fieldPlaceholder = placeholder || getFieldPlaceholder(type);

    return (
        <div className={cn('space-y-1', containerClassName)}>
            {/* Label with AI icon */}
            {label && (
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-[#858585]">
                        {label}
                    </label>
                    {showGenerateIcon && (
                        <AIGenerateIcon
                            size={14}
                            className="text-[#4fc1ff] hover:text-[#6fd1ff]"
                            onClick={handleGenerate}
                            isLoading={isGenerating}
                            disabled={disabled || isGenerating}
                            title="Generate with AI"
                        />
                    )}
                    {isGenerating && (
                        <span className="text-xs text-[#4fc1ff] animate-text-aurora">Generating...</span>
                    )}
                </div>
            )}

            {/* Rich Text Editor mode */}
            {editorMode === 'richtext' && (
                <div className="relative">
                    <RichTextEditor
                        content={value}
                        onChange={handleRichTextChange}
                        onBlur={onBlur}
                        placeholder={fieldPlaceholder}
                        variant={richTextVariant}
                        toolbarVariant={richTextToolbarVariant}
                        disabled={disabled || isGenerating}
                        className={cn(
                            isGenerating && 'opacity-70',
                            className
                        )}
                    />
                    {!label && showGenerateIcon && (
                        <div className="absolute top-2 right-2 z-10">
                            <AIGenerateIcon
                                size={16}
                                className="text-[#4fc1ff] hover:text-[#6fd1ff]"
                                onClick={handleGenerate}
                                isLoading={isGenerating}
                                disabled={disabled || isGenerating}
                                title="Generate with AI"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Textarea mode: without label (icon alongside field) */}
            {editorMode === 'textarea' && !label && showGenerateIcon && (
                <div className="relative">
                    <Textarea
                        value={value}
                        onChange={handleTextareaChange}
                        onBlur={onBlur}
                        placeholder={fieldPlaceholder}
                        rows={rows}
                        disabled={disabled || isGenerating}
                        className={cn(
                            'pr-10',
                            'bg-[#1a1a1a] text-[#cccccc] border-[#3e3e42]',
                            'focus:border-[#4fc1ff] focus:ring-1 focus:ring-[#4fc1ff]/30',
                            'resize-y min-h-[100px]',
                            isGenerating && 'opacity-70',
                            className
                        )}
                    />
                    <div className="absolute top-2 right-2">
                        <AIGenerateIcon
                            size={16}
                            className="text-[#4fc1ff] hover:text-[#6fd1ff]"
                            onClick={handleGenerate}
                            isLoading={isGenerating}
                            disabled={disabled || isGenerating}
                            title="Generate with AI"
                        />
                    </div>
                </div>
            )}

            {/* Textarea mode: with label (icon is in label row) */}
            {editorMode === 'textarea' && label && (
                <Textarea
                    value={value}
                    onChange={handleTextareaChange}
                    onBlur={onBlur}
                    placeholder={fieldPlaceholder}
                    rows={rows}
                    disabled={disabled || isGenerating}
                    className={cn(
                        'bg-[#1a1a1a] text-[#cccccc] border-[#3e3e42]',
                        'focus:border-[#4fc1ff] focus:ring-1 focus:ring-[#4fc1ff]/30',
                        'resize-y min-h-[100px]',
                        isGenerating && 'opacity-70',
                        className
                    )}
                />
            )}

            {/* Textarea mode: without label and without icon */}
            {editorMode === 'textarea' && !label && !showGenerateIcon && (
                <Textarea
                    value={value}
                    onChange={handleTextareaChange}
                    onBlur={onBlur}
                    placeholder={fieldPlaceholder}
                    rows={rows}
                    disabled={disabled || isGenerating}
                    className={cn(
                        'bg-[#1a1a1a] text-[#cccccc] border-[#3e3e42]',
                        'focus:border-[#4fc1ff] focus:ring-1 focus:ring-[#4fc1ff]/30',
                        'resize-y min-h-[100px]',
                        isGenerating && 'opacity-70',
                        className
                    )}
                />
            )}

            {/* Error message */}
            {error && (
                <p className="text-xs text-red-400">{error.message}</p>
            )}

            {/* Sources (optional) */}
            {showSources && lastSources && lastSources.length > 0 && (
                <div className="text-xs text-[#858585] mt-1">
                    <span className="font-medium">Sources:</span>{' '}
                    {lastSources.map((s, i) => (
                        <span key={s.chunkId}>
                            {s.documentName} ({s.relevanceScore}%)
                            {i < lastSources.length - 1 ? ', ' : ''}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Pre-configured GenerativeField for Brief Service
 */
export function BriefServiceField(props: Omit<GenerativeFieldProps, 'type'>) {
    return <GenerativeField type="brief.service" {...props} />;
}

/**
 * Pre-configured GenerativeField for Brief Deliverables
 */
export function BriefDeliverablesField(props: Omit<GenerativeFieldProps, 'type'>) {
    return <GenerativeField type="brief.deliverables" {...props} />;
}

/**
 * Pre-configured GenerativeField for Scope of Works
 */
export function ScopeWorksField(props: Omit<GenerativeFieldProps, 'type'>) {
    return <GenerativeField type="scope.works" {...props} />;
}
