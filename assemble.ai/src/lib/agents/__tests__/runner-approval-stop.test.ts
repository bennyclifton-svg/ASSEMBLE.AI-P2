/**
 * @jest-environment node
 */

const mockRunAgentTurn = jest.fn();
const mockGetTool = jest.fn();
const mockEmitChatEvent = jest.fn();
const mockInsertRows: Array<Record<string, unknown>> = [];

const mockInsert = jest.fn(() => ({
    values: jest.fn(() => ({
        returning: jest.fn(async () => [mockInsertRows.shift() ?? { id: 'fallback-id' }]),
    })),
}));
const mockWhere = jest.fn(async () => undefined);
const mockUpdate = jest.fn(() => ({
    set: jest.fn(() => ({
        where: mockWhere,
    })),
}));

jest.mock('@/lib/db', () => ({
    db: {
        insert: () => mockInsert(),
        update: () => mockUpdate(),
    },
}));

jest.mock('../completion', () => ({
    runAgentTurn: (...args: unknown[]) => mockRunAgentTurn(...args),
    extractText: (blocks: Array<Record<string, unknown>>) =>
        blocks
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join(''),
    extractToolUses: (blocks: Array<Record<string, unknown>>) =>
        blocks
            .filter((block) => block.type === 'tool_use')
            .map((block) => ({
                id: block.id,
                name: block.name,
                input: block.input,
            })),
}));

jest.mock('../registry', () => ({
    getAgent: () => ({
        name: 'finance',
        displayName: 'Finance',
        allowedTools: ['update_cost_line'],
        featureGroup: 'chat',
        maxTokens: 2048,
        contextModules: [],
        buildSystemPrompt: () => 'finance system prompt',
    }),
}));

jest.mock('../tools', () => ({}));
jest.mock('../tools/catalog', () => ({
    getTool: (...args: unknown[]) => mockGetTool(...args),
}));
jest.mock('../events', () => ({
    emitChatEvent: (...args: unknown[]) => mockEmitChatEvent(...args),
}));
jest.mock('@/lib/context/agent-context', () => ({
    assembleAgentContext: jest.fn(async () => ''),
    DEFAULT_AGENT_CONTEXT_MODULES: [],
}));

import { runAgent } from '../runner';

describe('runAgent approval stop', () => {
    beforeEach(() => {
        mockRunAgentTurn.mockReset();
        mockGetTool.mockReset();
        mockEmitChatEvent.mockReset();
        mockInsert.mockClear();
        mockUpdate.mockClear();
        mockWhere.mockClear();
        mockInsertRows.splice(0, mockInsertRows.length);
        mockInsertRows.push({ id: 'run-1' }, { id: 'tool-call-1' }, { id: 'assistant-1' });
    });

    it('stops after creating an approval card instead of asking the model for another tool turn', async () => {
        mockRunAgentTurn.mockResolvedValue({
            blocks: [
                {
                    type: 'tool_use',
                    id: 'toolu_update_1',
                    name: 'update_cost_line',
                    input: {
                        id: 'cl-acoustic',
                        budgetCents: 1300000,
                        approvedContractCents: 1300000,
                    },
                },
            ],
            stopReason: 'tool_use',
            modelId: 'test-model',
            usage: { inputTokens: 10, outputTokens: 5 },
        });
        mockGetTool.mockReturnValue({
            mutating: true,
            validate: (input: unknown) => input,
            execute: jest.fn(async () => ({
                status: 'awaiting_approval',
                approvalId: 'approval-1',
                toolName: 'update_cost_line',
                summary: 'Update acoustic consultant budget and contract sum',
            })),
        });

        const result = await runAgent({
            agentName: 'finance',
            threadId: 'thread-1',
            organizationId: 'org-1',
            userId: 'user-1',
            projectId: 'project-1',
            triggerMessageId: 'message-1',
            history: [
                {
                    role: 'user',
                    content: 'increase the acoustic budget and contract sum by 3000',
                },
            ],
        });

        expect(mockRunAgentTurn).toHaveBeenCalledTimes(1);
        expect(result.turns).toBe(1);
        expect(result.stopReason).toBe('awaiting_approval');
        expect(result.finalText).toBe(
            "I've put the proposed change in the approval card above. Use Approve & apply to create it, or Edit/Reject if it needs changing."
        );
    });
});
