'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CategoryUploadTiles } from './CategoryUploadTiles';
import { CategorizedList } from './CategorizedList';
import { UploadProgress, UploadFileStatus } from './UploadProgress';
import { useToast } from '@/components/ui/use-toast';
import { getCategoryById } from '@/lib/constants/categories';
import { useDocumentSets, useDocumentSetMutations } from '@/lib/hooks/use-document-sets';
import { RAG_DISABLED } from '@/lib/hooks/use-rag-repos';

interface DocumentRepositoryProps {
    projectId: string;
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
}

export function DocumentRepository({ projectId, selectedIds, onSelectionChange }: DocumentRepositoryProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<UploadFileStatus[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [knowledgeSetId, setKnowledgeSetId] = useState<string | null>(null);
    const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
    const [filterSubcategoryId, setFilterSubcategoryId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // RAG document set hooks
    const { documentSets, isLoading: setsLoading } = useDocumentSets(projectId);
    const { createDocumentSet, addDocuments, isLoading: mutationLoading } = useDocumentSetMutations();

    // Find or create the project's Knowledge document set
    useEffect(() => {
        if (RAG_DISABLED || setsLoading) return;

        const existingSet = documentSets.find(ds => ds.projectId === projectId && ds.name === 'Knowledge');
        if (existingSet) {
            setKnowledgeSetId(existingSet.id);
        }
    }, [projectId, documentSets, setsLoading]);

    /**
     * Handle Knowledge category action - triggers RAG processing for BULK ASSIGN only.
     * File drops are handled in handleFilesSelected after upload completes.
     * @param files - Empty array means use selectedIds (bulk assign)
     */
    const handleKnowledgeAction = useCallback(async (files: File[]) => {
        if (RAG_DISABLED) {
            toast({
                title: 'RAG Disabled',
                description: 'Knowledge Source feature is currently disabled.',
            });
            return;
        }

        // For file drops (files.length > 0), RAG is triggered in handleFilesSelected
        // after upload completes with document IDs. Nothing to do here.
        if (files.length > 0) {
            return;
        }

        // For bulk assign (files.length === 0), add selected documents to Knowledge set
        if (selectedIds.size === 0) {
            return; // Nothing to do
        }

        let setId = knowledgeSetId;

        // Create Knowledge set if it doesn't exist
        if (!setId) {
            const newSet = await createDocumentSet({
                projectId,
                name: 'Knowledge',
                description: 'Project knowledge source for AI-assisted content generation',
            });

            if (!newSet) {
                toast({
                    title: 'Error',
                    description: 'Failed to create Knowledge Source',
                    variant: 'destructive',
                });
                return;
            }

            setId = newSet.id;
            setKnowledgeSetId(setId);
        }

        // Add selected documents to Knowledge set
        const documentIds = Array.from(selectedIds);
        const result = await addDocuments(setId, documentIds);

        if (result) {
            toast({
                title: 'Adding to Knowledge Source',
                description: `${result.added.length} document(s) queued for AI processing`,
            });
        }
    }, [projectId, knowledgeSetId, selectedIds, createDocumentSet, addDocuments, toast]);

    /**
     * T030a: Handle Ctrl+click on category tile to bulk-select all documents in that category.
     * Selection is accumulative - multiple Ctrl+clicks add more documents.
     */
    const handleBulkSelectCategory = async (categoryId: string, subcategoryId?: string) => {
        try {
            // Fetch documents for this category
            let url = `/api/documents?projectId=${projectId}&categoryId=${categoryId}`;
            if (subcategoryId) {
                url += `&subcategoryId=${subcategoryId}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch documents');
            }

            const documents = await response.json();
            const docIds = documents.map((doc: { id: string }) => doc.id);

            if (docIds.length === 0) {
                const category = getCategoryById(categoryId);
                toast({
                    title: 'No documents',
                    description: `No documents found in ${category?.name || categoryId}`,
                });
                return;
            }

            // Add to existing selection (accumulative)
            const newSet = new Set(selectedIds);
            docIds.forEach((id: string) => newSet.add(id));
            onSelectionChange(newSet);

            const category = getCategoryById(categoryId);
            toast({
                title: 'Documents selected',
                description: `Added ${docIds.length} document(s) from ${category?.name || categoryId}`,
            });
        } catch (error) {
            console.error('Bulk select category error:', error);
            toast({
                title: 'Error',
                description: 'Failed to select documents',
                variant: 'destructive',
            });
        }
    };

    const handleBulkCategorize = async (categoryId: string, subcategoryId?: string, subcategoryName?: string) => {
        const documentIds = Array.from(selectedIds);
        if (documentIds.length === 0) return;

        try {
            const response = await fetch('/api/documents/bulk-categorize', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds, categoryId, subcategoryId, subcategoryName }),
            });

            if (response.ok) {
                const category = getCategoryById(categoryId);
                const categoryName = category?.name || categoryId;

                toast({
                    title: 'Documents categorized',
                    description: `${documentIds.length} file(s) → ${categoryName}`,
                });

                onSelectionChange(new Set());
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

    /**
     * Handle category filter change from clicking category tiles.
     * Pass null to clear the filter, or categoryId to filter by category.
     */
    const handleFilterChange = (categoryId: string | null, subcategoryId?: string | null) => {
        setFilterCategoryId(categoryId);
        setFilterSubcategoryId(subcategoryId ?? null);
    };

    // Upload configuration
    const UPLOAD_THROTTLE_MS = 100; // Delay between uploads to prevent DB pool exhaustion
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY_MS = 500;

    // Helper: delay function
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper: upload single file with retry logic
    const uploadFileWithRetry = async (
        file: File,
        formData: FormData,
        maxRetries: number = MAX_RETRIES
    ): Promise<{ success: boolean; response?: Response; error?: string }> => {
        let lastError: string = '';

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const res = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData,
                });

                if (res.ok) {
                    return { success: true, response: res };
                }

                // Server returned an error - check if retryable
                const status = res.status;

                // Don't retry client errors (4xx) except for 429 (rate limit) and 408 (timeout)
                if (status >= 400 && status < 500 && status !== 429 && status !== 408) {
                    let errorText = '';
                    try {
                        errorText = await res.text();
                    } catch {
                        errorText = `Server error: ${status} ${res.statusText}`;
                    }
                    return { success: false, error: errorText || `Server error: ${status}` };
                }

                // Retryable server error (5xx, 429, 408)
                lastError = `Server error: ${status} ${res.statusText}`;

                if (attempt < maxRetries) {
                    const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                    console.log(`[Upload] Retry ${attempt}/${maxRetries} for ${file.name} after ${retryDelay}ms`);
                    await delay(retryDelay);
                }
            } catch (networkError) {
                // Network-level error - always retry
                lastError = networkError instanceof Error ? networkError.message : 'Network error';

                if (attempt < maxRetries) {
                    const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                    console.log(`[Upload] Network error, retry ${attempt}/${maxRetries} for ${file.name} after ${retryDelay}ms`);
                    await delay(retryDelay);
                }
            }
        }

        return { success: false, error: lastError || 'Upload failed after retries' };
    };

    const handleFilesSelected = async (files: File[], categoryId?: string, subcategoryId?: string, subcategoryName?: string) => {
        // If no files provided but we have selected documents, this is a bulk categorize action
        if (files.length === 0 && selectedIds.size > 0 && categoryId) {
            await handleBulkCategorize(categoryId, subcategoryId, subcategoryName);
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
            // Track uploaded document IDs for Knowledge category RAG processing
            const uploadedDocumentIds: string[] = [];
            const isKnowledgeCategory = categoryId === 'knowledge';

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Throttle: add delay between uploads to prevent DB pool exhaustion
                if (i > 0) {
                    await delay(UPLOAD_THROTTLE_MS);
                }

                // Update to uploading
                setUploadFiles(prev => prev.map((f, idx) =>
                    idx === i ? { ...f, status: 'uploading' as const, progress: 0 } : f
                ));

                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectId', projectId);
                if (categoryId) formData.append('categoryId', categoryId);
                if (subcategoryId) formData.append('subcategoryId', subcategoryId);
                if (subcategoryName) formData.append('subcategoryName', subcategoryName);

                console.log('Uploading file:', {
                    filename: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    projectId,
                    categoryId,
                    subcategoryId,
                    subcategoryName
                });

                // Upload with automatic retry
                const result = await uploadFileWithRetry(file, formData);

                if (result.success && result.response) {
                    localSuccessCount++;
                    // Update to completed
                    setUploadFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'completed' as const, progress: 100 } : f
                    ));

                    // Capture document ID for Knowledge category RAG processing
                    if (isKnowledgeCategory) {
                        try {
                            const responseData = await result.response.clone().json();
                            // API returns { documentId: '...' } not { id: '...' }
                            if (responseData.documentId) {
                                uploadedDocumentIds.push(responseData.documentId);
                                console.log('[Knowledge] Captured document ID:', responseData.documentId);
                            }
                        } catch (e) {
                            console.warn('Could not parse upload response for RAG:', e);
                        }
                    }
                } else {
                    localFailureCount++;
                    const errorText = result.error || 'Upload failed';

                    console.error('Upload failed after retries:', {
                        filename: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        error: errorText,
                        categoryId,
                        subcategoryId
                    });

                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { error: errorText };
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

                // Trigger RAG processing for Knowledge category uploads
                if (isKnowledgeCategory && uploadedDocumentIds.length > 0) {
                    console.log('[Knowledge] Triggering RAG for uploaded documents:', uploadedDocumentIds);

                    // Get or create Knowledge set, then add documents
                    let setId = knowledgeSetId;

                    if (!setId && !RAG_DISABLED) {
                        const newSet = await createDocumentSet({
                            projectId,
                            name: 'Knowledge',
                            description: 'Project knowledge source for AI-assisted content generation',
                        });

                        if (newSet) {
                            setId = newSet.id;
                            setKnowledgeSetId(setId);
                        }
                    }

                    if (setId) {
                        const result = await addDocuments(setId, uploadedDocumentIds);
                        if (result) {
                            toast({
                                title: 'Knowledge Source',
                                description: `${result.added.length} document(s) queued for AI processing`,
                            });
                        }
                    }
                }
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
            // Capture full error details for debugging
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorName = error instanceof Error ? error.name : 'Unknown';
            const errorStack = error instanceof Error ? error.stack : undefined;

            console.error('Upload error details:', {
                message: errorMessage,
                name: errorName,
                stack: errorStack,
                raw: error,
            });

            toast({
                title: 'Upload error',
                description: errorMessage || 'An unexpected error occurred during upload.',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Category Upload Tiles */}
            <div className="px-6 pt-4 pb-4">
                <CategoryUploadTiles
                    projectId={projectId}
                    onFilesDropped={handleFilesSelected}
                    selectedDocumentIds={Array.from(selectedIds)}
                    onBulkSelectCategory={handleBulkSelectCategory}
                    onKnowledgeAction={handleKnowledgeAction}
                    filterCategoryId={filterCategoryId}
                    filterSubcategoryId={filterSubcategoryId}
                    onFilterChange={handleFilterChange}
                />
            </div>

            {/* Document List - Takes remaining space */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
                <CategorizedList
                    refreshTrigger={refreshTrigger}
                    projectId={projectId}
                    selectedIds={selectedIds}
                    onSelectionChange={onSelectionChange}
                    scrollContainerRef={scrollContainerRef}
                    filterCategoryId={filterCategoryId}
                    filterSubcategoryId={filterSubcategoryId}
                />
            </div>
        </div>
    );
}
