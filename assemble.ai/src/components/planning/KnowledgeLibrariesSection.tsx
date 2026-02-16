/**
 * T110: Knowledge Libraries Section
 * 6 global repo tiles (2x3 grid) with Save/Load functionality
 * Located in Planning Card after Stakeholders
 */

'use client';

import { useEffect, useState } from 'react';
import { useRAGRepos, type RAGRepo } from '@/lib/hooks/use-rag-repos';
import { REPO_TYPE_LABELS, type RepoType } from '@/lib/db/rag-schema';
import { useToast } from '@/lib/hooks/use-toast';

const MAX_INIT_ATTEMPTS = 3;

interface KnowledgeLibrariesSectionProps {
    projectId: string;
    organizationId: string;
    selectedDocumentIds: string[];
    onLoadDocuments?: (documentIds: string[]) => void;
}

export function KnowledgeLibrariesSection({
    projectId,
    organizationId,
    selectedDocumentIds,
    onLoadDocuments,
}: KnowledgeLibrariesSectionProps) {
    const { toast } = useToast();
    const [initAttempts, setInitAttempts] = useState(0);
    const {
        globalRepos,
        needsInitialization,
        isFetching,
        isSaving,
        isLoading,
        error,
        hasError,
        initializeRepos,
        saveToRepo,
        loadFromRepo,
        retry,
    } = useRAGRepos(projectId, organizationId);

    // Initialize global repos if missing (with retry limit)
    useEffect(() => {
        if (needsInitialization && !isFetching && !hasError && initAttempts < MAX_INIT_ATTEMPTS) {
            console.log('[KnowledgeLibraries] Initializing repos, attempt:', initAttempts + 1);
            setInitAttempts((prev) => prev + 1);
            initializeRepos();
        }
    }, [needsInitialization, isFetching, hasError, initAttempts, initializeRepos]);

    // Reset init attempts when retry is triggered
    const handleRetry = () => {
        setInitAttempts(0);
        retry();
    };

    const handleSave = async (repo: RAGRepo) => {
        if (selectedDocumentIds.length === 0) {
            toast({
                title: 'No documents selected',
                description: 'Select documents in the Document Repository first',
                variant: 'destructive',
            });
            return;
        }

        const result = await saveToRepo(repo.id, selectedDocumentIds);
        if (result) {
            toast({
                title: `Saved to ${repo.name}`,
                description: `${result.documentCount} document(s) saved`,
                variant: 'success',
            });
        } else {
            toast({
                title: 'Failed to save',
                description: error || 'An error occurred while saving',
                variant: 'destructive',
            });
        }
    };

    const handleLoad = async (repo: RAGRepo) => {
        const documentIds = await loadFromRepo(repo.id);
        if (documentIds) {
            if (documentIds.length === 0) {
                toast({
                    title: `${repo.name} is empty`,
                    description: 'No documents to load',
                });
            } else {
                onLoadDocuments?.(documentIds);
                toast({
                    title: `Loaded from ${repo.name}`,
                    description: `${documentIds.length} document(s) selected`,
                    variant: 'success',
                });
            }
        } else {
            toast({
                title: 'Failed to load',
                description: error || 'An error occurred while loading',
                variant: 'destructive',
            });
        }
    };

    if (isFetching) {
        return (
            <div className="bg-[var(--color-bg-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Knowledge Libraries</h3>
                <div className="text-[var(--color-text-muted)] text-sm">Loading knowledge libraries...</div>
            </div>
        );
    }

    // Show error state when fetch failed or repos failed to initialize
    if (hasError || (globalRepos.length === 0 && !isFetching && !needsInitialization)) {
        return (
            <div className="bg-[var(--color-bg-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Knowledge Libraries</h3>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="text-[var(--color-accent-coral)] text-sm font-medium mb-2">
                        Failed to load knowledge libraries
                    </div>
                    <p className="text-[var(--color-text-muted)] text-xs mb-4 max-w-xs">
                        {error || 'Database connection unavailable. Please check your configuration.'}
                    </p>
                    <button
                        onClick={handleRetry}
                        className="px-4 py-2 text-sm bg-[var(--color-accent-green)] hover:bg-[var(--primitive-green-dark)] text-white rounded transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--color-bg-primary)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Knowledge Libraries</h3>
            <p className="text-[var(--color-text-muted)] text-sm mb-4">
                Curated document collections available across all projects
            </p>

            {/* 2x3 Grid of Global Repo Tiles */}
            <div className="grid grid-cols-3 gap-3">
                {globalRepos.map((repo) => (
                    <RepoTile
                        key={repo.id}
                        repo={repo}
                        isDisabled={isSaving || isLoading}
                        hasSelection={selectedDocumentIds.length > 0}
                        onSave={() => handleSave(repo)}
                        onLoad={() => handleLoad(repo)}
                    />
                ))}

                {/* Show placeholders for missing repos during initialization */}
                {globalRepos.length < 6 &&
                    Array.from({ length: 6 - globalRepos.length }).map((_, i) => (
                        <div
                            key={`placeholder-${i}`}
                            className="h-24 rounded border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center"
                        >
                            <div className="text-[var(--color-text-muted)] text-xs">Initializing...</div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

interface RepoTileProps {
    repo: RAGRepo;
    isDisabled: boolean;
    hasSelection: boolean;
    onSave: () => void;
    onLoad: () => void;
}

function RepoTile({ repo, isDisabled, hasSelection, onSave, onLoad }: RepoTileProps) {
    const repoLabel = REPO_TYPE_LABELS[repo.repoType as RepoType] || repo.name;

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)] p-3 flex flex-col hover:border-[var(--color-border-strong)] transition-colors">
            {/* Header with name and count */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--color-text-primary)] text-sm font-medium truncate">
                    {repoLabel}
                </span>
                <span className="text-[var(--color-text-muted)] text-xs">
                    ({repo.memberCount || 0})
                </span>
            </div>

            {/* Sync status indicator */}
            {repo.memberCount > 0 && (
                <div className="flex items-center gap-1 mb-2">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            repo.syncedCount === repo.memberCount
                                ? 'bg-[var(--color-accent-green)]'
                                : repo.syncedCount > 0
                                ? 'bg-[var(--color-accent-yellow)]'
                                : 'bg-[var(--color-text-muted)]'
                        }`}
                    />
                    <span className="text-[var(--color-text-muted)] text-xs">
                        {repo.syncedCount}/{repo.memberCount} synced
                    </span>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-auto">
                <button
                    onClick={onSave}
                    disabled={isDisabled || !hasSelection}
                    className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                        hasSelection
                            ? 'bg-[var(--color-accent-green)] hover:bg-[var(--primitive-green-dark)] text-white'
                            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
                    }`}
                    title={hasSelection ? 'Save selected documents' : 'Select documents first'}
                >
                    Save
                </button>
                <button
                    onClick={onLoad}
                    disabled={isDisabled || repo.memberCount === 0}
                    className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                        repo.memberCount > 0
                            ? 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)]'
                            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
                    }`}
                    title={repo.memberCount > 0 ? 'Load documents to selection' : 'No documents saved'}
                >
                    Load
                </button>
            </div>
        </div>
    );
}
