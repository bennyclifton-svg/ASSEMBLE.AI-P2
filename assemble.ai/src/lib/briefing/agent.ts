import { runAgentTurn, extractText, extractToolUses, type AgentMessage } from '@/lib/agents/completion';
import {
    appendMessage,
    buildContextSnapshot,
    serializeBriefingMessage,
} from './session-service';
import { normalizeCoverage } from './coverage-judge';
import {
    buildBriefingHistory,
    buildBriefingSystemPrompt,
    buildBriefingTools,
} from './prompt-builder';
import { dispatchBriefingToolCall, isWriteTool } from './tool-handlers';
import type { BriefingSessionRow, BriefingToolCallRecord, TurnEvent } from './types';

const MAX_TURNS = 8;

function chunkText(text: string): string[] {
    if (text.length <= 120) return [text];
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 80) {
        chunks.push(text.slice(i, i + 80));
    }
    return chunks;
}

export async function* runBriefingTurn(args: {
    projectId: string;
    session: BriefingSessionRow;
}): AsyncGenerator<TurnEvent> {
    let session = args.session;
    yield { type: 'status', message: 'Preparing your briefing context...' };
    const snapshot = await buildContextSnapshot(args.projectId, session);
    const system = buildBriefingSystemPrompt(snapshot);
    const tools = buildBriefingTools();
    const messages: AgentMessage[] = buildBriefingHistory(snapshot);
    const toolCallRecords: BriefingToolCallRecord[] = [];
    let finalText = '';

    try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
            const result = await runAgentTurn({
                featureGroup: 'chat',
                system,
                messages,
                tools,
                maxTokens: 1800,
                temperature: 0.2,
            });

            const text = extractText(result.blocks);
            const toolUses = extractToolUses(result.blocks);
            messages.push({ role: 'assistant', content: result.blocks });

            if (toolUses.length === 0) {
                finalText = text;
                break;
            }

            const toolResults: Array<{
                type: 'tool_result';
                tool_use_id: string;
                content: string;
                is_error?: boolean;
            }> = [];

            for (const toolUse of toolUses) {
                const record = await dispatchBriefingToolCall({
                    ctx: { projectId: args.projectId, session },
                    name: toolUse.name,
                    input: toolUse.input,
                });
                toolCallRecords.push(record);

                await appendMessage({
                    sessionId: session.id,
                    role: 'tool',
                    content: JSON.stringify(record.error ? { error: record.error } : record.output),
                    toolCalls: [record],
                });

                yield { type: 'tool-call-result', result: record };

                const maybeSession = record.output as
                    | { data?: { coverage?: unknown; sessionStatus?: unknown } }
                    | undefined;
                if (
                    toolUse.name === 'markCategoryCovered' &&
                    maybeSession?.data?.coverage &&
                    !record.error
                ) {
                    session = {
                        ...session,
                        coverage: normalizeCoverage(maybeSession.data.coverage),
                        status:
                            maybeSession.data.sessionStatus === 'completed'
                                ? 'completed'
                                : session.status,
                    };
                    yield { type: 'coverage', coverage: session.coverage };
                }

                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: JSON.stringify(record.error ? { error: record.error } : record.output),
                    ...(record.error ? { is_error: true } : {}),
                });
            }

            messages.push({ role: 'user', content: toolResults });
        }

        if (!finalText) {
            finalText =
                'I saved the latest briefing updates. Next, I need one more detail before I can continue.';
        }

        for (const text of chunkText(finalText)) {
            yield { type: 'text-delta', text };
        }

        const assistantMessage = await appendMessage({
            sessionId: session.id,
            role: 'assistant',
            content: finalText,
            toolCalls: toolCallRecords.length > 0 ? toolCallRecords : null,
        });

        yield {
            type: 'done',
            message: serializeBriefingMessage(assistantMessage),
            session,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield { type: 'error', error: message };
        const assistantMessage = await appendMessage({
            sessionId: session.id,
            role: 'assistant',
            content: `Briefing hit a stream error: ${message}`,
            toolCalls: toolCallRecords,
        });
        yield {
            type: 'done',
            message: serializeBriefingMessage(assistantMessage),
            session,
        };
    }
}

export function shouldToastToolResult(result: BriefingToolCallRecord): boolean {
    return isWriteTool(result.name) && !result.error;
}
