'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Upload } from 'lucide-react';

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
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    const updateField = async (field: string, value: string) => {
        // Prepare payload with defaults for required fields
        // Convert null to empty string for string fields, undefined for optional fields
        const payload = {
            projectName: data?.projectName || '',
            address: data?.address || '',
            legalAddress: data?.legalAddress || '',
            zoning: data?.zoning || '',
            jurisdiction: data?.jurisdiction || '',
            lotArea: data?.lotArea || '',
            [field]: value, // Override with new value
        };

        console.log('Sending payload:', payload);

        const res = await fetch(`/api/planning/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Save failed:', res.status, errorText);
            throw new Error(`Save failed: ${errorText}`);
        }

        console.log('Save successful');
        onUpdate();

        // Notify parent if project name was changed
        if (field === 'projectName' && onProjectNameChange) {
            onProjectNameChange();
        }
    };

    const updateMultipleFields = async (extractedData: any) => {
        // Build payload with existing data + extracted data
        const payload = {
            projectName: extractedData.projectName || data?.projectName || '',
            address: extractedData.address || data?.address || '',
            legalAddress: extractedData.legalAddress || data?.legalAddress || '',
            zoning: extractedData.zoning || data?.zoning || '',
            jurisdiction: extractedData.jurisdiction || data?.jurisdiction || '',
            lotArea: extractedData.lotArea?.toString() || data?.lotArea?.toString() || '',
        };

        const res = await fetch(`/api/planning/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error('Failed to update fields');
        }

        onUpdate();

        // Notify parent if project name was changed
        if (extractedData.projectName && onProjectNameChange) {
            onProjectNameChange();
        }
    };

    const handleExtraction = async (input: File | string) => {
        setIsExtracting(true);
        try {
            let response: Response;

            if (input instanceof File) {
                const formData = new FormData();
                formData.append('file', input);

                response = await fetch('/api/planning/extract', {
                    method: 'POST',
                    body: formData,
                });
            } else {
                response = await fetch('/api/planning/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: input }),
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to extract data');
            }

            const result = await response.json();
            const { data: extractedData, confidence } = result;

            // Update fields with extracted data
            await updateMultipleFields(extractedData);

            // Show appropriate toast based on confidence
            if (confidence < 70) {
                toast({
                    title: 'Low Confidence Extraction',
                    description: `Extracted with ${confidence}% confidence. Please review the data.`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Data Extracted',
                    description: `Successfully extracted project details (${confidence}% confidence)`,
                });
            }
        } catch (error) {
            toast({
                title: 'Extraction Failed',
                description: error instanceof Error ? error.message : 'Failed to extract data',
                variant: 'destructive',
            });
        } finally {
            setIsExtracting(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear if leaving the container entirely
        const relatedTarget = e.relatedTarget as Element | null;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        // Check for text content first (Outlook emails drag as text)
        const textContent = e.dataTransfer.getData('text/plain');
        if (textContent && textContent.length > 20) {
            await handleExtraction(textContent);
            return;
        }

        // Check for files
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) {
            toast({
                title: 'No Content',
                description: 'No file or text content found',
                variant: 'destructive',
            });
            return;
        }

        const file = files[0];
        const validTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            toast({
                title: 'Invalid File Type',
                description: 'Please upload a PDF, Word document, image (JPG/PNG), or text file',
                variant: 'destructive',
            });
            return;
        }

        await handleExtraction(file);
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        // Don't intercept if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        e.preventDefault();

        // Try to get HTML content first (Outlook emails paste as HTML)
        let content = e.clipboardData.getData('text/html');

        // If no HTML, try plain text
        if (!content) {
            content = e.clipboardData.getData('text/plain');
        } else {
            // Strip HTML tags but keep text content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            content = tempDiv.textContent || tempDiv.innerText || '';
        }

        if (!content || content.length < 20) {
            toast({
                title: 'No Content',
                description: 'Paste some text content to extract project details',
                variant: 'destructive',
            });
            return;
        }

        await handleExtraction(content);
    };

    return (
        <div
            className="nav-panel-section py-3 pl-2 pr-3"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
        >
            {/* Extraction Progress Overlay */}
            {isExtracting && (
                <div className="absolute inset-0 z-50 bg-[var(--color-bg-primary)]/80 rounded-xl flex items-center justify-center">
                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-6 flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-copper)]"></div>
                        <p className="text-[var(--color-text-primary)] font-semibold">Extracting project details...</p>
                        <p className="text-xs text-[var(--color-text-muted)]">This may take a few moments</p>
                    </div>
                </div>
            )}

            {/* Drag & Drop Overlay */}
            {isDragging && !isExtracting && (
                <div className="absolute inset-0 z-50 bg-[var(--color-accent-copper)]/20 border-2 border-dashed border-[var(--color-accent-copper)] rounded-xl flex items-center justify-center">
                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-accent-copper)] rounded-lg p-6 flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-[var(--color-accent-copper)]" />
                        <p className="text-[var(--color-text-primary)] font-semibold">Drop to extract project details</p>
                        <p className="text-xs text-[var(--color-text-muted)]">PDF, Word, Image, or Text</p>
                    </div>
                </div>
            )}

            {/* Project Name - Prominent Header Field */}
            <div className="mb-3 pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-0.5 pl-1.5 pr-2">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Project Name
                    </span>
                    <Upload className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
                <InlineEditField
                    value={data?.projectName || ''}
                    onSave={(v) => updateField('projectName', v)}
                    placeholder="Untitled Project"
                    className="text-lg font-bold text-[var(--color-text-primary)] pl-1.5 pr-2"
                />
            </div>

            {/* Project Attributes - Single Column Layout */}
            <div className="space-y-0">
                <DetailRow
                    label="Address"
                    value={data?.address || ''}
                    onSave={(v) => updateField('address', v)}
                    placeholder="No address provided"
                />
                <DetailRow
                    label="Lot Area"
                    value={data?.lotArea?.toString() || ''}
                    onSave={(v) => updateField('lotArea', v)}
                    placeholder="0 m²"
                />
                <DetailRow
                    label="Zoning"
                    value={data?.zoning || ''}
                    onSave={(v) => updateField('zoning', v)}
                    placeholder="Enter zoning"
                />
                <DetailRow
                    label="Legal Address"
                    value={data?.legalAddress || ''}
                    onSave={(v) => updateField('legalAddress', v)}
                    placeholder="Enter legal address"
                />
                <DetailRow
                    label="Jurisdiction"
                    value={data?.jurisdiction || ''}
                    onSave={(v) => updateField('jurisdiction', v)}
                    placeholder="Enter jurisdiction"
                    isLast
                />
            </div>
        </div>
    );
}
