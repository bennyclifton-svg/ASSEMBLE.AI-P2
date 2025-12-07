'use client';

import { useState, useEffect, useRef } from 'react';

interface InlineEditFieldProps {
    value: string;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
    label?: string;
    multiline?: boolean;
    required?: boolean;
    rows?: number;
}

export function InlineEditField({ value, onSave, placeholder, label, multiline = false, required = false, rows = 3 }: InlineEditFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedValue, setSavedValue] = useState(value || '');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Only sync with prop value on initial mount or when prop changes while not saving
    useEffect(() => {
        if (!isEditing && !isSaving && !showSuccess) {
            setEditValue(value || '');
            setSavedValue(value || '');
        }
    }, [value]); // Removed isEditing from dependencies to prevent reversion

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
            setIsEditing(false);
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
            // Successfully saved - keep the new value
            setIsEditing(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error('Save failed:', error);
            // Revert to previous value on error
            setSavedValue(previousValue);
            setEditValue(previousValue);
            setError('Failed to save. Please try again.');
            // Keep in edit mode on error so user can retry
        } finally {
            setIsSaving(false);
        }
    };

    const debouncedHandleSave = () => {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce for 300ms to prevent rapid saves
        saveTimeoutRef.current = setTimeout(() => {
            handleSave();
        }, 300);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setEditValue(savedValue);
            setIsEditing(false);
            setError(null);
        }
    };

    if (isEditing) {
        return (
            <div>
                {label && <label className="block text-sm font-medium text-[#858585] mb-1">{label}</label>}
                <div className="relative">
                    {multiline ? (
                        <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={debouncedHandleSave}
                            onKeyDown={handleKeyDown}
                            className="w-full px-3 py-2 bg-[#252526] border border-[#0e639c] rounded text-[#cccccc] focus:outline-none focus:ring-1 focus:ring-[#0e639c]"
                            placeholder={placeholder}
                            autoFocus
                            rows={rows}
                            disabled={isSaving}
                        />
                    ) : (
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={debouncedHandleSave}
                            onKeyDown={handleKeyDown}
                            className="w-full px-3 py-2 bg-[#252526] border border-[#0e639c] rounded text-[#cccccc] focus:outline-none focus:ring-1 focus:ring-[#0e639c]"
                            placeholder={placeholder}
                            autoFocus
                            disabled={isSaving}
                        />
                    )}
                    {isSaving && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-[#0e639c] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                {error && (
                    <div className="text-red-500 text-sm mt-1">{error}</div>
                )}
            </div>
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className="cursor-pointer group">
            {label && <label className="block text-sm font-medium text-[#858585] mb-1">{label}</label>}
            <div className="px-3 py-2 bg-[#252526] border border-transparent group-hover:border-[#3e3e42] rounded text-[#cccccc] min-h-[38px] flex items-center relative">
                {savedValue || <span className="text-[#858585]">{placeholder || 'Click to edit'}</span>}
                {showSuccess && (
                    <span className="absolute right-2 text-green-500">✓</span>
                )}
            </div>
            {error && (
                <div className="text-red-500 text-sm mt-1">{error}</div>
            )}
        </div>
    );
}
