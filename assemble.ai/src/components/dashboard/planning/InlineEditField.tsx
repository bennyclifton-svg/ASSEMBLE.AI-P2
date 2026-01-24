'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';

interface InlineEditFieldProps {
    value: string;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
    label?: string;
    multiline?: boolean;
    required?: boolean;
    minRows?: number;
}

export function InlineEditField({
    value,
    onSave,
    placeholder,
    label,
    multiline = false,
    required = false,
    minRows = 1
}: InlineEditFieldProps) {
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedValue, setSavedValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea to fit content - stable approach without height reset
    const autoResize = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Calculate minimum height based on minRows
        const computed = window.getComputedStyle(textarea);
        const paddingTop = parseFloat(computed.paddingTop);
        const paddingBottom = parseFloat(computed.paddingBottom);
        const lineHeight = parseFloat(computed.lineHeight) || 20;
        const minHeight = (lineHeight * minRows) + paddingTop + paddingBottom;

        // Use scrollHeight directly - only grow, never shrink below min
        const currentHeight = parseFloat(textarea.style.height) || minHeight;
        const contentHeight = textarea.scrollHeight;

        // Only update if content needs more space or we need to shrink to minHeight
        if (contentHeight > currentHeight || currentHeight > Math.max(contentHeight, minHeight)) {
            textarea.style.height = `${Math.max(contentHeight, minHeight)}px`;
        }
    };

    // Only sync with prop value when not focused and not saving
    useEffect(() => {
        if (!isFocused && !isSaving && !showSuccess) {
            setEditValue(value || '');
            setSavedValue(value || '');
        }
    }, [value]);

    // Auto-resize on value change - use layoutEffect to prevent flicker
    useLayoutEffect(() => {
        autoResize();
    }, [editValue, minRows]);

    // Resize on window resize
    useEffect(() => {
        const handleResize = () => autoResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [minRows]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleSave = async () => {
        // Clear any pending save timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (editValue === savedValue) {
            return;
        }

        if (required && !editValue.trim()) {
            setError('This field is required');
            return;
        }

        setError(null);
        setIsSaving(true);

        // Optimistically update the saved value
        const previousValue = savedValue;
        setSavedValue(editValue);

        try {
            await onSave(editValue);
            // Successfully saved
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error('Save failed:', error);
            // Revert to previous value on error
            setSavedValue(previousValue);
            setEditValue(previousValue);
            setError('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Debounce save slightly to prevent rapid saves
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            handleSave();
        }, 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // For single-line fields, Enter saves and blurs
        if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            textareaRef.current?.blur();
        } else if (e.key === 'Escape') {
            setEditValue(savedValue);
            setError(null);
            textareaRef.current?.blur();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditValue(e.target.value);
    };

    // Static styling - no visual changes on focus/hover to prevent jumping
    const borderLeftColor = 'var(--color-border)';
    const bgColor = 'var(--color-bg-secondary)';

    return (
        <div className="space-y-2">
            {label && (
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    {label}
                </h3>
            )}
            <div className="overflow-hidden">
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={editValue}
                        onChange={handleChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full border-0 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[var(--color-text-primary)] resize-y min-h-[140px] p-4 cursor-text disabled:opacity-70"
                        style={{
                            borderLeft: `2px solid ${borderLeftColor}`,
                            backgroundColor: bgColor,
                            fieldSizing: 'content',
                        } as React.CSSProperties}
                        placeholder={placeholder || 'Enter text...'}
                        disabled={isSaving}
                        rows={1}
                    />
                    {/* Save indicator */}
                    {isSaving && (
                        <div className="absolute right-3 top-3 pointer-events-none">
                            <div className="w-4 h-4 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    {showSuccess && !isSaving && (
                        <span className="absolute right-3 top-3 text-[var(--color-success)] text-sm pointer-events-none">✓</span>
                    )}
                </div>
            </div>
            {error && (
                <div className="text-[var(--color-error)] text-sm">{error}</div>
            )}
        </div>
    );
}
