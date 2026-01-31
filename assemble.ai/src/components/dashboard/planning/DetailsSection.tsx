'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

// Props for InlineEditField component
interface InlineEditFieldProps {
    value: string;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
    className?: string;
}

// Inline editable text field for header
function InlineEditField({ value, onSave, placeholder, className }: InlineEditFieldProps) {
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [savedValue, setSavedValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync with prop value when not editing
    useEffect(() => {
        if (!isFocused && !isSaving) {
            setEditValue(value || '');
            setSavedValue(value || '');
        }
    }, [value, isFocused, isSaving]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleSave = async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (editValue === savedValue) return;

        setIsSaving(true);
        const previousValue = savedValue;
        setSavedValue(editValue);

        try {
            await onSave(editValue);
        } catch (error) {
            console.error('Save failed:', error);
            setSavedValue(previousValue);
            setEditValue(previousValue);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => handleSave(), 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            setEditValue(savedValue);
            inputRef.current?.blur();
        }
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSaving}
                className={`
                    w-full bg-transparent outline-none border-none
                    focus:outline-none focus:ring-0
                    placeholder:text-[var(--color-text-muted)] disabled:opacity-50
                    transition-all
                    ${className}
                `}
            />
            {isSaving && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-3 h-3 border-2 border-[var(--color-accent-copper)] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}

// Props for MetricCard component
interface MetricCardProps {
    label: string;
    value: string;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
    unit?: string;
    large?: boolean;
}

// Compact metric card for grid layout
function MetricCard({ label, value, onSave, placeholder, unit, large = false }: MetricCardProps) {
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [savedValue, setSavedValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync with prop value when not editing
    useEffect(() => {
        if (!isFocused && !isSaving) {
            setEditValue(value || '');
            setSavedValue(value || '');
        }
    }, [value, isFocused, isSaving]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleSave = async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (editValue === savedValue) return;

        setIsSaving(true);
        const previousValue = savedValue;
        setSavedValue(editValue);

        try {
            await onSave(editValue);
        } catch (error) {
            console.error('Save failed:', error);
            setSavedValue(previousValue);
            setEditValue(previousValue);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => handleSave(), 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            setEditValue(savedValue);
            inputRef.current?.blur();
        }
    };

    return (
        <div className="p-3 relative">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">
                {label}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSaving}
                className={`
                    w-full bg-transparent outline-none border-none
                    focus:outline-none focus:ring-0 text-[var(--color-text-primary)]
                    placeholder:text-[var(--color-text-muted)] disabled:opacity-50
                    ${large ? 'text-xl font-bold' : 'text-base font-semibold'}
                `}
            />
            {unit && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{unit}</div>}
            {isSaving && (
                <div className="absolute right-2 top-2 pointer-events-none">
                    <div className="w-2.5 h-2.5 border-2 border-[var(--color-accent-copper)] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}

// Props for DetailRow component
interface DetailRowProps {
    label: string;
    value: string;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
    isLast?: boolean;
}

// Two-column table row with label on left, editable field on right
function DetailRow({ label, value, onSave, placeholder, isLast = false }: DetailRowProps) {
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [savedValue, setSavedValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-resize textarea to fit content (handles word wrap)
    const autoResize = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const scrollTop = window.scrollY;
        // Reset height to auto to get accurate scrollHeight
        textarea.style.height = 'auto';
        const newHeight = Math.max(textarea.scrollHeight, 24);
        textarea.style.height = `${newHeight}px`;
        window.scrollTo(0, scrollTop);
    };

    // Sync with prop value when not editing
    useEffect(() => {
        if (!isFocused && !isSaving && !showSuccess) {
            setEditValue(value || '');
            setSavedValue(value || '');
        }
    }, [value]);

    // Auto-resize on value change
    useLayoutEffect(() => {
        autoResize();
    }, [editValue]);

    // Resize when container width changes (panel resize)
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const resizeObserver = new ResizeObserver(() => {
            autoResize();
        });

        resizeObserver.observe(textarea);
        return () => resizeObserver.disconnect();
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleSave = async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (editValue === savedValue) return;

        setIsSaving(true);
        const previousValue = savedValue;
        setSavedValue(editValue);

        try {
            await onSave(editValue);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error('Save failed:', error);
            setSavedValue(previousValue);
            setEditValue(previousValue);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => handleSave(), 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textareaRef.current?.blur();
        } else if (e.key === 'Escape') {
            setEditValue(savedValue);
            textareaRef.current?.blur();
        }
    };

    return (
        <div
            className={`
                flex transition-all duration-150 relative
                ${!isLast ? 'border-b border-[var(--color-border)]' : ''}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Label column - dynamic width, allows text wrap */}
            <div className="w-[25%] min-w-[60px] max-w-[100px] shrink-0 pl-1.5 pr-1.5 py-1 flex items-center relative">
                <span className="text-xs font-medium text-[var(--color-text-muted)] break-words leading-tight">{label}</span>

                {/* Copper vertical highlight bar at column separator - hover only */}
                <div
                    className={`
                        absolute right-0 top-0 bottom-0 w-[2px]
                        transition-opacity duration-150
                        ${isHovered && !isFocused ? 'opacity-100 bg-[var(--color-accent-copper)]' : 'opacity-0 bg-transparent'}
                    `}
                />
            </div>

            {/* Value column */}
            <div className="flex-1 relative pl-1 pr-3">
                <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className={`
                        w-full px-2 py-1 text-sm leading-tight
                        bg-transparent
                        transition-all duration-150
                        outline-none border-0 ring-0 shadow-none
                        focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none
                        focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:shadow-none
                        disabled:opacity-50
                        resize-none overflow-hidden
                        placeholder:text-[var(--color-text-muted)]
                        text-[var(--color-text-secondary)]
                        break-words whitespace-pre-wrap
                    `}
                    placeholder={placeholder}
                    disabled={isSaving}
                    rows={1}
                />

                {/* Save indicator */}
                {isSaving && (
                    <div className="absolute right-2 top-1.5 pointer-events-none">
                        <div className="w-3 h-3 border-2 border-[var(--color-accent-copper)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {showSuccess && !isSaving && (
                    <span className="absolute right-2 top-1.5 text-[var(--color-accent-copper)] text-xs pointer-events-none">✓</span>
                )}
            </div>
        </div>
    );
}

interface DetailsSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
    isActive?: boolean;
    onToggle?: () => void;
}

export function DetailsSection({ projectId, data, onUpdate, onProjectNameChange, isActive = false, onToggle }: DetailsSectionProps) {
    return (
        <div className={`nav-panel-section py-3 pl-2 pr-3 ${isActive ? 'nav-panel-active' : ''}`}>
            {/* Project Name Header with expand arrows */}
            <button
                onClick={onToggle}
                className="nav-panel-header w-full mb-2"
            >
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                    Project Name
                </span>
                {isActive ? (
                    <Minimize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-accent-copper)]" />
                ) : (
                    <Maximize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-text-muted)] transition-colors" />
                )}
            </button>

            {/* Project Name Value - read-only display */}
            <div className="text-lg font-bold text-[var(--color-text-primary)] pl-1.5 pr-2 truncate">
                {data?.projectName || 'Untitled Project'}
            </div>
        </div>
    );
}
