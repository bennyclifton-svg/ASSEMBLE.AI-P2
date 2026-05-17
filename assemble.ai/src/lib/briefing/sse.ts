import type { TurnEvent } from './types';

export function briefingSseResponse(events: AsyncIterable<TurnEvent>): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of events) {
                    controller.enqueue(
                        encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
                    );
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                controller.enqueue(
                    encoder.encode(
                        `event: error\ndata: ${JSON.stringify({ type: 'error', error: message })}\n\n`
                    )
                );
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
