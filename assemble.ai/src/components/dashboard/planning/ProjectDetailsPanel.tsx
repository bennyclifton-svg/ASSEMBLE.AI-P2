'use client';

import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Upload } from 'lucide-react';
import { AddressAutocomplete } from './AddressAutocomplete';
import { LEPDataCard } from './LEPDataCard';
import type { PlaceSelection, SiteInfo } from '@/types/lep';

const muted = 'var(--sw-muted)';

// Props for DetailRow component
interface DetailRowProps {
    label: string;
    value: string;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
    isLast?: boolean;
}

// Two-column row with label and editable field
function DetailRow({ label, value, onSave, placeholder, isLast = false }: DetailRowProps) {
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [savedValue, setSavedValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const autoResize = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const scrollTop = window.scrollY;
        textarea.style.height = 'auto';
        const newHeight = Math.max(textarea.scrollHeight, 24);
        textarea.style.height = `${newHeight}px`;
        window.scrollTo(0, scrollTop);
    };

    useEffect(() => {
        if (!isFocused && !isSaving && !showSuccess) {
            setEditValue(value || '');
            setSavedValue(value || '');
        }
    }, [value, isFocused, isSaving, showSuccess]);

    useLayoutEffect(() => {
        autoResize();
    }, [editValue]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const resizeObserver = new ResizeObserver(() => {
            autoResize();
        });

        resizeObserver.observe(textarea);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
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
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
            successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 2000);
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
            className="grid items-center relative transition-all duration-150"
            style={{
                gridTemplateColumns: '88px 1fr',
                gap: 12,
                padding: '1px 4px',
                borderBottom: !isLast ? '1px solid var(--sw-rule-2)' : undefined,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: muted,
                    textTransform: 'lowercase',
                    letterSpacing: '0.02em',
                }}
            >
                {label}
            </span>

            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent transition-all duration-150 outline-none border-0 ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none disabled:opacity-50 resize-none overflow-hidden"
                    style={{
                        fontFamily: 'var(--sw-font-sans)',
                        fontSize: 13,
                        color: 'var(--sw-ink)',
                        padding: '1px 0',
                        textTransform: 'none',
                        borderBottom: isFocused
                            ? '1px solid var(--sw-ink)'
                            : isHovered
                                ? '1px solid var(--sw-rule-2)'
                                : '1px solid transparent',
                    }}
                    placeholder={placeholder}
                    disabled={isSaving}
                    rows={1}
                />

                {isSaving && (
                    <div className="absolute right-1 top-0.5 pointer-events-none">
                        <div
                            className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: 'var(--sw-peach)', borderTopColor: 'transparent' }}
                        />
                    </div>
                )}
                {showSuccess && !isSaving && (
                    <span
                        className="absolute right-1 top-0 pointer-events-none"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 12,
                            color: 'var(--sw-peach)',
                        }}
                    >
                        ✓
                    </span>
                )}
            </div>
        </div>
    );
}

interface ProjectDetailsPanelProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
}

export function ProjectDetailsPanel({ projectId, data, onUpdate, onProjectNameChange }: ProjectDetailsPanelProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const dataRef = useRef(data);
    dataRef.current = data;

    const buildPayload = useCallback(() => {
        const d = dataRef.current;
        return {
            projectName: d?.projectName || '',
            address: d?.address || '',
            legalAddress: d?.legalAddress || '',
            zoning: d?.zoning || '',
            jurisdiction: d?.jurisdiction || '',
            lotArea: d?.lotArea || '',
            latitude: d?.latitude || '',
            longitude: d?.longitude || '',
            placeId: d?.placeId || '',
            formattedAddress: d?.formattedAddress || '',
        };
    }, []);

    const updateField = async (field: string, value: string) => {
        const payload = {
            ...buildPayload(),
            [field]: value,
        };

        const res = await fetch(`/api/planning/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Save failed: ${errorText}`);
        }

        onUpdate();

        if (field === 'projectName' && onProjectNameChange) {
            onProjectNameChange();
        }
    };

    const handleAddressSelect = async (place: PlaceSelection) => {
        const payload = {
            ...buildPayload(),
            address: place.formattedAddress,
            formattedAddress: place.formattedAddress,
            latitude: String(place.coordinates.lat),
            longitude: String(place.coordinates.lng),
            placeId: place.placeId,
        };

        const res = await fetch(`/api/planning/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error('Failed to save address');
        }

        onUpdate();
    };

    const handleSiteInfo = useCallback(async (info: SiteInfo) => {
        // Use ref to read latest data (avoids stale closure from LEPDataCard callback chain)
        const current = dataRef.current;
        const updates: Record<string, string> = {};
        // Always update from LEP site info (address may have changed)
        if (info.jurisdiction) updates.jurisdiction = info.jurisdiction;
        if (info.legalAddress) updates.legalAddress = info.legalAddress;
        if (info.lotAreaSqm) updates.lotArea = String(info.lotAreaSqm);

        if (Object.keys(updates).length === 0) return;

        const payload = { ...buildPayload(), ...updates };
        const res = await fetch(`/api/planning/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (res.ok) onUpdate();
    }, [buildPayload, projectId, onUpdate]);

    const updateMultipleFields = async (extractedData: any) => {
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

            await updateMultipleFields(extractedData);

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
                    variant: 'success',
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
        const relatedTarget = e.relatedTarget as Element | null;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const textContent = e.dataTransfer.getData('text/plain');
        if (textContent && textContent.length > 20) {
            await handleExtraction(textContent);
            return;
        }

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
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        e.preventDefault();

        let content = e.clipboardData.getData('text/html');

        if (!content) {
            content = e.clipboardData.getData('text/plain');
        } else {
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
            className="relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
        >
            {/* Extraction Progress Overlay */}
            {isExtracting && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'color-mix(in srgb, var(--sw-paper) 80%, transparent)' }}
                >
                    <div
                        className="p-6 flex flex-col items-center gap-3"
                        style={{
                            background: 'white',
                            border: '1px solid var(--sw-rule)',
                        }}
                    >
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-2"
                            style={{ borderColor: 'var(--sw-peach)' }}
                        />
                        <p
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Extracting project details…
                        </p>
                        <p
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                            }}
                        >
                            this may take a few moments
                        </p>
                    </div>
                </div>
            )}

            {/* Drag & Drop Overlay */}
            {isDragging && !isExtracting && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center"
                    style={{
                        background: 'color-mix(in srgb, var(--sw-peach) 20%, transparent)',
                        border: '2px dashed var(--sw-peach)',
                    }}
                >
                    <div
                        className="p-6 flex flex-col items-center gap-3"
                        style={{
                            background: 'white',
                            border: '1px solid var(--sw-peach)',
                        }}
                    >
                        <Upload className="w-10 h-10" style={{ color: 'var(--sw-peach)' }} />
                        <p
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Drop to extract project details
                        </p>
                        <p
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                            }}
                        >
                            pdf · word · image · text
                        </p>
                    </div>
                </div>
            )}

            {/* Flat field list — rendered inside the parent's "Lot" CardShell.
                Name + Address span the full shell width; everything below is
                split into two columns so the LEP rows on the right balance
                the lot/jurisdiction rows on the left. */}
            <div className="flex flex-col">
                <DetailRow
                    label="Name"
                    value={data?.projectName || ''}
                    onSave={(v) => updateField('projectName', v)}
                    placeholder="Untitled project"
                />
                <div
                    className="grid items-center"
                    style={{
                        gridTemplateColumns: '88px 1fr',
                        gap: 12,
                        padding: '1px 4px',
                        borderBottom: '1px solid var(--sw-rule-2)',
                    }}
                >
                    <span
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: muted,
                            textTransform: 'lowercase',
                            letterSpacing: '0.02em',
                        }}
                    >
                        Address
                    </span>
                    <AddressAutocomplete
                        value={data?.address || ''}
                        onSelect={handleAddressSelect}
                        onManualEdit={(v) => updateField('address', v)}
                        placeholder="Search address…"
                    />
                </div>
                <div
                    className="grid"
                    style={{
                        gridTemplateColumns: '1fr 1fr',
                        // Column gap only — rows in each column manage their
                        // own bottom borders, so no vertical gap here.
                        columnGap: 24,
                    }}
                >
                    <div className="flex flex-col">
                        <DetailRow
                            label="Lot area"
                            value={data?.lotArea?.toString() || ''}
                            onSave={(v) => updateField('lotArea', v)}
                            placeholder="0 m²"
                        />
                        <DetailRow
                            label="Legal address"
                            value={data?.legalAddress || ''}
                            onSave={(v) => updateField('legalAddress', v)}
                            placeholder="enter legal address"
                        />
                        <DetailRow
                            label="Jurisdiction"
                            value={data?.jurisdiction || ''}
                            onSave={(v) => updateField('jurisdiction', v)}
                            placeholder="enter jurisdiction"
                            isLast
                        />
                    </div>
                    <div className="flex flex-col">
                        <LEPDataCard
                            projectId={projectId}
                            hasCoordinates={!!(data?.latitude && data?.longitude)}
                            coordinates={data?.latitude && data?.longitude ? { lat: data.latitude, lng: data.longitude } : undefined}
                            onSiteInfo={handleSiteInfo}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
