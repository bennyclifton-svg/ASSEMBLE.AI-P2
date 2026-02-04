/**
 * Notes, Meetings & Reports Container Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Main container displaying Notes, Meetings, and Reports sections
 * with segmented ribbon headers matching procurement report styling.
 */

'use client';

import React, { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { NotesPanel } from './NotesPanel';
import { MeetingsPanel } from './MeetingsPanel';
import { ReportsPanel } from './ReportsPanel';
import { cn } from '@/lib/utils';

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
    // Handlers for Save Transmittal - save selected documents to an entity
    const handleSaveTransmittal = useCallback(async (type: 'note' | 'meeting' | 'report', id: string) => {
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

    return (
        <div className={cn('flex flex-col h-full overflow-y-auto', className)}>
            {/* Notes Section */}
            <NotesPanel
                projectId={projectId}
                onSaveTransmittal={(noteId) => handleSaveTransmittal('note', noteId)}
                onLoadTransmittal={(noteId) => handleLoadTransmittal('note', noteId)}
            />

            {/* Meetings Section */}
            <MeetingsPanel
                projectId={projectId}
                onSaveTransmittal={(meetingId) => handleSaveTransmittal('meeting', meetingId)}
                onLoadTransmittal={(meetingId) => handleLoadTransmittal('meeting', meetingId)}
            />

            {/* Reports Section */}
            <ReportsPanel
                projectId={projectId}
                onSaveTransmittal={(reportId) => handleSaveTransmittal('report', reportId)}
                onLoadTransmittal={(reportId) => handleLoadTransmittal('report', reportId)}
            />
        </div>
    );
}

export default NotesMeetingsReportsContainer;
