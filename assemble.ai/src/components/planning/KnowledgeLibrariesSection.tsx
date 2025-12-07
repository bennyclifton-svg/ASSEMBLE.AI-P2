/**
 * T110: Knowledge Libraries Section
 * 6 global repo tiles (2x3 grid) with Save/Load functionality
 * Located in Planning Card after Stakeholders
 */

'use client';

import { useEffect } from 'react';
import { useRAGRepos, type RAGRepo } from '@/lib/hooks/use-rag-repos';
import { REPO_TYPE_LABELS, type RepoType } from '@/lib/db/rag-schema';
import { useToast } from '@/lib/hooks/use-toast';

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
    const {
        globalRepos,
        needsInitialization,
        isFetching,
        isSaving,
        isLoading,
        error,
        initializeRepos,
        saveToRepo,
        loadFromRepo,
    } = useRAGRepos(projectId, organizationId);

    // Initialize global repos if missing
    useEffect(() => {
        if (needsInitialization && !isFetching) {
            initializeRepos();
        }
    }, [needsInitialization, isFetching, initializeRepos]);

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
            <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
                <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Knowledge Libraries</h3>
                <div className="text-[#858585] text-sm">Loading knowledge libraries...</div>
            </div>
        );
    }

    return (
        <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
            <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Knowledge Libraries</h3>
            <p className="text-[#858585] text-sm mb-4">
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
                            className="h-24 rounded border border-dashed border-[#3e3e42] bg-[#1e1e1e] flex items-center justify-center"
                        >
                            <div className="text-[#858585] text-xs">Initializing...</div>
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
        <div className="bg-[#1e1e1e] rounded border border-[#3e3e42] p-3 flex flex-col hover:border-[#4e4e52] transition-colors">
            {/* Header with name and count */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-[#cccccc] text-sm font-medium truncate">
                    {repoLabel}
                </span>
                <span className="text-[#858585] text-xs">
                    ({repo.memberCount || 0})
                </span>
            </div>

            {/* Sync status indicator */}
            {repo.memberCount > 0 && (
                <div className="flex items-center gap-1 mb-2">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            repo.syncedCount === repo.memberCount
                                ? 'bg-green-500'
                                : repo.syncedCount > 0
                                ? 'bg-yellow-500'
                                : 'bg-gray-500'
                        }`}
                    />
                    <span className="text-[#858585] text-xs">
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
                            ? 'bg-[#0e639c] hover:bg-[#1177bb] text-white'
                            : 'bg-[#3e3e42] text-[#858585] cursor-not-allowed'
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
                            ? 'bg-[#3e3e42] hover:bg-[#4e4e52] text-[#cccccc]'
                            : 'bg-[#2e2e32] text-[#858585] cursor-not-allowed'
                    }`}
                    title={repo.memberCount > 0 ? 'Load documents to selection' : 'No documents saved'}
                >
                    Load
                </button>
            </div>
        </div>
    );
}
