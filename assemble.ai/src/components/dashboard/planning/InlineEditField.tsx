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

    // Auto-resize textarea to fit content
    const autoResize = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Store scroll position
        const scrollTop = window.scrollY;

        // Reset to minimum to get accurate scrollHeight
        textarea.style.height = '0px';

        // Calculate heights
        const computed = window.getComputedStyle(textarea);
        const paddingTop = parseFloat(computed.paddingTop);
        const paddingBottom = parseFloat(computed.paddingBottom);
        const lineHeight = parseFloat(computed.lineHeight) || 20;
        const minHeight = (lineHeight * minRows) + paddingTop + paddingBottom;

        // Set to the larger of scrollHeight or minHeight
        const newHeight = Math.max(textarea.scrollHeight, minHeight);
        textarea.style.height = `${newHeight}px`;

        // Restore scroll position
        window.scrollTo(0, scrollTop);
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

    // Base styles - transparent by default, shows border on focus
    const baseStyles = `
        w-full px-2 py-1 rounded text-sm text-[#cccccc] leading-normal
        bg-transparent border border-transparent
        transition-colors duration-150
        focus:outline-none focus:bg-[#252526] focus:border-[#0e639c] focus:ring-1 focus:ring-[#0e639c]
        hover:border-[#3e3e42]
        disabled:opacity-50
        resize-none overflow-hidden
    `;

    const focusedBorderClass = isFocused ? 'border-[#0e639c] bg-[#252526]' : '';

    return (
        <div className="relative">
            {label && <label className="block text-xs font-medium text-[#858585] mb-0.5">{label}</label>}
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className={`${baseStyles} ${focusedBorderClass}`}
                    placeholder={placeholder || 'Click to edit'}
                    disabled={isSaving}
                    rows={1}
                />
                {/* Save indicator */}
                {isSaving && (
                    <div className="absolute right-2 top-2 pointer-events-none">
                        <div className="w-4 h-4 border-2 border-[#0e639c] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {showSuccess && !isSaving && (
                    <span className="absolute right-2 top-2 text-green-500 text-sm pointer-events-none">✓</span>
                )}
            </div>
            {error && (
                <div className="text-red-500 text-sm mt-1">{error}</div>
            )}
        </div>
    );
}
