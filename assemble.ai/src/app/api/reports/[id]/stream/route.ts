/**
 * T052: GET /api/reports/[id]/stream
 * SSE stream for real-time generation updates
 */

import { NextRequest } from 'next/server';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates, reportSections } from '@/lib/db/rag-schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Store for active SSE connections
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Send event to all connections for a report
 */
export function emitReportEvent(
    reportId: string,
    event: string,
    data: any
) {
    const reportConnections = connections.get(reportId);
    if (!reportConnections) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();

    for (const controller of reportConnections) {
        try {
            controller.enqueue(encoder.encode(message));
        } catch {
            // Connection closed, will be cleaned up
        }
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id } = await params;

    // Verify report exists
    const report = await ragDb.query.reportTemplates.findFirst({
        where: eq(reportTemplates.id, id),
    });

    if (!report) {
        return new Response('Report not found', { status: 404 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
        start(controller) {
            // Add connection to store
            if (!connections.has(id)) {
                connections.set(id, new Set());
            }
            connections.get(id)!.add(controller);

            // Send initial connection event
            const encoder = new TextEncoder();
            controller.enqueue(
                encoder.encode(`event: connected\ndata: ${JSON.stringify({ reportId: id })}\n\n`)
            );

            // Send current state
            sendCurrentState(id, controller);
        },
        cancel(controller) {
            // Remove connection from store
            const reportConnections = connections.get(id);
            if (reportConnections) {
                reportConnections.delete(controller);
                if (reportConnections.size === 0) {
                    connections.delete(id);
                }
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

/**
 * Send current report state to a new connection
 */
async function sendCurrentState(
    reportId: string,
    controller: ReadableStreamDefaultController
) {
    const encoder = new TextEncoder();

    try {
        // Get current report state
        const report = await ragDb.query.reportTemplates.findFirst({
            where: eq(reportTemplates.id, reportId),
        });

        if (!report) return;

        // Send TOC if available
        if (report.tableOfContents) {
            const toc = report.tableOfContents as any;
            controller.enqueue(
                encoder.encode(
                    `event: toc_generated\ndata: ${JSON.stringify({
                        sections: toc.sections?.length ?? 0,
                        toc,
                    })}\n\n`
                )
            );
        }

        // Get completed sections
        const sections = await ragDb.query.reportSections.findMany({
            where: eq(reportSections.reportId, reportId),
            orderBy: (sections, { asc }) => [asc(sections.sectionIndex)],
        });

        // Send section events for completed sections
        for (const section of sections) {
            if (section.status === 'complete' && section.content) {
                controller.enqueue(
                    encoder.encode(
                        `event: section_complete\ndata: ${JSON.stringify({
                            sectionIndex: section.sectionIndex,
                            title: section.title,
                        })}\n\n`
                    )
                );
            }
        }

        // Send status
        if (report.status === 'complete') {
            controller.enqueue(
                encoder.encode(
                    `event: complete\ndata: ${JSON.stringify({
                        totalSections: sections.length,
                    })}\n\n`
                )
            );
        }
    } catch (error) {
        console.error('[stream] Error sending current state:', error);
    }
}

/**
 * Helper to emit events from other parts of the application
 */
export function createProgressEmitter(reportId: string) {
    return (event: {
        reportId: string;
        sectionIndex: number;
        event: string;
        data: any;
    }) => {
        emitReportEvent(event.reportId, event.event, {
            sectionIndex: event.sectionIndex,
            ...event.data,
        });
    };
}
