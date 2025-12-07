/**
 * T060: use-report-stream hook
 * Consumes SSE events for real-time generation updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// SSE Event types
export type ReportStreamEvent =
    | { type: 'connected'; data: { reportId: string } }
    | { type: 'toc_generated'; data: { sections: number; toc: any } }
    | { type: 'section_start'; data: { sectionIndex: number; title: string } }
    | { type: 'section_chunk'; data: { sectionIndex: number; content: string } }
    | { type: 'sources_updated'; data: { sectionIndex: number; sources: any[] } }
    | { type: 'section_complete'; data: { sectionIndex: number; title: string } }
    | { type: 'complete'; data: { totalSections: number } }
    | { type: 'error'; data: { message: string; code?: string } };

export interface StreamState {
    isConnected: boolean;
    currentSection: number | null;
    streamingContent: string;
    sources: any[];
    completedSections: number[];
    isComplete: boolean;
    error: string | null;
}

/**
 * Hook for consuming SSE stream during report generation
 */
export function useReportStream(reportId: string | null) {
    const [state, setState] = useState<StreamState>({
        isConnected: false,
        currentSection: null,
        streamingContent: '',
        sources: [],
        completedSections: [],
        isComplete: false,
        error: null,
    });

    const eventSourceRef = useRef<EventSource | null>(null);

    // Event handlers
    const handleEvent = useCallback((event: ReportStreamEvent) => {
        setState(prev => {
            switch (event.type) {
                case 'connected':
                    return {
                        ...prev,
                        isConnected: true,
                        error: null,
                    };

                case 'toc_generated':
                    return {
                        ...prev,
                        // TOC info can be used by parent component
                    };

                case 'section_start':
                    return {
                        ...prev,
                        currentSection: event.data.sectionIndex,
                        streamingContent: '',
                        sources: [],
                    };

                case 'section_chunk':
                    return {
                        ...prev,
                        streamingContent: prev.streamingContent + event.data.content,
                    };

                case 'sources_updated':
                    return {
                        ...prev,
                        sources: event.data.sources,
                    };

                case 'section_complete':
                    return {
                        ...prev,
                        completedSections: [...prev.completedSections, event.data.sectionIndex],
                        currentSection: null,
                        streamingContent: '',
                    };

                case 'complete':
                    return {
                        ...prev,
                        isComplete: true,
                        currentSection: null,
                    };

                case 'error':
                    return {
                        ...prev,
                        error: event.data.message,
                    };

                default:
                    return prev;
            }
        });
    }, []);

    // Connect to SSE stream
    useEffect(() => {
        if (!reportId) {
            return;
        }

        // Create EventSource
        const eventSource = new EventSource(`/api/reports/${reportId}/stream`);
        eventSourceRef.current = eventSource;

        // Handle events
        eventSource.addEventListener('connected', (e) => {
            handleEvent({ type: 'connected', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('toc_generated', (e) => {
            handleEvent({ type: 'toc_generated', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('section_start', (e) => {
            handleEvent({ type: 'section_start', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('section_chunk', (e) => {
            handleEvent({ type: 'section_chunk', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('sources_updated', (e) => {
            handleEvent({ type: 'sources_updated', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('section_complete', (e) => {
            handleEvent({ type: 'section_complete', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('complete', (e) => {
            handleEvent({ type: 'complete', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('error', (e) => {
            if ((e as any).data) {
                handleEvent({ type: 'error', data: JSON.parse((e as any).data) });
            } else {
                handleEvent({ type: 'error', data: { message: 'Connection error' } });
            }
        });

        eventSource.onerror = () => {
            setState(prev => ({
                ...prev,
                isConnected: false,
                error: 'Stream connection lost',
            }));
        };

        // Cleanup
        return () => {
            eventSource.close();
            eventSourceRef.current = null;
        };
    }, [reportId, handleEvent]);

    // Disconnect manually
    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setState(prev => ({ ...prev, isConnected: false }));
        }
    }, []);

    // Reset state
    const reset = useCallback(() => {
        setState({
            isConnected: false,
            currentSection: null,
            streamingContent: '',
            sources: [],
            completedSections: [],
            isComplete: false,
            error: null,
        });
    }, []);

    return {
        ...state,
        disconnect,
        reset,
    };
}

/**
 * Get progress percentage from stream state
 */
export function getStreamProgress(state: StreamState, totalSections: number): number {
    if (state.isComplete) return 100;
    if (totalSections === 0) return 0;
    return Math.round((state.completedSections.length / totalSections) * 100);
}
