'use client';

import { useState } from 'react';
import { InlineEditField } from './InlineEditField';
import { useToast } from '@/lib/hooks/use-toast';
import { Upload } from 'lucide-react';

interface ObjectivesSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
}

export function ObjectivesSection({ projectId, data, onUpdate }: ObjectivesSectionProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    const updateField = async (field: string, value: string) => {
        const payload = {
            functional: data?.functional || '',
            quality: data?.quality || '',
            budget: data?.budget || '',
            program: data?.program || '',
            [field]: value,
        };

        const response = await fetch(`/api/planning/${projectId}/objectives`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Failed to update objectives:', error);
            throw new Error(error.error || 'Failed to update objectives');
        }

        await response.json();
        onUpdate();
    };

    const updateMultipleFields = async (extractedData: any) => {
        // Build payload with existing data + extracted data
        const payload = {
            functional: extractedData.functional || data?.functional || '',
            quality: extractedData.quality || data?.quality || '',
            budget: extractedData.budget || data?.budget || '',
            program: extractedData.program || data?.program || '',
        };

        const res = await fetch(`/api/planning/${projectId}/objectives`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error('Failed to update objectives');
        }

        onUpdate();
    };

    const handleExtraction = async (input: File | string) => {
        setIsExtracting(true);
        try {
            let response: Response;

            if (input instanceof File) {
                const formData = new FormData();
                formData.append('file', input);

                response = await fetch('/api/planning/extract-objectives', {
                    method: 'POST',
                    body: formData,
                });
            } else {
                response = await fetch('/api/planning/extract-objectives', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: input }),
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to extract objectives');
            }

            const result = await response.json();
            const { data: extractedData, confidence } = result;

            // Update fields with extracted data
            await updateMultipleFields(extractedData);

            // Show appropriate toast based on confidence
            if (confidence < 70) {
                toast({
                    title: 'Low Confidence Extraction',
                    description: `Extracted with ${confidence}% confidence. Please review the objectives.`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Objectives Extracted',
                    description: `Successfully extracted project objectives (${confidence}% confidence)`,
                });
            }
        } catch (error) {
            toast({
                title: 'Extraction Failed',
                description: error instanceof Error ? error.message : 'Failed to extract objectives',
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
                description: 'Paste some text content to extract project objectives',
                variant: 'destructive',
            });
            return;
        }

        await handleExtraction(content);
    };

    return (
        <div
            className="bg-[var(--color-bg-primary)] rounded-lg p-6 border border-[var(--color-border)] relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
        >
            {/* Extraction Progress Overlay */}
            {isExtracting && (
                <div className="absolute inset-0 z-50 bg-[var(--color-bg-primary)]/80 rounded-lg flex items-center justify-center">
                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-6 flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-green)]"></div>
                        <p className="text-[var(--color-text-primary)] font-semibold">Extracting objectives...</p>
                        <p className="text-xs text-[var(--color-text-muted)]">This may take a few moments</p>
                    </div>
                </div>
            )}

            {/* Drag & Drop Overlay */}
            {isDragging && !isExtracting && (
                <div className="absolute inset-0 z-50 bg-[var(--color-accent-green)]/20 border-2 border-dashed border-[var(--color-accent-green)] rounded-lg flex items-center justify-center">
                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-accent-green)] rounded-lg p-6 flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-[var(--color-accent-green)]" />
                        <p className="text-[var(--color-text-primary)] font-semibold">Drop to extract objectives</p>
                        <p className="text-xs text-[var(--color-text-muted)]">PDF, Word, Image, or Text</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Objectives</h3>
                <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
            </div>
            <div className="space-y-4">
                <InlineEditField
                    label="Functional"
                    value={data?.functional || ''}
                    onSave={(v) => updateField('functional', v)}
                    placeholder="Enter functional objectives"
                    multiline
                    minRows={2}
                />
                <InlineEditField
                    label="Quality"
                    value={data?.quality || ''}
                    onSave={(v) => updateField('quality', v)}
                    placeholder="Enter quality objectives"
                    multiline
                    minRows={2}
                />
                <InlineEditField
                    label="Budget"
                    value={data?.budget || ''}
                    onSave={(v) => updateField('budget', v)}
                    placeholder="Enter budget objectives"
                    multiline
                    minRows={2}
                />
                <InlineEditField
                    label="Program"
                    value={data?.program || ''}
                    onSave={(v) => updateField('program', v)}
                    placeholder="Enter program objectives"
                    multiline
                    minRows={2}
                />
            </div>
        </div>
    );
}
