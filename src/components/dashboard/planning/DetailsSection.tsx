'use client';

import { useState } from 'react';
import { InlineEditField } from './InlineEditField';
import { useToast } from '@/lib/hooks/use-toast';
import { Upload, UploadCloud } from 'lucide-react';

interface DetailsSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
}

export function DetailsSection({ projectId, data, onUpdate, onProjectNameChange }: DetailsSectionProps) {
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
            numberOfStories: data?.numberOfStories || '',
            buildingClass: data?.buildingClass || '',
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
            numberOfStories: extractedData.numberOfStories?.toString() || data?.numberOfStories?.toString() || '',
            buildingClass: extractedData.buildingClass || data?.buildingClass || '',
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
            className="bg-[#252526] rounded-lg p-4 border border-[#3e3e42] relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
        >
            {/* Extraction Progress Overlay */}
            {isExtracting && (
                <div className="absolute inset-0 z-50 bg-[#1e1e1e]/80 rounded-lg flex items-center justify-center">
                    <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-lg p-6 flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0e639c]"></div>
                        <p className="text-[#cccccc] font-semibold">Extracting project details...</p>
                        <p className="text-xs text-[#858585]">This may take a few moments</p>
                    </div>
                </div>
            )}

            {/* Drag & Drop Overlay */}
            {isDragging && !isExtracting && (
                <div className="absolute inset-0 z-50 bg-[#0e639c]/20 border-2 border-dashed border-[#0e639c] rounded-lg flex items-center justify-center">
                    <div className="bg-[#1e1e1e] border border-[#0e639c] rounded-lg p-6 flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-[#0e639c]" />
                        <p className="text-[#cccccc] font-semibold">Drop to extract project details</p>
                        <p className="text-xs text-[#858585]">PDF, Word, Image, or Text</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#cccccc]">Details</h3>
                <UploadCloud className="w-4 h-4 text-[#858585]" />
            </div>

            <div className="flex flex-col gap-2">
                <InlineEditField
                    label="Project Name"
                    value={data?.projectName || ''}
                    onSave={(v) => updateField('projectName', v)}
                    placeholder="Enter project name"
                />
                <InlineEditField
                    label="Address"
                    value={data?.address || ''}
                    onSave={(v) => updateField('address', v)}
                    placeholder="Enter address"
                />
                <InlineEditField
                    label="Zoning"
                    value={data?.zoning || ''}
                    onSave={(v) => updateField('zoning', v)}
                    placeholder="Enter zoning"
                />
                <InlineEditField
                    label="Lot Area (m²)"
                    value={data?.lotArea?.toString() || ''}
                    onSave={(v) => updateField('lotArea', v)}
                    placeholder="Enter lot area"
                />
                <InlineEditField
                    label="Building Class"
                    value={data?.buildingClass || ''}
                    onSave={(v) => updateField('buildingClass', v)}
                    placeholder="Enter building class"
                />
                <InlineEditField
                    label="Number of Stories"
                    value={data?.numberOfStories?.toString() || ''}
                    onSave={(v) => updateField('numberOfStories', v)}
                    placeholder="Enter number of stories"
                />
                <InlineEditField
                    label="Legal Address"
                    value={data?.legalAddress || ''}
                    onSave={(v) => updateField('legalAddress', v)}
                    placeholder="Enter legal address"
                />
                <InlineEditField
                    label="Jurisdiction"
                    value={data?.jurisdiction || ''}
                    onSave={(v) => updateField('jurisdiction', v)}
                    placeholder="Enter jurisdiction"
                />
            </div>
        </div>
    );
}
