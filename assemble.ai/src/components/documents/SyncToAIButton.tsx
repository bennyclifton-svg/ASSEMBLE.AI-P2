/**
 * T030: Sync To AI Button Component
 * Triggers document sync to RAG knowledge base
 */

'use client';

import { useState, useCallback } from 'react';
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentSetMutations, useDocumentSets } from '@/lib/hooks/use-document-sets';
import { useSyncStatus } from '@/lib/hooks/use-sync-status';
import { useToast } from '@/lib/hooks/use-toast';

interface SyncToAIButtonProps {
    projectId: string;
    selectedDocumentIds: string[];
    discipline?: string;
    trade?: string;
    onSyncComplete?: () => void;
}

export function SyncToAIButton({
    projectId,
    selectedDocumentIds,
    discipline,
    trade,
    onSyncComplete,
}: SyncToAIButtonProps) {
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);

    // Get or create document set for this discipline/trade
    const { documentSets, revalidate: revalidateSets } = useDocumentSets(
        projectId,
        discipline || trade
    );

    const { createDocumentSet, addDocuments, isLoading: isMutating } = useDocumentSetMutations();

    // Get sync status for selected documents
    const { statuses, statusCounts, hasSyncing } = useSyncStatus(selectedDocumentIds);

    // Determine button state
    const hasSelection = selectedDocumentIds.length > 0;
    const isDisabled = !hasSelection || isSyncing || isMutating;

    // Count already synced documents
    const alreadySyncedCount = selectedDocumentIds.filter(
        (id) => statuses[id]?.status === 'synced'
    ).length;

    const pendingCount = selectedDocumentIds.length - alreadySyncedCount;

    // Handle sync action
    const handleSync = useCallback(async () => {
        if (!hasSelection) return;

        setIsSyncing(true);

        try {
            // Find or create document set for this discipline/trade
            let documentSetId: string;

            const context = discipline || trade || 'General';
            const existingSet = documentSets.find(
                (set) => set.discipline === context || set.name.includes(context)
            );

            if (existingSet) {
                documentSetId = existingSet.id;
            } else {
                // Create new document set
                const newSet = await createDocumentSet({
                    projectId,
                    name: `${context} Documents`,
                    description: `Documents for ${context}`,
                    discipline: discipline || trade || undefined,
                });

                if (!newSet) {
                    throw new Error('Failed to create document set');
                }

                documentSetId = newSet.id;
                await revalidateSets();
            }

            // Add documents to the set
            const result = await addDocuments(documentSetId, selectedDocumentIds);

            if (!result) {
                throw new Error('Failed to add documents');
            }

            const addedCount = result.added.length;
            const skippedCount = result.skipped.length;

            if (addedCount > 0) {
                toast({
                    title: 'Sync started',
                    description: `${addedCount} document${addedCount === 1 ? '' : 's'} queued for AI processing${skippedCount > 0 ? ` (${skippedCount} already in set)` : ''}`,
                    variant: 'success',
                });
            } else if (skippedCount > 0) {
                toast({
                    title: 'Already synced',
                    description: `${skippedCount} document${skippedCount === 1 ? ' is' : 's are'} already in the AI knowledge base`,
                });
            }

            onSyncComplete?.();
        } catch (error) {
            console.error('[SyncToAIButton] Sync failed:', error);
            toast({
                title: 'Sync failed',
                description: error instanceof Error ? error.message : 'Failed to sync documents',
                variant: 'destructive',
            });
        } finally {
            setIsSyncing(false);
        }
    }, [
        hasSelection,
        selectedDocumentIds,
        documentSets,
        discipline,
        trade,
        projectId,
        createDocumentSet,
        addDocuments,
        revalidateSets,
        onSyncComplete,
        toast,
    ]);

    // Render loading state
    if (isSyncing || isMutating) {
        return (
            <Button disabled variant="outline" size="sm" className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
            </Button>
        );
    }

    // Render no selection state
    if (!hasSelection) {
        return (
            <Button disabled variant="outline" size="sm" className="gap-2 text-muted-foreground">
                <CloudOff className="h-4 w-4" />
                Select documents to sync
            </Button>
        );
    }

    // Render with selection
    return (
        <Button
            onClick={handleSync}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isDisabled}
        >
            {hasSyncing ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing {statusCounts.processing + statusCounts.pending}...
                </>
            ) : alreadySyncedCount === selectedDocumentIds.length ? (
                <>
                    <Check className="h-4 w-4 text-green-500" />
                    All synced
                </>
            ) : (
                <>
                    <Cloud className="h-4 w-4" />
                    Sync {pendingCount} to AI
                    {alreadySyncedCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            ({alreadySyncedCount} already synced)
                        </span>
                    )}
                </>
            )}
        </Button>
    );
}

/**
 * Compact variant for use in lists
 */
export function SyncStatusBadge({
    documentId,
    showRetry = false,
    onRetry,
}: {
    documentId: string;
    showRetry?: boolean;
    onRetry?: () => void;
}) {
    const { statuses } = useSyncStatus([documentId]);
    const status = statuses[documentId];

    if (!status || status.status === null) {
        return null;
    }

    const statusConfig = {
        pending: {
            icon: <Cloud className="h-3 w-3" />,
            label: 'Pending',
            className: 'text-yellow-500',
        },
        processing: {
            icon: <Loader2 className="h-3 w-3 animate-spin" />,
            label: 'Processing',
            className: 'text-blue-500',
        },
        synced: {
            icon: <Check className="h-3 w-3" />,
            label: 'Synced',
            className: 'text-green-500',
        },
        failed: {
            icon: <AlertCircle className="h-3 w-3" />,
            label: 'Failed',
            className: 'text-red-500',
        },
    };

    const config = statusConfig[status.status];

    return (
        <div className={`flex items-center gap-1 text-xs ${config.className}`}>
            {config.icon}
            <span>{config.label}</span>
            {status.status === 'failed' && showRetry && onRetry && (
                <button
                    onClick={onRetry}
                    className="ml-1 text-xs underline hover:no-underline"
                >
                    Retry
                </button>
            )}
        </div>
    );
}
