'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, CloudUpload } from 'lucide-react';
import { LibraryUploadTiles } from './LibraryUploadTiles';
import { LibraryDocumentList } from './LibraryDocumentList';
import { Button } from '@/components/ui/button';
import { KNOWLEDGE_LIBRARY_TYPES } from '@/lib/constants/libraries';

interface Library {
  id: string | null;
  type: string;
  name: string;
  color: string;
  documentCount: number;
}

interface LibraryDocument {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: number;
  syncStatus: 'pending' | 'processing' | 'synced' | 'failed';
}

export function KnowledgeLibraryRepository() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const [isLoadingLibraries, setIsLoadingLibraries] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch libraries
  const fetchLibraries = useCallback(async () => {
    try {
      setIsLoadingLibraries(true);
      setError(null);

      const res = await fetch('/api/libraries');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch libraries');
      }

      const data = await res.json();
      setLibraries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoadingLibraries(false);
    }
  }, [router]);

  // Fetch documents for selected library
  const fetchDocuments = useCallback(async (type: string) => {
    try {
      setIsLoadingDocuments(true);

      const res = await fetch(`/api/libraries/${type}/documents`);
      if (!res.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await res.json();
      setDocuments(data);
      setSelectedDocIds(new Set());
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  // Load documents when library type changes
  useEffect(() => {
    if (selectedType) {
      fetchDocuments(selectedType);
    } else {
      setDocuments([]);
      setSelectedDocIds(new Set());
    }
  }, [selectedType, fetchDocuments]);

  // Handle file drop
  const handleFilesDropped = useCallback(
    async (files: File[], libraryType: string) => {
      setIsUploading(true);
      setError(null);

      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch(`/api/libraries/${libraryType}/documents`, {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || 'Upload failed');
          }
        }

        // Refresh libraries and documents
        await fetchLibraries();
        if (selectedType === libraryType) {
          await fetchDocuments(libraryType);
        } else {
          setSelectedType(libraryType);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [fetchLibraries, fetchDocuments, selectedType]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (documentIds: string[]) => {
      if (!selectedType || documentIds.length === 0) return;

      setIsDeleting(true);
      setError(null);

      try {
        const res = await fetch(`/api/libraries/${selectedType}/documents`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentIds }),
        });

        if (!res.ok) {
          throw new Error('Delete failed');
        }

        // Refresh
        await fetchLibraries();
        await fetchDocuments(selectedType);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      } finally {
        setIsDeleting(false);
      }
    },
    [selectedType, fetchLibraries, fetchDocuments]
  );

  // Handle sync to AI
  const handleSync = useCallback(async () => {
    if (!selectedType) return;

    setIsSyncing(true);
    setError(null);

    try {
      const res = await fetch(`/api/libraries/${selectedType}/sync`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Sync failed');
      }

      const result = await res.json();

      // Refresh documents to show updated sync status
      setTimeout(() => {
        fetchDocuments(selectedType);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [selectedType, fetchDocuments]);

  // Get current library info
  const currentLibrary = selectedType
    ? KNOWLEDGE_LIBRARY_TYPES.find((t) => t.id === selectedType)
    : null;

  // Count pending documents
  const pendingCount = documents.filter((d) => d.syncStatus === 'pending').length;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Header */}
      <div className="p-4 border-b border-[#3e3e42]">
        <h2 className="text-lg font-semibold text-[#cccccc]">Knowledge Libraries</h2>
        <p className="text-sm text-[#808080] mt-1">
          Upload documents to train AI on your organization&apos;s knowledge
        </p>
      </div>

      {/* Upload Status */}
      {isUploading && (
        <div className="px-4 py-2 bg-[#0e639c]/20 border-b border-[#3e3e42] flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-[#0e639c] animate-spin" />
          <span className="text-sm text-[#0e639c]">Uploading...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-[#f48771]/20 border-b border-[#3e3e42] flex items-center justify-between">
          <span className="text-sm text-[#f48771]">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-[#f48771] hover:text-white text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Library Tiles */}
      <div className="p-4 border-b border-[#3e3e42]">
        <LibraryUploadTiles
          libraries={libraries}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          onFilesDropped={handleFilesDropped}
          isLoading={isLoadingLibraries}
        />
      </div>

      {/* Document List Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedType ? (
          <>
            {/* Library Header */}
            <div className="px-4 py-3 border-b border-[#3e3e42] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: currentLibrary?.color }}
                />
                <span className="font-medium text-[#cccccc]">
                  {currentLibrary?.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => fetchDocuments(selectedType)}
                  disabled={isLoadingDocuments}
                  variant="ghost"
                  size="sm"
                  className="text-[#808080] hover:text-[#cccccc]"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoadingDocuments ? 'animate-spin' : ''}`}
                  />
                </Button>

                {pendingCount > 0 && (
                  <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    size="sm"
                    className="bg-[#0e639c] hover:bg-[#1177bb] text-white"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-4 h-4 mr-1" />
                        Sync to AI ({pendingCount})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-hidden">
              <LibraryDocumentList
                documents={documents}
                selectedIds={selectedDocIds}
                onSelectionChange={setSelectedDocIds}
                onDelete={handleDelete}
                isLoading={isLoadingDocuments}
                isDeleting={isDeleting}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#808080]">
            <div className="text-center">
              <CloudUpload className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a library to view documents</p>
              <p className="text-xs mt-1">or drag files to a tile to upload</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
