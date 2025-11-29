'use client';

import { useState, useRef } from 'react';
import { CategoryUploadTiles } from './CategoryUploadTiles';
import { CategorizedList } from './CategorizedList';
import { UploadProgress, UploadFileStatus } from './UploadProgress';
import { useToast } from '@/components/ui/use-toast';
import { getCategoryById } from '@/lib/constants/categories';

interface DocumentRepositoryProps {
    projectId: string;
}

export function DocumentRepository({ projectId }: DocumentRepositoryProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<UploadFileStatus[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const handleBulkCategorize = async (categoryId: string, subcategoryId?: string) => {
        const documentIds = Array.from(selectedDocumentIds);
        if (documentIds.length === 0) return;

        try {
            const response = await fetch('/api/documents/bulk-categorize', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds, categoryId, subcategoryId }),
            });

            if (response.ok) {
                const category = getCategoryById(categoryId);
                const categoryName = category?.name || categoryId;

                toast({
                    title: 'Documents categorized',
                    description: `${documentIds.length} file(s) → ${categoryName}`,
                });

                setSelectedDocumentIds(new Set());
                setRefreshTrigger(prev => prev + 1);
            } else {
                toast({
                    title: 'Error',
                    description: 'Failed to categorize documents',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Bulk categorize error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        }
    };

    const handleFilesSelected = async (files: File[], categoryId?: string, subcategoryId?: string) => {
        // If no files provided but we have selected documents, this is a bulk categorize action
        if (files.length === 0 && selectedDocumentIds.size > 0 && categoryId) {
            await handleBulkCategorize(categoryId, subcategoryId);
            return;
        }

        // Otherwise, proceed with file upload
        if (files.length === 0) return;

        setUploading(true);

        // Initialize upload status for all files
        const fileStatuses: UploadFileStatus[] = files.map(file => ({
            file,
            progress: 0,
            status: 'pending' as const,
        }));
        setUploadFiles(fileStatuses); // Set the initial state

        let localSuccessCount = 0;
        let localFailureCount = 0;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Update to uploading
                setUploadFiles(prev => prev.map((f, idx) =>
                    idx === i ? { ...f, status: 'uploading' as const, progress: 0 } : f
                ));

                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectId', projectId);
                if (categoryId) formData.append('categoryId', categoryId);
                if (subcategoryId) formData.append('subcategoryId', subcategoryId);

                console.log('Uploading file with:', {
                    filename: file.name,
                    projectId,
                    categoryId,
                    subcategoryId
                });

                const res = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData,
                });

                if (res.ok) {
                    localSuccessCount++;
                    // Update to completed
                    setUploadFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'completed' as const, progress: 100 } : f
                    ));
                } else {
                    localFailureCount++;
                    const errorText = await res.text();
                    console.error('Upload failed:', {
                        status: res.status,
                        statusText: res.statusText,
                        error: errorText,
                        filename: file.name,
                        categoryId,
                        subcategoryId
                    });

                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { error: errorText || 'Upload failed' };
                    }

                    // Update to error
                    setUploadFiles(prev => prev.map((f, idx) =>
                        idx === i ? {
                            ...f,
                            status: 'error' as const,
                            error: errorData.error || 'Upload failed'
                        } : f
                    ));
                }
            }

            if (localSuccessCount > 0) {
                const category = categoryId ? getCategoryById(categoryId) : null;
                const categoryName = category?.name || 'Uncategorized';

                toast({
                    title: 'Upload complete',
                    description: `${localSuccessCount} file(s) → ${categoryName}`,
                });
            } else if (localFailureCount > 0) {
                toast({
                    title: 'Upload error',
                    description: `Failed to upload ${localFailureCount} file(s).`,
                    variant: 'destructive',
                });
            }

            // Refresh the document list
            setRefreshTrigger(prev => prev + 1);

            // Clear progress after a delay
            setTimeout(() => {
                setUploadFiles([]);
            }, 3000);
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: 'Upload error',
                description: 'An unexpected error occurred during upload.',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[#3e3e42]">
                <h2 className="text-2xl font-bold text-[#cccccc]">Documents</h2>
            </div>

            {/* Category Upload Tiles */}
            <div className="px-6 py-4">
                <CategoryUploadTiles
                    projectId={projectId}
                    onFilesDropped={handleFilesSelected}
                    selectedDocumentIds={Array.from(selectedDocumentIds)}
                />
            </div>

            {/* Document List - Takes remaining space */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
                <CategorizedList
                    refreshTrigger={refreshTrigger}
                    projectId={projectId}
                    selectedIds={selectedDocumentIds}
                    onSelectionChange={setSelectedDocumentIds}
                    scrollContainerRef={scrollContainerRef}
                />
            </div>
        </div>
    );
}
