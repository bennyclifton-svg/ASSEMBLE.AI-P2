/**
 * SSE event bus for chat threads.
 *
 * Mirrors the controller-set pattern used by the report stream
 * (src/app/api/reports/[id]/stream/route.ts). Each thread has zero or
 * more open SSE controllers; the runner publishes events through
 * emitChatEvent and the open routes forward them to the client.
 *
 * Note: this uses an in-process Map, so events do not cross worker
 * boundaries. Phase 6 swaps this for Redis pub/sub when the BullMQ
 * agent-runs queue is introduced.
 *
 * Why globalThis? In Next.js dev mode (Turbopack), this module can be
 * re-evaluated on hot-reload, producing multiple Map instances. The SSE
 * route would register a controller in instance A while the agent runner
 * emits into instance B — events vanish silently. Pinning the Map to
 * globalThis keeps a single shared instance across re-evaluations.
 */

declare global {
    var __assembleChatConnections: Map<string, Set<ReadableStreamDefaultController>> | undefined;
}

const connections: Map<string, Set<ReadableStreamDefaultController>> =
    globalThis.__assembleChatConnections ??
    (globalThis.__assembleChatConnections = new Map());
const encoder = new TextEncoder();

export type ChatEvent =
    | { type: 'run_started'; runId: string; agentName: string }
    | { type: 'agent_thinking'; runId: string; turn: number }
    | { type: 'tool_call_started'; runId: string; toolCallId: string; toolName: string; input: unknown }
    | {
          type: 'tool_call_finished';
          runId: string;
          toolCallId: string;
          toolName: string;
          status: 'complete' | 'error';
          durationMs: number;
          error?: string;
      }
    | {
          type: 'awaiting_approval';
          runId: string;
          approvalId: string;
          toolName: string;
          // Free-form structured diff for UI rendering: { entity, entityId, before, after }.
          proposedDiff: unknown;
          createdAt?: string | Date | null;
      }
    | {
          type: 'approval_resolved';
          approvalId: string;
          // applied = mutation committed; rejected = user said no; conflict = optimistic-lock failure.
          status: 'applied' | 'rejected' | 'conflict';
          appliedOutput?: unknown;
          error?: string;
      }
    | {
          type: 'document_selection_changed';
          projectId: string;
          mode: 'replace' | 'add' | 'remove' | 'clear';
          documentIds: string[];
      }
    | { type: 'assistant_message'; runId: string; messageId: string; content: string }
    | {
          type: 'run_finished';
          runId: string;
          status: 'complete' | 'error';
          stopReason: string | null;
          inputTokens: number;
          outputTokens: number;
          error?: string;
      };

export function registerChatConnection(
    threadId: string,
    controller: ReadableStreamDefaultController
): void {
    if (!connections.has(threadId)) connections.set(threadId, new Set());
    connections.get(threadId)!.add(controller);
}

export function unregisterChatConnection(
    threadId: string,
    controller: ReadableStreamDefaultController
): void {
    const set = connections.get(threadId);
    if (!set) return;
    set.delete(controller);
    if (set.size === 0) connections.delete(threadId);
}

export function emitChatEvent(threadId: string, event: ChatEvent): void {
    const set = connections.get(threadId);
    if (!set) return;
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    const bytes = encoder.encode(message);
    for (const controller of set) {
        try {
            controller.enqueue(bytes);
        } catch {
            // controller closed; cleanup happens via the cancel() callback
        }
    }
}
