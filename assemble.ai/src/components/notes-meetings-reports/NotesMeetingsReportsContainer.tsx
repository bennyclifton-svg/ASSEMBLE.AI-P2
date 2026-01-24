/**
 * Notes, Meetings & Reports Container Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Main container with sub-tab navigation for Notes, Meetings, and Reports panels.
 * T097: Create tab container component with sub-tab navigation
 * T098: Implement sub-tab state management
 */

'use client';

import React, { useState, useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotesPanel } from './NotesPanel';
import { MeetingsPanel } from './MeetingsPanel';
import { ReportsPanel } from './ReportsPanel';
import { cn } from '@/lib/utils';

// Sub-tab type
type SubTab = 'notes' | 'meetings' | 'reports';

interface NotesMeetingsReportsContainerProps {
    projectId: string;
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    className?: string;
}

export function NotesMeetingsReportsContainer({
    projectId,
    selectedDocumentIds,
    onSetSelectedDocumentIds,
    className,
}: NotesMeetingsReportsContainerProps) {
    // T098: Sub-tab state management
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('notes');

    // Track active entity for transmittal operations
    const [activeTransmittalContext, setActiveTransmittalContext] = useState<{
        type: 'note' | 'meeting' | 'report';
        id: string;
    } | null>(null);

    // Handlers for Save Transmittal - save selected documents to an entity
    const handleSaveTransmittal = useCallback(async (type: 'note' | 'meeting' | 'report', id: string) => {
        setActiveTransmittalContext({ type, id });

        // Only proceed if there are documents selected
        if (!selectedDocumentIds || selectedDocumentIds.length === 0) {
            console.warn(`[NotesMeetingsReportsContainer] No documents selected to save for ${type}`);
            return;
        }

        // Build the appropriate endpoint based on type
        let endpoint = '';
        switch (type) {
            case 'note':
                endpoint = `/api/notes/${id}/transmittal`;
                break;
            case 'meeting':
                endpoint = `/api/meetings/${id}/transmittal`;
                break;
            case 'report':
                endpoint = `/api/project-reports/${id}/transmittal`;
                break;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: selectedDocumentIds }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to save transmittal' }));
                console.error(`[NotesMeetingsReportsContainer] Failed to save transmittal:`, error);
                return;
            }

            console.log(`[NotesMeetingsReportsContainer] Saved ${selectedDocumentIds.length} documents to ${type}`);

            // Trigger SWR refetch to update the UI
            globalMutate(endpoint);
        } catch (err) {
            console.error(`[NotesMeetingsReportsContainer] Error saving transmittal for ${type}:`, err);
        }
    }, [selectedDocumentIds]);

    // Handlers for Load Transmittal - fetch and select the entity's documents
    // This replaces the current selection with the documents associated with the entity
    const handleLoadTransmittal = useCallback(async (type: 'note' | 'meeting' | 'report', id: string) => {
        try {
            let endpoint = '';
            switch (type) {
                case 'note':
                    endpoint = `/api/notes/${id}/transmittal`;
                    break;
                case 'meeting':
                    endpoint = `/api/meetings/${id}/transmittal`;
                    break;
                case 'report':
                    endpoint = `/api/project-reports/${id}/transmittal`;
                    break;
            }

            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                // API returns { documents: [...] } with each document having a documentId field
                const documentIds = data.documents?.map((doc: { documentId: string }) => doc.documentId) || [];
                // This replaces the current selection (deselects all, then selects the loaded ones)
                onSetSelectedDocumentIds?.(documentIds);
                console.log(`[NotesMeetingsReportsContainer] Loaded ${documentIds.length} documents from ${type}`);
            } else {
                console.error(`[NotesMeetingsReportsContainer] Failed to load transmittal: ${res.status}`);
            }
        } catch (err) {
            console.error(`[NotesMeetingsReportsContainer] Error loading transmittal for ${type}:`, err);
        }
    }, [onSetSelectedDocumentIds]);

    // Sub-tab styling - matches the procurement sub-tabs style
    const subTabClassName = `
        relative flex items-center gap-1.5 rounded-none px-4 py-2 text-[13px] font-medium transition-all duration-200 bg-transparent
        text-[var(--color-text-muted)]
        data-[state=active]:bg-[var(--color-bg-primary)]
        data-[state=active]:text-[var(--color-accent-primary)]
        data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent-primary)]
        hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/50
    `;

    return (
        <div className={cn('flex flex-col h-full', className)}>
            <Tabs
                value={activeSubTab}
                onValueChange={(value) => setActiveSubTab(value as SubTab)}
                className="flex-1 flex flex-col min-h-0"
            >
                {/* Sub-tab navigation bar */}
                <TabsList className="w-full justify-start bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] rounded-none h-auto p-0 px-2">
                    <TabsTrigger value="notes" className={subTabClassName}>
                        Notes
                    </TabsTrigger>
                    <TabsTrigger value="meetings" className={subTabClassName}>
                        Meetings
                    </TabsTrigger>
                    <TabsTrigger value="reports" className={subTabClassName}>
                        Reports
                    </TabsTrigger>
                </TabsList>

                {/* Notes Tab Content */}
                <TabsContent value="notes" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <NotesPanel
                        projectId={projectId}
                        onSaveTransmittal={(noteId) => handleSaveTransmittal('note', noteId)}
                        onLoadTransmittal={(noteId) => handleLoadTransmittal('note', noteId)}
                    />
                </TabsContent>

                {/* Meetings Tab Content */}
                <TabsContent value="meetings" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <MeetingsPanel
                        projectId={projectId}
                        onSaveTransmittal={(meetingId) => handleSaveTransmittal('meeting', meetingId)}
                        onLoadTransmittal={(meetingId) => handleLoadTransmittal('meeting', meetingId)}
                    />
                </TabsContent>

                {/* Reports Tab Content */}
                <TabsContent value="reports" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <ReportsPanel
                        projectId={projectId}
                        onSaveTransmittal={(reportId) => handleSaveTransmittal('report', reportId)}
                        onLoadTransmittal={(reportId) => handleLoadTransmittal('report', reportId)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default NotesMeetingsReportsContainer;
